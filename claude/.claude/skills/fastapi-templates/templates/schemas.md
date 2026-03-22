# Flight Booking Domain — Pydantic v2 Schemas

Adapt field names after exploring the upstream `/docs`. These represent the **BFF contract** (what consumers see), not upstream shapes.

## Common

```python
# app/schemas/common.py
from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class ErrorResponse(BaseModel):
    code: str
    message: str
    detail: str | None = None
    request_id: str = ""


class PaginatedResponse(BaseModel, Generic[T]):
    total: int
    page: int
    page_size: int
    total_pages: int
    results: list[T]
```

## Flights

```python
# app/schemas/flights.py
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class FlightSearchRequest(BaseModel):
    origin: str = Field(..., min_length=3, max_length=3, description="IATA airport code")
    destination: str = Field(..., min_length=3, max_length=3, description="IATA airport code")
    departure_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD")
    passengers: int = Field(default=1, ge=1, le=9)
    cabin_class: str = Field(default="Y", description="Y=Economy, W=PremiumEconomy, J=Business, F=First")
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

    @field_validator("origin", "destination", mode="before")
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        return v.upper()


class FlightOffer(BaseModel):
    offer_id: str
    price_total: float
    currency: str = "MYR"
    airline_code: str
    airline_name: str                # human-readable label
    cabin_code: str
    cabin_class: str                 # human-readable label
    departure_airport: str
    departure_city: str
    arrival_airport: str
    arrival_city: str
    departure_at: datetime
    arrival_at: datetime
    duration_minutes: int
    stops: int
    baggage_kg: int | None = None
    is_refundable: bool = False


class FlightSearchResponse(PaginatedResponse[FlightOffer]):
    pass


class OfferDetailResponse(BaseModel):
    offer_id: str
    price_total: float
    currency: str
    airline_name: str
    cabin_class: str
    departure_airport: str
    arrival_airport: str
    departure_at: datetime
    arrival_at: datetime
    duration_minutes: int
    stops: int
    fare_rules: str | None = None
    baggage_allowance: str | None = None
    change_policy: str | None = None
    refund_policy: str | None = None
    is_refundable: bool = False
```

## Bookings

```python
# app/schemas/bookings.py
from datetime import date
from pydantic import BaseModel, Field, EmailStr


class PassengerInput(BaseModel):
    type: str = Field(..., description="ADT=Adult, CHD=Child, INF=Infant")
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    phone: str | None = None
    date_of_birth: date
    passport_number: str | None = None
    passport_expiry: date | None = None
    nationality: str | None = None


class CreateBookingRequest(BaseModel):
    offer_id: str
    passengers: list[PassengerInput] = Field(..., min_length=1, max_length=9)
    contact_email: EmailStr | None = None

    @field_validator("passengers")
    @classmethod
    def at_least_one_adult(cls, v: list[PassengerInput]) -> list[PassengerInput]:
        adult_count = sum(1 for p in v if p.type == "ADT")
        if adult_count < 1:
            raise ValueError("At least one adult passenger (type=ADT) is required")
        return v


class PassengerSummary(BaseModel):
    type: str
    type_label: str     # "Adult", "Child", "Infant"
    first_name: str
    last_name: str
    email: str


class BookingResponse(BaseModel):
    booking_reference: str
    status: str          # "Confirmed", "Cancelled", etc. — never raw codes
    offer_id: str
    airline_name: str
    departure_airport: str
    arrival_airport: str
    departure_at: datetime
    arrival_at: datetime
    passengers: list[PassengerSummary]
    total_price: float
    currency: str
    booked_at: datetime
    cache_status: str | None = None   # "stale" if returned from cache after upstream failure
```

## Airports

```python
# app/schemas/airports.py
from pydantic import BaseModel


class AirportResponse(BaseModel):
    code: str
    name: str
    city: str | None = None
    country: str | None = None
    timezone: str | None = None
```
