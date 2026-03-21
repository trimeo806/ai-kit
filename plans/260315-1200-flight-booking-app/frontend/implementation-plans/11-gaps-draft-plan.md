# Gaps Draft Plan — Flight Booking App Frontend

*Covers items identified in review: data layer, types, guards, validation, config, edge cases, performance*

---

## Gap 1 — API / Data Layer (`lib/duffel.ts`)

### Decision needed: where does each call run?

| Endpoint | Runs on | Reason |
|----------|---------|--------|
| `POST /air/offer_requests` | **Server Action** | Contains Duffel API key — must not reach browser |
| `GET /air/offers?offer_request_id=` | **Server Action** | Same — key protection |
| `GET /air/offers/{id}` | **Server Action** | Same |
| `GET /places/suggestions?query=` | **Route Handler** `/api/places` | Debounced from client combobox; key proxied server-side |
| `POST /air/orders` | **Route Handler** `/api/orders` | Already in layout guide |
| `GET /air/orders/{id}` | **Server fetch in page** | Confirmation page is a server component |

### Duffel client setup

```ts
// lib/duffel.ts  (server-only)
import "server-only"
import { Duffel } from "@duffel/api"

export const duffel = new Duffel({
  token: process.env.DUFFEL_API_KEY!,
})
```

**Open question**: Use the official `@duffel/api` SDK or raw `fetch`? SDK adds ~30KB but gives typed responses.

### Route Handler — places proxy

```ts
// app/api/places/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("query") ?? ""
  if (query.length < 2) return Response.json([])
  // forward to Duffel /places/suggestions
}
```

**Open question**: Cache suggestions? (`next: { revalidate: 3600 }` for airport data that rarely changes)

---

## Gap 2 — Type Definitions (`lib/types/`)

### Proposed file structure

```
lib/types/
├── duffel.ts        # Duffel API shapes (Offer, Order, Passenger, Slice, Segment)
├── store.ts         # Zustand store types (move from store.ts inline)
└── forms.ts         # Zod inferred types for search + passenger forms
```

### Minimum Duffel shapes needed

```ts
// lib/types/duffel.ts

export interface DuffelPassenger {
  id: string
  type: "adult" | "child" | "infant_without_seat"
}

export interface DuffelSegment {
  departing_at: string       // ISO datetime
  arriving_at: string
  origin: { iata_code: string; name: string; city_name: string }
  destination: { iata_code: string; name: string; city_name: string }
  operating_carrier: { name: string; iata_code: string; logo_symbol_url?: string }
  duration: string           // ISO 8601 e.g. "PT1H30M"
}

export interface DuffelSlice {
  id: string
  origin: { iata_code: string }
  destination: { iata_code: string }
  duration: string
  segments: DuffelSegment[]
}

export interface DuffelOffer {
  id: string
  total_amount: string
  total_currency: string
  base_amount: string
  tax_amount: string
  passengers: DuffelPassenger[]
  slices: DuffelSlice[]
  owner: { name: string; iata_code: string; logo_symbol_url?: string }
  conditions: {
    change_before_departure?: { allowed: boolean; penalty_amount?: string }
    refund_before_departure?: { allowed: boolean; penalty_amount?: string }
  }
}

export interface DuffelOrder {
  id: string
  booking_reference: string
  total_amount: string
  base_amount: string
  tax_amount: string
  total_currency: string
  passengers: Array<{
    id: string
    given_name: string
    family_name: string
    title: string
    type: string
  }>
  slices: DuffelSlice[]
}
```

**Open question**: Use `@duffel/api` SDK types directly vs maintaining our own? SDK types are more complete but create a hard dependency.

---

## Gap 3 — Route Guards & State Persistence

### The core problem

Zustand state is in-memory. A refresh on `/passengers` loses `selectedOffer`. Two strategies:

#### Option A — Zustand `persist` middleware (simple)

```ts
// lib/store.ts
import { persist } from "zustand/middleware"

export const useFlightStore = create<FlightStore>()(
  persist(
    (set) => ({ ... }),
    {
      name: "flight-store",
      storage: createJSONStorage(() => sessionStorage),  // sessionStorage: tab-scoped
      partialize: (state) => ({                          // only persist what's needed
        offerRequestId: state.offerRequestId,
        passengerIds: state.passengerIds,
        selectedOffer: state.selectedOffer,
      }),
    }
  )
)
```

#### Option B — URL-encoded state (shareable links)

`/passengers?offer=ofq_xxx` — offer ID in URL, refetch on mount if store is empty.

**Recommendation**: Option A for simplicity. Option B only if shareable booking links are required.

### Route guard pattern

