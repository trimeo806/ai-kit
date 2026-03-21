# Duffel API Exploration — Frontend Phase F0

*Token validated · All endpoints tested live · Response shapes documented*

---

## Data Model — Key Concepts

Understanding these five building blocks is required before reading the API sections below.

| Concept | What it is |
|---------|-----------|
| **Offer Request** | The search query — describes passengers + one or more slices (where/when to fly) |
| **Slice** | One leg of a journey between an origin and destination (identified by IATA code) |
| **Segment** | An individual flight within a slice. Direct = 1 segment. With connections = multiple segments |
| **Offer** | A bundle of flights from one airline at a specific price, returned in response to an offer request |
| **Order** | The confirmed booking created after selecting an offer and providing passenger + payment details |

### Trip Type → Slice/Segment Structure

| Trip type | Slices | Segments per slice | Example |
|-----------|--------|-------------------|---------|
| One-way direct | 1 | 1 | LHR → JFK (BA117) |
| One-way indirect | 1 | 2+ | LHR → BOS → LGA (VS4011 + VS3277) |
| Return direct | 2 | 1 each | LGW → YYZ (WS4) + YYZ → LGW (WS3) |
| Return indirect | 2 | 1 outbound + 2+ return | LHR → YYZ (AC869) + YYZ → ORD → LHR (AC509 + AC5364) |
| Multi-city | 3+ | 1+ each | LON→JFK + NYC→SFO + SFO→LON |

> **Connections vs stops**: `segments.length - 1` = number of connections (layovers). `segment.stops[]` = technical stops where the plane lands but passengers stay aboard — these are rare and different from connections.

> **IATA code types**: `origin`/`destination` accept both airport codes (`LHR`, `KUL`) and city codes (`LON`, `NYC`). The Places suggestions endpoint returns both types — use `iata_code` from whichever result the user selects.

> **Ordering**: All slices and segments in every response are sorted chronologically by departure time.

---

## Token & Auth

| | |
|-|-|
| **Token** | `duffel_test_eyMbgtLMAEeqth9iBBBWvqCv3IUPz_lyNKidLvFZf5I` |
| **Mode** | Test (`live_mode: false`) — free bookings via Duffel Airways |
| **Base URL** | `https://api.duffel.com` |
| **Required headers** | `Authorization: Bearer <token>` · `Duffel-Version: v2` · `Accept: application/json` |
| **Status** | ✅ WORKING |

> **Security rule**: Token goes in Next.js API routes only (server-side). Never `NEXT_PUBLIC_`. Never in client components.

---

## API → Feature Map

| Frontend Screen | Feature | Duffel Endpoint |
|----------------|---------|-----------------|
| **F1 Search** | Airport combobox auto-suggest | `GET /places/suggestions?query=` |
| **F1 Search** | Submit search form | `POST /air/offer_requests?return_offers=false` |
| **F2 Results** | Load paginated offers | `GET /air/offers?offer_request_id=&limit=&sort=&after=` |
| **F2 Results** | User selects a flight | `GET /air/offers/{offer_id}` |
| **F3 Passenger** | (no API — form only) | — |
| **F4 Confirmation** | Submit booking | `POST /air/orders` |
| **F4 Confirmation** | Display confirmation | `GET /air/orders/{order_id}` |

---

## F1 — Search Screen

### API 1 · Airport Auto-Suggest

**Trigger**: User types in origin or destination field (debounce 300ms, min 2 chars)

```
GET /places/suggestions?query={userInput}
```

**Actual response** (tested with "london"):
```json
{
  "data": [{
    "city_name": null,
    "airports": [{
      "id": "arp_ltn_gb",
      "iata_code": "LTN",
      "name": "London Luton Airport",
      "city_name": "London",
      "iata_city_code": "LON",
      "iata_country_code": "GB",
      "latitude": 51.875482,
      "longitude": -0.37004,
      "time_zone": "Europe/London",
      "type": "airport"
    }]
  }]
}
```

**What to display in combobox**: `LTN — London Luton Airport · London, GB`

