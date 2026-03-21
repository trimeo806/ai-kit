# Flight Booking Flow — Implementation Overview

*Based on: `duffel-api-exploration.md` · API: Duffel v2 · Mode: Test (free bookings)*

---

## The 4-Screen Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  F1 Search  │────▶│ F2 Results  │────▶│ F3 Passenger│────▶│F4 Confirm   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
  2 API calls          2 API calls        0 API calls          2 API calls
```

---

## Screen-by-Screen Breakdown

### F1 — Search

**Purpose**: Collect origin, destination, dates, passengers, cabin class

**APIs**:
| # | Trigger | Endpoint | What it returns |
|---|---------|----------|-----------------|
| 1 | User types in airport field (300ms debounce, min 2 chars) | `GET /places/suggestions?query=` | Airport/city list for combobox |
| 2 | User clicks "Search flights" | `POST /air/offer_requests?return_offers=false` | `offerRequestId`, `passengerIds[]` |

**Critical after step 2**:
- Save `offerRequestId` → used to load offers in F2
- Save `passengerIds[]` → **must** be used verbatim in `POST /air/orders` (F4). These IDs are one-time, generated per search.
- Navigate to `/results?orq={offerRequestId}`

---

### F2 — Results

**Purpose**: Show paginated flight offers; allow filtering + sorting; let user pick a flight

**APIs**:
| # | Trigger | Endpoint | What it returns |
|---|---------|----------|-----------------|
| 3 | Page mount / sort change / "Load more" | `GET /air/offers?offer_request_id=&limit=50&sort=total_amount&after={cursor}` | Paginated offer list |
| 4 | User clicks a flight card | `GET /air/offers/{offer_id}` | Full offer detail (expiry, baggage, conditions) |

**Key rules**:
- Duffel has **no server-side filter params** — fetch 50 offers, filter connections / airlines / times in the browser
- Pagination: `meta.after` cursor → pass as `after=` query param for next page; `null` = last page
- After step 4: save the full `selectedOffer` object → price/currency used verbatim in booking payload
- Show offer expiry countdown from `expires_at`; redirect to F1 if expired

**Flight card data sources**:
```
Price         → total_amount + total_currency
Airline       → owner.name + owner.logo_symbol_url (Duffel CDN SVG)
Departure     → slices[0].segments[0].departing_at
Arrival       → slices[0].segments[last].arriving_at
Duration      → slices[0].duration  (parse "PT2H30M" → "2h 30m")
Connections   → slices[0].segments.length - 1  (0 = nonstop)
Baggage       → slices[0].segments[0].passengers[0].baggages
Refundable    → conditions.refund_before_departure.allowed
```

---

### F3 — Passenger Details

**Purpose**: Collect personal details for each passenger

**No Duffel API call** — pure form. Number of passenger forms = `passengerIds.length` from Zustand.

**Form fields → order payload mapping**:
| Field | Validation | Maps to |
|-------|-----------|---------|
| First name | required | `given_name` |
| Last name | required | `family_name` |
| Date of birth | `YYYY-MM-DD` | `born_on` |
| Title | mr / mrs / ms / miss / dr | `title` |
| Gender | m / f | `gender` |
| Email | valid email | `email` |
| Phone | E.164 `+60123456789` | `phone_number` |
| Passport no | only if `passenger_identity_documents_required` | `identity_documents[0].unique_identifier` |

---

### F4 — Booking Confirmation

**Purpose**: Submit the booking, display confirmation

**APIs**:
| # | Trigger | Endpoint | What it returns |
|---|---------|----------|-----------------|
| 5 | Page mount (mutation on load) | `POST /air/orders` | `orderId`, `booking_reference`, `status: confirmed` |
| 6 | Confirmation display / deep-link / refresh | `GET /air/orders/{order_id}` | Full order with itinerary + passengers |

**Booking payload — 3 fields that MUST exactly match `selectedOffer`**:
```typescript
selected_offers[0]   = selectedOffer.id
payments[0].currency = selectedOffer.total_currency   // "EUR" — exact string
payments[0].amount   = selectedOffer.total_amount     // "47.17" — exact string, no rounding
```

**Passenger IDs must come from the offer request** (step 2), not fabricated:
```typescript
passengers[0].id = passengerIds[0]   // "pas_0000B4NPfY7Rjtyzn8v5k0"
```

---

## State Management (Zustand) — What Flows Between Screens

```
F1 writes ──────────────────────────────────────────────────────────┐
  search {}                (origin, destination, dates, pax, cabin)  │
  offerRequestId           "orq_xxx"                                  │
  passengerIds[]           ["pas_xxx"]  ← ⚠️ must use in F4         │
                                                                      │
F2 writes ────────────────────────────────────────────────────┐      │
  selectedOfferId          "off_xxx"                           │      │
  selectedOffer            { full object }  ← price/currency  │      │
  filters {}               stops, airlines, hours              │      │
  sortBy                   total_amount | total_duration        │      │
                                                               │      │
F4 reads all of ───────────────────────────────────────────────┘──────┘
  → builds POST /air/orders payload
  → writes orderId "ord_xxx"
```

---

## Next.js API Route Structure (proxy layer)

All Duffel calls go through server-side Next.js routes. Token never touches the browser.

```
src/app/api/
├── places/route.ts                  GET  ?query=
├── flights/
│   ├── search/route.ts              POST  → /air/offer_requests
│   ├── offers/route.ts              GET   → /air/offers
│   └── [offerId]/route.ts           GET   → /air/offers/{offerId}
└── bookings/
    ├── route.ts                     POST  → /air/orders
    └── [orderId]/route.ts           GET   → /air/orders/{orderId}
```

---

## Error Handling Plan

| Error code | Screen | User action |
|-----------|--------|------------|
| `offer_expired` | F2, F4 | Redirect to F1, show "Prices have changed — please search again" |
| `offer_no_longer_available` | F4 | Same as above |
| `price_changed` | F4 | Re-fetch offer, show new price, ask user to confirm |
| `duplicate_booking` | F4 | Show message, link to existing order |
| `invalid_passenger_name` | F4 | Highlight field, return to F3 |
| 429 rate limit | Any | Retry after `ratelimit-reset` header value |
| 503 / 504 | Any | Retry once; show error if persists |

---

## Postman Collection Usage

The collection at `duffel-postman-collection.json` runs the full flow with auto-variable capture:

| Step | Request | Auto-captures |
|------|---------|---------------|
| 1 | Airport Auto-Suggest | — |
| 2 | Create Offer Request | `offerRequestId`, `passengerId` |
| 3 | List Offers | `offerId`, `offerTotalAmount`, `offerCurrency` (from first result) |
| 4 | Get Single Offer | Refreshes `offerTotalAmount`, `offerCurrency` |
| 5 | Create Order | `orderId` |
| 6 | Get Order | Verifies `booking_reference` + `status: confirmed` |

**Import**: Postman → Import → select `duffel-postman-collection.json` → run requests in order 1 → 6.

No manual variable editing required — each request's test script captures the IDs needed by the next request.