```tsx
// components/shared/RequireOffer.tsx — client component guard
"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useFlightStore } from "@/lib/store"

export function RequireOffer({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const selectedOffer = useFlightStore((s) => s.selectedOffer)

  useEffect(() => {
    if (!selectedOffer) router.replace("/")
  }, [selectedOffer, router])

  if (!selectedOffer) return null   // or a loading spinner
  return <>{children}</>
}
```

**Pages that need a guard**:

| Page | Requires |
|------|----------|
| `/results` | `offerRequestId` |
| `/passengers` | `selectedOffer` |
| `/confirmation/[orderId]` | No guard — fetches from API by `orderId` in URL |

**Open question**: Use `middleware.ts` (server-side redirect before page renders) vs client-side guard? Middleware can't read Zustand/sessionStorage — client guard is the only real option unless state is in a cookie.

---

## Gap 4 — Search Form Validation

### Zod schema

```ts
// lib/types/forms.ts
import { z } from "zod"

export const searchFormSchema = z.object({
  tripType:    z.enum(["one_way", "round_trip", "multi_city"]),
  origin:      z.object({
    iata: z.string().length(3, "Select a valid airport"),
    name: z.string(),
  }),
  destination: z.object({
    iata: z.string().length(3, "Select a valid airport"),
    name: z.string(),
  }),
  departDate:  z.string().min(1, "Select a departure date")
    .refine((d) => new Date(d) >= new Date(), "Departure must be in the future"),
  returnDate:  z.string().optional()
    .refine(/* only required when round_trip */ ...),
  passengers:  z.array(z.object({
    type:  z.enum(["adult", "child", "infant_without_seat"]),
    count: z.number().min(0).max(9),
  })).refine((p) => p.reduce((sum, x) => sum + x.count, 0) >= 1, "At least 1 passenger"),
  cabinClass:  z.enum(["economy", "premium_economy", "business", "first"]),
})
.refine(
  (data) => data.origin.iata !== data.destination.iata,
  { message: "Origin and destination must differ", path: ["destination"] }
)

export type SearchFormValues = z.infer<typeof searchFormSchema>
```

**Open question**: When origin === destination, should the error show on destination or as a form-level banner?

---

## Gap 5 — `next.config.ts`

```ts
// next.config.ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Duffel airline logo CDN
      { protocol: "https", hostname: "assets.duffel.com" },
    ],
  },

  // Prevent Duffel key from being bundled client-side
  serverExternalPackages: ["@duffel/api"],

  // Optional: disable x-powered-by header
  poweredByHeader: false,
}

export default nextConfig
```

**`.env.local` template** (to be committed as `.env.example`):

```bash
# Duffel API
DUFFEL_API_KEY=duffel_test_xxxxxxxxxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Open question**: Is there a staging Duffel key? Should test vs live mode be environment-controlled?

---

## Gap 6 — Multi-City & Round-Trip Edge Cases

### Scope decision needed

| Feature | Complexity | Recommendation |
|---------|-----------|----------------|
| One-way | Already wireframed | ✅ In scope |
| Round-trip | Calendar `mode="range"`, 2 slices in offer request | ✅ In scope — add wireframe |
| Multi-city | N-slice builder UI (add/remove rows), significant form complexity | ⚠️ Defer to v2 |

### Round-trip additions needed

The wireframes show the "Round-trip" pill but no expanded state. Additions required:

- Return date enabled when `tripType === "round_trip"`
- `POST /air/offer_requests` payload gains a second slice:
  ```json
  "slices": [
    { "origin": "KUL", "destination": "SIN", "departure_date": "2026-05-15" },
    { "origin": "SIN", "destination": "KUL", "departure_date": "2026-05-22" }
  ]
  ```
- Results page may return outbound + return as separate offers — need to decide if this app picks one combined offer or pairs them manually

**Open question**: Does the assessment require round-trip support, or is one-way sufficient to score well?

---

## Gap 7 — Filter Performance

### Problem

With 80+ offers, running 4 filters (stops + airline + time + price) on every keystroke/toggle is wasteful.

### Solution — `useMemo`

```ts
// components/results/useFilteredOffers.ts
import { useMemo } from "react"
import { useFlightStore } from "@/lib/store"
import type { DuffelOffer } from "@/lib/types/duffel"

