# Legacy API Exploration — Backend Phase B0

*All endpoints tested live against https://mock-travel-api.vercel.app*

---

## API Info

| | |
|-|-|
| **Title** | easyGDS Legacy Flight API v1.4.7 |
| **Base URL** | `https://mock-travel-api.vercel.app` |
| **Swagger** | `/docs` |
| **OpenAPI** | `/openapi.json` |
| **Auth** | None (no API key required) |
| **Simulate failures** | Append `?simulate_issues=true` to any endpoint |
| **Status** | ✅ All 6 endpoints tested live |

---

## Endpoints Overview

| Method | Path | Purpose | Version |
|--------|------|---------|---------|
| `POST` | `/api/v1/flightsearch` | Search flights | v1 |
| `GET` | `/api/v2/offer/{offer_id}` | Get offer details | v2 ← inconsistent! |
| `POST` | `/booking/create` | Create booking | none ← missing `/api/` prefix! |
| `GET` | `/api/v1/reservations/{ref}` | Retrieve booking | v1 |
| `GET` | `/api/airports` | List all airports | none |
| `GET` | `/api/airports/{code}` | Get single airport | none |

---

## Endpoint 1 · Flight Search

### Request

```
POST /api/v1/flightsearch
Content-Type: application/json
```

**Schema** (from OpenAPI):
```json
{
  "origin": "string (required)",
  "destination": "string (required)",
  "departure_date": "string (required)",
  "return_date": "string | null (optional)",
  "pax_count": "integer (default: 1)",
  "cabin": "string (default: 'Y')"
}
```

**Cabin codes**: `Y` (Economy) · `W` (Premium Economy) · `J` (Business) · `F` (First)

**Example**:
```json
{ "origin": "KUL", "destination": "SIN", "departure_date": "2026-05-15", "pax_count": 1, "cabin": "Y" }
```

### Actual Response (tested live)

```json
{
  "Status": "OK",
  "StatusCode": 200,
  "data": {
    "search_id": "41382784-5722-4822-a59b-a8857a6a51b3",
    "SearchId": "72ab13b6-87d9-4036-bbf8-5105f4196943",
    "flight_results": {
      "outbound": {
        "result_count": 11,
        "ResultCount": 11,
        "results": [
          {
            "offer_id": "1e080aa936888c3d",
            "offerId": "1e080aa936888c3d",
            "stops": 0,
            "num_stops": 0,
            "total_journey_time": 46,
            "total_journey": "0h 46m",
            "validating_carrier": "MH",
            "fare_basis": "MAP3M",
            "booking_class": "Y",
            "seats_remaining": 6,
            "avl_seats": 6,
            "seatAvailability": 6,
            "refundable": false,
            "isRefundable": false,
            "last_ticketing_date": 1778545500,
            "pricing": {
              "currency": "MYR",
              "CurrencyCode": "MYR",
              "total": 97.08,
              "total_amount": "97.08",
              "totalAmountDecimal": 97.08,
              "per_pax": 97.08,
              "base_fare": 82.91,
              "BaseFare": 82.91,
              "taxes_fees": {
                "tax_breakdown": [
                  { "code": "XT", "amount": 5.45 },
                  { "code": "UB", "amount": 4.47 },
                  { "code": "YR", "amount": 2.41 },
                  { "code": "MY", "amount": 1.84 }
                ],
                "total_tax": 14.17,
                "TotalTax": "14.17"
              }
            },
            "baggage": {
              "checked": { "pieces": 1, "weight_kg": 20, "Weight": "20KG" },
              "cabin_baggage": { "pieces": 1, "weight_kg": 7 }
            },
            "segments": {
              "segment_list": [
                {
                  "leg_data": [
                    {
                      "departure_info": {
                        "airport": { "code": "KUL", "terminal": "1" },
                        "scheduled_time": "15-May-2026 08:25 AM",
                        "dt": "15/05/2026 08:25"
                      },
                      "arrival_info": {
                        "airport": { "code": "SIN", "terminal": "1" },
                        "scheduled_time": 1778807460,
                        "arr_date": "2026-05-15"
                      },
                      "carrier": {
                        "operating": "MH",
                        "marketing": "MH",
                        "mktg_carrier": "MH",
                        "flight_no": "501",
                        "number": "MH501"
                      },
                      "equipment": {
                        "aircraft_code": "359",
                        "type": "359"
                      },
                      "cabin": "Y",
                      "cabin_class": "Y",
                      "duration_minutes": 46,
                      "elapsed_time": "0h 46m"
                    }
                  ]
                }
              ]
            }
          }
        ]
      }
    },
    "search_params": {
      "orig": "KUL", "Origin": "KUL",
      "dest": "SIN", "Destination": "SIN",
      "dep_date": "2026-05-15", "DepartureDate": "2026-05-15",
      "pax": 1,
      "cabin": "Y"
    },
    "meta": {
      "request_time_ms": 601,
      "provider": "GDS_SABRE",
      "timestamp": 1773825411,
      "cache_hit": false
    }
  }
}
```

