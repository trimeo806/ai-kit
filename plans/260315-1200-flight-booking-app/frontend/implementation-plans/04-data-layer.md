# Data Layer Plan — Flight Booking App Frontend

*Pattern: Hybrid — Server Actions for mutations, Route Handlers for real-time/paginated GETs*
*Token: server-only · Never `NEXT_PUBLIC_` · Never in client bundle*

---

## Decision Summary

| Endpoint | Pattern | Reason |
|----------|---------|--------|
| `GET /places/suggestions` | Route Handler `/api/places` | Debounced from client combobox — must be a Route Handler |
| `POST /air/offer_requests` | Server Action | Form submit mutation |
| `GET /air/offers` | Route Handler `/api/flights/offers` | Paginated, cursor-driven, called from client on mount + "Load more" |
| `GET /air/offers/{id}` | Server Action | Button click mutation (select flight) |
| `POST /air/orders` | Server Action | Form submit mutation (confirm booking) |
| `GET /air/orders/{id}` | Server fetch in page component | Confirmation page is a Server Component — direct fetch, no route needed |

---

## File Structure

```
src/
├── lib/
│   ├── duffel.ts                    # Duffel client (server-only)
│   └── types/
│       ├── duffel.ts               # All Duffel API shapes
│       └── actions.ts              # Server Action return types
├── actions/
│   ├── search.ts                   # searchFlights() → POST /air/offer_requests
│   ├── offers.ts                   # getOffer() → GET /air/offers/{id}
│   └── booking.ts                  # createOrder() → POST /air/orders
└── app/
    └── api/
        ├── places/
        │   └── route.ts            # GET /api/places?query=
        └── flights/
            └── offers/
                └── route.ts        # GET /api/flights/offers?orq=&limit=&after=&sort=
```

---

## 1. Duffel Client — `lib/duffel.ts`

Single instance, imported only in server files (actions + route handlers + page components).

```ts
// lib/duffel.ts
import "server-only"

const BASE_URL = "https://api.duffel.com"
const TOKEN    = process.env.DUFFEL_API_KEY!

if (!TOKEN) throw new Error("DUFFEL_API_KEY is not set")

type Method = "GET" | "POST"

export async function duffelFetch<T>(
  path: string,
  options: { method?: Method; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method:  options.method ?? "GET",
    headers: {
      Authorization:    `Bearer ${TOKEN}`,
      "Duffel-Version": "v2",
      "Content-Type":   "application/json",
      Accept:           "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new DuffelError(res.status, err?.errors?.[0] ?? { message: "Unknown error" })
  }

  return res.json() as Promise<T>
}

export class DuffelError extends Error {
  constructor(
    public readonly status: number,
    public readonly error: { title?: string; message?: string; code?: string }
  ) {
    super(error.message ?? "Duffel API error")
    this.name = "DuffelError"
  }
}
```

**Notes:**
- No SDK dependency — raw fetch keeps the bundle lean and the code readable to assessors
- `server-only` import causes a build error if accidentally imported in a client component
- `DuffelError` carries `.code` (e.g. `"offer_expired"`) — used in error handling below

---

## 2. Type Definitions — `lib/types/duffel.ts`

Sourced from live API responses (verified in `2-duffel-api-exploration.md`).