**What to store on select** (Zustand):
```typescript
{ iata_code: "LTN", name: "London Luton Airport", city_name: "London", iata_country_code: "GB" }
```

---

### API 2 · Create Offer Request (on Search submit)

**Trigger**: User clicks "Search flights"

```
POST /air/offer_requests?return_offers=false
Content-Type: application/json
```

> **Why `return_offers=false`?** Tested live: one-way returns 47 offers inline, round-trip returns **1,638 offers** — too large a payload. Async mode returns only the `orq_` ID, then we paginate separately.

**One-way payload**:
```json
{
  "data": {
    "cabin_class": "economy",
    "slices": [
      { "origin": "KUL", "destination": "SIN", "departure_date": "2026-05-15" }
    ],
    "passengers": [
      { "type": "adult" },
      { "type": "adult" }
    ]
  }
}
```

**Round-trip payload** (2 slices):
```json
{
  "data": {
    "cabin_class": "economy",
    "slices": [
      { "origin": "KUL", "destination": "SIN", "departure_date": "2026-05-15" },
      { "origin": "SIN", "destination": "KUL", "departure_date": "2026-05-20" }
    ],
    "passengers": [{ "type": "adult" }]
  }
}
```

**Multi-city payload** (3+ slices):
```json
{
  "data": {
    "cabin_class": "economy",
    "slices": [
      { "origin": "LON", "destination": "JFK", "departure_date": "2026-05-01" },
      { "origin": "NYC", "destination": "SFO", "departure_date": "2026-05-04" },
      { "origin": "SFO", "destination": "LON", "departure_date": "2026-05-08" }
    ],
    "passengers": [{ "type": "adult" }]
  }
}
```

> **City vs airport codes**: `origin`/`destination` accept both — `"LON"` (city, matches all London airports) or `"LHR"` (specific airport). Use whichever `iata_code` the Places suggestion returns.

**Cabin class values**: `economy` · `premium_economy` · `business` · `first`

**Passenger types**: `adult` · `child` · `infant_without_seat`

**Actual response**:
```json
{
  "data": {
    "id": "orq_0000B4NPqcQH1F9SaAwguI",
    "cabin_class": "economy",
    "passengers": [
      { "id": "pas_0000B4NPfY7Rjtyzn8v5k0", "type": "adult" }
    ],
    "slices": [...],
    "live_mode": false
  }
}
```

**Save to Zustand** (critical — needed for booking):
```typescript
offerRequestId = "orq_xxx"
passengerIds   = ["pas_xxx"]   // ⚠️ MUST use these IDs in POST /air/orders
```

**After success**: `router.push('/results?orq=orq_xxx')`

---

## F2 — Results Listing Screen

### API 3 · List Offers (paginated)

**Trigger**: Results page mounts · "Load more" click · sort change

```
GET /air/offers?offer_request_id=orq_xxx&limit=20&sort=total_amount&after={cursor}
```

| Param | Values | Notes |
|-------|--------|-------|
| `offer_request_id` | `orq_xxx` from Zustand | Required |
| `limit` | `20`–`50` | Page size |
| `sort` | `total_amount` \| `total_duration` | Server-side sort only |
| `after` | cursor from `meta.after` | Next page |

> **Filtering is client-side only** — Duffel has no filter query params. Fetch `limit=50` and filter by stops/airline/departure-time in the browser.