### Problems Your BFF Must Fix

| Problem | Detail | Fix |
|---------|--------|-----|
| **Nesting depth** | Airport code buried 7 levels deep: `data.flight_results.outbound.results[].segments.segment_list[].leg_data[].departure_info.airport.code` | Flatten to top-level `departure_airport`, `arrival_airport` |
| **Redundant IDs** | `offer_id` AND `offerId` (same value) | Pick one canonical: `offerId` |
| **Redundant price** | `total` (float), `total_amount` (string), `totalAmountDecimal` (float) | Canonical: `total_amount` as string |
| **Redundant stops** | `stops` AND `num_stops` | Pick one: `stops` |
| **Mixed date formats** | Departure: `"15-May-2026 08:25 AM"` (DD-Mon-YYYY), also `"15/05/2026 08:25"` (DD/MM/YYYY HH:MM). Arrival: Unix timestamp `1778807460` | Normalize all to ISO 8601 |
| **Codes without labels** | `validating_carrier: "MH"` — no airline name | Enrich: `"MH" → "Malaysia Airlines"` |
| **Codes without labels** | `cabin: "Y"` — no human name | Enrich: `"Y"→"Economy"`, `"W"→"Premium Economy"`, `"J"→"Business"`, `"F"→"First"` |
| **Codes without labels** | `equipment.aircraft_code: "359"` | Enrich: `"359"→"Airbus A350-900"`, `"738"→"Boeing 737-800"` |
| **Codes without labels** | Tax codes `XT`, `UB`, `YR`, `MY` | Map or expose as-is with label |
| **No pagination** | Returns all 11 results inline | Implement cursor pagination in BFF |
| **Error format** | `{ "error": { "message": "...", "code": N } }` | Normalize to unified GraphQL error |

---

## Endpoint 2 · Get Offer Details

### Request

```
GET /api/v2/offer/{offer_id}
```

> ⚠️ Note: Uses `/v2/` while search uses `/v1/` — intentional inconsistency

### Actual Response (tested live)

```json
{
  "data": {
    "offer": {
      "id": "1e080aa936888c3d",
      "offer_id": "1e080aa936888c3d",
      "status": "LIVE",
      "StatusCode": "A",
      "fare_details": {
        "rules": {
          "refund": { "allowed": true, "penalty": { "amount": 150, "currency": "MYR", "CurrencyCode": "MYR" } },
          "change": { "allowed": true, "penalty": { "amount": 150, "currency": "MYR" } },
          "no_show": { "penalty": { "amount": 200, "currency": "MYR" } }
        },
        "fare_family": "FULL",
        "FareFamily": "FL"
      },
      "baggage_allowance": {
        "checked": { "quantity": 0, "max_weight_kg": 25, "MaxWeight": "30KG" },
        "carry_on": { "quantity": 1, "max_weight_kg": 7 }
      },
      "conditions": {
        "advance_purchase_days": 7,
        "min_stay_days": 0,
        "max_stay_days": 14
      },
      "payment_requirements": {
        "accepted_methods": ["CC", "DC", "BT"],
        "time_limit": 1773955031,
        "instant_ticketing_required": true
      },
      "created_at": "20260318091711",
      "expires_at": "2026-03-18T10:50:11.838286+00:00"
    }
  },
  "meta": {
    "request_id": "46e4f85f-dbfd-469a-9638-f13bad719053",
    "provider": "GDS_SABRE"
  }
}
```

