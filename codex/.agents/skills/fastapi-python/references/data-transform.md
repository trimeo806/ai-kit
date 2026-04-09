# FastAPI Data Transformation Patterns

## Core Principle

The BFF layer's primary job is translation. Upstream responses are messy by design; the consumer API must be clean by design. Keep these completely separate — never pass an upstream response shape directly to a consumer.

```
Upstream response  →  UpstreamClient (raw dict)  →  Service (transform)  →  Pydantic schema  →  Consumer
```

## Parsing Deeply Nested Responses

Upstream flight search nests departure airport code at:
`data → flight_results → outbound → results[] → segments → segment_list[] → leg_data[] → departure_info → airport → code`

Use a helper to safely extract nested values without KeyError:

```python
from typing import Any


def dig(data: dict | list, *keys: str | int, default: Any = None) -> Any:
    """Safely traverse nested dict/list. Returns default if any key is missing."""
    current = data
    for key in keys:
        try:
            current = current[key]
        except (KeyError, IndexError, TypeError):
            return default
    return current


# Usage
departure_code = dig(
    result,
    "segments", "segment_list", 0, "leg_data", 0, "departure_info", "airport", "code",
    default="UNKNOWN",
)
```

## Deduplicating Redundant Fields

Upstream offers contain `offer_id`, `offerId`, and sometimes `id` for the same value:

```python
def extract_offer_id(raw: dict) -> str:
    """Pick the first non-None value from known field aliases."""
    return (
        raw.get("offer_id")
        or raw.get("offerId")
        or raw.get("id")
        or ""
    )


def extract_price(raw: dict) -> float:
    """Upstream sends price as both number and string; normalise to float."""
    # Prefer the numeric field; fall back to parsing the string
    value = raw.get("totalAmountDecimal") or raw.get("total")
    if value is None:
        # Try string form
        total_str = raw.get("total_amount", "0")
        value = float(str(total_str).replace(",", "").strip())
    return float(value)
```

## Date/Time Normalization

Upstream uses 5 different date formats. Normalize everything to `datetime` objects; let Pydantic serialize to ISO 8601.

```python
from datetime import datetime
import re


# Mapping of format strings ordered by specificity
_DATE_FORMATS = [
    "%Y%m%d%H%M%S",          # 20241215143000
    "%Y-%m-%dT%H:%M:%S",     # 2024-12-15T14:30:00
    "%Y-%m-%dT%H:%M:%SZ",    # 2024-12-15T14:30:00Z
    "%d/%m/%Y",               # 15/12/2024
    "%d-%b-%Y",               # 15-Dec-2024
]


def parse_datetime(value: str | int | float | None) -> datetime | None:
    """Parse any upstream date format into a UTC-aware datetime."""
    if value is None:
        return None

    # Unix epoch (int or float)
    if isinstance(value, (int, float)):
        return datetime.utcfromtimestamp(value)

    value = str(value).strip()

    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue

    raise ValueError(f"Unrecognised date format: {value!r}")
```

## Code-to-Label Mapping

Upstream returns raw codes; consumers expect human-readable labels.

```python
AIRLINE_NAMES: dict[str, str] = {
    "MH": "Malaysia Airlines",
    "AK": "AirAsia",
    "SQ": "Singapore Airlines",
    "TF": "Batik Air Malaysia",
    "FY": "Firefly",
}

CABIN_LABELS: dict[str, str] = {
    "Y": "Economy",
    "W": "Premium Economy",
    "J": "Business",
    "F": "First",
}

AIRCRAFT_TYPES: dict[str, str] = {
    "738": "Boeing 737-800",
    "359": "Airbus A350-900",
    "333": "Airbus A330-300",
    "320": "Airbus A320",
    "77W": "Boeing 777-300ER",
}

BOOKING_STATUS: dict[str, str] = {
    "HK": "Confirmed",
    "HX": "Cancelled",
    "UN": "Unable to Confirm",
    "WL": "Waitlisted",
}

PASSENGER_TYPES: dict[str, str] = {
    "ADT": "Adult",
    "CHD": "Child",
    "INF": "Infant",
}


def label(mapping: dict[str, str], code: str, default: str | None = None) -> str:
    """Look up a code; return the code itself as fallback if default is None."""
    return mapping.get(code.upper(), default if default is not None else code)
```

## Full Offer Transformation Example

```python
from app.schemas.flights import FlightOffer


def transform_offer(raw: dict, airport_cache: dict[str, str]) -> FlightOffer:
    """
    Transform a raw upstream offer (deeply nested) into a flat FlightOffer.
    airport_cache maps IATA code → city name.
    """
    # Navigate the nested structure
    outbound = dig(raw, "flight_data", "outbound", default={})
    first_segment = dig(outbound, "segments", "segment_list", 0, default={})
    first_leg = dig(first_segment, "leg_data", 0, default={})
    last_leg = dig(first_segment, "leg_data", -1, default={})

    dep_code = dig(first_leg, "departure_info", "airport", "code", default="")
    arr_code = dig(last_leg, "arrival_info", "airport", "code", default="")

    airline_code = dig(first_segment, "carrier", "code", default="")
    cabin_code = dig(raw, "fare_info", "cabin_code", default="Y")

    dep_time = parse_datetime(dig(first_leg, "departure_info", "datetime"))
    arr_time = parse_datetime(dig(last_leg, "arrival_info", "datetime"))
    duration_min = int(dig(outbound, "total_duration_minutes", default=0))
    stops = max(0, len(dig(first_segment, "leg_data", default=[])) - 1)

    return FlightOffer(
        offer_id=extract_offer_id(raw),
        price_total=extract_price(raw),
        currency=dig(raw, "price", "currency", default="MYR"),
        airline_code=airline_code,
        airline_name=label(AIRLINE_NAMES, airline_code),
        cabin_code=cabin_code,
        cabin_class=label(CABIN_LABELS, cabin_code),
        departure_airport=dep_code,
        departure_city=airport_cache.get(dep_code, dep_code),
        arrival_airport=arr_code,
        arrival_city=airport_cache.get(arr_code, arr_code),
        departure_at=dep_time,
        arrival_at=arr_time,
        duration_minutes=duration_min,
        stops=stops,
    )
```

## Pagination Helper

Upstream returns all results in one dump; the BFF adds pagination:

```python
from app.schemas.common import PaginatedResponse, T


def paginate(items: list[T], page: int, page_size: int) -> PaginatedResponse[T]:
    """Slice a list into a paginated response. page is 1-indexed."""
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
        results=items[start:end],
    )
```

```python
# schemas/common.py
from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    total: int
    page: int
    page_size: int
    total_pages: int
    results: list[T]
```