**Actual response**:
```json
{
  "meta": { "limit": 20, "after": "g2EC", "before": null },
  "data": [{
    "id": "off_0000B4NPdqJZtilPhAnevS",
    "total_amount": "46.41",
    "total_currency": "EUR",
    "base_amount": "39.34",
    "tax_amount": "7.09",
    "expires_at": "2026-03-18T09:19:27Z",
    "owner": {
      "name": "British Airways",
      "iata_code": "BA",
      "logo_symbol_url": "https://assets.duffel.com/img/airlines/.../BA.svg",
      "logo_lockup_url": "https://assets.duffel.com/img/airlines/.../BA.svg"
    },
    "slices": [{
      "id": "sli_xxx",
      "duration": "PT58M",
      "fare_brand_name": "Basic",
      "origin": {
        "iata_code": "KUL", "name": "Kuala Lumpur International Airport",
        "city_name": "Kuala Lumpur", "iata_country_code": "MY"
      },
      "destination": {
        "iata_code": "SIN", "name": "Singapore Changi Airport",
        "city_name": "Singapore", "iata_country_code": "SG"
      },
      "segments": [{
        "id": "seg_xxx",
        "departing_at": "2026-05-15T10:50:00",
        "arriving_at": "2026-05-15T11:48:00",
        "duration": "PT58M",
        "origin_terminal": "2",
        "destination_terminal": "1",
        "stops": [],
        "operating_carrier": {
          "name": "British Airways", "iata_code": "BA",
          "logo_symbol_url": "https://assets.duffel.com/..."
        },
        "marketing_carrier": { "name": "British Airways", "iata_code": "BA" },
        "operating_carrier_flight_number": "0105",
        "aircraft": null,
        "passengers": [{
          "passenger_id": "pas_xxx",
          "cabin_class": "economy",
          "cabin_class_marketing_name": "Economy",
          "fare_basis_code": "Y20LGTN2",
          "cabin": {
            "name": "economy",
            "amenities": {
              "wifi": { "cost": "paid", "available": true },
              "seat": { "pitch": "30", "legroom": "n/a" },
              "power": { "available": true }
            }
          },
          "baggages": [
            { "type": "checked", "quantity": 1 },
            { "type": "carry_on", "quantity": 1 }
          ]
        }]
      }]
    }],
    "conditions": {
      "refund_before_departure": { "allowed": false, "penalty_amount": null, "penalty_currency": null },
      "change_before_departure": { "allowed": true, "penalty_amount": "10.00", "penalty_currency": "GBP" }
    },
    "passengers": [{ "id": "pas_xxx", "type": "adult" }]
  }]
}
```

**Flight card — what to extract**:

| UI Element | Source field | Notes |
|-----------|-------------|-------|
| Price | `total_amount` + `total_currency` | String — parse with `parseFloat()` |
| Airline name | `owner.name` | |
| Airline logo | `owner.logo_symbol_url` | SVG from Duffel CDN — free to use |
| Departure time | `slices[0].segments[0].departing_at` | Local time string — no timezone conversion needed |
| Arrival time | `slices[0].segments[last].arriving_at` | |
| Duration | `slices[0].duration` → parse `PT58M` | `PT2H30M` = 2h 30m |
| Connections | `slices[0].segments.length - 1` | 0 = nonstop; each extra segment = 1 layover |
| Cabin class | `slices[0].segments[0].passengers[0].cabin_class_marketing_name` | |
| Baggage | `slices[0].segments[0].passengers[0].baggages` | |
| Fare brand | `slices[0].fare_brand_name` | "Basic", "Standard", "Flex" |
| Refundable | `conditions.refund_before_departure.allowed` | |

**Duration parser helper**:
```typescript
function parseDuration(iso: string) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  const h = parseInt(m?.[1] || '0'), min = parseInt(m?.[2] || '0')
  return h ? `${h}h ${min}m` : `${min}m`
}
```