### Problems Your BFF Must Fix

| Problem | Detail | Fix |
|---------|--------|-----|
| **Redundant offer ID** | `id` AND `offer_id` same value | Pick one |
| **Redundant status** | `status: "LIVE"` AND `StatusCode: "A"` | Expose `status` only with label |
| **Mixed date formats** | `created_at: "20260318091711"` (YYYYMMDDHHMMSS), `expires_at` is ISO 8601 (mixed within same object!) | Normalize to ISO 8601 |
| **Redundant currency** | `currency` AND `CurrencyCode` same value | Pick one |
| **Redundant fare** | `fare_family: "FULL"` AND `FareFamily: "FL"` | Pick one |
| **payment time_limit** | Unix timestamp `1773955031` | Convert to ISO 8601 |
| **Error format** | `{ "errors": [{ "code": "NOT_FOUND", "detail": "...", "status": "404" }] }` | Normalize |

---

## Endpoint 3 · Create Booking

### Request

```
POST /booking/create
Content-Type: application/json
```

> ⚠️ Note: No `/api/` prefix — inconsistent with all other endpoints

**Schema** (from OpenAPI — required fields only):
```json
{
  "offer_id": "string (required)",
  "passengers": [
    {
      "first_name": "string (required)",
      "last_name": "string (required)",
      "title": "string | null",
      "dob": "string | null",
      "nationality": "string | null",
      "passport_no": "string | null",
      "email": "string | null",
      "phone": "string | null"
    }
  ],
  "contact_email": "string (required)",
  "contact_phone": "string | null"
}
```

**Example**:
```json
{
  "offer_id": "1e080aa936888c3d",
  "passengers": [{
    "first_name": "Tony",
    "last_name": "Stark",
    "title": "Mr",
    "dob": "1980-07-24",
    "nationality": "MY",
    "passport_no": "A12345678",
    "email": "tony@example.com",
    "phone": "+60123456789"
  }],
  "contact_email": "tony@example.com",
  "contact_phone": "+60123456789"
}
```

### Actual Response (tested live)

```json
{
  "Result": "SUCCESS",
  "ResultCode": 0,
  "data": {
    "booking_ref": "EG12DF68",
    "BookingReference": "EG12DF68",
    "pnr": "G58579D",
    "PNR": "G58579D",
    "status": "CONFIRMED",
    "StatusCode": "HK",
    "offer_id": "1e080aa936888c3d",
    "passengers": [{
      "pax_id": "PAX1",
      "title": "Mr",
      "first_name": "Tony",
      "FirstName": "Tony",
      "last_name": "Stark",
      "LastName": "Stark",
      "name": "Stark/Tony Mr",
      "dob": "1980-07-24",
      "DateOfBirth": "1980-07-24",
      "nationality": "MY",
      "passport_no": "A12345678",
      "type": "ADT",
      "PaxType": "ADT"
    }],
    "contact": {
      "email": "tony@example.com",
      "phone": "+60123456789",
      "EmailAddress": "tony@example.com"
    },
    "ticketing": {
      "status": "PENDING",
      "time_limit": "20260319101724",
      "ticket_numbers": []
    },
    "created_at": "18/03/2026 09:17",
    "CreatedDateTime": 1773825444
  }
}
```

### Problems Your BFF Must Fix