```ts
// lib/types/duffel.ts

export interface DuffelListResponse<T> {
  data: T[]
  meta: { limit: number; after: string | null; before: string | null }
}

export interface DuffelSingleResponse<T> {
  data: T
}

// --- Places ---

export interface DuffelPlace {
  id: string
  iata_code: string
  name: string
  city_name: string
  iata_city_code: string
  iata_country_code: string
  time_zone: string
  type: "airport" | "city"
}

export interface DuffelPlaceSuggestion {
  city_name: string | null
  airports: DuffelPlace[]
}

// --- Carrier ---

export interface DuffelCarrier {
  id: string
  name: string
  iata_code: string
  logo_symbol_url: string
  logo_lockup_url: string
}

// --- Offer ---

export interface FareCondition {
  allowed: boolean
  penalty_amount: string | null
  penalty_currency: string | null
}

export interface CabinAmenities {
  wifi:  { available: boolean; cost: "free" | "paid" | null }
  seat:  { pitch: string | null; legroom: string | null }
  power: { available: boolean }
}

export interface SegmentPassenger {
  passenger_id: string
  cabin_class: string
  cabin_class_marketing_name: string
  fare_basis_code: string
  cabin: { name: string; amenities: CabinAmenities }
  baggages: { type: "checked" | "carry_on"; quantity: number }[]
}

export interface DuffelSegment {
  id: string
  departing_at: string        // "2026-05-15T10:50:00" — local time, no TZ suffix
  arriving_at: string
  duration: string            // ISO 8601 e.g. "PT58M", "PT2H30M"
  origin: DuffelPlace
  destination: DuffelPlace
  origin_terminal: string | null
  destination_terminal: string | null
  operating_carrier: DuffelCarrier
  marketing_carrier: DuffelCarrier
  operating_carrier_flight_number: string
  aircraft: { name: string; iata_code: string } | null
  stops: unknown[]            // technical stops — passengers stay aboard, rare
  passengers: SegmentPassenger[]
}

export interface DuffelSlice {
  id: string
  duration: string
  fare_brand_name: string | null
  origin: DuffelPlace
  destination: DuffelPlace
  segments: DuffelSegment[]
}

export interface OfferPassenger {
  id: string                  // "pas_xxx" — must be used verbatim in POST /air/orders
  type: "adult" | "child" | "infant_without_seat"
  given_name: string | null
  family_name: string | null
}

export interface DuffelOffer {
  id: string
  total_amount: string        // "47.17" — string, NOT number. Send as-is in order.
  total_currency: string      // "EUR"
  base_amount: string
  tax_amount: string
  expires_at: string          // ISO 8601 — show countdown, redirect if expired
  live_mode: boolean
  owner: DuffelCarrier
  passengers: OfferPassenger[]
  slices: DuffelSlice[]
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
}

// --- Order ---

export interface OrderPassenger {
  id: string
  given_name: string
  family_name: string
  title: string
  type: string
  born_on: string
  email: string
  phone_number: string
}

export interface DuffelOrder {
  id: string
  booking_reference: string   // e.g. "ABCDEF" — show prominently on confirmation
  status: "confirmed" | "cancelled"
  total_amount: string
  total_currency: string
  base_amount: string
  tax_amount: string
  passengers: OrderPassenger[]
  slices: DuffelSlice[]
  live_mode: boolean
}
```

---

## 3. Server Action Return Types — `lib/types/actions.ts`

Server Actions return discriminated unions — no HTTP status codes.

```ts
// lib/types/actions.ts

export type ActionResult<T> =
  | { success: true;  data: T }
  | { success: false; error: string; code?: string }
```

---

## 4. Route Handler — Places Autocomplete

**Trigger**: user types ≥ 2 chars in airport combobox (300ms debounce)

```ts
// app/api/places/route.ts
import { duffelFetch } from "@/lib/duffel"
import type { DuffelListResponse, DuffelPlaceSuggestion } from "@/lib/types/duffel"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("query") ?? ""

  if (query.length < 2) {
    return Response.json([])
  }

  try {
    const res = await duffelFetch<DuffelListResponse<DuffelPlaceSuggestion>>(
      `/places/suggestions?query=${encodeURIComponent(query)}`,
      { method: "GET" }
    )
    // Flatten suggestion groups into a single airport list
    const places = res.data.flatMap((group) => group.airports)
    return Response.json(places)
  } catch {
    return Response.json([], { status: 200 }) // fail silently — combobox just shows nothing
  }
}
```

**Client usage** (in `AirportCombobox.tsx`):

```ts
const fetchPlaces = useMemo(
  () =>
    debounce(async (query: string) => {
      if (query.length < 2) { setOptions([]); return }
      const res  = await fetch(`/api/places?query=${encodeURIComponent(query)}`)
      const data = await res.json()
      setOptions(data as DuffelPlace[])
    }, 300),
  []
)
```