**Client-side filter targets**:
- Connections: `slices[0].segments.length - 1` (0 = nonstop, 1 = 1 stop, etc.)
- Technical stops (rare, plane doesn't change): `slices[0].segments[n].stops.length`
- Airline: `owner.iata_code`
- Departure hour: `new Date(slices[0].segments[0].departing_at).getHours()`

---

### API 4 · Get Single Offer (on flight select)

**Trigger**: User clicks a flight card to proceed

```
GET /air/offers/{offer_id}
```

**Actual response** (additional fields vs list):
```json
{
  "data": {
    "id": "off_xxx",
    "total_amount": "47.17",
    "total_currency": "EUR",
    "expires_at": "2026-03-18T09:19:27.155028Z",
    "passenger_identity_documents_required": false,
    "supported_passenger_identity_document_types": ["passport", "known_traveler_number"],
    "payment_requirements": {
      "requires_instant_payment": false,
      "price_guarantee_expires_at": "2026-03-20T08:49:27Z",
      "payment_required_by": "2026-03-21T08:49:27Z"
    },
    "conditions": {
      "refund_before_departure": { "allowed": true, "penalty_amount": "10.00", "penalty_currency": "GBP" },
      "change_before_departure": { "allowed": false, "penalty_amount": null, "penalty_currency": null }
    }
  }
}
```

**Save to Zustand**: full `selectedOffer` object — price/currency used verbatim in booking payload.

**Show before F3**: expiry countdown · baggage summary · refund/change policy.

---

## F3 — Passenger Details Screen

**No Duffel API call here** — pure form. But fields must match exactly what `POST /air/orders` needs.

| Form field | Zod validation | Maps to `POST /air/orders` |
|-----------|---------------|---------------------------|
| First name | `z.string().min(1)` | `given_name` |
| Last name | `z.string().min(1)` | `family_name` |
| Date of birth | `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` | `born_on` |
| Title | `z.enum(['mr','mrs','ms','miss','dr'])` | `title` |
| Gender | `z.enum(['m','f'])` | `gender` |
| Email | `z.string().email()` | `email` |
| Phone | `z.string().regex(/^\+\d{7,15}$/)` | `phone_number` (E.164) |
| Passport no | If `passenger_identity_documents_required` | `identity_documents[0].unique_identifier` |
| Passport expiry | If required | `identity_documents[0].expires_on` |
| Issue country | If required | `identity_documents[0].issuing_country_code` |

**Repeat per passenger** — number of form instances = number of `passengerIds` in Zustand.

---

## F4 — Booking Confirmation Screen

### API 5 · Create Order

**Trigger**: User clicks "Confirm Booking"

```
POST /air/orders
Content-Type: application/json
```

**Payload** (assembled from Zustand `selectedOffer` + `passengerIds` + F3 form data):
```json
{
  "data": {
    "type": "instant",
    "selected_offers": ["off_xxx"],
    "payments": [{
      "type": "balance",
      "currency": "EUR",
      "amount": "47.17"
    }],
    "passengers": [{
      "id": "pas_0000B4NPfY7Rjtyzn8v5k0",
      "given_name": "Tony",
      "family_name": "Stark",
      "born_on": "1980-07-24",
      "title": "mr",
      "gender": "m",
      "email": "tony@example.com",
      "phone_number": "+60123456789"
    }]
  }
}
```

**3 fields that must exactly match `selectedOffer`**:
```typescript
selected_offers[0]   = selectedOffer.id
payments[0].currency = selectedOffer.total_currency   // "EUR"
payments[0].amount   = selectedOffer.total_amount     // "47.17" (string as-is)
```

**Actual response**:
```json
{
  "data": {
    "id": "ord_xxx",
    "booking_reference": "ABCDEF",
    "status": "confirmed",
    "total_amount": "47.17",
    "total_currency": "EUR",
    "passengers": [...],
    "slices": [...]
  }
}
```

---

### API 6 · Get Order (confirmation display)

**Trigger**: Confirmation page load (deep-link, refresh)

```
GET /air/orders/{order_id}
```

Same shape as create order response. Enables `/confirmation/ord_xxx` to work as a shareable URL.

---

## Complete Flow Diagram

```
F1 Search
  │
  ├─ [user types origin/dest]
  │   GET /places/suggestions?query=
  │   → show airport combobox options
  │
  └─ [user clicks Search]
      POST /air/offer_requests?return_offers=false
      → save: offerRequestId, passengerIds[]
      → router.push('/results?orq=...')

F2 Results
  │
  ├─ [page mount]
  │   GET /air/offers?offer_request_id=&limit=50&sort=total_amount
  │   → render flight cards
  │   → client-side filter (stops, airline, time)
  │
  ├─ [load more]
  │   GET /air/offers?offer_request_id=&after={cursor}
  │
  └─ [user selects flight]
      GET /air/offers/{offer_id}
      → save: selectedOffer (full)
      → router.push('/passenger')

F3 Passenger
  │
  └─ [no API — form only]
      → on submit: router.push('/confirmation')

F4 Confirmation
  │
  ├─ [page mount — mutation]
  │   POST /air/orders
  │   → save: orderId
  │
  └─ [display]
      GET /air/orders/{order_id}
      → show booking reference, itinerary, passengers
```

---

## Zustand Store — What to Persist Across Screens

```typescript
interface BookingStore {
  // Set in F1
  search: {
    origin: Place | null
    destination: Place | null
    departureDate: string
    returnDate: string | null
    adults: number
    children: number
    infants: number
    cabinClass: 'economy' | 'premium_economy' | 'business' | 'first'
  }
  offerRequestId: string | null
  passengerIds: string[]          // ⚠️ from offer request — required for booking

  // Set in F2
  selectedOfferId: string | null
  selectedOffer: DuffelOffer | null   // full object — price/currency used in order
  filters: {
    maxStops: number | null
    airlines: string[]
    departureHourRange: [number, number]
  }
  sortBy: 'total_amount' | 'total_duration'

  // Set in F4
  orderId: string | null
}
```

---

## TypeScript Types (verified from live responses)

```typescript
interface DuffelOffer {
  id: string
  total_amount: string          // "47.17" — string, NOT number
  total_currency: string        // "EUR"
  base_amount: string
  tax_amount: string
  expires_at: string            // ISO 8601 — show countdown in UI
  live_mode: boolean
  owner: DuffelCarrier
  conditions: {
    refund_before_departure: FareCondition
    change_before_departure: FareCondition
  }
  payment_requirements: {
    requires_instant_payment: boolean
    price_guarantee_expires_at: string
    payment_required_by: string
  }
  passenger_identity_documents_required: boolean
  supported_passenger_identity_document_types: string[]
  total_emissions_kg: string
  passengers: OfferPassenger[]
  slices: DuffelSlice[]
}

interface FareCondition {
  allowed: boolean
  penalty_amount: string | null
  penalty_currency: string | null
}

interface OfferPassenger {
  id: string          // "pas_xxx" — save this for POST /air/orders
  type: 'adult' | 'child' | 'infant_without_seat'
  given_name: string | null
  family_name: string | null
}

interface DuffelSlice {
  id: string
  duration: string              // "PT58M" ISO 8601
  fare_brand_name: string | null
  origin: DuffelPlace
  destination: DuffelPlace
  segments: DuffelSegment[]
}

interface DuffelSegment {
  id: string
  departing_at: string          // "2026-05-15T10:50:00"
  arriving_at: string
  duration: string
  origin: DuffelPlace
  destination: DuffelPlace
  origin_terminal: string | null
  destination_terminal: string | null
  operating_carrier: DuffelCarrier
  marketing_carrier: DuffelCarrier
  operating_carrier_flight_number: string
  aircraft: { name: string; iata_code: string } | null
  stops: any[]
  passengers: SegmentPassenger[]
}

interface DuffelCarrier {
  id: string
  name: string
  iata_code: string
  logo_symbol_url: string       // SVG — use directly in <img>
  logo_lockup_url: string
}

interface DuffelPlace {
  id: string                    // "arp_kul_my"
  iata_code: string             // "KUL"
  name: string                  // "Kuala Lumpur International Airport"
  city_name: string             // "Kuala Lumpur"
  iata_city_code: string
  iata_country_code: string
  time_zone: string
  city: { name: string; iata_code: string }
}

interface SegmentPassenger {
  passenger_id: string
  cabin_class: string
  cabin_class_marketing_name: string
  fare_basis_code: string
  cabin: { name: string; marketing_name: string; amenities: CabinAmenities }
  baggages: { type: 'checked' | 'carry_on'; quantity: number }[]
}

interface DuffelListResponse<T> {
  data: T[]
  meta: { limit: number; after: string | null; before: string | null }
}
```

---

## Next.js API Routes (proxy layer — keeps token server-side)

```
src/app/api/
├── places/route.ts                  GET ?query=   → /places/suggestions
├── flights/
│   ├── search/route.ts              POST          → /air/offer_requests?return_offers=false
│   ├── offers/route.ts              GET  ?offer_request_id=&limit=&sort=&after=
│   └── [offerId]/route.ts           GET           → /air/offers/{offerId}
└── bookings/
    ├── route.ts                     POST          → /air/orders
    └── [orderId]/route.ts           GET           → /air/orders/{orderId}
```

---

## Key Implementation Warnings

| # | Warning | Detail |
|---|---------|--------|
| 1 | **passengerIds are one-time** | Generated per offer request — can't reuse across searches |
| 2 | **Offers expire** | `expires_at` — show countdown; redirect to search if expired |
| 3 | **Price is a string** | `parseFloat(total_amount)` for display; send as-is (string) in order payload |
| 4 | **Exact price match** | `payments.amount` must equal `offer.total_amount` exactly — no rounding |
| 5 | **Filtering is client-side** | Fetch `limit=50`, filter connections/airlines/times in browser |
| 6 | **round-trip = 1638 offers** | Always use `return_offers=false` + paginated listing |
| 7 | **Airline logos provided** | `owner.logo_symbol_url` is a Duffel CDN SVG — no sourcing needed |
| 8 | **Duration format** | Parse `PT2H30M` → "2h 30m" with regex, not date-fns |
| 9 | **Connections ≠ stops** | `segments.length - 1` = layovers; `segment.stops[]` = rare technical stops (plane lands, passengers stay on) |
| 10 | **City vs airport codes** | `origin`/`destination` accept city codes (`LON`) or airport codes (`LHR`) — both valid in slice payload |
| 11 | **Multi-city = 3+ slices** | Add a third (or more) slice object — same structure as round-trip |

---

## Supplementary APIs

These endpoints are not part of the core 4-screen booking flow but are supported by Duffel.

---

### Airports

Reference data for airport details (the booking flow uses Places suggestions instead).

```
GET /air/airports                   # paginated list
GET /air/airports/{id}              # single by Duffel ID (e.g. "arp_lhr_gb")
```

**Query params (list):** `limit` (1–200, default 50) · `after` · `before` · `iata_country_code`

**Response fields:**
```json
{
  "id": "arp_lhr_gb",
  "name": "Heathrow",
  "iata_code": "LHR",
  "iata_country_code": "GB",
  "icao_code": "EGLL",
  "city_name": "London",
  "latitude": 51.47,
  "longitude": -0.4543,
  "time_zone": "Europe/London",
  "city": { "name": "London", "iata_code": "LON" }
}
```

---

### Airlines

Reference data for airline details (logos and names come embedded in offer responses).

```
GET /air/airlines                   # paginated list
GET /air/airlines/{id}              # single
```

**Response fields:** `id` · `name` · `iata_code` · `logo_symbol_url` · `logo_lockup_url` · `conditions_of_carriage_url`

---

### Aircraft

Reference data for aircraft types.

```
GET /air/aircraft                   # paginated list
GET /air/aircraft/{id}              # single
```

**Response fields:** `id` (e.g. `arc_00009UhD4ongolulWd91Ky`) · `iata_code` (e.g. `380`) · `name` (e.g. `Airbus Industries A380`)

---

### Seat Maps

Retrieve cabin layout and seat availability for a given offer (per segment).

```
GET /air/seat_maps?offer_id={offer_id}
```

**Response shape:**
```json
{
  "data": [{
    "id": "sem_xxx",
    "segment_id": "seg_xxx",
    "slice_id": "sli_xxx",
    "cabins": [{
      "cabin_class": "economy",
      "aisles": 1,
      "rows": [{
        "number": "1",
        "sections": [{
          "seats": [{
            "iata_column_position": "A",
            "availability_status": "available",
            "price": { "amount": "50.00", "currency": "GBP" }
          }]
        }]
      }]
    }]
  }]
}
```

**Availability status values:** `available` · `occupied` · `unavailable`

> One seat map returned per flight segment. Do NOT use `return_available_services=true` on `GET /air/offers` for seat data — use this endpoint exclusively.

---

### Order Cancellations

Two-step cancellation flow: create pending → confirm.

```
GET  /air/order_cancellations?order_id={id}     # list
POST /air/order_cancellations                   # create pending cancellation
GET  /air/order_cancellations/{id}              # get single
POST /air/order_cancellations/{id}/actions/confirm  # confirm (executes refund)
```

**Create request body:**
```json
{ "data": { "order_id": "ord_xxx" } }
```

**Response fields:**
| Field | Description |
|-------|-------------|
| `id` | Cancellation ID |
| `refund_amount` | Amount returned |
| `refund_currency` | ISO 4217 |
| `refund_to` | `balance` · `card` · `airline_credits` |
| `expires_at` | Deadline to confirm |
| `confirmed_at` | `null` until confirmed |
| `airline_credits` | Credits generated (if any) |

> Always confirm only the **most recent** cancellation for an order. Refunds go to Duffel balance — you must separately refund the customer.

---

### Order Changes

Two-step change flow: create pending change offer → confirm.

```
POST /air/order_change_requests          # search for change offers
GET  /air/order_change_offers?order_change_request_id=  # list change offers
POST /air/order_changes                  # create pending change
GET  /air/order_changes/{id}             # get single
POST /air/order_changes/{id}/actions/confirm  # confirm (with optional payment)
```

**Create pending change request body:**
```json
{ "data": { "selected_order_change_offer": "och_xxx" } }
```

**Confirm body (only when `change_total_amount` > 0):**
```json
{
  "data": {
    "payment": { "type": "balance", "currency": "GBP", "amount": "30.20" }
  }
}
```

**Response fields:**
| Field | Description |
|-------|-------------|
| `change_total_amount` | Charged (positive) or refunded (negative) |
| `new_total_amount` | Total after change |
| `penalty_total_amount` | Airline fees |
| `expires_at` | Confirmation deadline |
| `refund_to` | `voucher` or `original_form_of_payment` |

---

### Payments (Hold Orders)

Pay for a previously created hold order.

```
POST /air/payments
```

**Request body:**
```json
{
  "data": {
    "order_id": "ord_xxx",
    "payment": {
      "type": "balance",
      "amount": "47.17",
      "currency": "EUR"
    }
  }
}
```

**Payment types:** `balance` (Duffel account) · `card` (requires `three_d_secure_session_id`) · `arc_bsp_cash` (IATA agents) · `airline_credit`

**Response fields:** `id` · `status` (`succeeded` · `failed` · `pending` · `cancelled`) · `amount` · `currency` · `order_id` · `failure_reason`

> Must be called before `payment_required_by` deadline on the hold order.

---

## Error Handling Reference

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 202 | Accepted (processing) — do NOT retry |
| 204 | No content |
| 400 | Bad request — malformed JSON, missing headers |
| 401 | Unauthorized — invalid/missing token |
| 403 | Forbidden — token lacks permission |
| 404 | Not found |
| 422 | Validation error |
| 429 | Rate limited — check `ratelimit-reset` header |
| 500 | Internal error — contact support with `request_id` |
| 502 | Airline/gateway error |
| 503 | Temporarily unavailable — safe to retry |
| 504 | Gateway timeout |

### Error Response Shape

```json
{
  "errors": [{
    "title": "Brief description",
    "message": "Detailed explanation",
    "type": "authentication_error",
    "code": "offer_expired",
    "documentation_url": "https://..."
  }]
}
```

### Flight-Specific Error Codes

| Code | Action |
|------|--------|
| `offer_expired` | Restart search |
| `offer_no_longer_available` | Restart search |
| `price_changed` | Re-price and confirm with customer |
| `duplicate_booking` | Check existing orders |
| `invalid_passenger_name` | Fix passenger form validation |

### Rate Limiting

Headers returned on 429: `ratelimit-limit` · `ratelimit-remaining` · `ratelimit-reset` (60-second window)

---

## Pagination (all list endpoints)

```
GET /air/offers?offer_request_id=orq_xxx&limit=50&after={cursor}
```

| Param | Default | Range |
|-------|---------|-------|
| `limit` | 50 | 1–200 |
| `after` | — | cursor from `meta.after` |
| `before` | — | cursor from `meta.before` |

When `meta.after` is `null` → last page.