| Problem | Detail | Fix |
|---------|--------|-----|
| **Redundant booking ref** | `booking_ref` AND `BookingReference` same value | Canonical: `bookingReference` |
| **Redundant PNR** | `pnr` AND `PNR` same value | Canonical: `pnr` |
| **Redundant passenger names** | `first_name`/`FirstName`, `last_name`/`LastName` | Single `given_name`, `family_name` |
| **Redundant DOB** | `dob` AND `DateOfBirth` same value | Canonical: `dateOfBirth` |
| **Passenger type** | `type: "ADT"` (cryptic IATA code) | Enrich: `"ADT"→"Adult"`, `"CHD"→"Child"`, `"INF"→"Infant"` |
| **Status code** | `StatusCode: "HK"` (cryptic) | Enrich: `"HK"→"Confirmed"`, `"HL"→"Waitlisted"`, `"UC"→"Unable to Confirm"` |
| **Contact redundancy** | `email` AND `EmailAddress` same value | Pick one |
| **Mixed date formats** | `created_at: "18/03/2026 09:17"` (DD/MM/YYYY HH:MM), `time_limit: "20260319101724"` (YYYYMMDDHHMMSS), `CreatedDateTime: 1773825444` (Unix) | Normalize all to ISO 8601 |
| **Error format** | `{ "fault": { "faultstring": "...", "faultcode": "..." } }` | Normalize |

---

## Endpoint 4 · Retrieve Booking

### Request

```
GET /api/v1/reservations/{ref}
```

**Example**: `GET /api/v1/reservations/EG12DF68`

### Actual Response (tested live)

```json
{
  "status": "ok",
  "data": {
    "reservation": { ... },
    "Reservation": { ... }
  }
}
```

> ⚠️ The **entire reservation is duplicated** — `data.reservation` and `data.Reservation` contain identical data.

**Inner structure** (same as booking create response — same problems apply).

### Problems Your BFF Must Fix

| Problem | Detail | Fix |
|---------|--------|-----|
| **Entire object duplicated** | `data.reservation` and `data.Reservation` are identical | Use `data.reservation` only |
| **All create-booking problems** | Same redundant/mixed-format issues | Same fixes |
| **Error format** | `{ "status": "error", "msg": "Booking INVALID not found" }` — 4th unique error format! | Normalize |

> **Caching opportunity**: This endpoint is a prime caching candidate. Booking data doesn't change frequently. Cache by `booking_ref` with 5-min TTL.

---

## Endpoint 5 · List Airports

### Request

```
GET /api/airports
```

### Actual Response (tested live)

```json
{
  "airports": [
    {
      "code": "KUL",
      "IATA": "KUL",
      "country_code": "MY",
      "CC": "MY",
      "tz_offset": 8,
      "coordinates": {
        "lat": 2.7456, "lng": 101.7099,
        "longitude": 101.7099, "latitude": 2.7456
      }
    },
    { "code": "SIN", "IATA": "SIN", "country_code": "SG", "CC": "SG", "tz_offset": 8, ... },
    { "code": "BKK", ... },
    { "code": "CGK", ... },
    { "code": "MNL", ... }
  ]
}
```

### Problems Your BFF Must Fix

| Problem | Detail | Fix |
|---------|--------|-----|
| **No city name** | Only `code` + `country_code` — no airport name, no city name | Enrich from single-airport endpoint or static lookup table |
| **Redundant code** | `code` AND `IATA` same value | Pick one |
| **Redundant country** | `country_code` AND `CC` same value | Pick one |
| **Redundant coords** | `lat`/`latitude`, `lng`/`longitude` duplicated | Pick one pair |

> **Caching strategy**: Cache the full enriched list at startup with 1hr TTL. Airport codes are static — they never change. Pre-fetch all `GET /api/airports/{code}` at startup to get city names for all airports.

---

## Endpoint 6 · Get Single Airport

### Request

```
GET /api/airports/{code}
```

**Example**: `GET /api/airports/KUL`

### Actual Response (tested live)

