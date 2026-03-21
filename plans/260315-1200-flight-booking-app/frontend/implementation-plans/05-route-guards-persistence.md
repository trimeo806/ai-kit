# Gap 3 — Route Guards & State Persistence Plan

*Persist: Zustand + sessionStorage (tab-scoped, survives refresh)*
*Back from /passengers → /results · Reset on new search + "Search again"*
*Offer expiry on /passengers → modal, not silent redirect*
*Modify search → pre-filled form*

---

## Decision Summary

| Behaviour | Decision |
|-----------|----------|
| Persist strategy | Zustand `persist` middleware → `sessionStorage` |
| Back from `/passengers` | → `/results`, offer stays selected |
| Store reset triggers | New search submit + "Search again" on `/confirmation` |
| Offer expiry on `/passengers` | Modal: "This flight expired — start a new search?" |
| Modify search on `/results` | → `/` with form pre-filled from store |

---

## 1. Zustand Store with `persist` — `lib/store.ts`

### What to persist vs what to skip

| Field | Persist? | Reason |
|-------|----------|--------|
| `search` | ✅ | Powers "Modify search" pre-fill |
| `offerRequestId` | ✅ | Needed to reload `/results` after refresh |
| `passengerIds` | ✅ | Required verbatim in `POST /air/orders` |
| `selectedOffer` | ✅ | Needed on `/passengers` after refresh |
| `orderId` | ✅ | Needed to restore `/confirmation` after refresh |
| `filters` | ❌ | Stale filters on a new results page is confusing |
| `sortBy` | ❌ | Same — reset to default on each results load |

### Store implementation

```ts
// lib/store.ts
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { SearchFormValues } from "@/lib/types/forms"
import type { DuffelOffer } from "@/lib/types/duffel"

interface Filters {
  stops:         "all" | "direct" | "1stop" | "2plus"
  airlines:      string[]
  departureTime: [number, number]
  priceRange:    [number, number]
}

interface FlightStore {
  // ── Persisted ──────────────────────────────────────
  search:         SearchFormValues | null
  offerRequestId: string | null
  passengerIds:   string[]
  selectedOffer:  DuffelOffer | null
  orderId:        string | null

  // ── Session only (not persisted) ───────────────────
  filters: Filters
  sortBy:  "total_amount" | "total_duration"

  // ── Actions ────────────────────────────────────────
  setSearch:        (params: SearchFormValues) => void
  setOfferRequest:  (id: string, passengerIds: string[]) => void
  setSelectedOffer: (offer: DuffelOffer) => void
  setOrderId:       (id: string) => void
  setFilter:        (filter: Partial<Filters>) => void
  setSortBy:        (sort: FlightStore["sortBy"]) => void
  resetForNewSearch: () => void  // partial reset — new search submit
  resetAll:          () => void  // full reset — "Search again" on confirmation
}

const defaultFilters: Filters = {
  stops:         "all",
  airlines:      [],
  departureTime: [0, 23],
  priceRange:    [0, 9999],
}

export const useFlightStore = create<FlightStore>()(
  persist(
    (set) => ({
      // Initial state
      search:         null,
      offerRequestId: null,
      passengerIds:   [],
      selectedOffer:  null,
      orderId:        null,
      filters:        defaultFilters,
      sortBy:         "total_amount",

      // Actions
      setSearch: (params) =>
        set({ search: params }),

      setOfferRequest: (id, passengerIds) =>
        set({ offerRequestId: id, passengerIds }),

      setSelectedOffer: (offer) =>
        set({ selectedOffer: offer }),

      setOrderId: (id) =>
        set({ orderId: id }),

      setFilter: (filter) =>
        set((s) => ({ filters: { ...s.filters, ...filter } })),

      setSortBy: (sort) =>
        set({ sortBy: sort }),

      // Partial reset: new search overwrites offer/order data, keeps search params
      resetForNewSearch: () =>
        set({
          offerRequestId: null,
          passengerIds:   [],
          selectedOffer:  null,
          orderId:        null,
          filters:        defaultFilters,
          sortBy:         "total_amount",
        }),

      // Full reset: "Search again" — clears everything
      resetAll: () =>
        set({
          search:         null,
          offerRequestId: null,
          passengerIds:   [],
          selectedOffer:  null,
          orderId:        null,
          filters:        defaultFilters,
          sortBy:         "total_amount",
        }),
    }),
    {
      name:    "flight-store",
      storage: createJSONStorage(() => sessionStorage), // tab-scoped, cleared on tab close
      partialize: (state) => ({
        // Only these fields written to sessionStorage
        search:         state.search,
        offerRequestId: state.offerRequestId,
        passengerIds:   state.passengerIds,
        selectedOffer:  state.selectedOffer,
        orderId:        state.orderId,
        // filters + sortBy intentionally excluded
      }),
    }
  )
)
```