**What to display in combobox**: `{iata_code} — {name} · {city_name}, {iata_country_code}`
**What to store on select** (Zustand): `{ iata: iata_code, name, city: city_name }`

---

## 5. Route Handler — List Offers (paginated)

**Trigger**: results page mount, "Load more" click, sort change

```ts
// app/api/flights/offers/route.ts
import { duffelFetch } from "@/lib/duffel"
import type { DuffelListResponse, DuffelOffer } from "@/lib/types/duffel"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const orq    = searchParams.get("orq")
  const limit  = searchParams.get("limit")  ?? "50"
  const sort   = searchParams.get("sort")   ?? "total_amount"
  const after  = searchParams.get("after")

  if (!orq) {
    return Response.json({ error: "orq is required" }, { status: 400 })
  }

  const params = new URLSearchParams({
    offer_request_id: orq,
    limit,
    sort,
    ...(after ? { after } : {}),
  })

  try {
    const res = await duffelFetch<DuffelListResponse<DuffelOffer>>(
      `/air/offers?${params}`
    )
    return Response.json(res)
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status ?? 500
    return Response.json({ error: "Failed to load offers" }, { status })
  }
}
```

**Client usage** (in `ResultsList.tsx`):

```ts
// Initial load
const res  = await fetch(`/api/flights/offers?orq=${offerRequestId}&limit=50&sort=${sortBy}`)
const data = await res.json() as DuffelListResponse<DuffelOffer>
setOffers(data.data)
setCursor(data.meta.after)   // null = last page

// Load more
const res  = await fetch(`/api/flights/offers?orq=${offerRequestId}&after=${cursor}&sort=${sortBy}`)
```

**Filtering is client-side** — Duffel has no filter query params. Fetch 50, filter in browser.

---

## 6. Server Action — Search Flights

**Trigger**: user clicks "Search flights" in `SearchForm.tsx`

```ts
// actions/search.ts
"use server"
import { duffelFetch, DuffelError } from "@/lib/duffel"
import type { DuffelSingleResponse } from "@/lib/types/duffel"
import type { ActionResult } from "@/lib/types/actions"
import type { SearchFormValues } from "@/lib/types/forms"

interface OfferRequest {
  id: string
  passengers: { id: string; type: string }[]
}

export async function searchFlights(
  params: SearchFormValues
): Promise<ActionResult<{ offerRequestId: string; passengerIds: string[] }>> {
  // Build slices from form data
  const slices = [
    {
      origin:         params.origin.iata,
      destination:    params.destination.iata,
      departure_date: params.departDate,
    },
    // Round-trip: add return slice
    ...(params.tripType === "round_trip" && params.returnDate
      ? [{
          origin:         params.destination.iata,
          destination:    params.origin.iata,
          departure_date: params.returnDate,
        }]
      : []),
  ]

  // Build passengers array (one entry per passenger, not one per count)
  const passengers = params.passengers.flatMap(({ type, count }) =>
    Array.from({ length: count }, () => ({ type }))
  )

  try {
    const res = await duffelFetch<DuffelSingleResponse<OfferRequest>>(
      "/air/offer_requests?return_offers=false",
      {
        method: "POST",
        body: {
          data: {
            cabin_class: params.cabinClass,
            slices,
            passengers,
          },
        },
      }
    )

    return {
      success:    true,
      data: {
        offerRequestId: res.data.id,
        passengerIds:   res.data.passengers.map((p) => p.id),
        // ⚠️ passengerIds are one-time — generated per search, must use verbatim in POST /air/orders
      },
    }
  } catch (err) {
    if (err instanceof DuffelError) {
      return { success: false, error: err.message, code: err.error.code }
    }
    return { success: false, error: "Search failed. Please try again." }
  }
}
```

**Client usage** (in `SearchForm.tsx`):

```ts
const result = await searchFlights(formValues)
if (!result.success) {
  toast.error(result.error)
  return
}
store.setOfferRequest(result.data.offerRequestId, result.data.passengerIds)
router.push(`/results?orq=${result.data.offerRequestId}`)
```

---

