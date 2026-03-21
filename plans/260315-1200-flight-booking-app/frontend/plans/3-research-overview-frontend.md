# Flight Booking App — Frontend Research Overview

*Assessment: Next.js + React + Duffel Flights API · Independent project*

---

## Table of Contents

1. [Project Summary](#1-project-summary)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Architecture](#4-architecture)
5. [Duffel API — Complete Feature Mapping](#5-duffel-api--complete-feature-mapping)
6. [Requirements Breakdown](#6-requirements-breakdown)
7. [Key Attention Points](#7-key-attention-points)
8. [Implementation Workflow](#8-implementation-workflow)
9. [Bug-Fixing Workflow](#9-bug-fixing-workflow)
10. [Agents & Skills Map](#10-agents--skills-map)
11. [Hosting & Deployment](#11-hosting--deployment)
12. [Risks & Mitigations](#12-risks--mitigations)

**Related Research**
- [UI/UX Research](./research-ui-ux.md) — Screen-by-screen design decisions, component specs, design system, patterns to adopt/avoid
- [Full Competitor Analysis](./research-ui-ux-competitor-analysis.md) — 7 OTA deep-dive (Google Flights, Skyscanner, Kayak, Expedia, Trip.com, AirAsia, Booking.com)

---

## 1. Project Summary

Build a production-ready flight booking application using Next.js and React. The app consumes the **Duffel Flights API** directly and walks a user through the complete booking flow.

| | |
|-|-|
| **Assessment type** | Frontend |
| **Framework** | Next.js 16 + React + TypeScript |
| **API** | Duffel Flights API (REST) — test environment, free trial |
| **Screens** | Search → Results → Passenger Details → Booking Confirmation |
| **Time guideline** | 6–8 hours |
| **Deploy** | Vercel |

> This project is **completely independent** from the backend assessment. The frontend does NOT consume the backend's GraphQL API. It calls Duffel directly via Next.js API routes.

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | **Next.js 16.x** — App Router | Required by assessment. Server Components by default, Client Components for interactivity. Streaming SSR for search results. `headers()` and `cookies()` are async in v16. `fetch()` with `cache: 'no-store'` for live flight data. *(Verified via context7: v16.1.6)* |
| **Language** | **TypeScript 5.x** — strict mode | Strongly recommended by assessment. Type safety across the booking flow |
| **State Management** | **Zustand v5** (UI/client state) + **TanStack Query v5** (server state) | Zustand v5: `create<T>()(...)` pattern with TypeScript generics, persist middleware for booking wizard state. TanStack Query v5: unified object signature `useQuery({ queryKey, queryFn })`, `useMutation` with `onMutate`/`onError`/`onSuccess` lifecycle. *(Verified via context7: Zustand v5.0.12, TanStack Query v5.90.3)* |
| **API Client** | **TanStack Query v5 + fetch** | TQ handles server state. Zustand handles UI state. No GraphQL client needed — frontend consumes Duffel REST API via Next.js API routes |
| **Duffel access** | **Raw fetch via Next.js API routes** | Duffel API key must stay server-side. Route Handlers (`app/api/`) proxy requests to Duffel. Never use `NEXT_PUBLIC_` prefix |
| **Forms & Validation** | **React Hook Form + Zod** | ~22KB combined. Minimal re-renders, TypeScript-first. Zod schemas double as runtime validation + static types |
| **UI Components** | **shadcn/ui** (Radix UI + Tailwind) | Accessible combobox (airport auto-suggest), date picker, cards, dialogs. Copy-paste components — no heavy dependency. WCAG 2.1 AA compliant |
| **Styling** | **Tailwind CSS v4** | Zero runtime, pairs with shadcn/ui. Design tokens via config. Fast iteration |
| **Dates** | **date-fns** | Tree-shakeable, timezone support. Handles flight time formatting, duration display |
| **E2E Testing** | **Playwright 1.58+** | Cross-browser, `route.fulfill()` for API mocking, `route.fetch()` for response patching. *(Verified via context7: v1.58.2)* |

### Why Zustand over alternatives?

| Option | Bundle | Verdict |
|--------|--------|---------|
| **Zustand** | ~1KB | **Chosen**. Simple store for UI state (current step, selected flight, filter values). No providers needed |
| Redux Toolkit | ~25KB | Overkill for a booking wizard |
| Jotai | ~3KB | Good, but Zustand's single-store pattern is clearer for multi-step forms |
| React Context | 0KB | Re-render issues with deeply nested consumers |

### Why TanStack Query over SWR?

| Option | Features | Verdict |
|--------|----------|---------|
| **TanStack Query v5** | Devtools, mutations, optimistic updates, prefetching | **Chosen**. Best-in-class for REST API consumption |
| SWR | Simpler | Lighter but lacks mutation lifecycle needed for booking flow |

### Frontend Data Flow

```
Browser → Next.js API Routes (server-side) → Duffel REST API
                    ↓
         TanStack Query (client-side cache)
                    ↓
         React Components (Zustand for UI state)
```

**Key**: Duffel API key stays on the server. Next.js API routes act as a thin proxy — no BFF transformation needed since Duffel responses are already well-structured.

---

## 3. Repository Structure

```
flight-booking-frontend/
├── package.json
├── next.config.ts
├── src/
│   ├── app/
│   │   ├── api/                     # Route Handlers (Duffel proxy — server-side only)
│   │   │   ├── places/route.ts      # GET ?query= → /places/suggestions
│   │   │   ├── flights/
│   │   │   │   ├── search/route.ts  # POST → /air/offer_requests?return_offers=false
│   │   │   │   ├── offers/route.ts  # GET ?offer_request_id=&limit=&sort=&after=
│   │   │   │   └── [offerId]/route.ts  # GET → /air/offers/{offerId}
│   │   │   └── bookings/
│   │   │       ├── route.ts         # POST → /air/orders
│   │   │       └── [orderId]/route.ts  # GET → /air/orders/{orderId}
│   │   ├── page.tsx                 # Search screen (/)
│   │   ├── results/page.tsx         # Results listing (/results?orq=)
│   │   ├── passenger/page.tsx       # Passenger details (/passenger)
│   │   └── confirmation/
│   │       └── [orderId]/page.tsx   # Booking confirmation (/confirmation/ord_xxx)
│   ├── components/
│   │   ├── search/                  # SearchForm, AirportCombobox, DatePicker, PassengerSelector
│   │   ├── results/                 # FlightCard, FilterPanel, SortBar, FlightList
│   │   ├── passenger/               # PassengerForm, FormField
│   │   ├── confirmation/            # BookingConfirmation, ItinerarySummary
│   │   └── ui/                      # shadcn/ui base components
│   ├── lib/
│   │   ├── duffel.ts                # Duffel API client (server-side fetch wrapper)
│   │   └── types.ts                 # All Duffel TypeScript interfaces
│   ├── stores/
│   │   └── booking.ts               # Zustand booking wizard store
│   └── hooks/
│       ├── useAirportSearch.ts      # TanStack Query — /api/places
│       ├── useFlightSearch.ts       # TanStack Query — /api/flights/search
│       ├── useOffers.ts             # TanStack Query — /api/flights/offers (paginated)
│       └── useCreateBooking.ts      # useMutation — /api/bookings
├── docs/
│   ├── architecture.md              # Component structure, state management, rendering strategy
│   ├── competitor-analysis.md       # Trip.com, Booking.com, AirAsia, Expedia UX patterns
│   └── ai-workflow.md               # Tools used, how used, what worked
├── .github/workflows/
│   └── deploy.yml                   # lint → test → Vercel deploy
└── README.md                        # Setup instructions
```

---

## 4. Architecture

```
┌──────────────────────────────────────────┐     ┌────────────────┐
│              Next.js 16 App              │     │                │
│                                          │     │  Duffel API    │
│  ┌─────────────┐    ┌─────────────────┐  │     │  (REST)        │
│  │ React Pages │    │ API Routes      │  │     │                │
│  │ (Client)    │───▶│ /api/flights/*  │──┼────▶│  Well-         │
│  │             │◀───│ /api/bookings/* │◀─┼────│  structured    │
│  │ TanStack    │    │                 │  │     │  responses     │
│  │ Query       │    │ Keeps Duffel    │  │     │                │
│  │ + Zustand   │    │ API key secure  │  │     │  Test env:     │
│  │             │    │ (server-side)   │  │     │  free trial    │
│  └─────────────┘    └─────────────────┘  │     └────────────────┘
└──────────────────────────────────────────┘
```

### Rendering Strategy Per Page

| Page | Strategy | Rationale |
|------|----------|-----------|
| **Search** (`/`) | RSC layout + Client Component for form | Form needs interactivity (date picker, combobox). Layout is static |
| **Results** (`/results`) | Client Component + TanStack Query | User-initiated search → client-side fetch. Loading/empty states via TQ |
| **Passenger** (`/passenger`) | Client Component | Multi-step form with React Hook Form + Zustand wizard state |
| **Confirmation** (`/confirmation/[orderId]`) | Client Component with `useMutation` | Mutation result display. Success/error states. Deep-link safe via `GET /air/orders/{id}` |

---

## 5. Duffel API — Complete Feature Mapping

> Token: `duffel_test_eyMbgtLMAEeqth9iBBBWvqCv3IUPz_lyNKidLvFZf5I` · Status: ✅ WORKING
> Base URL: `https://api.duffel.com`
> Required headers: `Authorization: Bearer <token>` · `Duffel-Version: v2` · `Accept: application/json`
> **Security rule**: Token goes in Next.js API routes only. Never `NEXT_PUBLIC_`. Never in client components.

### API Summary Table

| Screen | Feature | Duffel Endpoint | Trigger |
|--------|---------|-----------------|---------|
| Search | Airport auto-suggest | `GET /places/suggestions?query=` | User types (debounce 300ms) |
| Search | Submit search | `POST /air/offer_requests?return_offers=false` | "Search flights" click |
| Results | Load offers (paginated) | `GET /air/offers?offer_request_id=&limit=50&sort=&after=` | Page mount |
| Results | Load more | `GET /air/offers?...&after={meta.after}` | "Load more" click |
| Results | Select flight | `GET /air/offers/{offer_id}` | Flight card click |
| Passenger | (none — form only) | — | — |
| Confirmation | Submit booking | `POST /air/orders` | "Confirm Booking" click |
| Confirmation | Display confirmation | `GET /air/orders/{order_id}` | Page mount (deep-link safe) |

---

### Screen 1 — Search

#### API 1 · Airport Auto-Suggest (`GET /places/suggestions`)

**Requirement**: Origin and destination fields with airport auto-suggest

**Trigger**: User types in combobox (debounce 300ms, min 2 chars)

```
Your route:  GET /api/places?query={input}
Proxies to:  GET https://api.duffel.com/places/suggestions?query={input}
```

**Live response** (tested with "london"):
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

**Combobox display**: `LTN — London Luton Airport · London, GB`

**Save to Zustand on select**:
```typescript
{ iata_code: "LTN", name: "London Luton Airport", city_name: "London", iata_country_code: "GB" }
```

---

#### API 2 · Create Offer Request (`POST /air/offer_requests?return_offers=false`)

**Requirement**: Departure date (+ return date for round trips), number of passengers, cabin class

**Trigger**: User clicks "Search flights"

> **Why `return_offers=false`?** Live test: one-way = 47 offers inline, round-trip = **1,638 offers** — too large a payload. Async mode returns only the `orq_` ID, then we paginate separately.

```
Your route:  POST /api/flights/search
Proxies to:  POST https://api.duffel.com/air/offer_requests?return_offers=false
```

**One-way payload**:
```json
{
  "data": {
    "cabin_class": "economy",
    "slices": [
      { "origin": "KUL", "destination": "SIN", "departure_date": "2026-05-15" }
    ],
    "passengers": [{ "type": "adult" }, { "type": "adult" }]
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

**Form field → payload mapping**:
```
origin.iata_code       → slices[0].origin
destination.iata_code  → slices[0].destination
departureDate          → slices[0].departure_date
returnDate             → slices[1].departure_date  (second slice, round-trip only)
adults × N             → passengers: [{ type: "adult" }, ...]
children × N           → passengers: [{ type: "child" }, ...]
infants × N            → passengers: [{ type: "infant_without_seat" }, ...]
cabinClass             → cabin_class  ("economy" | "premium_economy" | "business" | "first")
```

**Live response**:
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

**Save to Zustand** (⚠️ critical — both needed for booking):
```typescript
offerRequestId = "orq_0000B4NPqcQH1F9SaAwguI"
passengerIds   = ["pas_0000B4NPfY7Rjtyzn8v5k0"]   // MUST use in POST /air/orders
```

**On success**: `router.push('/results?orq=orq_xxx')`

---

### Screen 2 — Results Listing

#### API 3 · List Offers (`GET /air/offers`)

**Requirement**: Flight cards with price, airline, times, stops, duration. Filtering by stops/airlines/time. Sorting by price/duration/departure.

**Trigger**: Results page mount, sort change, "Load more" click

```
Your route:  GET /api/flights/offers?offer_request_id=orq_xxx&limit=50&sort=total_amount&after={cursor}
Proxies to:  GET https://api.duffel.com/air/offers?offer_request_id=orq_xxx&limit=50&sort=total_amount&after={cursor}
```

| Param | Values | How set |
|-------|--------|---------|
| `offer_request_id` | `orq_xxx` from Zustand | Required always |
| `limit` | `50` | Fixed — fetch more per page for client-side filtering |
| `sort` | `total_amount` \| `total_duration` | User's sort selection (server-side) — **departure time not supported by Duffel API; see OQ-1** |
| `after` | `meta.after` from previous response | Cursor for next page |

> **Filtering (stops, airline, departure time) is client-side only** — Duffel has no filter query params. Fetch `limit=50` and filter in browser.

**Live response shape** (key fields):
```json
{
  "meta": { "limit": 50, "after": "g2EC", "before": null },
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
      "logo_symbol_url": "https://assets.duffel.com/img/airlines/.../BA.svg"
    },
    "slices": [{
      "duration": "PT58M",
      "fare_brand_name": "Basic",
      "origin": { "iata_code": "KUL", "name": "Kuala Lumpur International Airport", "city_name": "Kuala Lumpur" },
      "destination": { "iata_code": "SIN", "name": "Singapore Changi Airport", "city_name": "Singapore" },
      "segments": [{
        "departing_at": "2026-05-15T10:50:00",
        "arriving_at": "2026-05-15T11:48:00",
        "duration": "PT58M",
        "origin_terminal": "2",
        "destination_terminal": "1",
        "operating_carrier": { "name": "British Airways", "iata_code": "BA", "logo_symbol_url": "..." },
        "operating_carrier_flight_number": "0105",
        "passengers": [{
          "cabin_class": "economy",
          "cabin_class_marketing_name": "Economy",
          "baggages": [{ "type": "checked", "quantity": 1 }, { "type": "carry_on", "quantity": 1 }]
        }]
      }]
    }],
    "conditions": {
      "refund_before_departure": { "allowed": false },
      "change_before_departure": { "allowed": true, "penalty_amount": "10.00", "penalty_currency": "GBP" }
    },
    "passengers": [{ "id": "pas_xxx", "type": "adult" }]
  }]
}
```

**Flight card — what to extract**:

| UI Element | Source field | Notes |
|-----------|-------------|-------|
| Price | `total_amount` + `total_currency` | String — `parseFloat()` for display only |
| Airline name | `owner.name` | |
| Airline logo | `owner.logo_symbol_url` | SVG from Duffel CDN — use directly in `<img>` |
| Departure time | `slices[0].segments[0].departing_at` | Local time string |
| Arrival time | `slices[0].segments[last].arriving_at` | |
| Total duration | `slices[0].duration` | Parse `PT2H30M` → "2h 30m" |
| Stops | `slices[0].segments.length - 1` | 0 = nonstop |
| Cabin class | `slices[0].segments[0].passengers[0].cabin_class_marketing_name` | |
| Baggage | `slices[0].segments[0].passengers[0].baggages` | |
| Fare brand | `slices[0].fare_brand_name` | "Basic", "Standard", "Flex" |
| Refundable | `conditions.refund_before_departure.allowed` | |

**Duration parser**:
```typescript
function parseDuration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  const h = parseInt(m?.[1] || '0'), min = parseInt(m?.[2] || '0')
  return h ? `${h}h ${min}m` : `${min}m`
}
```

**Client-side filter targets**:
```typescript
stops:          slices[0].segments.length - 1
airline:        owner.iata_code
departureHour:  new Date(slices[0].segments[0].departing_at).getHours()
```

---

#### API 4 · Get Single Offer (`GET /air/offers/{offer_id}`)

**Requirement**: User selects a flight — show full detail before passenger form

**Trigger**: User clicks a flight card

```
Your route:  GET /api/flights/offers/{offerId}
Proxies to:  GET https://api.duffel.com/air/offers/{offerId}
```

**Additional fields vs list response** (the reason for the extra call):
```json
{
  "data": {
    "passenger_identity_documents_required": false,
    "supported_passenger_identity_document_types": ["passport", "known_traveler_number"],
    "payment_requirements": {
      "requires_instant_payment": false,
      "price_guarantee_expires_at": "2026-03-20T08:49:27Z",
      "payment_required_by": "2026-03-21T08:49:27Z"
    },
    "conditions": {
      "refund_before_departure": { "allowed": true, "penalty_amount": "10.00", "penalty_currency": "GBP" },
      "change_before_departure": { "allowed": false }
    }
  }
}
```

**Save to Zustand**: full `selectedOffer` object — price/currency used verbatim in booking payload.

**Show to user before navigating to F3**: expiry countdown · baggage summary · refund/change policy · whether passport is required.

---

### Screen 3 — Passenger Details

**No Duffel API call.** Pure form collecting data in the exact shape `POST /air/orders` needs.

**Requirement**: Collect names, date of birth, contact details per passenger. Client-side validation.

| Form field | Zod validation | Maps to `POST /air/orders` |
|-----------|---------------|---------------------------|
| First name | `z.string().min(1)` | `passengers[].given_name` |
| Last name | `z.string().min(1)` | `passengers[].family_name` |
| Date of birth | `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` | `passengers[].born_on` |
| Title | `z.enum(['mr','mrs','ms','miss','dr'])` | `passengers[].title` |
| Gender | `z.enum(['m','f'])` | `passengers[].gender` |
| Email | `z.string().email()` | `passengers[].email` |
| Phone | `z.string().regex(/^\+\d{7,15}$/)` | `passengers[].phone_number` (E.164) |
| Passport number | only if `passenger_identity_documents_required: true` | `passengers[].identity_documents[0].unique_identifier` |
| Passport expiry | only if required | `passengers[].identity_documents[0].expires_on` |
| Issuing country | only if required | `passengers[].identity_documents[0].issuing_country_code` |

**Repeat form for each passenger** — count from `passengerIds.length` in Zustand (set during offer request).

**On valid submit**: `router.push('/confirmation')`

---

### Screen 4 — Booking Confirmation

#### API 5 · Create Order (`POST /air/orders`)

**Requirement**: Submit the booking via Duffel API, handle errors clearly.

**Trigger**: Page mount (call on arrival) or "Confirm Booking" button

```
Your route:  POST /api/bookings
Proxies to:  POST https://api.duffel.com/air/orders
```

**Payload** (assembled from Zustand `selectedOffer` + `passengerIds` + F3 form data):
```json
{
  "data": {
    "type": "instant",
    "selected_offers": ["off_0000B4NPdqJZtilPhAnevS"],
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
selected_offers[0]   = selectedOffer.id              // off_xxx
payments[0].currency = selectedOffer.total_currency  // "EUR"
payments[0].amount   = selectedOffer.total_amount    // "47.17" (string, no rounding)
```

**⚠️ Passenger IDs**: `passengers[].id` must be the `pas_xxx` values from the original offer request — NOT new IDs, NOT the form data.

**Live response**:
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

#### API 6 · Get Order (`GET /air/orders/{order_id}`)

**Requirement**: Display confirmation with order summary.

**Trigger**: Confirmation page mount (re-fetch enables deep-link and refresh)

```
Your route:  GET /api/bookings/{orderId}
Proxies to:  GET https://api.duffel.com/air/orders/{orderId}
```

Same shape as create order response. Enables `/confirmation/ord_xxx` to work as a shareable, refreshable URL.

**What to display**:
```
Booking reference  ← booking_reference    ("ABCDEF")
Status             ← status               ("confirmed")
Total paid         ← total_amount + total_currency
Itinerary          ← slices[].segments[]  (same structure as offer)
Passenger names    ← passengers[].given_name + family_name
```

---

### Complete Call Sequence

```
Search page
  ├─ [user types origin/dest]
  │   GET /api/places?query=                   → airport combobox options
  │
  └─ [user clicks Search]
      POST /api/flights/search                 → save: offerRequestId, passengerIds[]
      → router.push('/results?orq=orq_xxx')

Results page
  ├─ [page mount]
  │   GET /api/flights/offers?offer_request_id=&limit=50&sort=total_amount
  │   → render flight cards
  │   → client-side filter (stops, airline, departure hour)
  │
  ├─ [load more]
  │   GET /api/flights/offers?...&after={meta.after}
  │
  └─ [user clicks flight]
      GET /api/flights/offers/{offerId}        → save: selectedOffer (full)
      → router.push('/passenger')

Passenger page
  └─ [no API — form only]
      → on valid submit: router.push('/confirmation')

Confirmation page
  ├─ [page mount]
  │   POST /api/bookings                       → save: orderId
  │
  └─ [display]
      GET /api/bookings/{orderId}              → show reference, itinerary, passengers
```

---

### Zustand Store Design

```typescript
interface BookingStore {
  // Set in Search
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
  passengerIds: string[]             // ⚠️ from offer request — required for booking

  // Set in Results
  selectedOfferId: string | null
  selectedOffer: DuffelOffer | null  // full object — price/currency used verbatim in order
  filters: {
    maxStops: number | null
    airlines: string[]
    departureHourRange: [number, number]
  }
  sortBy: 'total_amount' | 'total_duration'  // OQ-1: may need to add 'departure_time' (client-side) pending AJ answer

  // Set in Confirmation
  orderId: string | null
}
```

---

### TypeScript Types (verified from live API responses)

```typescript
interface DuffelOffer {
  id: string
  total_amount: string          // "47.17" — string, NOT number
  total_currency: string        // "EUR"
  base_amount: string
  tax_amount: string
  expires_at: string            // ISO 8601 — show countdown, redirect if expired
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
  id: string          // "pas_xxx" — save for POST /air/orders
  type: 'adult' | 'child' | 'infant_without_seat'
  given_name: string | null
  family_name: string | null
}

interface DuffelSlice {
  id: string
  duration: string              // "PT58M" ISO 8601 duration
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
  name: string                  // "British Airways"
  iata_code: string             // "BA"
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

### Key Implementation Warnings

| # | Warning | Detail |
|---|---------|--------|
| 1 | **passengerIds are one-time** | Generated per offer request — cannot reuse across searches |
| 2 | **Offers expire** | `expires_at` — show countdown; redirect to search if expired |
| 3 | **Price is a string** | `parseFloat(total_amount)` for display only; send as-is (string) in order payload |
| 4 | **Exact price match** | `payments.amount` must equal `offer.total_amount` exactly — no rounding |
| 5 | **Filtering is client-side** | Fetch `limit=50`, filter stops/airlines/times in browser |
| 6 | **Round-trip = 1,638 offers** | Always use `return_offers=false` + paginated listing |
| 7 | **Airline logos provided** | `owner.logo_symbol_url` is a Duffel CDN SVG — no sourcing needed |
| 8 | **Duration format** | Parse `PT2H30M` → "2h 30m" with regex, not date-fns |

---

## 6. Requirements Breakdown

| # | Requirement | Details | Priority |
|---|------------|---------|----------|
| F1 | **Search Form** | Origin/destination with airport auto-suggest (Duffel Places API), departure/return dates, passengers, cabin class | Must Have |
| F2 | **Results Listing** | Flight cards: price, airline, times, stops, duration. Filtering: stops, airlines, time range. Sorting: price, duration, departure | Must Have |
| F3 | **Passenger Details** | Collect names, DOB, contact details per passenger. Client-side validation (Zod). Fields required by Duffel `POST /air/orders` | Must Have |
| F4 | **Booking Confirmation** | Submit booking via Duffel Orders API, display order summary, handle API errors | Must Have |
| F5 | **Loading/Error/Empty States** | Every API interaction must handle all three states gracefully | Must Have |
| F6 | **Responsive Design** | Must work on mobile and desktop | Must Have |
| F7 | **Documentation** | Architectural decisions, competitor analysis, AI tools, setup instructions | Must Have |
| F8 | **Deployed Version** | Working deployment on Vercel | Must Have |

### Documentation Requirements

| # | Document | Content |
|---|---------|---------|
| D1 | **Architecture** | Component structure, state management approach, rendering strategy per page (SSR/CSR/RSC) with rationale |
| D2 | **Competitor Analysis** | UX patterns from Trip.com, Booking.com, AirAsia, Expedia — what adopted vs avoided |
| D3 | **AI Workflow** | Which tools, how used, where helped most |
| D4 | **Setup Instructions** | Clear steps to run locally |

---

## 7. Key Attention Points

### What Will Differentiate You

1. **Polished UX** — Airport auto-suggest combobox, loading skeletons, smooth step transitions. Must feel like a real product
2. **End-to-end flow over perfection** — "A complete booking flow with good UX beats a flawless search page with nothing after it"
3. **Git history** — "Commit early and often — we value seeing how you work." Atomic commits showing thought process
4. **Handle all states** — loading, error, and empty for every API call. Explicitly in the rubric

### Common Pitfalls

| Pitfall | Prevention |
|---------|------------|
| Spending >2 hrs on search UI | Timebox search to 2 hrs max — other 3 screens must exist |
| Ignoring error/empty/loading states | Add these from the start, not in Polish phase |
| Caching flight prices | Never cache — only cache static data like airport suggestions |
| API key exposure | Only `DUFFEL_API_TOKEN`, never `NEXT_PUBLIC_DUFFEL_API_TOKEN` |
| Offer expiry ignored | Check `expires_at`, show countdown, redirect if expired |
| Rounding payment amount | Send `total_amount` as-is (string) — no `toFixed()` |

---

## 8. Implementation Workflow

```
F1 — Foundation (1 hr)
  └→ Init Next.js 16 (App Router, TypeScript strict)
  └→ Install: zustand, @tanstack/react-query, react-hook-form, zod, shadcn/ui, date-fns
  └→ Set up Zustand store skeleton
  └→ Create API route stubs (6 routes)
  └→ Set DUFFEL_API_TOKEN in .env.local
  └→ Git init + first commit

F2 — Core Screens (4 hrs)          ← timebox strictly
  └→ Search page: AirportCombobox + DatePicker + PassengerSelector + CabinSelect
  └→ Results page: FlightCard + FilterPanel + SortBar + infinite scroll
  └→ Passenger form: per-passenger RHF form with Zod validation
  └→ Confirmation page: order summary display + error state
  └→ Wire all Zustand state transitions between screens

F3 — Polish + Tests (2 hrs)
  └→ Loading skeletons for every API call
  └→ Error boundaries per page
  └→ Empty states (no results, expired offer)
  └→ Responsive layout (mobile-first)
  └→ Playwright E2E: full booking flow + error states

F4 — Deploy + Docs (1 hr)
  └→ Deploy to Vercel, set DUFFEL_API_TOKEN env var
  └→ Write docs/architecture.md
  └→ Write docs/competitor-analysis.md
  └→ Write docs/ai-workflow.md
  └→ Update README with setup instructions
```

### Phase Task Checklist

#### F1 — Foundation

- [ ] `npx create-next-app@latest --typescript --app --tailwind`
- [ ] Install dependencies: `zustand @tanstack/react-query react-hook-form zod date-fns`
- [ ] Add shadcn/ui: `npx shadcn@latest init` + `add combobox calendar button input`
- [ ] Create `src/stores/booking.ts` — Zustand store with initial state
- [ ] Create 6 API route stubs (no logic yet, just `return Response.json({})`)
- [ ] Set `DUFFEL_API_TOKEN` in `.env.local`
- [ ] `git init && git add . && git commit -m "chore: init Next.js 16 project"`

#### F2 — Core Screens

- [ ] `src/lib/duffel.ts` — server-side fetch helper with auth headers
- [ ] Fill in API routes: places, flights/search, flights/offers, flights/[offerId], bookings, bookings/[orderId]
- [ ] `src/hooks/useAirportSearch.ts` — TanStack Query, debounced
- [ ] **Search page**: combobox (origin + destination), calendar date picker, passenger count, cabin select, submit → POST offer request
- [ ] **Results page**: fetch offers on mount, flight cards grid, filter sidebar, sort bar, load more
- [ ] **Passenger page**: dynamic form instances (one per passenger), all required fields, Zod validation
- [ ] **Confirmation page**: fire `POST /api/bookings`, display `booking_reference` + itinerary on success, error message on failure

#### F3 — Polish + Tests

- [ ] Add skeleton components for FlightCard, FilterPanel loading state
- [ ] Add `<ErrorBoundary>` to each page
- [ ] Empty state: "No flights found" with search-again CTA
- [ ] Expired offer: detect `expires_at`, redirect to search with toast
- [ ] Mobile layout: stacked cards, collapsible filter panel
- [ ] Playwright: `tests/booking-flow.spec.ts` — full happy path with `route.fulfill()` mocks

#### F4 — Deploy + Docs

- [ ] Push to GitHub, connect Vercel
- [ ] Add `DUFFEL_API_TOKEN` in Vercel dashboard (not `NEXT_PUBLIC_`)
- [ ] `docs/architecture.md` — per-page rendering strategy, Zustand vs TQ split, why shadcn
- [ ] `docs/competitor-analysis.md` — min 4 OTAs, specific patterns noted
- [ ] `docs/ai-workflow.md` — prompts used, agents used, what worked, what didn't
- [ ] `README.md` — prerequisites, `npm install`, `.env.local` setup, `npm run dev`

---

## 9. Bug-Fixing Workflow

### Bug-Fix Decision Tree

```
Bug Detected
    │
    ├─ Build/type error? ──→ Fix inline (tsc, eslint)
    │
    ├─ Runtime crash? ──→ Reproduce → Diagnose (devtools) → Fix → Test
    │                     Agent: debugger
    │
    ├─ Duffel API integration issue? ──→ Check API route, response shape, headers
    │                                    Agent: frontend-developer
    │
    ├─ UI rendering bug? ──→ Check component props, Zustand state, CSS
    │                        Agent: frontend-developer
    │
    └─ Flaky Playwright test? ──→ Check selectors, timing, route.fulfill() pattern
                                  Agent: tester
```

### Common Bug Patterns

| Bug | Likely Cause | Fix |
|-----|-------------|-----|
| `booking_reference` undefined | `POST /air/orders` returned error, not checked | Add `if (!response.ok)` check in API route |
| Airport combobox shows no results | Query too short / debounce not firing | Min 2 chars, debounce 300ms, check `data[].airports` path |
| Offer expired on confirmation | Not checking `expires_at` | Add expiry check in Results before navigating |
| Payment fails with 422 | `amount` rounded or wrong currency | Send `total_amount` string as-is from `selectedOffer` |
| `passengerIds` undefined in booking | Store not persisted across navigation | Check Zustand persist middleware or pass via URL |
| Duration shows "NaN" | ISO duration regex not matching | Test `PT58M`, `PT2H30M`, `PT1H` — all valid formats |
| DUFFEL_API_TOKEN undefined | Used `NEXT_PUBLIC_` prefix or not set in Vercel | Remove `NEXT_PUBLIC_`, set in Vercel dashboard |
| Playwright test hangs | API mock not matching route pattern | Log actual request URL, fix `page.route()` glob |

### Bug Priority

| Priority | Type | Action |
|----------|------|--------|
| **P0** | Booking flow broken, cannot navigate between screens | Fix immediately |
| **P1** | One screen broken, data not loading | Fix within current phase |
| **P2** | Styling broken on mobile, filter not working | Fix in Polish phase |
| **P3** | Typo, minor alignment, edge case | Note in "What I'd improve" doc |

---

## 10. Agents & Skills Map

| Phase | Agent | Skills | Handoffs |
|-------|-------|--------|----------|
| **F1 — Foundation** | `developer` | `nextjs-developer`, `typescript-pro` | → `frontend-architect` for architecture gate |
| **F2 — Core Screens** | `frontend-developer` | `nextjs-developer`, `react-expert`, `typescript-pro`, `ui-styling`, `ui-ux-pro-max` | → `code-reviewer` after each screen |
| **F3 — Polish + Tests** | `frontend-developer` + `tester` | `ui-ux-pro-max`, `ui-styling`, `playwright-expert`, `web-testing` | → `code-reviewer` |
| **F4 — Deploy + Docs** | `devops-engineer` | `infra-cloud` | → `security-auditor` for token/secrets check |

**Architecture gate** (before F2): `frontend-architect` → `architecture-designer`, `nextjs-developer`, `react-expert` → produces page/component hierarchy, routing, state management strategy.

**On-demand agents**:

| Agent | When |
|-------|------|
| `debugger` | Runtime errors, unexpected API responses |
| `researcher` | Unfamiliar Duffel API pattern, library question |
| `code-reviewer` | After each screen is complete |
| `security-auditor` | Before deployment — verify API token handling |

---

## 11. Hosting & Deployment

| | Platform | Reason |
|-|----------|--------|
| **Frontend** | **Vercel** | Native Next.js SSR, 100GB bandwidth, unlimited builds, auto-deploy on push. $0/month |
| **CI/CD** | **GitHub Actions** | Unlimited minutes on public repos |

### Environment Variables

| Where | Variable | Value |
|-------|---------|-------|
| `.env.local` (local dev) | `DUFFEL_API_TOKEN` | Your test token |
| Vercel Dashboard | `DUFFEL_API_TOKEN` | Your test token |
| GitHub Actions Secrets | `DUFFEL_API_TOKEN` | Encrypted, masked in logs |

> **Never** use `NEXT_PUBLIC_DUFFEL_API_TOKEN` — that prefix exposes the value to the browser.

### Deployment Checklist

- [ ] Push to GitHub
- [ ] Connect repo to Vercel
- [ ] Add `DUFFEL_API_TOKEN` in Vercel → Settings → Environment Variables
- [ ] Verify deployment URL works end-to-end (search → book)
- [ ] Add deployed URL to README

---

## Open Questions

| # | Question | Asked To | Status | Answer |
|---|----------|----------|--------|--------|
| OQ-1 | **Sort by departure time** — The assessment requires sorting results by departure time, but Duffel's `GET /air/offers` `sort` param only supports `total_amount` and `total_duration`. Is departure time sorting a hard requirement, or is price + duration sufficient? If required, confirm client-side sorting on `slices[0].segments[0].departing_at` is acceptable. | AJ | ⏳ Pending | — |

> **Impact of OQ-1 answer**:
> - **If required** → add `'departure_time'` to Zustand `sortBy` type; implement client-side sort on `slices[0].segments[0].departing_at`; update Section 5 API 3 sort param table and Section 8 F2 checklist
> - **If price + duration is sufficient** → no change needed; document the API limitation in `docs/architecture.md`

---

## 12. Risks & Mitigations

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | **Time overrun** | Timebox search to 2 hrs. Working e2e flow > perfect feature. Cut Playwright tests before cutting core screens |
| 2 | **Duffel async flow non-trivial** | Always use `return_offers=false`. Save `passengerIds` from offer request. See Section 5 flow |
| 3 | **Offer expires mid-flow** | Check `expires_at` on Results page. Show countdown. Redirect to search if expired |
| 4 | **API key exposure** | Never `NEXT_PUBLIC_`. All calls via API routes (server-side). Verified in deploy |
| 5 | **Documentation rushed** | Write `docs/architecture.md` decisions inline as you build, not after |
| 6 | **Round-trip offer explosion** | Always `return_offers=false` — verified: 1,638 offers inline on round-trip |

---

## Quick Reference

```
PROJECT:   Next.js 16 + React + TypeScript — Duffel Flights API
STACK:     Next.js 16.x · TypeScript 5.x · Zustand v5 · TanStack Query v5
           React Hook Form · Zod · shadcn/ui · Tailwind CSS v4 · date-fns
           Playwright 1.58+ (E2E)
API:       Duffel REST API via Next.js API route proxy (server-side)
TOKEN:     DUFFEL_API_TOKEN (server-side only — never NEXT_PUBLIC_)
DEPLOY:    Vercel + GitHub Actions
REPO:      flight-booking-frontend (separate from backend)

VERSIONS (verified via context7, 2026-03-18):
  Next.js v16.1.6 · Zustand v5.0.12 · TanStack Query v5.90.3 · Playwright v1.58.2

DUFFEL FLOW:
  POST /air/offer_requests?return_offers=false  → orq_xxx, pas_xxx[]
  GET  /air/offers?offer_request_id=orq_xxx     → paginated offers
  GET  /air/offers/{off_xxx}                    → full offer detail
  POST /air/orders                              → ord_xxx, booking_reference
  GET  /air/orders/{ord_xxx}                    → confirmation display
```