```json
{
  "code": "KUL",
  "IATA": "KUL",
  "city": "Kuala Lumpur",
  "country_code": "MY",
  "tz_offset": 8,
  "coordinates": {
    "lat": 2.7456, "lng": 101.7099,
    "longitude": 101.7099, "latitude": 2.7456
  }
}
```

> ⚠️ This endpoint includes `city` — the list endpoint does NOT. Classic legacy inconsistency.

### Problems Your BFF Must Fix

| Problem | Detail | Fix |
|---------|--------|-----|
| **No airport name** | Has `city` but no `name` (e.g. "Kuala Lumpur International Airport") | Add from static enrichment table |
| **Inconsistency vs list** | List has no `city`, this has `city` — different shapes for same resource | Unify shape |
| **Redundant code/coords** | Same as list endpoint | Same fix |

---

## The 4 Error Formats You Must Normalize

Tested live across all endpoints:

```json
// Format 1 — /api/v1/flightsearch errors
{ "error": { "message": "...", "code": 400 } }

// Format 2 — /api/v2/offer/{id} errors
{ "errors": [{ "code": "NOT_FOUND", "detail": "Offer invalid_id not found or expired", "status": "404" }] }

// Format 3 — /booking/create errors
{ "fault": { "faultstring": "...", "faultcode": "VALIDATION_ERROR" } }

// Format 4 — /api/v1/reservations/{ref} errors
{ "status": "error", "msg": "Booking INVALID not found" }
```

**Your unified GraphQL error output**:
```json
{
  "errors": [{
    "message": "Human-readable message",
    "extensions": {
      "code": "NOT_FOUND | VALIDATION_ERROR | UPSTREAM_ERROR | RATE_LIMITED",
      "details": [{ "field": "offer_id", "message": "Offer not found or expired" }]
    }
  }]
}
```

---

## Code Enrichment Tables

Your `services/enrichment.py` must map these:

### Airlines
```python
AIRLINE_NAMES = {
    "MH": "Malaysia Airlines",
    "AK": "AirAsia",
    "SQ": "Singapore Airlines",
    "TG": "Thai Airways",
    "GA": "Garuda Indonesia",
    "PR": "Philippine Airlines",
    "CX": "Cathay Pacific",
    "EK": "Emirates",
    "QR": "Qatar Airways",
    "BA": "British Airways",
}
```

### Cabin Classes
```python
CABIN_LABELS = {
    "Y": "Economy",
    "W": "Premium Economy",
    "J": "Business",
    "F": "First",
}
```

### Aircraft
```python
AIRCRAFT_NAMES = {
    "359": "Airbus A350-900",
    "738": "Boeing 737-800",
    "333": "Airbus A330-300",
    "77W": "Boeing 777-300ER",
    "320": "Airbus A320",
    "321": "Airbus A321",
    "789": "Boeing 787-9 Dreamliner",
}
```

### Booking Status
```python
STATUS_LABELS = {
    "HK": "Confirmed",
    "HL": "Waitlisted",
    "UC": "Unable to Confirm",
    "UN": "Unable",
}
```

### Passenger Types
```python
PAX_TYPE_LABELS = {
    "ADT": "Adult",
    "CHD": "Child",
    "INF": "Infant",
}
```

---

## Date Format Parser

All 5 formats found in responses — your normalizer must handle all:

```python
import re
from datetime import datetime, timezone

def normalize_to_iso(value) -> str:
    """Normalize any legacy date format to ISO 8601."""
    if isinstance(value, (int, float)):
        # Unix timestamp: 1778807460
        return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()

    s = str(value).strip()

    # ISO 8601 already: "2026-03-18T10:50:11.838286+00:00"
    if re.match(r'\d{4}-\d{2}-\d{2}T', s):
        return s

    # YYYYMMDDHHMMSS: "20260318091711"
    if re.match(r'^\d{14}$', s):
        return datetime.strptime(s, "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc).isoformat()

    # DD-Mon-YYYY HH:MM AM/PM: "15-May-2026 08:25 AM"
    if re.match(r'\d{2}-[A-Za-z]{3}-\d{4}', s):
        return datetime.strptime(s, "%d-%b-%Y %I:%M %p").replace(tzinfo=timezone.utc).isoformat()

    # DD/MM/YYYY HH:MM: "15/05/2026 08:25"
    if re.match(r'\d{2}/\d{2}/\d{4}', s):
        return datetime.strptime(s, "%d/%m/%Y %H:%M").replace(tzinfo=timezone.utc).isoformat()

    # ISO date only: "2026-05-15"
    if re.match(r'^\d{4}-\d{2}-\d{2}$', s):
        return s

    raise ValueError(f"Unknown date format: {s}")
```

---

## Backend Requirements → Endpoint Mapping

| Backend Requirement | Legacy Endpoints Called | Transformation Needed |
|--------------------|------------------------|-----------------------|
| **B1: Flight Search** | `POST /api/v1/flightsearch` | Flatten 7-level nesting · normalize dates · enrich codes · deduplicate fields · add pagination |
| **B2: Offer Details** | `GET /api/v2/offer/{id}` | Normalize dates (YYYYMMDDHHMMSS + Unix) · enrich codes · deduplicate |
| **B3: Create Booking** | `POST /booking/create` | Validate input · forward · unify response · enrich status/pax-type codes · normalize dates |
| **B4: Retrieve Booking** | `GET /api/v1/reservations/{ref}` | Strip duplicate root key · same as B3 cleanup · **cache this response** |
| **B5: Unified Errors** | All 6 endpoints | Detect all 4 error formats → emit single GraphQL error shape |
| **B6: Resilience** | All 6 endpoints | Tenacity retry on 503/429 · PyBreaker after 5 failures · test with `?simulate_issues=true` |
| **B7: Caching** | `GET /api/airports` + `GET /api/airports/{code}` + `GET /api/v1/reservations/{ref}` | Airports: 1hr TTL · Booking: 5min TTL · Prices: NEVER cache |
| **B8: Airport Enrichment** | `GET /api/airports` → enrich with `GET /api/airports/{code}` | Pre-fetch all airports on startup, merge city names into list |

---

## Caching Strategy (verified from response shapes)

| Data | Cache? | TTL | Invalidation | Reason |
|------|--------|-----|-------------|--------|
| Airport list + city names | ✅ Yes | 1 hour | Time-based | Static IATA data — never changes |
| Airline/aircraft/cabin codes | ✅ Yes | 1 hour | Time-based | Static lookup table — embed in code |
| Flight search results | ❌ No | — | — | Prices change constantly |
| Offer details | ❌ No | — | — | `expires_at` makes caching risky |
| Booking retrieval | ✅ Yes | 5 min | Time-based | Booking data stable; reviewers want to see caching here |

---

## What Good GraphQL Output Looks Like

After your BFF transforms endpoint 1, the GraphQL response should look like this:

```graphql
# Input from consumer
query SearchFlights {
  searchFlights(input: {
    origin: "KUL", destination: "SIN",
    departureDate: "2026-05-15", adults: 1, cabinClass: ECONOMY
  }) {
    offers {
      offerId
      price { amount currency }
      airline { code name }
      cabin
      departure { airport { code name city } time }
      arrival { airport { code name city } time }
      stops
      durationMinutes
      baggage { checked { pieces weightKg } cabin { pieces weightKg } }
      conditions { refundable changeable changePenalty { amount currency } }
      expiresAt
      seatsRemaining
    }
    pageInfo { hasNextPage endCursor }
    totalCount
  }
}
```

**Departure time** → ISO 8601 (normalized from `"15-May-2026 08:25 AM"`)
**Airline code** `"MH"` → `name: "Malaysia Airlines"`
**Cabin code** `"Y"` → `ECONOMY`
**Aircraft** `"359"` → `"Airbus A350-900"`
No redundant fields. No camelCase/snake_case mix. No 7-level nesting.