## 7. Server Action — Get Single Offer

**Trigger**: user clicks a flight card in results

```ts
// actions/offers.ts
"use server"
import { duffelFetch, DuffelError } from "@/lib/duffel"
import type { DuffelSingleResponse, DuffelOffer } from "@/lib/types/duffel"
import type { ActionResult } from "@/lib/types/actions"

export async function getOffer(
  offerId: string
): Promise<ActionResult<DuffelOffer>> {
  try {
    const res = await duffelFetch<DuffelSingleResponse<DuffelOffer>>(
      `/air/offers/${offerId}`
    )
    return { success: true, data: res.data }
  } catch (err) {
    if (err instanceof DuffelError) {
      // offer_expired or offer_no_longer_available → send user back to search
      return { success: false, error: err.message, code: err.error.code }
    }
    return { success: false, error: "Could not load flight details." }
  }
}
```

**Client usage** (in `FlightCard.tsx`):

```ts
const result = await getOffer(offer.id)
if (!result.success) {
  if (result.code === "offer_expired" || result.code === "offer_no_longer_available") {
    toast.error("This flight is no longer available. Please search again.")
    router.push("/")
    return
  }
  toast.error(result.error)
  return
}
store.setSelectedOffer(result.data)
router.push("/passengers")
```

---

## 8. Server Action — Create Order

**Trigger**: user clicks "Confirm booking" in `PassengerForm.tsx`

```ts
// actions/booking.ts
"use server"
import { duffelFetch, DuffelError } from "@/lib/duffel"
import type { DuffelSingleResponse, DuffelOrder } from "@/lib/types/duffel"
import type { ActionResult } from "@/lib/types/actions"
import type { PassengerFormValues } from "@/lib/types/forms"

interface CreateOrderParams {
  selectedOfferId:   string
  offerTotalAmount:  string   // must be exact string from offer — no rounding
  offerCurrency:     string
  passengerIds:      string[] // from offer request — must match exactly
  passengers:        PassengerFormValues["passengers"]
}

export async function createOrder(
  params: CreateOrderParams
): Promise<ActionResult<{ orderId: string; bookingReference: string }>> {
  const payload = {
    data: {
      type:             "instant",
      selected_offers:  [params.selectedOfferId],
      payments: [{
        type:     "balance",
        currency: params.offerCurrency,   // ⚠️ exact string from offer
        amount:   params.offerTotalAmount, // ⚠️ exact string from offer — no parseFloat/toFixed
      }],
      passengers: params.passengers.map((pax, i) => ({
        id:           params.passengerIds[i], // ⚠️ must use IDs from offer request
        given_name:   pax.firstName,
        family_name:  pax.lastName,
        born_on:      pax.dateOfBirth,
        title:        pax.title,
        gender:       pax.gender,
        email:        pax.email,
        phone_number: pax.phone, // E.164 format e.g. "+60123456789"
        ...(pax.passport
          ? {
              identity_documents: [{
                type:                "passport",
                unique_identifier:   pax.passport.number,
                expires_on:          pax.passport.expiryDate,
                issuing_country_code: pax.passport.issuingCountry,
              }],
            }
          : {}),
      })),
    },
  }

  try {
    const res = await duffelFetch<DuffelSingleResponse<DuffelOrder>>(
      "/air/orders",
      { method: "POST", body: payload }
    )
    return {
      success: true,
      data: {
        orderId:          res.data.id,
        bookingReference: res.data.booking_reference,
      },
    }
  } catch (err) {
    if (err instanceof DuffelError) {
      const code = err.error.code
      if (code === "offer_expired" || code === "offer_no_longer_available") {
        return { success: false, error: "Your session expired. Please search again.", code }
      }
      if (code === "price_changed") {
        return { success: false, error: "The price changed. Please review and confirm.", code }
      }
      if (code === "invalid_passenger_name") {
        return { success: false, error: "Check passenger name — no special characters allowed.", code }
      }
      return { success: false, error: err.message, code }
    }
    return { success: false, error: "Booking failed. Please try again." }
  }
}
```

