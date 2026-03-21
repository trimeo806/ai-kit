# Flight Booking App — Backend Research Overview

*Assessment: FastAPI + Strawberry GraphQL wrapping Legacy mock-travel API · Independent project*

---

## Table of Contents

1. [Project Summary](#1-project-summary)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Architecture](#4-architecture)
5. [GraphQL API Schema](#5-graphql-api-schema)
6. [Legacy API → GraphQL Mapping](#6-legacy-api--graphql-mapping)
7. [Requirements Breakdown](#7-requirements-breakdown)
8. [Key Attention Points](#8-key-attention-points)
9. [Implementation Workflow](#9-implementation-workflow)
10. [Bug-Fixing Workflow](#10-bug-fixing-workflow)
11. [Agents & Skills Map](#11-agents--skills-map)
12. [Hosting & Deployment](#12-hosting--deployment)
13. [Risks & Mitigations](#13-risks--mitigations)

---

## 1. Project Summary

Build a **BFF (Backend-for-Frontend) API** that wraps a messy legacy mock-travel REST API and exposes a clean, well-typed GraphQL interface. The assessment evaluates data transformation quality, resilience patterns, caching strategy, and AI workflow documentation.

| | |
|-|-|
| **Assessment type** | Backend |
| **Framework** | FastAPI + Strawberry GraphQL (Python) |
| **Upstream API** | Legacy mock-travel REST API — `https://mock-travel-api.vercel.app` (Swagger: `/docs`) |
| **Output** | Clean GraphQL BFF — any consumer can query it via GraphiQL or Postman |
| **Time guideline** | 6–8 hours |
| **Deploy** | Google Cloud Run (Docker) |

> This project is **completely independent** from the frontend assessment. The frontend does NOT consume this GraphQL API — it uses Duffel API separately. This BFF is evaluated as a standalone backend product.

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | **FastAPI 0.128+** | Native async (critical for non-blocking upstream calls), ASGI middleware, Pydantic-native validation. **Why not Django?** Django's ORM and admin are irrelevant (no database needed), async support is bolted-on not native, and GraphQL integration requires third-party packages. FastAPI is purpose-built for async API wrappers. *(Verified via context7: 0.128.0)* |
| **GraphQL** | **Strawberry GraphQL 0.282+** | Code-first with `@strawberry.type` decorators, native `GraphQLRouter` for FastAPI (`app.include_router(graphql_app, prefix="/graphql")`), async resolvers, DataLoader for N+1 prevention. *(Verified via context7: 0.282.0)* |
| **Language** | **Python 3.12+** | Type hints, async/await, performance improvements |
| **Validation** | **Pydantic v2** | Input validation for upstream response shapes, 2x faster than v1 |
| **HTTP Client** | **httpx (async)** | HTTP/2 support, async mode, timeout config. Calls the legacy API |
| **Retry/Resilience** | **Tenacity** | Exponential backoff + jitter for 503/429 errors. 3 attempts: 1s → 2s → 4s |
| **Circuit Breaker** | **PyBreaker** | Opens after 5 consecutive failures, resets after 60s. Prevents cascading failures |
| **Caching** | **cachetools (TTLCache)** | In-memory. Airports: 1hr TTL. Airline/aircraft codes: 1hr TTL. Flight prices: NEVER cached |
| **N+1 Prevention** | **DataLoader pattern** | Batch legacy API requests within a single GraphQL resolve cycle |
| **Testing** | **pytest + pytest-httpx** | Async test support, parametrization, mock upstream responses |

### Why GraphQL over REST for the BFF?

| Factor | GraphQL | REST |
|--------|---------|------|
| **Legacy API is deeply nested** | Resolvers flatten per-field — natural fit | Must flatten entire response upfront |
| **Varied data per consumer** | Any consumer queries only what it needs | Separate endpoints or query params for each shape |
| **Documentation** | Schema explorer is self-documenting, always in sync | Swagger/OpenAPI requires maintenance |
| **Consumer autonomy** | Any consumer adds fields without backend changes | New fields = new endpoint or DTO |
| **Assessment impression** | Demonstrates architectural thinking | Expected/safe choice |

**Verdict**: GraphQL is justified — the legacy API's inconsistency makes resolver-level flattening the cleanest approach. Schema explorer auto-documents the API.

### Why Strawberry over alternatives?

| Library | Style | FastAPI Integration | Verdict |
|---------|-------|-------------------|---------|
| **Strawberry** | Code-first, decorators | Native `GraphQLRouter` | **Chosen**. Type-safe, async, Pythonic |
| Ariadne | Schema-first | Mount as ASGI | Good for SDL-first teams |
| Graphene | Code-first (old) | Third-party | Legacy, less maintained |

---

## 3. Repository Structure

```
flight-booking-backend/
├── pyproject.toml
├── requirements.txt
├── Dockerfile
├── app/
│   ├── main.py                  # FastAPI app + Strawberry GraphQLRouter
│   ├── schema/                  # Strawberry types + resolvers (API layer)
│   │   ├── queries.py           # searchFlights, searchAirports, offerDetails, retrieveBooking
│   │   ├── mutations.py         # createBooking
│   │   └── types/
│   │       ├── flight.py        # FlightOffer, Segment, Airport, SearchResult, PageInfo
│   │       ├── booking.py       # BookingConfirmation, BookingSummary
│   │       └── enums.py         # CabinClass, BookingStatus, PassengerType
│   ├── services/                # Business logic, transformation, enrichment
│   │   ├── flight_search.py     # searchFlights resolver logic
│   │   ├── offer_details.py     # offerDetails resolver logic
│   │   ├── booking.py           # createBooking + retrieveBooking logic
│   │   └── enrichment.py        # Code → label maps (airline, cabin, aircraft, status, pax)
│   ├── clients/                 # Upstream legacy API client
│   │   ├── legacy_client.py     # httpx async client + retry + circuit breaker
│   │   └── models/              # Pydantic models for all legacy response shapes
│   │       ├── flight.py        # LegacyFlightSearchResponse, LegacyOffer, etc.
│   │       └── booking.py       # LegacyBookingResponse, LegacyReservation
│   ├── resilience/
│   │   ├── retry.py             # Tenacity config
│   │   └── circuit_breaker.py   # PyBreaker config
│   └── cache/
│       └── ttl_cache.py         # TTLCache instances (airports, codes)
├── tests/
│   ├── test_transformations.py  # Unit tests for date normalization, code enrichment
│   ├── test_resilience.py       # Retry + circuit breaker tests with pytest-httpx
│   └── test_resolvers.py        # GraphQL query tests
├── docs/
│   ├── architecture.md          # Layer diagram, codebase structure, API design decisions
│   ├── resilience.md            # Retry + circuit breaker behavior docs
│   ├── caching.md               # What cached, TTL, invalidation strategy
│   └── ai-workflow.md           # Tools used, prompts, what worked, course corrections
├── .github/workflows/
│   └── deploy.yml               # lint → test → build Docker → deploy Cloud Run
└── README.md                    # Setup instructions
```

**Key rule**: `schema/` never calls `clients/` directly. Always goes through `services/`. This keeps transformation logic testable and swappable.

---

## 4. Architecture

```
┌───────────────────────────┐     ┌────────────────┐
│   Your GraphQL BFF        │     │                │
│   (FastAPI + Strawberry)  │     │  Legacy API    │
│                           │     │  (messy REST)  │
│  Any consumer    ────────▶│────▶│                │
│  (GraphiQL/Postman)       │◀────│  Problems:     │
│                           │     │  • 4-level deep│
│  Transforms:              │     │  • Mixed dates │
│  • Flattens nesting       │     │  • 4 error fmts│
│  • Normalizes dates       │     │  • Cryptic codes│
│  • Enriches codes         │     │  • No pagination│
│  • Unifies errors         │     │  • Redundant   │
│  • Adds pagination        │     │    fields      │
│  • Caches airports        │     │                │
│  • Retries on failures    │     │                │
└───────────────────────────┘     └────────────────┘
         │                              │
    Strawberry GraphQL             httpx (async)
    schema explorer                + Tenacity retry
    (auto-docs)                    + PyBreaker circuit
```

### Layer Separation

```
Request
   ↓
schema/queries.py          # Strawberry resolver — validates input, calls service
   ↓
services/flight_search.py  # Business logic — orchestrates client, cache, enrichment
   ↓
clients/legacy_client.py   # httpx calls with retry + circuit breaker
   ↓
Legacy API

Response
   ↑
clients/models/flight.py   # Pydantic parses raw legacy response
   ↑
services/enrichment.py     # Enrich codes, flatten nesting, normalize dates
   ↑
schema/types/flight.py     # Strawberry types — clean output shape
```

### What is BFF (Backend-for-Frontend)?

A BFF is a backend service designed specifically for one frontend's needs. It shapes data exactly how UI components need it. In this assessment, the BFF wraps the messy legacy API and exposes clean, frontend-friendly GraphQL types.

The assessment evaluates the BFF as a **standalone product** — evaluated independently, not connected to the frontend project.

---

## 5. GraphQL API Schema

### Queries & Mutations

#### `searchFlights` — Query

```graphql
input SearchFlightsInput {
  origin: String!             # Airport code e.g. "KUL"
  destination: String!        # Airport code e.g. "SIN"
  departureDate: String!      # ISO date e.g. "2026-04-15"
  returnDate: String          # Optional for round trips
  adults: Int!
  cabinClass: CabinClass!     # ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
  currency: String
  first: Int                  # Pagination: page size (default 10)
  after: String               # Pagination: cursor
}

type FlightOffer {
  offerId: ID!
  price: Float!
  currency: String!
  airline: String!            # Human-readable: "Malaysia Airlines"
  airlineCode: String!        # IATA code: "MH"
  airlineLogo: String         # URL to airline logo
  cabin: CabinClass!
  departure: DateTime!        # ISO 8601 normalized
  arrival: DateTime!          # ISO 8601 normalized
  departureAirport: Airport!  # Enriched with city name
  arrivalAirport: Airport!    # Enriched with city name
  stops: Int!
  duration: Int!              # Minutes
  segments: [Segment!]!
}

type Airport {
  code: String!
  name: String!
  city: String!
  country: String!
}

type Segment {
  segmentId: ID!
  airline: String!            # Human-readable: "Malaysia Airlines"
  airlineCode: String!        # "MH"
  flightNumber: String!       # "MH 123"
  aircraft: String!           # Human-readable: "Boeing 737-800"
  aircraftCode: String!       # "738"
  departure: DateTime!
  arrival: DateTime!
  departureAirport: Airport!
  arrivalAirport: Airport!
  duration: Int!              # Minutes
  cabin: CabinClass!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}

type SearchResult {
  offers: [FlightOffer!]!
  totalCount: Int!
  pageInfo: PageInfo!         # Cursor-based pagination (BFF-implemented)
}
```

#### `searchAirports` — Query

```graphql
type Query {
  searchAirports(query: String!): [Airport!]!
}
```

Searches the cached airport list by code, name, or city.

#### `offerDetails` — Query

```graphql
type OfferDetails {
  offerId: ID!
  flights: [FlightOffer!]!
  fareRules: FareRules!
  baggage: BaggageAllowance!
  policies: ChangeRefundPolicy!
  validUntil: DateTime!
}

type FareRules {
  description: String
  refundable: Boolean!
  changeable: Boolean!
}

type BaggageAllowance {
  cabin: String
  checked: String
}

type ChangeRefundPolicy {
  changeFee: Float
  refundFee: Float
  changeAllowed: Boolean!
  refundAllowed: Boolean!
}
```

#### `createBooking` — Mutation

```graphql
input CreateBookingInput {
  offerId: ID!
  passengers: [PassengerInput!]!
  contactEmail: String!
  contactPhone: String!
}

input PassengerInput {
  title: String!
  firstName: String!
  lastName: String!
  dateOfBirth: String!     # ISO date
  nationality: String!
  passportNumber: String!
  passportExpiry: String!  # ISO date
  email: String!
  phone: String!
  type: PassengerType!     # ADULT, CHILD, INFANT
}

type BookingConfirmation {
  bookingReference: String!
  pnr: String!
  status: BookingStatus!   # CONFIRMED, WAITLISTED, etc.
  summary: BookingSummary!
}

type BookingSummary {
  totalPrice: Float!
  currency: String!
  passengers: [Passenger!]!
  flights: [FlightOffer!]!
}
```

#### `retrieveBooking` — Query

```graphql
type Booking {
  bookingReference: String!
  pnr: String!
  status: BookingStatus!
  passengers: [Passenger!]!
  flights: [FlightOffer!]!
  totalPrice: Float!
  currency: String!
  bookedAt: DateTime!
}
```

### Enums

```graphql
enum CabinClass {
  ECONOMY
  PREMIUM_ECONOMY
  BUSINESS
  FIRST
}

enum BookingStatus {
  CONFIRMED
  WAITLISTED
  UNABLE_TO_CONFIRM
  UNABLE
}

enum PassengerType {
  ADULT
  CHILD
  INFANT
}
```

### Unified Error Format

All errors returned via GraphQL `extensions` — consumers handle one shape only:

```json
{
  "errors": [{
    "message": "Human-readable error message",
    "extensions": {
      "code": "VALIDATION_ERROR",
      "details": [{ "field": "email", "message": "Invalid email format" }]
    }
  }]
}
```

| Error Code | When |
|-----------|------|
| `VALIDATION_ERROR` | Invalid input (passenger details, search params) |
| `NOT_FOUND` | Offer or booking reference doesn't exist |
| `UPSTREAM_ERROR` | Legacy API is down or timed out (after retries exhausted) |
| `RATE_LIMITED` | Too many requests (after retry backoff exhausted) |

---

## 6. Legacy API → GraphQL Mapping

> Legacy API base: `https://mock-travel-api.vercel.app` · Swagger: `/docs`
> Use `?simulate_issues=true` to test resilience patterns (develop in stable mode first).

### Endpoint → Resolver Mapping

| Legacy Endpoint | GraphQL Resolver | Transformation Required |
|----------------|-----------------|------------------------|
| `POST /api/v1/flightsearch` | `searchFlights` | Flatten 7-level nesting, normalize 3 date formats, enrich codes, add BFF pagination, strip redundant fields |
| `GET /api/v2/offer/{id}` | `offerDetails` | Normalize YYYYMMDDHHMMSS dates, enrich all codes, flatten fare rules |
| `POST /booking/create` | `createBooking` | Pick canonical field names (strip duplicates: `booking_ref`/`BookingReference`), decode status `HK` → `CONFIRMED` |
| `GET /api/v1/reservations/{ref}` | `retrieveBooking` | Strip duplicated objects (`data.reservation` AND `data.Reservation`), enrich all codes |
| `GET /api/airports` | `searchAirports` + startup cache | Merge city names from detail endpoint (list omits city) |
| `GET /api/airports/{code}` | startup enrichment only | Source of city name for airport cache |

### Data Transformation Requirements

#### Date Normalization (`normalize_to_iso()`)

The legacy API uses 5 different date formats — all must output ISO 8601:

```python
import re
from datetime import datetime

def normalize_to_iso(value: str | int) -> str:
    if isinstance(value, int):
        # Unix timestamp
        return datetime.utcfromtimestamp(value).isoformat() + "Z"

    v = str(value).strip()

    # ISO 8601 already
    if re.match(r'\d{4}-\d{2}-\d{2}T', v):
        return v

    # YYYYMMDDHHMMSS → "20260318091711"
    if re.match(r'^\d{14}$', v):
        return datetime.strptime(v, "%Y%m%d%H%M%S").isoformat() + "Z"

    # DD-Mon-YYYY → "18-Mar-2026"
    if re.match(r'^\d{2}-[A-Za-z]{3}-\d{4}$', v):
        return datetime.strptime(v, "%d-%b-%Y").isoformat() + "Z"

    # DD/MM/YYYY HH:MM → "18/03/2026 09:17"
    if re.match(r'^\d{2}/\d{2}/\d{4} \d{2}:\d{2}$', v):
        return datetime.strptime(v, "%d/%m/%Y %H:%M").isoformat() + "Z"

    raise ValueError(f"Unrecognized date format: {v!r}")
```

#### Code Enrichment Tables

```python
AIRLINE_NAMES = {
    "MH": "Malaysia Airlines",
    "AK": "AirAsia",
    "SQ": "Singapore Airlines",
    "TG": "Thai Airways",
    "CX": "Cathay Pacific",
    "GA": "Garuda Indonesia",
    "PR": "Philippine Airlines",
    "VN": "Vietnam Airlines",
}

CABIN_LABELS = {
    "Y": "Economy",
    "W": "Premium Economy",
    "J": "Business",
    "C": "Business",   # some carriers use C
    "F": "First",
}

AIRCRAFT_NAMES = {
    "738": "Boeing 737-800",
    "789": "Boeing 787-9",
    "359": "Airbus A350-900",
    "333": "Airbus A330-300",
    "320": "Airbus A320",
    "321": "Airbus A321",
}

STATUS_LABELS = {
    "HK": "CONFIRMED",
    "WL": "WAITLISTED",
    "UN": "UNABLE_TO_CONFIRM",
    "NO": "UNABLE",
}

PAX_TYPE_LABELS = {
    "ADT": "ADULT",
    "CHD": "CHILD",
    "INF": "INFANT",
}
```

#### Error Format Unification

The legacy API returns 4 different error shapes. All must be normalized:

```python
def parse_legacy_error(response_body: dict) -> dict:
    # Format 1: {"error": "message"}
    if "error" in response_body and isinstance(response_body["error"], str):
        return {"code": "UPSTREAM_ERROR", "message": response_body["error"]}

    # Format 2: {"errors": [{"message": "...", "field": "..."}]}
    if "errors" in response_body and isinstance(response_body["errors"], list):
        first = response_body["errors"][0]
        return {"code": "VALIDATION_ERROR", "message": first.get("message", "Validation failed"),
                "details": response_body["errors"]}

    # Format 3: {"fault": {"faultstring": "...", "detail": {"errorcode": "..."}}}
    if "fault" in response_body:
        fault = response_body["fault"]
        return {"code": "UPSTREAM_ERROR", "message": fault.get("faultstring", "Unknown fault")}

    # Format 4: {"status": 422, "msg": "..."}
    if "status" in response_body and "msg" in response_body:
        return {"code": "VALIDATION_ERROR", "message": response_body["msg"]}

    return {"code": "UPSTREAM_ERROR", "message": "Unknown upstream error"}
```

#### Field Deduplication — `POST /booking/create` response

The legacy booking response has redundant fields — pick one canonical name:

| Legacy field (keep) | Legacy duplicate (strip) | GraphQL field |
|--------------------|------------------------|---------------|
| `booking_ref` | `BookingReference` | `bookingReference` |
| `pnr` | `PNR` | `pnr` |
| `first_name` | `FirstName` | `firstName` |
| `status` (`"HK"`) | — | `status` (`"CONFIRMED"` via STATUS_LABELS) |

#### Nested → Flat: `POST /api/v1/flightsearch` response

Legacy path to airport code (7 levels deep):
```
data.flight_results.outbound.results[].segments.segment_list[].leg_data[].departure_info.airport.code
```

Your GraphQL output:
```graphql
departureAirport { code city name country }
```

#### Pagination on Unpaginated Upstream

The legacy API returns all results at once. BFF adds cursor-based pagination:

1. Receive all results from legacy API
2. Sort by requested field (price, departure, etc.)
3. Generate cursor = `base64(index_position)`
4. Return `first` N items after the `after` cursor
5. Set `hasNextPage = True` if more remain
6. Cache full result set for 30s (keyed by search params) — subsequent page requests don't re-call legacy API

#### Airport City Name Merge

The `GET /api/airports` list endpoint omits `city_name`. The `GET /api/airports/{code}` detail endpoint includes it. Strategy:

1. At startup: fetch `GET /api/airports` → get list of all airport codes
2. For each code: fetch `GET /api/airports/{code}` → get city name
3. Build enriched airport dict: `{code: {name, city, country}}` → store in TTLCache (1hr)
4. All resolvers use this cache — never call `/api/airports` per-request

---

### Resilience Patterns

#### Tenacity Retry

```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import httpx

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=4),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.HTTPStatusError))
)
async def call_legacy_api(endpoint: str, **kwargs):
    response = await client.get(endpoint, **kwargs)
    if response.status_code in (429, 503):
        response.raise_for_status()   # triggers retry
    return response
```

Behavior: attempt 1 immediately → wait 1s → attempt 2 → wait 2s → attempt 3 → wait 4s → raise

#### PyBreaker Circuit Breaker

```python
import pybreaker

legacy_breaker = pybreaker.CircuitBreaker(
    fail_max=5,       # open after 5 consecutive failures
    reset_timeout=60  # try again after 60s
)

@legacy_breaker
async def call_with_breaker(endpoint: str):
    return await call_legacy_api(endpoint)
```

States: **Closed** (normal) → 5 failures → **Open** (fast-fail, no upstream calls) → 60s → **Half-Open** (test 1 request) → success → **Closed**

#### Testing Resilience

```bash
# Test with simulate_issues=true — legacy API randomly injects errors
GET https://mock-travel-api.vercel.app/api/v1/flightsearch?simulate_issues=true

# Verify:
# 1. Retry fires on 503
# 2. Circuit opens after 5 failures
# 3. Correct error returned when circuit is open (UPSTREAM_ERROR, not timeout)
```

---

### Caching Strategy

| Data | Cache | TTL | Invalidation |
|------|-------|-----|-------------|
| Airport list (enriched) | TTLCache | 1 hour | Expiry only — airports don't change |
| Airline/aircraft code maps | TTLCache | 1 hour | Expiry only — static enrichment data |
| Search results (for pagination) | TTLCache | 30 seconds | Expiry only — keyed by search params |
| Booking reservations | TTLCache | 5 minutes | Expiry only — booking status can change |
| **Flight prices** | **NEVER** | — | Prices change constantly — never cache |

---

## 7. Requirements Breakdown

| # | Requirement | Details | Priority |
|---|------------|---------|----------|
| B1 | **Flight Search** | Accept simple query → call legacy API → return flat, lean, paginated results with airline names (not codes), consistent dates | Must Have |
| B2 | **Offer Details** | Enrich with fare rules, baggage, policies. Transform all codes → labels | Must Have |
| B3 | **Create Booking** | Validate passenger input → forward to legacy API → return clean confirmation | Must Have |
| B4 | **Retrieve Booking** | Fetch by reference → return clean summary. Demonstrate caching | Must Have |
| B5 | **Unified Error Format** | Normalize 4 upstream error shapes → 1 consistent GraphQL error format | Must Have |
| B6 | **Resilience** | Retry (Tenacity) + circuit breaker (PyBreaker). Demo with `?simulate_issues=true` | Must Have |
| B7 | **Caching** | Airports + airline codes cached (TTL). Prices never cached. Document invalidation strategy | Must Have |
| B8 | **API Documentation** | GraphQL schema explorer (auto-generated by Strawberry at `/graphql`) | Must Have |

### Documentation Requirements

| # | Document | Content |
|---|---------|---------|
| D1 | **Architecture** | Layer diagram, codebase structure, why GraphQL, why FastAPI over Django |
| D2 | **Resilience** | Retry + circuit breaker behavior, `?simulate_issues=true` test results |
| D3 | **Caching** | What cached, TTL values, invalidation reasoning, measurable improvement |
| D4 | **AI Workflow** | Tools used, prompts that worked, what didn't, where you course-corrected. **This is a core deliverable, not an afterthought** |
| D5 | **Setup Instructions** | Prerequisites, local run, Docker build, env vars |

---

## 8. Key Attention Points

### What Will Differentiate You

1. **Data transformation quality** — The legacy API's deeply nested, inconsistent responses are THE test. Clean flattening with proper code enrichment is what they evaluate most
2. **End-to-end flow over perfection** — "Complete search-to-booking pipeline beats a half-finished API with perfect retry logic"
3. **AI workflow documentation is core** — "This is a core part of the role." Document prompts, tools, what worked, where you course-corrected. Write it AS you work, not after
4. **Git history** — Commit early and often. Each meaningful step should be its own commit

### Legacy API Gotchas

| Issue | What You'll Encounter | Your BFF Must... |
|-------|----------------------|-----------------|
| **4 error formats** | `{"error": ...}`, `{"errors": [...]}`, `{"fault": ...}`, `{"status": ..., "msg": ...}` | Detect and normalize all 4 → one GraphQL error shape |
| **5 date formats** | ISO 8601, Unix epoch, DD/MM/YYYY HH:MM, YYYYMMDDHHMMSS, DD-Mon-YYYY | Parse all → output ISO 8601 consistently |
| **Cryptic codes** | MH (airline), Y (cabin), 738 (aircraft), HK (status), ADT (pax type) | Map to: "Malaysia Airlines", "Economy", "Boeing 737-800", "CONFIRMED", "ADULT" |
| **Nesting depth** | Airport code 7 levels deep | Flatten to: `departure_airport { code city name country }` |
| **Redundant fields** | `offer_id`/`offerId`, `total`/`total_amount`/`totalAmountDecimal`, `booking_ref`/`BookingReference` | Pick one canonical name, strip duplicates |
| **Airport list missing city** | `GET /api/airports` has no `city_name`; `GET /api/airports/{code}` has it | Pre-fetch all detail at startup, merge into cache |
| **Duplicated objects** | `GET /api/v1/reservations/{ref}` returns `data.reservation` AND `data.Reservation` | Pick one (lowercase canonical), ignore the other |

### Common Pitfalls

| Pitfall | Prevention |
|---------|------------|
| Designing transformations from Swagger docs alone | Test every endpoint manually first — live responses differ from docs |
| Skipping `?simulate_issues=true` testing | Test resilience before submission — unproven retry logic doesn't count |
| Over-engineering retry | Simple 3-retry with backoff is sufficient. Complete pipeline > perfect retry |
| Writing AI workflow docs last | Write prompts and decisions in `docs/ai-workflow.md` as you go |
| Caching flight prices | Prices change constantly — only cache airports and code maps |

---

## 9. Implementation Workflow

```
B1 — Foundation (1 hr)
  └→ Manually test ALL 6 legacy endpoints (Swagger at /docs)
  └→ Record actual response shapes (differ from Swagger)
  └→ Init FastAPI + Strawberry + Pydantic project
  └→ Set up Dockerfile for local dev
  └→ Git init, first commit

B2 — BFF Core (4 hrs)           ← architecture gate first (see below)
  └→ Pydantic models for all legacy response shapes (clients/models/)
  └→ Strawberry types (schema/types/)
  └→ Date normalizer: normalize_to_iso() — covers all 5 formats
  └→ Code enrichment: AIRLINE_NAMES, CABIN_LABELS, AIRCRAFT_NAMES, STATUS_LABELS, PAX_TYPE_LABELS
  └→ Error unifier: parse_legacy_error() — handles all 4 formats
  └→ Airport cache: startup pre-fetch + merge city names
  └→ Implement resolvers: searchFlights, searchAirports, offerDetails, createBooking, retrieveBooking
  └→ BFF pagination: cursor-based on top of unpaginated upstream

B3 — Resilience + Tests (2 hrs)
  └→ Tenacity retry: 3 attempts, exponential backoff + jitter
  └→ PyBreaker circuit breaker: open after 5 failures, reset 60s
  └→ Test with ?simulate_issues=true
  └→ pytest suite: transformations, error handling, resilience

B4 — Deploy + Docs (1 hr)
  └→ Docker build + Google Cloud Run deploy
  └→ GitHub Actions: lint → test → build → deploy
  └→ docs/architecture.md, docs/resilience.md, docs/caching.md
  └→ docs/ai-workflow.md (built up throughout)
  └→ README setup instructions
```

**Architecture gate before B2**: `backend-architect` produces GraphQL schema + layer design, presents to user for approval before implementation begins.

### Phase Task Checklist

#### B1 — Foundation

- [ ] Manually test `POST /api/v1/flightsearch` — record actual response shape (note 7-level nesting)
- [ ] Test `GET /api/v2/offer/{id}` — note YYYYMMDDHHMMSS date format for `created_at`
- [ ] Test `POST /booking/create` — note duplicate field pairs (`booking_ref`/`BookingReference`)
- [ ] Test `GET /api/v1/reservations/{ref}` — note duplicated `reservation`/`Reservation` objects
- [ ] Test `GET /api/airports` and `GET /api/airports/{code}` — note city name inconsistency
- [ ] Test all 4 error formats (invalid input, missing resource, etc.)
- [ ] `pip install fastapi strawberry-graphql pydantic httpx tenacity pybreaker cachetools uvicorn`
- [ ] `app/main.py` — FastAPI app with `GraphQLRouter` at `/graphql`
- [ ] `Dockerfile` — Python 3.12, uvicorn, health check
- [ ] `git init && git commit -m "chore: init FastAPI + Strawberry project"`

#### B2 — BFF Core

- [ ] `clients/models/flight.py` — Pydantic models matching actual legacy response shapes (not Swagger)
- [ ] `clients/legacy_client.py` — httpx async client with timeout config
- [ ] `cache/ttl_cache.py` — TTLCache instances for airports (1hr) and codes (1hr)
- [ ] `services/enrichment.py` — all 5 code maps + `normalize_to_iso()` + `parse_legacy_error()`
- [ ] Airport startup pre-fetch: call `/api/airports`, then each `/api/airports/{code}` for city names
- [ ] `schema/types/flight.py` — Strawberry FlightOffer, Segment, Airport, SearchResult, PageInfo
- [ ] `schema/types/booking.py` — BookingConfirmation, BookingSummary
- [ ] `schema/types/enums.py` — CabinClass, BookingStatus, PassengerType
- [ ] `services/flight_search.py` — call legacy, parse, enrich, paginate
- [ ] `schema/queries.py` — `searchFlights` + `searchAirports` resolvers
- [ ] `services/offer_details.py` — call `/api/v2/offer/{id}`, enrich, flatten
- [ ] `schema/queries.py` — `offerDetails` resolver
- [ ] `services/booking.py` — `createBooking` + `retrieveBooking`
- [ ] `schema/mutations.py` + `schema/queries.py` — booking resolvers
- [ ] `schema/queries.py` — unified error handling in all resolvers

#### B3 — Resilience + Tests

- [ ] `resilience/retry.py` — Tenacity decorator: 3 attempts, exponential 1s → 2s → 4s, jitter
- [ ] `resilience/circuit_breaker.py` — PyBreaker: open after 5 failures, reset 60s
- [ ] Apply retry + circuit breaker to `legacy_client.py`
- [ ] Test `?simulate_issues=true`: verify retry fires, circuit opens correctly
- [ ] `tests/test_transformations.py` — unit test all 5 date formats, all code maps, all 4 error formats
- [ ] `tests/test_resilience.py` — pytest-httpx mocks for retry + circuit breaker behavior
- [ ] `tests/test_resolvers.py` — GraphQL query tests with mocked legacy client

#### B4 — Deploy + Docs

- [ ] `docker build -t flight-booking-backend .` — verify local build
- [ ] Deploy to Cloud Run: `gcloud run deploy`
- [ ] GitHub Actions: `.github/workflows/deploy.yml` — lint → pytest → docker build → cloud run deploy
- [ ] `docs/architecture.md` — layer diagram, why GraphQL, why FastAPI, codebase walkthrough
- [ ] `docs/resilience.md` — retry behavior table, circuit breaker state diagram, `?simulate_issues=true` results
- [ ] `docs/caching.md` — what cached, TTL values, why prices not cached, invalidation strategy
- [ ] `docs/ai-workflow.md` — complete log of AI tools used, prompts, what worked, course corrections
- [ ] `README.md` — prerequisites, `pip install -r requirements.txt`, env vars, `uvicorn app.main:app`

---

## 10. Bug-Fixing Workflow

### Bug-Fix Decision Tree

```
Bug Detected
    │
    ├─ Build/type error? ──→ Fix inline (mypy, ruff)
    │
    ├─ Runtime crash? ──→ Reproduce → Diagnose (logs/stack trace) → Fix
    │                     Agent: debugger
    │
    ├─ GraphQL field returns null? ──→ Check Strawberry field names match resolver
    │                                  Agent: backend-developer
    │
    ├─ Date shows "Invalid Date"? ──→ Add format to normalize_to_iso(), test all 6 patterns
    │                                  Agent: backend-developer
    │
    └─ Flaky pytest? ──→ Check pytest-httpx mock matches actual URL pattern
                         Agent: tester
```

### Common Bug Patterns

| Bug | Likely Cause | Fix |
|-----|-------------|-----|
| GraphQL field returns `null` | Strawberry field name mismatch with resolver return key | Check `@strawberry.field` names match dict keys |
| "Invalid Date" in response | Legacy API returned unexpected date format | Add format to `normalize_to_iso()`, test all 5 |
| Airport combobox (consumer side) shows codes not names | Airport cache not populated at startup | Ensure `startup` event populates TTLCache before first request |
| Booking mutation fails silently | Pydantic ValidationError not caught by error unifier | Add `except ValidationError` in error handler |
| Circuit breaker opens too early | Test mode hitting `?simulate_issues=true` permanently | Develop in stable mode first, test resilience last |
| CORS error from browser | Missing CORS middleware | `app.add_middleware(CORSMiddleware, allow_origins=["*"])` |
| Pagination cursor wrong page | `base64(index)` cursor decoding off-by-one | Test with `first=2&after=cursor` stepping through results |
| Legacy error format 4 not caught | `"status"` key collision with HTTP status | Check for `"msg"` alongside `"status"` before falling through |

### Bug Priority

| Priority | Type | Action |
|----------|------|--------|
| **P0** | GraphQL endpoint unreachable, app won't start | Fix immediately |
| **P1** | One resolver broken, transformation wrong | Fix within current phase |
| **P2** | Pagination off-by-one, minor enrichment gap | Fix in Tests phase |
| **P3** | Missing code in enrichment map, edge-case date | Note in "What I'd improve" doc |

---

## 11. Agents & Skills Map

| Phase | Agent | Skills | Handoffs |
|-------|-------|--------|----------|
| **B1 — Foundation** | `developer` | `fastapi-python`, `infra-docker` | → `backend-architect` for architecture gate |
| **B2 — BFF Core** | `backend-developer` | `fastapi-python`, `api-designer`, `graphql-architect`, `error-recovery` | → `code-reviewer` after each resolver group |
| **B3 — Resilience + Tests** | `backend-developer` | `fastapi-python`, `error-recovery`, `sequential-thinking` | → `tester` for verification |
| **B4 — Deploy + Docs** | `devops-engineer` | `infra-docker`, `infra-cloud` | → `security-auditor` for secrets review |

**Architecture gate** (before B2): `backend-architect` → `api-designer`, `architecture-designer`, `graphql-architect` → produces GraphQL schema design, layer separation, caching strategy. Wait for user approval before dispatching `backend-developer`.

**On-demand agents**:

| Agent | When |
|-------|------|
| `debugger` | Runtime errors, unexpected legacy API behavior |
| `researcher` | Unfamiliar Tenacity/PyBreaker pattern, Strawberry DataLoader question |
| `code-reviewer` | After each resolver group is complete |
| `security-auditor` | Before deployment — verify no secrets in code |

---

## 12. Hosting & Deployment

| | Platform | Reason |
|-|----------|--------|
| **Backend** | **Google Cloud Run** | 2M requests/month free, scale-to-zero with no auto-sleep penalty, Docker-based. $0/month |
| **CI/CD** | **GitHub Actions** | Unlimited minutes on public repos |

### Why Cloud Run over alternatives?

| Alternative | Issue |
|-------------|-------|
| Render | Auto-sleeps after 15 min → 10s cold start on reviewer's visit |
| Railway | Free tier discontinued |
| Fly.io | Requires $5/month credit card |

### Environment Variables

| Where | Variable | Value |
|-------|---------|-------|
| `.env` (local dev, gitignored) | `LEGACY_API_BASE_URL` | `https://mock-travel-api.vercel.app` |
| Cloud Run deploy | `LEGACY_API_BASE_URL` | `https://mock-travel-api.vercel.app` |
| GitHub Actions Secrets | Any sensitive vars | Encrypted, masked in logs |

### Deployment Checklist

- [ ] `docker build` passes locally
- [ ] `pytest` passes locally
- [ ] Push to GitHub → GitHub Actions runs lint + test + build
- [ ] Deploy to Cloud Run: verify `/graphql` endpoint accessible
- [ ] Verify GraphQL schema explorer loads at `/graphql`
- [ ] Add deployed URL to README

---

## 13. Risks & Mitigations

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | **Time overrun** | "Complete search-to-booking pipeline > perfect retry logic on one endpoint." Cut edge cases before cutting core flow |
| 2 | **Legacy API surprises** | Test every endpoint manually before designing. Don't trust Swagger docs alone |
| 3 | **GraphQL setup overhead** | Offset by zero-maintenance docs (schema explorer) and architectural demonstration |
| 4 | **Over-engineering retry** | Simple 3-retry with backoff is sufficient. Move on |
| 5 | **Documentation rushed** | Write `docs/ai-workflow.md` entries as you work. Keep a running decisions log |
| 6 | **Cold start on Cloud Run** | 1-2s acceptable. Add `GET /health` endpoint for reviewer to warm up |
| 7 | **`?simulate_issues=true` breaks dev** | Develop in stable mode. Only enable simulate_issues for resilience testing in B3 |

---

## Quick Reference

```
PROJECT:   FastAPI + Strawberry GraphQL — Legacy API BFF
STACK:     FastAPI 0.128+ · Strawberry 0.282+ · Python 3.12+ · Pydantic v2
           httpx (async) · Tenacity · PyBreaker · cachetools · pytest + pytest-httpx
UPSTREAM:  https://mock-travel-api.vercel.app  (Swagger: /docs)
GRAPHQL:   POST /graphql  (schema explorer at GET /graphql)
DEPLOY:    Google Cloud Run + GitHub Actions
REPO:      flight-booking-backend (separate from frontend)

VERSIONS (verified via context7, 2026-03-18):
  FastAPI 0.128.0 · Strawberry 0.282.0

RESOLVERS:
  searchFlights(input: SearchFlightsInput!): SearchResult!
  searchAirports(query: String!): [Airport!]!
  offerDetails(offerId: ID!): OfferDetails!
  createBooking(input: CreateBookingInput!): BookingConfirmation!  [mutation]
  retrieveBooking(reference: String!): Booking!

LEGACY ENDPOINTS USED:
  POST /api/v1/flightsearch       → searchFlights
  GET  /api/v2/offer/{id}         → offerDetails
  POST /booking/create            → createBooking
  GET  /api/v1/reservations/{ref} → retrieveBooking
  GET  /api/airports              → airport cache (startup)
  GET  /api/airports/{code}       → airport city name enrichment (startup)

TRANSFORMATIONS:
  5 date formats → ISO 8601 (normalize_to_iso)
  4 error formats → 1 GraphQL error shape (parse_legacy_error)
  Codes → Labels (AIRLINE_NAMES, CABIN_LABELS, AIRCRAFT_NAMES, STATUS_LABELS, PAX_TYPE_LABELS)
  7-level nesting → flat GraphQL types
  Unpaginated upstream → cursor-based BFF pagination
```