export function useFilteredOffers(offers: DuffelOffer[]) {
  const { filters, sortBy } = useFlightStore()

  return useMemo(() => {
    let result = offers

    // Stops filter
    if (filters.stops !== "all") {
      result = result.filter((o) => {
        const stopCount = o.slices[0].segments.length - 1
        if (filters.stops === "direct") return stopCount === 0
        if (filters.stops === "1stop")  return stopCount === 1
        if (filters.stops === "2plus")  return stopCount >= 2
        return true
      })
    }

    // Airlines filter
    if (filters.airlines.length > 0) {
      result = result.filter((o) =>
        filters.airlines.includes(o.owner.iata_code)
      )
    }

    // Price range
    result = result.filter((o) => {
      const price = parseFloat(o.total_amount)
      return price >= filters.priceRange[0] && price <= filters.priceRange[1]
    })

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === "total_amount")  return parseFloat(a.total_amount) - parseFloat(b.total_amount)
      if (sortBy === "total_duration") return a.slices[0].duration.localeCompare(b.slices[0].duration)
      return 0
    })

    return result
  }, [offers, filters, sortBy])
}
```

**Open question**: Price range slider — derive `min`/`max` from loaded offers dynamically, or hardcode? Dynamic is better UX.

---

## Gap 8 — Minor Items

### 8a — `generateMetadata`

```ts
// app/page.tsx
export const metadata = {
  title: "Search Flights — FlightApp",
  description: "Search hundreds of airlines for the best deal",
}

// app/results/page.tsx
export async function generateMetadata({ searchParams }) {
  return { title: `Flight Results — FlightApp` }
}

// app/confirmation/[orderId]/page.tsx
export async function generateMetadata({ params }) {
  return { title: `Booking ${params.orderId} — FlightApp` }
}
```

### 8b — Airline Logo Fallback

When `logo_symbol_url` is `null` or errors:

```tsx
// components/shared/AirlineLogo.tsx
export function AirlineLogo({ iata, url, name }: Props) {
  const [error, setError] = useState(false)

  if (error || !url) {
    return (
      <div className="h-10 w-10 rounded bg-muted border border-border
                      flex items-center justify-center
                      text-base font-bold text-muted-foreground">
        {iata.slice(0, 2)}
      </div>
    )
  }

  return (
    <Image
      src={url} alt={`${name} logo`}
      width={40} height={40}
      className="h-10 w-10 rounded object-contain"
      onError={() => setError(true)}
    />
  )
}
```

### 8c — Error Boundaries

```tsx
// app/results/error.tsx  (Next.js App Router error boundary)
"use client"
export default function ResultsError({ error, reset }) {
  return (
    <div className="flex flex-col items-center gap-4 p-10">
      <p className="text-base text-muted-foreground">Failed to load flights.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
```

One `error.tsx` per route segment is sufficient.

### 8d — Mobile Passenger Form Sidebar

On `< lg` screens, `BookingSummary` sidebar collapses to a sticky footer:

```tsx
// Sticky bottom bar on mobile
<div className="lg:hidden fixed bottom-0 inset-x-0 border-t bg-card p-4 flex items-center justify-between">
  <div>
    <p className="text-base text-muted-foreground">Total</p>
    <p className="text-2xl font-bold">€92.86</p>
  </div>
  <Button className="h-12 px-8">Confirm booking</Button>
</div>
```

---

## Open Questions Summary

| # | Question | Impact |
|---|----------|--------|
| 1 | Use `@duffel/api` SDK or raw `fetch`? | Types, bundle size |
| 2 | Cache `/places/suggestions` responses? | Performance |
| 3 | Zustand `persist` (sessionStorage) vs URL state? | Refresh UX |
| 4 | Origin === destination error: field-level or form banner? | UX |
| 5 | Commit `.env.example`? Staging key available? | Dev setup |
| 6 | Is round-trip required for assessment? Multi-city in scope? | Scope |
| 7 | Price range slider: dynamic min/max from offers or fixed? | UX |

---

## Suggested File Additions

```
src/
├── lib/
│   ├── duffel.ts                    ← Gap 1: Duffel server client
│   ├── types/
│   │   ├── duffel.ts               ← Gap 2: API shapes
│   │   ├── store.ts                ← Gap 2: store types (extract from store.ts)
│   │   └── forms.ts                ← Gap 4: Zod schemas + inferred types
│   └── store.ts                    ← Gap 3: add persist middleware
├── app/
│   ├── api/
│   │   └── places/route.ts         ← Gap 1: places proxy
│   ├── results/error.tsx           ← Gap 8c
│   ├── passengers/error.tsx        ← Gap 8c
│   └── confirmation/error.tsx      ← Gap 8c
├── components/
│   ├── shared/
│   │   ├── RequireOffer.tsx         ← Gap 3: route guard
│   │   └── AirlineLogo.tsx         ← Gap 8b: logo fallback (already in file structure)
│   └── results/
│       └── useFilteredOffers.ts    ← Gap 7: memoized filter hook
└── next.config.ts                  ← Gap 5
.env.example                        ← Gap 5
```
