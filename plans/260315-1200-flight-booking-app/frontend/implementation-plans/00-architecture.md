# Frontend Architecture — Flight Booking App

**Date**: 2026-03-19
**Framework**: Next.js 16 App Router
**API**: Duffel API v2 (REST) via server-only proxy
**Status**: Authoritative reference for scaffolding and implementation

---

## Table of Contents

- [1. Tech Stack](#1-tech-stack)
- [2. Project Structure](#2-project-structure)
- [3. Routing](#3-routing)
- [4. Data Fetching Architecture](#4-data-fetching-architecture)
- [5. State Management](#5-state-management)
- [6. Component Architecture](#6-component-architecture)
- [7. Type System](#7-type-system)
- [8. Route Guards & Hydration](#8-route-guards--hydration)
- [9. Design System](#9-design-system)
- [10. Error Handling](#10-error-handling)
- [11. Dependencies](#11-dependencies)
- [12. Environment Setup](#12-environment-setup)
- [13. Internationalisation (i18n)](#13-internationalisation-i18n)
- [Plan 12 — TODO (Post-Project)](#plan-12--todo-post-project)

---

## 1. Tech Stack

| Library | Version | Justification |
|---------|---------|---------------|
| Next.js | 16.2.0 (App Router) | Server Components, Route Handlers, Server Actions in one framework |
| TypeScript | 5.9.3 (strict) | Type safety across client/server boundary |
| Tailwind CSS | 4.2.1 | CSS-first config via `@theme`, zero runtime CSS, Safari 16.4+/Chrome 111+ |
| shadcn/ui | latest | Radix UI primitives with copy-paste ownership, no vendor lock |
| Zustand | 5.0.12 + `persist` | Lightweight client state (2KB), sessionStorage persistence |
| react-hook-form | 7.71.2 | Performant uncontrolled forms with Zod integration |
| Zod | 4.3.6 | Schema validation shared between forms and Server Actions |
| motion | 12.37.0 (`motion/react`) | Rebranded from framer-motion; state-driven animations, tree-shaking (~7-9KB) |
| Inter | (next/font/google) | Skyscanner reference font, replaces Geist — loaded via `next/font/google` |
| next-intl | 3.x | App Router i18n — locale routing, message extraction, server + client hooks |
| Sonner | 2.0.7 | Toast notifications, zero-config with shadcn wrapper |
| date-fns | 4.1.0 | Lightweight date formatting (tree-shakeable) |
| @hookform/resolvers | 5.2.2 | Zod 4 + react-hook-form bridge; new type inference pattern |

**Explicitly NOT using**:
- `@duffel/api` SDK — raw `fetch` keeps bundle lean and code transparent
- TanStack Query — not needed; Route Handlers handle caching, no client-side cache required
- Redux/Jotai — Zustand is sufficient for this 4-screen linear flow
- `framer-motion` — use `motion` package instead (official rebrand, identical API)

---

## 2. Project Structure

```
src/
├── app/
│   ├── layout.tsx                          # Minimal root shell (html + body only, no font/provider logic)
│   ├── globals.css                         # Tailwind v4 + CSS custom properties (tokens)
│   ├── [locale]/                           # ← next-intl locale segment (en / ms / zh)
│   │   ├── layout.tsx                      # Locale layout: Inter font, NextIntlClientProvider, TooltipProvider, Toaster
│   │   ├── page.tsx                        # F1: Search (/[locale])
│   │   ├── results/
│   │   │   ├── page.tsx                    # F2: Results (/[locale]/results?orq=)
│   │   │   └── error.tsx                   # Error boundary for results
│   │   ├── passengers/
│   │   │   ├── page.tsx                    # F3: Passenger Details (/[locale]/passengers)
│   │   │   └── error.tsx                   # Error boundary for passengers
│   │   └── confirmation/
│   │       └── [orderId]/
│   │           ├── page.tsx                # F4: Confirmation — async Server Component
│   │           └── error.tsx              # Error boundary for confirmation
│   └── api/
│       ├── places/
│       │   └── route.ts                    # GET → Duffel /places/suggestions
│       └── flights/
│           └── offers/
│               └── route.ts               # GET → Duffel /air/offers (paginated)
│
├── actions/
│   ├── search.ts                           # searchFlights() → POST /air/offer_requests
│   ├── offers.ts                           # getOffer() → GET /air/offers/{id}
│   └── booking.ts                          # createOrder() → POST /air/orders
│
├── components/
│   ├── ui/                                 # shadcn auto-generated (do NOT edit)
│   ├── search/
│   │   ├── SearchForm.tsx                  # "use client" — useForm + useTransition
│   │   ├── AirportCombobox.tsx             # Command + Popover, debounced /api/places
│   │   ├── DateRangePicker.tsx             # Calendar + Popover, single or range mode
│   │   ├── PassengerSelector.tsx           # Counter popover (adults/children/infants)
│   │   ├── TripTypePills.tsx               # One-way / Round-trip toggle
│   │   └── SwapButton.tsx                  # 40x40 circle swap origin/destination
│   ├── results/
│   │   ├── ResultsList.tsx                 # "use client" — fetches /api/flights/offers, renders cards
│   │   ├── FlightCard.tsx                  # 3-col grid: airline+times | duration+badge | price+CTA
│   │   ├── FlightCardSkeleton.tsx          # Shimmer loading placeholder (x3)
│   │   ├── FilterPanel.tsx                 # Stops + Airlines + DepartureTime + Price
│   │   ├── SortBar.tsx                     # Cheapest / Fastest / Earliest tabs
│   │   ├── StickyHeader.tsx                # Compact search summary + "Modify" button
│   │   ├── MobileFilterTrigger.tsx         # Sheet trigger for < lg breakpoint
│   │   ├── EmptyState.tsx                  # "No flights found" message
│   │   └── hooks/
│   │       └── useFilteredOffers.ts        # useMemo filter+sort pipeline
│   ├── passengers/
│   │   ├── PassengerForm.tsx               # "use client" — useForm + Accordion
│   │   ├── PassengerCard.tsx               # AccordionItem per passenger
│   │   ├── BookingSummary.tsx              # Sticky sidebar (desktop) / footer bar (mobile)
│   │   └── OfferExpiryGuard.tsx            # Polls expires_at, shows AlertDialog on expiry
│   ├── confirmation/
│   │   ├── ConfirmationCard.tsx            # Success layout: header + flight + passengers + price
│   │   └── ErrorCard.tsx                   # Error variant for failed order fetch
│   └── shared/
│       ├── ProgressStepper.tsx             # 4-step indicator (Search → Results → Passengers → Confirm)
│       ├── StopBadge.tsx                   # Nonstop (green) / 1 stop (yellow) / 2+ (red)
│       ├── AirlineLogo.tsx                 # 40x40 logo tile with IATA fallback
│       ├── RequireOfferRequest.tsx         # Route guard for /[locale]/results
│       ├── RequireSelectedOffer.tsx        # Route guard for /[locale]/passengers
│       └── LocaleSwitcher.tsx             # Locale toggle (EN / MY / ZH) — placed in NavBar
│
├── lib/
│   ├── duffel.ts                           # server-only fetch wrapper + DuffelError class
│   ├── store.ts                            # Zustand + persist (sessionStorage)
│   ├── utils.ts                            # cn() + parseDuration() + parseDurationMs()
│   ├── hooks/
│   │   └── useHydrated.ts                  # SSR-safe hydration gate for store
│   ├── types/
│   │   ├── duffel.ts                       # All Duffel API response shapes
│   │   ├── forms.ts                        # Zod schemas + inferred TS types
│   │   └── actions.ts                      # ActionResult<T> discriminated union
│   └── animations/
│       ├── tokens.ts                       # Duration, easing, stagger constants
│       ├── variants.ts                     # Shared reusable variants (fade, slide, scale)
│       └── hooks.ts                        # usePrefersReducedMotion
│
├── messages/
│   ├── en.json                             # English (default)
│   ├── ms.json                             # Bahasa Malaysia
│   └── zh.json                             # Chinese (Simplified)
├── i18n/
│   ├── routing.ts                          # defineRouting() — locales + defaultLocale
│   └── request.ts                          # getRequestConfig() — per-request locale
├── middleware.ts                           # next-intl locale detection + redirect
├── next.config.ts
├── tailwind.config.ts
├── components.json                         # shadcn/ui config
└── .env.example
```

---

## 3. Routing

### Route Table

| Route | Page | Rendering | Auth | Guard |
|-------|------|-----------|------|-------|
| `/[locale]` | Search | Client Component (form interactivity) | No | None |
| `/[locale]/results?orq={id}` | Results | Client Component (filters, pagination) | No | `RequireOfferRequest` |
| `/[locale]/passengers` | Passenger Details | Client Component (form) | No | `RequireSelectedOffer` |
| `/[locale]/confirmation/[orderId]` | Confirmation | Server Component (async) | No | None (server fetch) |

> **Locale routing**: next-intl uses a `[locale]` segment at the root. The `middleware.ts` detects the user's preferred locale (from `Accept-Language` header) and redirects `/` → `/en` (or `/ms`, `/zh`). The `defaultLocale` is `"en"` and it is **not** prefixed-hidden — all routes include the locale segment for consistency.

> **Next.js 16 — Async `params`**: Page props (`params`, `searchParams`) are now Promises and must be awaited. All page components must be `async`:
> ```ts
> // app/confirmation/[orderId]/page.tsx
> export default async function ConfirmationPage({
>   params,
> }: {
>   params: Promise<{ orderId: string }>
> }) {
>   const { orderId } = await params
>   ...
> }
> ```

### Navigation Flow

```
/  ──(search submit)──>  /results?orq={offerRequestId}
                              │
                    (select flight card)
                              │
                              v
                        /passengers
                              │
                     (confirm booking)
                              │
                              v
                    /confirmation/{orderId}
                              │
                      ("Search again")
                              │
                              v
                              /
```

### Key Navigation Rules

- **Forward navigation**: always `router.push()` — preserves browser history
- **Guard redirects**: always `router.replace()` — avoids redirect loops in history
- **"Modify search"** on /results: `router.push("/")` — store.search pre-fills the form
- **"Search again"** on /confirmation: `store.resetAll()` then `router.push("/")`
- **Browser back** from /passengers: naturally returns to /results (URL + store intact)
- **`?orq=` param** is the canonical source of truth for /results (not the store)

> **Locale-aware routing**: Import `useRouter` and `Link` from `"next-intl/navigation"` — NOT from `"next/navigation"`. The next-intl versions automatically prepend the active locale to every path, so `router.push("/")` navigates to `/en/` (or `/ms/`, `/zh/`) without manual locale injection.

---

## 4. Data Fetching Architecture

### Decision: Hybrid Server Actions + Route Handlers

Server Actions handle mutations and one-off server fetches. Route Handlers handle client-initiated GETs that need debouncing or pagination.

### Endpoint Routing Table

| Duffel API Endpoint | Frontend Pattern | File | Trigger | Reason |
|---------------------|-----------------|------|---------|--------|
| `GET /places/suggestions` | Route Handler | `app/api/places/route.ts` | Combobox keystroke (300ms debounce) | Client-initiated debounced GET |
| `POST /air/offer_requests` | Server Action | `actions/search.ts` | "Search flights" button | Form submit mutation |
| `GET /air/offers` (paginated) | Route Handler | `app/api/flights/offers/route.ts` | Page mount + "Load more" + sort change | Client-driven pagination with cursor |
| `GET /air/offers/{id}` | Server Action | `actions/offers.ts` | Flight card "Select" click | One-off fetch, returns to client |
| `POST /air/orders` | Server Action | `actions/booking.ts` | "Confirm booking" button | Form submit mutation |
| `GET /air/orders/{id}` | Direct server fetch | `app/confirmation/[orderId]/page.tsx` | Page load (Server Component) | No client needed, server renders directly |

### Duffel Client (`lib/duffel.ts`)

- Single `duffelFetch<T>()` wrapper using native `fetch`
- `import "server-only"` — build error if imported in client bundle
- Bearer token from `process.env.DUFFEL_API_KEY` (never `NEXT_PUBLIC_`)
- `Duffel-Version: v2` header on all requests
- Custom `DuffelError` class carries `.status` and `.error.code` for error routing
- No SDK dependency — raw fetch for transparency and minimal bundle

### Server Action Return Type

All Server Actions return a discriminated union:

```ts
type ActionResult<T> =
  | { success: true;  data: T }
  | { success: false; error: string; code?: string }
```

### Critical API Warnings

| # | Warning |
|---|---------|
| 1 | `passengerIds` are one-time per offer request — regenerated on every search |
| 2 | `payments.amount` must be the exact string from `offer.total_amount` — no `parseFloat`/`toFixed` |
| 3 | `payments.currency` must match `offer.total_currency` exactly |
| 4 | `selected_offers[0]` must be the offer ID from `GET /air/offers/{id}`, not the list |
| 5 | `return_offers=false` is mandatory on offer requests — otherwise returns 1,638+ inline offers |
| 6 | Duration strings are ISO 8601 (`"PT2H30M"`) — parse with regex, not `date-fns` |
| 7 | `segments.length - 1` = layovers; `segment.stops[]` = technical stops (different concept) |
| 8 | Airline logos (`owner.logo_symbol_url`) are Duffel CDN SVGs — always show fallback if null |

---

## 5. State Management

### Strategy Table

| State Type | Tool | Rationale |
|-----------|------|-----------|
| Booking flow state | Zustand + persist (sessionStorage) | Survives refresh, tab-scoped, cleared on tab close |
| Filters & sort | Zustand (not persisted) | Reset to defaults on each results page load |
| Form state | react-hook-form (uncontrolled) | Performant, Zod validation, shadcn Form integration |
| URL state | `?orq=` search param on /results | Canonical source of truth, bookmarkable |
| Server state | Route Handlers / Server Actions | No client cache library needed |
| UI micro-state | `useState` | Component-scoped (open/close, loading, error) |

### Zustand Store Shape

```ts
interface FlightStore {
  // ── Persisted (sessionStorage) ──────────────────
  search:         SearchFormValues | null   // Powers "Modify search" pre-fill
  offerRequestId: string | null             // Needed to reload /results after refresh
  passengerIds:   string[]                  // Required verbatim in POST /air/orders
  selectedOffer:  DuffelOffer | null        // Needed on /passengers after refresh
  orderId:        string | null             // Needed to restore /confirmation after refresh

  // ── Session only (NOT persisted) ─────────────────
  filters: Filters                          // Reset to defaults on results page load
  sortBy:  "total_amount" | "total_duration"

  // ── Actions ──────────────────────────────────────
  setSearch(params: SearchFormValues): void
  setOfferRequest(id: string, passengerIds: string[]): void
  setSelectedOffer(offer: DuffelOffer): void
  setOrderId(id: string): void
  setFilter(filter: Partial<Filters>): void
  setSortBy(sort: "total_amount" | "total_duration"): void
  resetForNewSearch(): void   // Partial: clears offer/order, keeps search params
  resetAll(): void            // Full: clears everything ("Search again")
}

interface Filters {
  stops:         "all" | "direct" | "1stop" | "2plus"
  airlines:      string[]          // IATA codes
  departureTime: Array<"morning" | "afternoon" | "evening" | "night">  // Chip multi-select (6AM–12PM / 12PM–6PM / 6PM–12AM / 12AM–6AM)
  priceRange:    [number, number]  // Derived from loaded offers
}
```

### Persistence Config

- **Storage**: `sessionStorage` via `createJSONStorage(() => sessionStorage)`
- **Scope**: Tab-scoped (each tab = independent booking flow)
- **Partialize**: Only `search`, `offerRequestId`, `passengerIds`, `selectedOffer`, `orderId`
- **Excluded**: `filters`, `sortBy` — intentionally reset on each results load

### Reset Strategies

| Trigger | Method | What it clears | When |
|---------|--------|----------------|------|
| New search submit | `resetForNewSearch()` | offer/order data, filters, sort | Before setting new offerRequestId |
| "Search again" on confirmation | `resetAll()` | Everything including search params | Before navigating to `/` |
| Offer expired/unavailable | `resetAll()` | Everything | Before redirecting to `/` |

---

## 6. Component Architecture

### Client vs Server Boundary Decisions

| Component | Boundary | Reason |
|-----------|----------|--------|
| `app/layout.tsx` | Server | Wraps providers, no client hooks |
| `app/page.tsx` (Search) | Server | Renders SearchForm (client) inside server shell |
| `SearchForm` | `"use client"` | useForm, useTransition, event handlers |
| `app/results/page.tsx` | Server | Renders ResultsList (client) inside server shell |
| `ResultsList` | `"use client"` | Fetch on mount, filter/sort state |
| `app/passengers/page.tsx` | Server | Renders PassengerForm (client) inside server shell |
| `PassengerForm` | `"use client"` | useForm, store access |
| `app/confirmation/[orderId]/page.tsx` | Server | Async data fetch, no client interactivity needed |
| `ConfirmationCard` | `"use client"` | "Search again" button needs router + store |

### Component Map Per Screen

**F1 — Search (`/`)**
```
SearchPage (server)
└── SearchForm (client)
    ├── TripTypePills
    ├── AirportCombobox (x2: origin, destination)
    ├── SwapButton
    ├── DateRangePicker (single or range mode)
    ├── PassengerSelector
    └── Button ("Search flights")
```

**F2 — Results (`/results`)**
```
ResultsPage (server)
└── RequireOfferRequest (client guard)
    ├── StickyHeader (compact search summary + "Modify")
    ├── SortBar (Cheapest / Fastest / Earliest)
    ├── FilterPanel (desktop sidebar, 320px)
    │   ├── RadioGroup (stops)
    │   ├── Checkbox list (airlines)
    │   └── Slider (price range)
    ├── MobileFilterTrigger (Sheet for < lg)
    ├── ResultsList
    │   ├── FlightCard (x N)
    │   ├── FlightCardSkeleton (x 3, while loading)
    │   └── EmptyState (when 0 filtered results)
    └── "Load more" Button
```

**F3 — Passengers (`/passengers`)**
```
PassengersPage (server)
└── RequireSelectedOffer (client guard)
    ├── OfferExpiryGuard (polls expires_at)
    ├── ProgressStepper (step 3 active)
    ├── PassengerForm (client)
    │   └── Accordion
    │       └── PassengerCard (x N, one per passengerIds entry)
    ├── BookingSummary (desktop sidebar, 360px)
    └── Button ("Confirm booking")
```

**F4 — Confirmation (`/confirmation/[orderId]`)**
```
ConfirmationPage (async server component)
├── ProgressStepper (step 4 complete)
├── ConfirmationCard (client — needs store.resetAll)
│   ├── Success header (checkmark + booking reference)
│   ├── Flight summary (airline + route + times)
│   ├── Passengers list
│   ├── Price breakdown (base + tax + total)
│   └── Actions: "Search again" button
└── ErrorCard (when order fetch fails)
```

### Naming Conventions

- **Page components**: `page.tsx` (Next.js convention), thin wrappers composing feature components
- **Feature components**: PascalCase, domain-named (`FlightCard`, `PassengerForm`)
- **Hooks**: `use` prefix, camelCase (`useFilteredOffers`, `useHydrated`)
- **Server Actions**: camelCase verbs (`searchFlights`, `getOffer`, `createOrder`)
- **Types**: PascalCase with `Duffel` prefix for API shapes, no prefix for app shapes

---

## 7. Type System

### Three Type Files

| File | Purpose | Contents |
|------|---------|----------|
| `lib/types/duffel.ts` | Duffel API response shapes | `DuffelPlace`, `DuffelOffer`, `DuffelSlice`, `DuffelSegment`, `DuffelCarrier`, `DuffelOrder`, `DuffelListResponse<T>`, `DuffelSingleResponse<T>`, `OfferPassenger`, `OrderPassenger`, `FareCondition`, `CabinAmenities`, `SegmentPassenger` |
| `lib/types/forms.ts` | Zod schemas + inferred types | `searchFormSchema`, `SearchFormValues`, `searchFormDefaults`, `passengerFormSchema`, `PassengerFormValues`, `SinglePassengerValues` |
| `lib/types/actions.ts` | Server Action return type | `ActionResult<T>` discriminated union |

### Type Flow

```
Duffel API JSON
    ↓  (duffelFetch<T> casts)
lib/types/duffel.ts shapes
    ↓  (Server Actions wrap in ActionResult)
lib/types/actions.ts ActionResult<T>
    ↓  (client checks .success)
Components consume .data

Zod schemas (forms.ts)
    ↓  (z.infer)
TypeScript types (SearchFormValues, PassengerFormValues)
    ↓  (useForm<T>)
react-hook-form typed fields
    ↓  (onSubmit)
Server Action params
```

### Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Usage: `import { duffelFetch } from "@/lib/duffel"`, `import type { DuffelOffer } from "@/lib/types/duffel"`

---

## 8. Route Guards & Hydration

### The Problem

Zustand + `sessionStorage` reads from the browser — unavailable during SSR. Without a hydration gate, the server renders empty state and the client re-renders after hydration, causing flash or premature redirect.

### `useHydrated` Hook

Returns `false` during SSR and on first client render (before sessionStorage read). Returns `true` once Zustand has rehydrated.

All store-dependent logic (guards, pre-fills) must be gated behind this hook.

### Guard Map

| Page | Guard Component | Requires | Redirect Target |
|------|----------------|----------|-----------------|
| `/results` | `RequireOfferRequest` | `?orq=` URL param OR `store.offerRequestId` | `/` |
| `/passengers` | `RequireSelectedOffer` | `store.selectedOffer` | `/results?orq={id}` if orqId exists, else `/` |
| `/confirmation/[orderId]` | None | Server fetches by URL param | Shows `ErrorCard` on failure |

### Guard Behavior Details

**RequireOfferRequest** (`/results`):
1. Wait for hydration
2. Check `?orq=` search param first (URL is authoritative)
3. If `?orq=` present but store empty, sync URL param to store
4. If neither URL nor store has orqId, redirect to `/`
5. Render `null` until hydrated (prevents flash)

**RequireSelectedOffer** (`/passengers`):
1. Wait for hydration
2. Check `store.selectedOffer`
3. If missing but `store.offerRequestId` exists, redirect to `/results?orq={id}`
4. If both missing, redirect to `/`
5. Render `null` until hydrated and offer confirmed

### Offer Expiry Guard

`OfferExpiryGuard` on `/passengers` polls `selectedOffer.expires_at` every 30 seconds. On expiry, shows an `AlertDialog` modal (not a silent redirect). User confirms, then `resetAll()` + `router.replace("/")`.

### Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Refresh on `/results` | Guard reads `?orq=` from URL — loads normally |
| Refresh on `/passengers` | `selectedOffer` restored from sessionStorage |
| Refresh on `/confirmation/[orderId]` | Server fetches by orderId in URL — no store needed |
| Tab closed and reopened | sessionStorage cleared — guard redirects to `/` |
| Two tabs open | Each tab has independent sessionStorage — independent flows |
| Offer expires while filling form | Modal after 30s poll — user confirms — full reset |
| Corrupted sessionStorage | Zustand falls back to initial state — guard redirects |
| Direct URL to `/passengers` | Guard redirects to `/results` or `/` as appropriate |

---

## 9. Design System

### Color Tokens (CSS Custom Properties)

**Light mode (`:root`)**:

| Token | Value | Use |
|-------|-------|-----|
| `--background` | `0 0% 100%` | Page background |
| `--foreground` | `240 10% 4%` | Primary text |
| `--card` | `0 0% 100%` | Card surface |
| `--border` | `240 6% 90%` | Default borders |
| `--primary` | `240 6% 10%` | Primary buttons |
| `--muted` | `240 5% 96%` | Muted backgrounds |
| `--muted-foreground` | `240 4% 46%` | Secondary text |
| `--destructive` | `0 84% 60%` | Error states |
| `--radius` | `0.5rem` (8px) | Base border radius |
| `--brand-primary` | `#0770E3` | CTAs, active states, links |
| `--brand-primary-dark` | `#084EB2` | Hover/pressed |

**Dark mode (`.dark`)**:

| Token | Value | Use |
|-------|-------|-----|
| `--background` | `240 10% 4%` (`#09090B`) | Page background |
| `--foreground` | `0 0% 98%` (`#FAFAFA`) | Primary text |
| `--card` | `240 10% 4%` (`#09090B`) | Card surface |
| `--border` | `240 4% 16%` (`#27272A`) | Default borders |
| `--muted-foreground` | `240 5% 46%` (`#A1A1AA`) | Secondary text |

**Flight State Badges**:

| Badge | Light BG | Light FG | Dark BG | Dark FG |
|-------|----------|----------|---------|---------|
| Nonstop | `#DCFCE7` | `#166534` | `#052E16` | `#86EFAC` |
| 1 stop | `#FEF9C3` | `#854D0E` | `#2D1B00` | `#FBBF24` |
| 2+ stops | `#FEF2F2` | `#991B1B` | `#450A0A` | `#FCA5A5` |

### Typography

| Role | Size | Weight | Tailwind |
|------|------|--------|----------|
| Hero heading | 40px | 700 | `text-[40px] font-bold tracking-tight` |
| Section heading | 32px | 700 | `text-[32px] font-bold tracking-tight` |
| Card title | 24px | 600 | `text-2xl font-semibold` |
| Price / Flight time | 24px | 700 | `text-2xl font-bold tracking-tight` |
| Booking reference | 24px | 700 mono | `font-mono text-2xl font-bold tracking-widest` |
| Body text | 16px | 400 | `text-base` |
| Secondary text | 16px | 400 | `text-base text-muted-foreground` |
| Labels | 16px | 500 | `text-base font-medium text-muted-foreground` |
| Badge text | 16px | 600 | `text-base font-semibold` |

**Rule**: Never use `text-xs` (12px) or `text-sm` (14px) for UI text. Hierarchy is achieved through color and weight, not size reduction.

### Fonts

- **Sans**: Inter via `next/font/google` — loaded in `src/app/[locale]/layout.tsx` (no extra install; bundled by Next.js)
- **Mono**: `ui-monospace, monospace` (system stack — used only for booking reference field)

### Component Sizes

| Component | Height | Width | Tailwind |
|-----------|--------|-------|----------|
| Search input | 56px | full | `h-[56px] px-4 text-base` |
| Search button | 56px | full | `h-[56px] px-8 text-base font-semibold` |
| Primary button | 48px | auto | `h-12 px-8 text-base font-medium` |
| Small button | 40px | auto | `h-10 px-6 text-base font-medium` |
| Filter sidebar | auto | 320px | `w-[320px] p-6 border-r` |
| Booking sidebar | auto | 360px | `w-[360px] p-6` |
| Search card | auto | 880px max | `max-w-[880px] p-6` |
| Confirmation card | auto | 640px max | `max-w-[640px] p-6` |
| Stop badge | 32px | auto | `h-8 px-4 py-2 rounded-full` |
| Airline logo | 40px | 40px | `h-10 w-10 rounded` |
| Swap button | 40px | 40px | `h-10 w-10 rounded-full` |
| Progress dot | 32px | 32px | `h-8 w-8 rounded-full` |
| Sort tab | 48px | auto | `h-[48px] px-6 text-base font-medium` |
| Filter row | 48px min | auto | `min-h-[48px] py-2` |

### Border Radius

| Use | Value | Tailwind |
|-----|-------|---------|
| Cards | 8px | `rounded-lg` |
| Buttons | 6px | `rounded-md` |
| Inputs | 4px | `rounded` |
| Badges/pills | 9999px | `rounded-full` |

### Responsive Breakpoints

| Breakpoint | Value | Changes |
|-----------|-------|---------|
| `sm` | 640px | Stack search form inputs |
| `md` | 768px | Single-month → dual-month calendar |
| `lg` | 1024px | Show filter sidebar (results) / booking sidebar (passengers) |
| `xl` | 1280px | Max content width |

**Pattern**: Desktop sidebar, mobile Sheet:
```
<aside className="hidden lg:block w-[320px]">...</aside>
<Sheet className="lg:hidden">...</Sheet>
```

### shadcn Components (22 total)

```
Button, Input, Label, Select, Popover, Calendar, Command,
Badge, Card, Accordion, Separator, Sonner, Skeleton, Form,
RadioGroup, Checkbox, Slider, Sheet, Dialog, Tooltip, Progress,
AlertDialog
```

### Animations (`motion` package)

- **Package**: `motion` (rebranded from `framer-motion`) — import from `motion/react`
- **Provider**: `LazyMotion` with `domAnimation` features in root layout
- **Component API**: Use `m` (not `motion`) for tree-shaking
- **Rule**: `motion` only where state drives animation; Tailwind for static hover/focus
- **Bundle**: ~7-9KB gzipped
- **Reduced motion**: `usePrefersReducedMotion` hook disables animations
- **Token files**: `lib/animations/tokens.ts`, `lib/animations/variants.ts`

```ts
// ✅ Correct imports (motion package)
import { LazyMotion, domAnimation, m } from "motion/react"

// ❌ Old import (still works but deprecated for new projects)
import { motion, LazyMotion } from "framer-motion"
```

---

## 10. Error Handling

### Per-Error-Code Strategy

| Duffel Error Code | Where | Action |
|-------------------|-------|--------|
| `offer_expired` | `getOffer`, `createOrder` | `store.resetAll()` + `router.push("/")` + toast |
| `offer_no_longer_available` | `getOffer`, `createOrder` | Same as above |
| `price_changed` | `createOrder` | Re-fetch offer, update store, show new price dialog |
| `duplicate_booking` | `createOrder` | Toast + link to existing order |
| `invalid_passenger_name` | `createOrder` | `form.setError()` on firstName/lastName fields + toast |
| HTTP 429 | Any | Read `ratelimit-reset` header, retry after delay |
| HTTP 503/504 | Any | Retry once; show error toast if persists |

### Error Boundary Coverage

Each route segment with async data has an `error.tsx`:

| Route | Error Boundary | Recovery Action |
|-------|---------------|-----------------|
| `/results/error.tsx` | "Failed to load flights" | "Try again" button (calls `reset()`) |
| `/passengers/error.tsx` | "Something went wrong" | "Try again" button |
| `/confirmation/[orderId]/error.tsx` | "Could not load booking" | "Try again" button |

### Error Display Patterns

| Pattern | Where | Implementation |
|---------|-------|---------------|
| Field-level inline | Form fields | `<FormMessage />` renders `fieldState.error.message` |
| Toast notification | API errors | `toast.error(message)` via Sonner |
| Programmatic field error | `invalid_passenger_name` | `form.setError("passengers.N.firstName", ...)` |
| Modal dialog | Offer expiry on /passengers | `AlertDialog` via `OfferExpiryGuard` |
| Error boundary | Route-level crashes | `error.tsx` per route segment |
| Empty state | Zero filtered results | `EmptyState` component in results list |

### Offer Expiry on `/passengers`

- Check `selectedOffer.expires_at` on mount
- Poll every 30 seconds via `setInterval`
- On expiry: show `AlertDialog` modal ("This flight has expired")
- User confirms: `resetAll()` + `router.replace("/")`
- NOT a silent redirect — explicit user acknowledgment required

---

## 11. Dependencies

### Production Dependencies

```json
{
  "dependencies": {
    "next": "^16.2.0",
    "next-intl": "^3.26.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "zustand": "^5.0.12",
    "react-hook-form": "^7.71.2",
    "@hookform/resolvers": "^5.2.2",
    "zod": "^4.3.6",
    "motion": "^12.37.0",
    "sonner": "^2.0.7",
    "date-fns": "^4.1.0",
    "tailwindcss": "^4.2.1",
    "@radix-ui/react-accordion": "latest",
    "@radix-ui/react-alert-dialog": "latest",
    "@radix-ui/react-checkbox": "latest",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-label": "latest",
    "@radix-ui/react-popover": "latest",
    "@radix-ui/react-radio-group": "latest",
    "@radix-ui/react-select": "latest",
    "@radix-ui/react-separator": "latest",
    "@radix-ui/react-slider": "latest",
    "@radix-ui/react-slot": "latest",
    "@radix-ui/react-tooltip": "latest",
    "cmdk": "latest",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.5.0",
    "lucide-react": "^0.577.0"
  }
}
```

Note: Radix UI packages and `cmdk` are installed automatically by `npx shadcn@latest add`. Exact versions are pinned at install time.

### Dev Dependencies (notable)

```json
{
  "devDependencies": {
    "typescript": "^5.9.3",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "tailwindcss-animate": "latest",
    "autoprefixer": "latest",
    "postcss": "latest"
  }
}
```

---

## 12. Environment Setup

### `.env.example`

```bash
# Duffel API — https://app.duffel.com/developers/keys
# Test token prefix: duffel_test_
# Live token prefix: duffel_live_
DUFFEL_API_KEY=duffel_test_xxxxxxxxxxxx

# App URL (used for metadata, OG tags)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Rules**:
- `DUFFEL_API_KEY` is server-only — NEVER prefix with `NEXT_PUBLIC_`
- The key is only accessed in `lib/duffel.ts` (which imports `"server-only"`)
- Test mode key (`duffel_test_`) for development; live key for production

### `next.config.ts`

```ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.duffel.com" },  // Airline logo SVGs
    ],
  },
  poweredByHeader: false,
}

export default nextConfig
```

- No `serverExternalPackages` needed — using raw `fetch`, not `@duffel/api` SDK
- `assets.duffel.com` whitelisted for `next/image` optimization of airline logos

### Scaffolding Command

```bash
npx create-next-app@16 flight-app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

Then:

```bash
cd flight-app
npx shadcn@latest init   # Base color: Zinc, CSS variables: Yes, Tailwind v4: Yes
npx shadcn@latest add button input label select popover calendar command \
  badge card accordion separator sonner skeleton form radio-group checkbox \
  slider sheet dialog tooltip alert-dialog progress
npm install zustand react-hook-form @hookform/resolvers zod motion \
  next-intl sonner date-fns
```

> **Note — `framer-motion` is now `motion`**: Install `motion`, not `framer-motion`. Imports change from `"framer-motion"` to `"motion/react"`.

> **Note — Zod 4**: `z.strictObject()` replaces `.strict()`. Error customisation API is overhauled — see [Zod v4 changelog](https://zod.dev/v4/changelog) before writing custom error messages.

> **Note — Next.js 16 async params**: Run the official codemod after scaffolding to update `params`/`searchParams` access:
> ```bash
> npx @next/codemod@canary upgrade latest
> ```

---

## 13. Internationalisation (i18n)

### Library: `next-intl` 3.x

`next-intl` provides App Router-native i18n with server components, client components, and middleware support. It handles locale routing, message lookup, and number/date formatting.

```bash
npm install next-intl
```

### Supported Locales

| Locale | Language | Script | Notes |
|--------|----------|--------|-------|
| `en` | English | LTR | Default locale |
| `ms` | Bahasa Malaysia | LTR | National language |
| `zh` | Chinese (Simplified) | LTR | Regional market |

RTL support (Arabic, Urdu) can be added later by adding `dir="rtl"` to `<html>` and adjusting layout flex directions.

### Routing Strategy

All routes are prefixed with the locale segment: `/en/`, `/ms/`, `/zh/`.

```
/               → redirect to /en (middleware)
/en             → Search page (English)
/ms             → Search page (Bahasa Malaysia)
/en/results     → Results (English)
/ms/passengers  → Passenger Details (Bahasa Malaysia)
```

### File Structure

```
i18n/
├── routing.ts     # defineRouting — locales array + defaultLocale
└── request.ts     # getRequestConfig — loads messages per locale

messages/
├── en.json        # English strings
├── ms.json        # Bahasa Malaysia strings
└── zh.json        # Chinese (Simplified) strings

src/app/
└── [locale]/
    ├── layout.tsx         # Locale-aware root layout (NextIntlClientProvider)
    ├── page.tsx           # /[locale] — Search
    ├── results/page.tsx
    ├── passengers/page.tsx
    └── confirmation/[orderId]/page.tsx

middleware.ts              # next-intl createMiddleware — locale detection + redirect
```

### Configuration

```ts
// i18n/routing.ts
import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["en", "ms", "zh"],
  defaultLocale: "en",
})
```

```ts
// i18n/request.ts
import { getRequestConfig } from "next-intl/server"
import { routing } from "./routing"

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
```

```ts
// middleware.ts
import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

export default createMiddleware(routing)

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}
```

```tsx
// src/app/[locale]/layout.tsx
import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { Inter } from "next/font/google"
import { notFound } from "next/navigation"
import { routing } from "@/i18n/routing"

const inter = Inter({ subsets: ["latin"] })

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!routing.locales.includes(locale as any)) notFound()

  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body className={`${inter.className} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

### Message File Structure

```json
// messages/en.json
{
  "nav": {
    "flights": "Flights",
    "hotels": "Hotels",
    "cars": "Cars",
    "signIn": "Sign in"
  },
  "search": {
    "heading": "Find your next flight",
    "subheading": "Search hundreds of airlines for the best deal",
    "from": "From",
    "to": "To",
    "departureDate": "Departure date",
    "returnDate": "Return date",
    "passengersAndClass": "Passengers & class",
    "searchFlights": "Search flights",
    "oneWay": "One-way",
    "roundTrip": "Round-trip",
    "multiCity": "Multi-city",
    "disabledOneWay": "(disabled — one-way)"
  },
  "results": {
    "found": "{count} flights found",
    "modifySearch": "Modify search",
    "filters": "Filters",
    "clearAll": "Clear all",
    "stops": "Stops",
    "any": "Any",
    "nonstop": "Nonstop",
    "oneStop": "1 stop",
    "twoPlus": "2+ stops",
    "departureTime": "Departure time",
    "airlines": "Airlines",
    "priceRange": "Price range",
    "sort": {
      "cheapest": "Cheapest",
      "fastest": "Fastest",
      "earliest": "Earliest"
    },
    "chips": {
      "morning": "6AM–12PM",
      "afternoon": "12PM–6PM",
      "evening": "6PM–12AM",
      "night": "12AM–6AM"
    },
    "select": "Select",
    "loadMore": "Load more flights",
    "noFlights": "No flights found",
    "noFlightsHint": "Try adjusting your filters or search different dates",
    "perPerson": "per person"
  },
  "passengers": {
    "heading": "Passenger details",
    "passenger": "Passenger {n}",
    "adult": "Adult",
    "child": "Child",
    "title": "Title",
    "firstName": "First name",
    "lastName": "Last name",
    "dateOfBirth": "Date of birth",
    "email": "Email",
    "phone": "Phone number",
    "confirmBooking": "Confirm booking"
  },
  "confirmation": {
    "confirmed": "Booking confirmed!",
    "failed": "Booking failed",
    "reference": "Booking reference",
    "emailSent": "A confirmation email has been sent to {email}",
    "downloadReceipt": "Download receipt",
    "searchAgain": "Search again",
    "tryAgain": "Try again",
    "baseFare": "Base fare",
    "taxes": "Taxes & fees",
    "total": "Total"
  },
  "stepper": {
    "search": "Search",
    "results": "Results",
    "passengers": "Passengers",
    "confirm": "Confirm"
  },
  "popularDestinations": {
    "heading": "Popular destinations",
    "from": "from"
  },
  "footer": {
    "tagline": "Smart flight search powered by Duffel",
    "company": "Company",
    "about": "About",
    "careers": "Careers",
    "press": "Press",
    "support": "Support",
    "helpCenter": "Help center",
    "contact": "Contact us",
    "legal": "Legal",
    "privacy": "Privacy",
    "terms": "Terms",
    "copyright": "© 2026 SkyBook. Powered by Duffel API."
  }
}
```

### Usage in Components

```tsx
// Server component
import { getTranslations } from "next-intl/server"

export default async function SearchPage() {
  const t = await getTranslations("search")
  return <h1>{t("heading")}</h1>
}

// Client component
"use client"
import { useTranslations } from "next-intl"

export function SearchForm() {
  const t = useTranslations("search")
  return <label>{t("from")}</label>
}

// Interpolation
const t = useTranslations("results")
t("found", { count: 85 })  // → "85 flights found"
```

### Number and Currency Formatting

Use `next-intl`'s `useFormatter` / `getFormatter` — do **not** use raw `Intl` directly.

```tsx
// Client component
import { useFormatter } from "next-intl"

function PriceDisplay({ amount, currency }: { amount: string; currency: string }) {
  const format = useFormatter()
  return (
    <span>
      {format.number(parseFloat(amount), { style: "currency", currency })}
    </span>
  )
}
// en: "€46.41" | ms: "€46.41" | zh: "€46.41"
// Currency symbol follows locale conventions automatically
```

### Date Formatting

```tsx
import { useFormatter } from "next-intl"

const format = useFormatter()
format.dateTime(new Date("2026-05-15"), { dateStyle: "long" })
// en: "May 15, 2026" | ms: "15 Mei 2026" | zh: "2026年5月15日"
```

### `next.config.ts` Update

```ts
import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.duffel.com" },
    ],
  },
  poweredByHeader: false,
}

export default withNextIntl(nextConfig)
```

### Locale Switcher Pattern

```tsx
// components/shared/LocaleSwitcher.tsx
"use client"
import { useLocale } from "next-intl"
import { useRouter, usePathname } from "next/navigation"

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "ms", label: "MY" },
  { code: "zh", label: "ZH" },
]

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  function switchLocale(next: string) {
    // Replace the locale segment in the current path
    const segments = pathname.split("/")
    segments[1] = next
    router.push(segments.join("/"))
  }

  return (
    <div className="flex gap-2">
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => switchLocale(code)}
          className={
            locale === code
              ? "text-[var(--bg-highlight-primary)] font-semibold"
              : "text-[var(--text-primary)] opacity-75"
          }
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

Add `<LocaleSwitcher />` to the `NavBar` right-hand side alongside the Sign In button.

### Zustand Store — Locale Awareness

The Zustand store is locale-agnostic — it stores IATA codes, dates (ISO), and amounts (strings from Duffel). Formatting for display is done at render time via `useFormatter`. No locale state in the store.

### ADR-FE-005: next-intl over next-i18next

**Status**: Accepted

**Context**: Two main i18n libraries exist for Next.js App Router. `next-i18next` was built for the Pages Router. `next-intl` was purpose-built for App Router with full Server Component support.

**Decision**: Use `next-intl`. It integrates with `getRequestConfig`, supports `useTranslations` in both server and client components, and works correctly with the `[locale]` routing segment pattern.

**Consequences**:
- Positive: First-class App Router support, server-side message loading, type-safe message keys
- Negative: `[locale]` segment changes all route paths (acceptable; all internal links use `useRouter`/`Link` which are locale-aware)

---

## ADRs

### ADR-FE-000: `motion` package over `framer-motion`

**Status**: Accepted

**Context**: Framer Motion was officially rebranded to `motion` (v12+). The `framer-motion` package still receives updates but new projects should use `motion`.

**Decision**: Use `motion` package. Import from `motion/react`. API is identical — `LazyMotion`, `m`, `AnimatePresence` all work the same.

**Consequences**:
- Positive: Using the canonical package name going forward
- Negative: None — API is identical; shadcn animation examples still reference `framer-motion` but imports can be swapped directly

---

### ADR-FE-001: Raw fetch over Duffel SDK

**Status**: Accepted

**Context**: The `@duffel/api` SDK provides typed responses but adds ~30KB to the server bundle and creates a hard dependency on SDK versioning.

**Decision**: Use a custom `duffelFetch<T>()` wrapper with raw `fetch` and hand-written types verified against live API responses.

**Alternatives**: `@duffel/api` SDK — rejected because types can be maintained locally with less bundle cost, and raw fetch is more transparent for assessment review.

**Consequences**:
- Positive: Zero dependency on SDK versioning, smaller bundle, explicit code
- Negative: Must maintain types manually when Duffel API changes

### ADR-FE-002: Zustand + sessionStorage over URL state

**Status**: Accepted

**Context**: Booking flow state (selected offer, passenger IDs) must survive page refresh but not outlive the browser tab.

**Decision**: Zustand `persist` middleware with `sessionStorage`. URL params used only for `?orq=` on /results (shareable, canonical).

**Alternatives**: Full URL state — rejected because serializing entire DuffelOffer to URL is impractical. Cookies — rejected because server-side middleware cannot read Zustand anyway, and cookies add complexity for no benefit in this auth-free app.

**Consequences**:
- Positive: Simple, tab-scoped, survives refresh, no server-side concerns
- Negative: Not shareable across tabs (each tab = independent flow — acceptable for booking)

### ADR-FE-003: Hybrid Server Actions + Route Handlers

**Status**: Accepted

**Context**: Duffel API key must never reach the browser. Mutations naturally fit Server Actions. But debounced combobox queries and paginated list fetches are better served by Route Handlers that clients call directly.

**Decision**: Server Actions for mutations and one-off fetches. Route Handlers for client-driven GET requests (autocomplete, paginated offers).

**Alternatives**: All Route Handlers — rejected because Server Actions provide better DX for form mutations. All Server Actions — rejected because debounced autocomplete and cursor pagination don't map well to the Server Action model.

**Consequences**:
- Positive: Each pattern used where it fits best, clean separation
- Negative: Two patterns to maintain (minor; well-documented in this architecture)

### ADR-FE-004: No TanStack Query

**Status**: Accepted

**Context**: TanStack Query excels at client-side cache management, deduplication, and background refetching. This app has a linear 4-screen flow with no dashboards, no real-time updates, and no shared data across routes.

**Decision**: Do not install TanStack Query. Route Handlers handle server-side caching. Client fetches are straightforward `fetch` calls with local state.

**Alternatives**: TanStack Query — rejected because it adds complexity without benefit for this linear flow. Would reconsider if the app grew to include dashboards or shared cross-route data.

**Consequences**:
- Positive: Fewer dependencies, simpler mental model
- Negative: No automatic deduplication or background refetch (not needed here)

---

## Handoff to frontend-developer

### Implementation Order

1. **Scaffold** — `create-next-app`, shadcn init, install dependencies
2. **Foundation** — `globals.css` (tokens), `tailwind.config.ts`, `next.config.ts`, `layout.tsx`, `.env.example`
3. **Types** — `lib/types/duffel.ts`, `lib/types/forms.ts`, `lib/types/actions.ts`
4. **Data layer** — `lib/duffel.ts`, then Server Actions (`actions/search.ts`, `actions/offers.ts`, `actions/booking.ts`), then Route Handlers (`api/places`, `api/flights/offers`)
5. **Store** — `lib/store.ts` (Zustand + persist), `lib/hooks/useHydrated.ts`
6. **Shared components** — `ProgressStepper`, `StopBadge`, `AirlineLogo`, `RequireOfferRequest`, `RequireSelectedOffer`
7. **F1: Search** — `SearchForm` and sub-components (`AirportCombobox`, `DateRangePicker`, `PassengerSelector`, `TripTypePills`, `SwapButton`)
8. **F2: Results** — `ResultsList`, `FlightCard`, `FlightCardSkeleton`, `FilterPanel`, `SortBar`, `StickyHeader`, `EmptyState`, `useFilteredOffers`, `MobileFilterTrigger`
9. **F3: Passengers** — `PassengerForm`, `PassengerCard`, `BookingSummary`, `OfferExpiryGuard`
10. **F4: Confirmation** — `ConfirmationCard`, `ErrorCard`, server fetch in page component
11. **Animations** — `lib/animations/*`, wire into components
12. **Error boundaries** — `error.tsx` per route segment
13. **Polish** — `generateMetadata` per route, responsive testing, accessibility audit

### Conventions

- All pages are thin server components that compose client feature components
- `"use client"` only at the leaf boundary where interactivity is required
- One component per file, co-located with its route when route-specific
- Shared components in `components/shared/`, feature components in `components/{feature}/`
- Hooks co-located with feature (`components/results/hooks/`) or in `lib/hooks/` if shared
- All sizes from the design tokens — never ad-hoc magic numbers
- `@/` path alias for all imports

---

---

## Plan 12 — TODO (Post-Project)

**File**: `12-ai-workflow.md` — *To be created after the project is complete.*

Will document the AI tools, agents, and workflow structure used throughout development:

- Which Claude Code agents were activated per implementation phase (planner, frontend-architect, frontend-developer, etc.)
- Skills applied (react-expert, tanstack-start, typescript-pro, …)
- Prompting patterns that were most effective
- Areas where AI assistance accelerated or required correction

---

*This document consolidates: 01-tailwind-config, 02-design-tokens, 03-shadcn-components, 04-data-layer, 05-route-guards-persistence, 06-form-validation, 07-layout-guide, 08-round-trip, 10-animation-plan, and 11-gaps-draft-plan.*