---

## 2. Hydration Guard — `lib/hooks/useHydrated.ts`

Zustand `persist` with `sessionStorage` reads from the browser — unavailable during SSR. Without a guard, the server renders with empty state and the client re-renders after hydration, causing a flash or a premature redirect.

```ts
// lib/hooks/useHydrated.ts
import { useEffect, useState } from "react"

/**
 * Returns false on the server and on the first client render (before
 * sessionStorage has been read). Returns true once Zustand has rehydrated.
 *
 * Usage: gate any store-dependent logic (guards, pre-fills) behind this.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // useFlightStore.persist.hasHydrated() is true after the first rehydration
    const unsub = useFlightStore.persist.onFinishHydration(() => setHydrated(true))
    // In case hydration already finished before this effect runs
    if (useFlightStore.persist.hasHydrated()) setHydrated(true)
    return unsub
  }, [])

  return hydrated
}
```

---

## 3. Route Guards

### Guard map

| Page | Requires | Redirect to |
|------|----------|-------------|
| `/results` | `offerRequestId` OR `?orq=` in URL | `/` |
| `/passengers` | `selectedOffer` | `/results` |
| `/confirmation/[orderId]` | None — server fetches order by `orderId` in URL | — |

### `RequireOfferRequest` — for `/results`

`/results` is special: `?orq=` in the URL is the canonical source of truth. The guard reads the URL param first, falls back to the store, and redirects only if both are absent.

```tsx
// components/shared/RequireOfferRequest.tsx
"use client"
import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useFlightStore } from "@/lib/store"
import { useHydrated } from "@/lib/hooks/useHydrated"

export function RequireOfferRequest({ children }: { children: React.ReactNode }) {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const hydrated      = useHydrated()
  const storedOrq     = useFlightStore((s) => s.offerRequestId)
  const setOfferReq   = useFlightStore((s) => s.setOfferRequest)
  const urlOrq        = searchParams.get("orq")

  useEffect(() => {
    if (!hydrated) return

    if (urlOrq) {
      // URL is authoritative — sync to store if missing
      if (!storedOrq) setOfferReq(urlOrq, [])
      return
    }

    if (!storedOrq) {
      router.replace("/")
    }
  }, [hydrated, urlOrq, storedOrq])

  // Show nothing until hydrated — prevents flash of redirected content
  if (!hydrated) return null

  return <>{children}</>
}
```

### `RequireSelectedOffer` — for `/passengers`

```tsx
// components/shared/RequireSelectedOffer.tsx
"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useFlightStore } from "@/lib/store"
import { useHydrated } from "@/lib/hooks/useHydrated"

export function RequireSelectedOffer({ children }: { children: React.ReactNode }) {
  const router        = useRouter()
  const hydrated      = useHydrated()
  const selectedOffer = useFlightStore((s) => s.selectedOffer)
  const orqId         = useFlightStore((s) => s.offerRequestId)

  useEffect(() => {
    if (!hydrated) return
    if (!selectedOffer) {
      // Go back to results if we have an orqId, otherwise home
      router.replace(orqId ? `/results?orq=${orqId}` : "/")
    }
  }, [hydrated, selectedOffer, orqId])

  if (!hydrated || !selectedOffer) return null

  return <>{children}</>
}
```

### Wiring guards into pages

```tsx
// app/results/page.tsx
import { RequireOfferRequest } from "@/components/shared/RequireOfferRequest"

export default function ResultsPage() {
  return (
    <RequireOfferRequest>
      {/* ... results content ... */}
    </RequireOfferRequest>
  )
}

// app/passengers/page.tsx
import { RequireSelectedOffer } from "@/components/shared/RequireSelectedOffer"

export default function PassengersPage() {
  return (
    <RequireSelectedOffer>
      {/* ... passenger form content ... */}
    </RequireSelectedOffer>
  )
}
```

---

## 4. Offer Expiry Modal — `/passengers`

`selectedOffer.expires_at` is an ISO datetime. Check on mount and poll every 30 seconds.