**Client usage** (in `PassengerForm.tsx`):

```ts
const result = await createOrder({
  selectedOfferId:  store.selectedOffer.id,
  offerTotalAmount: store.selectedOffer.total_amount,
  offerCurrency:    store.selectedOffer.total_currency,
  passengerIds:     store.passengerIds,
  passengers:       formValues.passengers,
})

if (!result.success) {
  if (result.code === "offer_expired" || result.code === "offer_no_longer_available") {
    store.reset()
    router.push("/")
    return
  }
  if (result.code === "price_changed") {
    // re-fetch offer, update store, show price diff modal
    return
  }
  toast.error(result.error)
  return
}

store.setOrderId(result.data.orderId)
router.push(`/confirmation/${result.data.orderId}`)
```

---

## 9. Server Fetch in Page — Get Order (Confirmation)

**No action or route handler needed** — confirmation page is a Server Component.

```ts
// app/confirmation/[orderId]/page.tsx
import { duffelFetch } from "@/lib/duffel"
import type { DuffelSingleResponse, DuffelOrder } from "@/lib/types/duffel"
import { ConfirmationCard } from "@/components/confirmation/ConfirmationCard"
import { ErrorCard } from "@/components/confirmation/ErrorCard"

async function getOrder(orderId: string): Promise<DuffelOrder | null> {
  try {
    const res = await duffelFetch<DuffelSingleResponse<DuffelOrder>>(
      `/air/orders/${orderId}`
    )
    return res.data
  } catch {
    return null
  }
}

export default async function ConfirmationPage({
  params,
}: {
  params: { orderId: string }
}) {
  const order = await getOrder(params.orderId)

  if (!order) return <ErrorCard />

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 items-start justify-center p-10">
        <div className="w-full max-w-[640px] overflow-hidden rounded-lg border border-border bg-card">
          <ConfirmationCard order={order} />
        </div>
      </main>
    </div>
  )
}
```

---

## 10. Error Handling Reference

| Duffel code | Where it can appear | Action |
|-------------|---------------------|--------|
| `offer_expired` | `getOffer`, `createOrder` | `store.reset()` → `router.push("/")` + toast |
| `offer_no_longer_available` | `getOffer`, `createOrder` | Same as above |
| `price_changed` | `createOrder` | Re-fetch offer, show new price, ask user to confirm |
| `duplicate_booking` | `createOrder` | Toast + link to existing order |
| `invalid_passenger_name` | `createOrder` | Toast + `router.push("/passengers")` |
| HTTP 429 | Any | `ratelimit-reset` header — retry after delay |
| HTTP 503/504 | Any | Retry once; show error toast if persists |

---

## 11. `.env.example`

```bash
# Duffel API — https://app.duffel.com/developers/keys
# Test token prefix: duffel_test_
# Live token prefix: duffel_live_
DUFFEL_API_KEY=duffel_test_xxxxxxxxxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 12. `next.config.ts`

```ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.duffel.com" }, // airline logo SVGs
    ],
  },
  poweredByHeader: false,
}

export default nextConfig
```

> No `serverExternalPackages` needed — we're using raw fetch, not the `@duffel/api` SDK.

---

## 13. Key Implementation Warnings (from live API testing)

| # | Warning |
|---|---------|
| 1 | `passengerIds` are **one-time per offer request** — regenerated on every search |
| 2 | `payments.amount` must be the **exact string** from `offer.total_amount` — no `parseFloat`, no `toFixed` |
| 3 | `payments.currency` must match `offer.total_currency` exactly |
| 4 | `selected_offers[0]` must be `offer.id` from the **single offer fetch** (`GET /air/offers/{id}`), not the list |
| 5 | `return_offers=false` is mandatory on offer requests — round-trip inline returns 1,638 offers |
| 6 | Duration strings are ISO 8601 (`"PT2H30M"`) — parse with regex, not `date-fns` |
| 7 | `segments.length - 1` = layovers; `segment.stops[]` = technical stops (different concept) |
| 8 | Airline logos (`owner.logo_symbol_url`) are Duffel CDN SVGs — always show fallback if null |