```tsx
// components/passengers/OfferExpiryGuard.tsx
"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useFlightStore } from "@/lib/store"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

export function OfferExpiryGuard() {
  const router        = useRouter()
  const selectedOffer = useFlightStore((s) => s.selectedOffer)
  const resetAll      = useFlightStore((s) => s.resetAll)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!selectedOffer?.expires_at) return

    const checkExpiry = () => {
      if (new Date(selectedOffer.expires_at) <= new Date()) {
        setExpired(true)
      }
    }

    checkExpiry() // check immediately on mount

    const interval = setInterval(checkExpiry, 30_000) // recheck every 30s
    return () => clearInterval(interval)
  }, [selectedOffer?.expires_at])

  function handleConfirm() {
    resetAll()
    router.replace("/")
  }

  return (
    <AlertDialog open={expired}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>This flight has expired</AlertDialogTitle>
          <AlertDialogDescription>
            Flight prices are held for a limited time. Please start a new search
            to find available flights.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleConfirm}>
            Start a new search
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

Wire into `/passengers` page alongside the guard:

```tsx
// app/passengers/page.tsx
export default function PassengersPage() {
  return (
    <RequireSelectedOffer>
      <OfferExpiryGuard />
      {/* ... rest of page ... */}
    </RequireSelectedOffer>
  )
}
```

---

## 5. Store Reset — Two Triggers

### Trigger 1: New search submit

Called in `SearchForm.tsx` before navigating to `/results`:

```ts
// components/search/SearchForm.tsx — inside onSubmit
const result = await searchFlights(values)
if (!result.success) { toast.error(result.error); return }

store.resetForNewSearch()                    // clears offer/order, keeps search
store.setSearch(values)                      // write new search params
store.setOfferRequest(result.data.offerRequestId, result.data.passengerIds)
router.push(`/results?orq=${result.data.offerRequestId}`)
```

### Trigger 2: "Search again" on confirmation

```tsx
// components/confirmation/ConfirmationCard.tsx
const resetAll = useFlightStore((s) => s.resetAll)

<Button
  variant="outline"
  onClick={() => { resetAll(); router.push("/") }}
>
  Search again
</Button>
```

---

## 6. Modify Search — Pre-filled Form

"Modify" button on `/results` sticky header navigates to `/` with store's `search` still intact. The search form reads from the store on mount.

```tsx
// components/results/StickyHeader.tsx
const orqId = useFlightStore((s) => s.offerRequestId)

<Button variant="ghost" onClick={() => router.push("/")}>
  Modify search
</Button>
```

```tsx
// components/search/SearchForm.tsx — pre-fill from store on mount
const storedSearch = useFlightStore((s) => s.search)

const form = useForm<SearchFormValues>({
  resolver:      zodResolver(searchFormSchema),
  defaultValues: storedSearch ?? searchFormDefaults, // ← pre-fill if returning from /results
  mode:          "onSubmit",
  reValidateMode: "onChange",
})
```

Since `search` is persisted in sessionStorage, the form is pre-filled automatically — no extra logic needed.

---

## 7. Back Navigation — `/passengers` → `/results`

Browser back from `/passengers` naturally navigates to `/results?orq=...` via the browser history stack. No custom handling needed — the URL and store state are both intact because:

- `selectedOffer` is still in sessionStorage
- `offerRequestId` is still in the URL (`?orq=`)
- `RequireOfferRequest` guard on `/results` passes — the orq param is in the URL

The only edge case is if the user clears sessionStorage manually — in that case `RequireOfferRequest` falls back to the URL `?orq=` param and still loads the results page (it just won't have the previously selected offer highlighted).

---

## 8. File Summary

```
lib/
├── store.ts                              # Zustand + persist (updated)
└── hooks/
    └── useHydrated.ts                    # SSR-safe hydration hook

components/
└── shared/
    ├── RequireOfferRequest.tsx           # Guard for /results
    └── RequireSelectedOffer.tsx          # Guard for /passengers

components/
└── passengers/
    └── OfferExpiryGuard.tsx              # Expiry modal on /passengers
```

---

## 9. Edge Cases Covered

| Scenario | Behaviour |
|----------|-----------|
| Refresh on `/results` | `RequireOfferRequest` reads `?orq=` from URL — page loads normally |
| Refresh on `/passengers` | `selectedOffer` restored from sessionStorage — page loads normally |
| Refresh on `/confirmation/[orderId]` | Server fetches order by `orderId` in URL — no store needed |
| Tab closed and reopened | sessionStorage cleared — guard redirects to `/` |
| Two tabs open | Each tab has its own sessionStorage — independent booking flows |
| Offer expires while filling form | Modal after 30s poll — user confirms → full reset → `/` |
| Corrupted sessionStorage | Zod parse fails on rehydration → Zustand falls back to initial state |
| Direct URL to `/passengers` with no store | `RequireSelectedOffer` → redirect to `/results` if orqId exists, else `/` |
