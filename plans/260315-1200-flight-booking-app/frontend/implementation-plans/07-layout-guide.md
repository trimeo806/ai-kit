# Layout Guide — Flight Booking App

*4-screen layout structure · Next.js App Router · shadcn/ui · Skyscanner pattern*

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root: Inter font, TooltipProvider, Toaster
│   ├── globals.css                   # Tailwind + CSS tokens
│   ├── page.tsx                      # Screen 1 — Search (/)
│   ├── results/
│   │   └── page.tsx                  # Screen 2 — Results (/results?orq=...)
│   ├── passengers/
│   │   └── page.tsx                  # Screen 3 — Passenger Details (/passengers)
│   └── confirmation/
│       └── [orderId]/
│           └── page.tsx              # Screen 4 — Confirmation (/confirmation/[orderId])
│
├── components/
│   ├── ui/                           # shadcn auto-generated
│   ├── search/
│   │   ├── SearchForm.tsx            # Main search card
│   │   ├── AirportCombobox.tsx       # Command + Popover
│   │   ├── DateRangePicker.tsx       # Calendar + Popover
│   │   ├── PassengerSelector.tsx     # Counter popover
│   │   └── TripTypePills.tsx         # One-way / Round-trip pills
│   ├── results/
│   │   ├── FlightCard.tsx            # 3-col grid card
│   │   ├── FlightCardSkeleton.tsx    # Shimmer loader
│   │   ├── FilterPanel.tsx           # Stops + Airlines + Time + Price
│   │   ├── SortBar.tsx               # Tab row
│   │   └── EmptyState.tsx            # No flights found
│   ├── passengers/
│   │   ├── PassengerCard.tsx         # Accordion form per pax
│   │   ├── PassengerForm.tsx         # react-hook-form + zod fields
│   │   └── BookingSummary.tsx        # Sticky sidebar
│   ├── confirmation/
│   │   ├── ConfirmationCard.tsx      # Success layout
│   │   └── ErrorCard.tsx             # Error variant
│   ├── shared/
│   │   ├── NavBar.tsx                # Top navigation bar (bg-primary blue)
│   │   ├── ProgressStepper.tsx       # 4-step indicator
│   │   ├── StopBadge.tsx             # Nonstop / 1 stop / 2+ badge
│   │   └── AirlineLogo.tsx           # 40×40 logo tile
│
├── lib/
│   ├── store.ts                      # Zustand store
│   ├── duffel.ts                     # Duffel client (server-only)
│   └── utils.ts                      # shadcn cn() + formatters
│
└── app/api/
    └── orders/
        └── route.ts                  # POST /api/orders → Duffel proxy
```

---

## NavBar Component

```tsx
// components/shared/NavBar.tsx
// Blue bar: bg-[var(--bg-primary)] h-14 px-8
// Logo: text-[var(--text-primary)] font-bold text-xl
// Nav links: text-[var(--text-primary)]/85 — active uses nav-link-active utility
// Sign in: ghost button bg-white/15 border-white/40 text-[var(--text-primary)]

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const NAV_LINKS = [
  { href: "/",        label: "Flights"  },
  { href: "/hotels",  label: "Hotels"   },
  { href: "/cars",    label: "Car hire" },
]

export function NavBar() {
  const pathname = usePathname()

  return (
    <header className="h-14 bg-[var(--bg-primary)] px-8 flex items-center justify-between shrink-0">
      {/* Logo */}
      <Link href="/" className="text-[var(--text-primary)] font-bold text-xl tracking-tight">
        SkyBook
      </Link>

      {/* Nav links */}
      <nav className="hidden md:flex items-center gap-6">
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "text-sm font-medium transition-colors",
              pathname === href
                ? "nav-link-active"
                : "text-[var(--text-primary)]/85 hover:text-[var(--text-primary)]"
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Sign in */}
      <Button
        variant="ghost"
        className="bg-white/15 border border-white/40 text-[var(--text-primary)]
                   hover:bg-white/25 hover:text-[var(--text-primary)] h-9 px-4"
      >
        Sign in
      </Button>
    </header>
  )
}
```

---

## Screen 1 — Search (`/`)

### Layout structure

```
<main>
  <NavBar />                              ← bg-[var(--bg-primary)]
  <section class="hero">                 ← bg-gradient from-[#0770E3] to-[#084EB2] py-12 px-8
    <h1 text-[var(--text-primary)]>
    <p text-[var(--text-primary)]/80>
    <div class="search-card">            ← bg-white rounded-xl shadow-lg max-w-[880px]
      <TripTypePills />
      <AirportCombobox from + swap + to>
      <DateRangePicker departure + return>
      <PassengerSelector />
      <Button>Search flights</Button>
  <section class="popular-destinations"> ← bg-[var(--bg-secondary)] py-12 px-8
    <h2 text-[var(--text-secondary)]>Popular destinations</h2>
    <grid 4-col of DestinationCard>      ← static mock data (Duffel has no explore endpoint)
  <footer>                               ← bg-white border-t border-[var(--border)]
    brand + columns + bottom bar         ← text-[var(--text-secondary)]
```

**Responsive**: stack all inputs vertically on `< md` screens.

```tsx
// app/page.tsx
import { NavBar } from "@/components/shared/NavBar"
import { SearchForm } from "@/components/search/SearchForm"

const POPULAR_DESTINATIONS = [
  { city: "Tokyo",    iata: "TYO", flag: "🇯🇵", from: "KUL", price: 320 },
  { city: "Sydney",   iata: "SYD", flag: "🇦🇺", from: "KUL", price: 410 },
  { city: "London",   iata: "LHR", flag: "🇬🇧", from: "KUL", price: 490 },
  { city: "New York", iata: "JFK", flag: "🇺🇸", from: "KUL", price: 550 },
] as const

export default function SearchPage() {
  return (
    <main className="min-h-screen flex flex-col bg-[var(--bg-secondary)]">
      {/* Navigation */}
      <NavBar />

      {/* Hero — search form */}
      <section className="bg-gradient-to-b from-[#0770E3] to-[#084EB2] py-12 px-8">
        <div className="mx-auto max-w-[880px]">
          <div className="mb-8 text-center">
            <h1 className="text-[40px] font-bold tracking-tight text-[var(--text-primary)]">
              Find your next flight
            </h1>
            <p className="mt-2 text-base text-[var(--text-primary)]/80">
              Search hundreds of airlines for the best deal
            </p>
          </div>
          {/* Search card */}
          <div className="w-full rounded-xl bg-white shadow-lg p-6">
            <SearchForm />
          </div>
        </div>
      </section>

      {/* Popular destinations */}
      <section className="bg-[var(--bg-secondary)] py-12 px-8">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-2xl font-bold text-[var(--text-secondary)] mb-6">
            Popular destinations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {POPULAR_DESTINATIONS.map((dest) => (
              <div
                key={dest.iata}
                className="bg-white rounded-xl border border-[var(--border)]
                           p-5 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="text-3xl mb-3">{dest.flag}</div>
                <div className="font-semibold text-[var(--text-secondary)] text-lg">
                  {dest.city}
                </div>
                <div className="text-sm text-gray-500 mb-2">{dest.iata}</div>
                <div className="text-[var(--bg-highlight-secondary)] font-bold text-sm">
                  from ${dest.price}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[var(--border)] mt-auto">
        <div className="mx-auto max-w-[1200px] px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-[var(--text-secondary)]">
            <div>
              <div className="font-bold text-lg mb-3">SkyBook</div>
              <p className="text-sm text-gray-500">Find the best flights at the best prices.</p>
            </div>
            <div>
              <div className="font-semibold mb-3">Company</div>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>About us</li>
                <li>Careers</li>
                <li>Press</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-3">Support</div>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>Help centre</li>
                <li>Contact us</li>
                <li>Privacy</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-3">Explore</div>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>Flights</li>
                <li>Hotels</li>
                <li>Car hire</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-[var(--border)] text-sm text-gray-400 text-center">
            © {new Date().getFullYear()} SkyBook. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  )
}
```

---

## Popular Destinations Static Data

```ts
// Duffel API has no explore/suggestions endpoint — destinations are hardcoded.
const POPULAR_DESTINATIONS = [
  { city: "Tokyo",    iata: "TYO", flag: "🇯🇵", from: "KUL", price: 320 },
  { city: "Sydney",   iata: "SYD", flag: "🇦🇺", from: "KUL", price: 410 },
  { city: "London",   iata: "LHR", flag: "🇬🇧", from: "KUL", price: 490 },
  { city: "New York", iata: "JFK", flag: "🇺🇸", from: "KUL", price: 550 },
] as const
// Note: Duffel API has no explore/suggestions endpoint — destinations are hardcoded.
```

---

## Screen 2 — Results (`/results`)

### Layout structure

```
<div class="flex flex-col h-screen">
  <NavBar />                             ← bg-[var(--bg-primary)]
  <StickySearchBar />                    ← bg-[var(--bg-primary)], input: transparent + text-[var(--text-primary)]
                                            "Modify search" button: bg-[var(--bg-highlight-primary)] text-[var(--text-highlight-primary)]
  <SortBar>                              ← bg-[var(--bg-primary)], tabs use sort-tab-active / sort-tab-inactive utilities
  <div class="flex flex-1 bg-[var(--bg-secondary)]">
    <FilterPanel>                        ← bg-white w-[320px], sticky, border-r
      · Stops (RadioGroup)
      · Departure time (time-chip / time-chip active — labels: 6AM–12PM, 12PM–6PM, 6PM–12AM, 12AM–6AM)
      · Airlines (Checkbox list)
      · Price (Slider)
    <ResultsList>                        ← flex-1, overflow-y-auto
      · "N flights found" count          ← text-[var(--bg-highlight-secondary)] font-bold
      · [FlightCard] × n
      · [FlightCardSkeleton × 3] when loading
      · [EmptyState] when 0 results
      · "Load more" button
```

**Mobile** (< 1024px): FilterPanel hidden → Sheet trigger button above cards. SortBar scrolls horizontally.

```tsx
// app/results/page.tsx
import { NavBar } from "@/components/shared/NavBar"
import { StickySearchBar } from "@/components/results/StickySearchBar"
import { SortBar } from "@/components/results/SortBar"
import { FilterPanel } from "@/components/results/FilterPanel"
import { ResultsList } from "@/components/results/ResultsList"
import { MobileFilterTrigger } from "@/components/results/MobileFilterTrigger"

export default function ResultsPage() {
  return (
    <div className="flex h-screen flex-col">
      <NavBar />
      <StickySearchBar />
      <SortBar />
      <div className="flex flex-1 overflow-hidden bg-[var(--bg-secondary)]">
        {/* Desktop filter sidebar */}
        <aside className="hidden lg:flex w-[320px] shrink-0 flex-col gap-6
                          bg-white border-r border-[var(--border)] overflow-y-auto p-6">
          <FilterPanel />
        </aside>
        {/* Results */}
        <main className="flex-1 overflow-y-auto p-6">
          <ResultsList />
        </main>
      </div>
      {/* Mobile filter sheet trigger */}
      <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-10">
        <MobileFilterTrigger />
      </div>
    </div>
  )
}
```

### StickySearchBar token usage

```tsx
// components/results/StickySearchBar.tsx
// bg-[var(--bg-primary)] — blue bar matching NavBar
// input fields: bg-transparent border-white/30 text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/60
// "Modify search" button: bg-[var(--bg-highlight-primary)] text-[var(--text-highlight-primary)]
//   i.e. bg-white text-[#0770E3] — stands out on the blue bar
```

### SortBar token usage

```tsx
// components/results/SortBar.tsx
// Outer bar: bg-[var(--bg-primary)] px-6 py-2 flex gap-2
// Active tab:   sort-tab-active   → bg-white text-[var(--text-highlight-primary)] rounded px-4 py-1.5 font-semibold
// Inactive tab: sort-tab-inactive → bg-transparent text-[var(--text-primary)]/75 hover:text-[var(--text-primary)]
```

### "N flights found" count

```tsx
// text-[var(--bg-highlight-secondary)] == #0770E3 on white/gray background — acts as accent
<p className="text-[var(--bg-highlight-secondary)] font-bold text-sm mb-4">
  {count} flights found
</p>
```

### Departure time chips

```tsx
// FilterPanel — departure time section uses chip multi-select
const TIME_SLOTS = [
  { id: "morning",   label: "6AM–12PM"  },
  { id: "afternoon", label: "12PM–6PM"  },
  { id: "evening",   label: "6PM–12AM"  },
  { id: "night",     label: "12AM–6AM"  },
]

// active:   time-chip active  → bg-[var(--bg-highlight-secondary)] text-[var(--text-highlight-secondary)] border-[var(--bg-highlight-secondary)]
// inactive: time-chip         → bg-white text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--bg-highlight-secondary)]
```

### Flight card grid (3 columns)

```tsx
<div className="grid grid-cols-[2fr_1.5fr_1.5fr] items-center gap-3 p-6">
  {/* Left: airline + times */}
  {/* Center: duration + line + badge */}
  {/* Right: price + Select button */}
</div>
```

---

## Screen 3 — Passenger Details (`/passengers`)

### Layout structure

```
<div class="flex flex-col min-h-screen bg-[var(--bg-secondary)]">
  <NavBar />                                ← bg-[var(--bg-primary)]
  <div class="progress-header">            ← bg-[var(--bg-primary)] px-8 py-6
    <ProgressStepper current={2} />
  <div class="flex flex-1 items-start p-6 gap-6 bg-[var(--bg-secondary)]">
    <div class="flex-1 flex flex-col gap-6">  ← form column
      <Accordion>                           ← bg-white form cards
        [PassengerCard] × n
      </Accordion>
      <Button>Confirm booking</Button>
    </div>
    <aside class="bg-white w-[360px] shrink-0">  ← booking summary sidebar
      <BookingSummary />
    </aside>
```

**Mobile**: sidebar collapses to a sticky footer bar showing price + CTA.

```tsx
// app/passengers/page.tsx
import { NavBar } from "@/components/shared/NavBar"
import { ProgressStepper } from "@/components/shared/ProgressStepper"
import { PassengerAccordion } from "@/components/passengers/PassengerAccordion"
import { BookingSummary } from "@/components/passengers/BookingSummary"
import { Button } from "@/components/ui/button"

export default function PassengersPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-secondary)]">
      <NavBar />
      {/* Progress header — blue band */}
      <div className="bg-[var(--bg-primary)] px-8 py-6">
        <ProgressStepper current={2} />   {/* 0-indexed */}
      </div>
      {/* Body */}
      <div className="flex flex-1 items-start gap-6 p-6">
        {/* Form */}
        <div className="flex-1 flex flex-col gap-6">
          <PassengerAccordion />
          <Button size="lg" className="w-full">Confirm booking</Button>
        </div>
        {/* Summary sidebar */}
        <aside className="hidden lg:flex w-[360px] shrink-0 bg-white rounded-xl border border-[var(--border)]">
          <BookingSummary />
        </aside>
      </div>
    </div>
  )
}
```

### Progress stepper layout

```
[dot 1] — [line done] — [dot 2] — [line done] — [dot 3 active] — [line] — [dot 4]
 Search                  Results                  Passengers               Confirm
```

```tsx
// components/shared/ProgressStepper.tsx
// Renders inside bg-[var(--bg-primary)] — all text/dots are on blue background

const steps = ["Search", "Results", "Passengers", "Confirm"]

<div className="flex items-center">
  {steps.map((label, i) => (
    <React.Fragment key={label}>
      <div className="flex flex-col items-center gap-1">
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full text-base font-bold border-2",
          // done: white dot, blue check — bg-[var(--bg-highlight-primary)] = white
          i < current  && "bg-[var(--bg-highlight-primary)] border-[var(--bg-highlight-primary)] text-[var(--text-highlight-primary)]",
          // active: same as done
          i === current && "bg-[var(--bg-highlight-primary)] border-[var(--bg-highlight-primary)] text-[var(--text-highlight-primary)]",
          // inactive: translucent white on blue
          i > current  && "bg-white/20 border-white/50 text-[var(--text-primary)]"
        )}>
          {i < current ? "✓" : i + 1}
        </div>
        <span className="text-xs text-white/80 whitespace-nowrap">{label}</span>
      </div>
      {i < steps.length - 1 && (
        <div className={cn(
          "h-0.5 flex-1 mb-4",
          // done line: white / active line
          i < current ? "bg-[var(--bg-highlight-primary)]" : "bg-white/30"
        )} />
      )}
    </React.Fragment>
  ))}
</div>
```

---

## Screen 4 — Booking Confirmation (`/confirmation/[orderId]`)

### Layout structure

```
<div class="flex flex-col min-h-screen bg-[var(--bg-secondary)]">
  <NavBar />                                     ← bg-[var(--bg-primary)]
  <div class="progress-header">                 ← bg-[var(--bg-primary)] with all stepper dots done
    <ProgressStepper current={4} />              ← current=4 means all steps complete
  <main class="flex-1 flex justify-center p-10 bg-[var(--bg-secondary)]">
    <div class="bg-white max-w-[640px] w-full rounded-xl border border-[var(--border)] overflow-hidden">
      <SuccessHeader>              ← ✅ icon, "Booking confirmed!" text-[var(--text-secondary)]
      <FlightSummarySection>
      <PassengersSection>
      <PriceSection>               ← total price: text-[var(--bg-highlight-secondary)] font-bold
      <ActionsSection>             ← Download PDF + Search again
```

**Error variant** — replace card content with `<ErrorCard>` on API failure.

```tsx
// app/confirmation/[orderId]/page.tsx
import { NavBar } from "@/components/shared/NavBar"
import { ProgressStepper } from "@/components/shared/ProgressStepper"
import { ConfirmationCard } from "@/components/confirmation/ConfirmationCard"
import { ErrorCard } from "@/components/confirmation/ErrorCard"

export default async function ConfirmationPage({ params }: { params: { orderId: string } }) {
  const order = await getOrder(params.orderId)  // server fetch

  if (!order) return <ErrorCard />

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-secondary)]">
      <NavBar />
      {/* Progress header — all steps done */}
      <div className="bg-[var(--bg-primary)] px-8 py-6">
        <ProgressStepper current={4} />
      </div>
      {/* Confirmation card */}
      <main className="flex flex-1 items-start justify-center p-10">
        <div className="w-full max-w-[640px] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <ConfirmationCard order={order} />
        </div>
      </main>
    </div>
  )
}
```

### Confirmation card token usage

```tsx
// components/confirmation/ConfirmationCard.tsx
// "Booking confirmed!" heading: text-[var(--text-secondary)] (black on white card)
// Total price amount:           text-[var(--bg-highlight-secondary)] font-bold
//                               i.e. #0770E3 blue — matches brand accent
```

---

## Root Layout

```tsx
// app/layout.tsx
import { Inter } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-[var(--bg-secondary)] text-[var(--text-secondary)]`}>
        <TooltipProvider>
          {children}
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  )
}
```

---

## Zustand Store Shape

```ts
// lib/store.ts
import { create } from "zustand"

interface SearchParams {
  origin:      { iata: string; name: string; city: string } | null
  destination: { iata: string; name: string; city: string } | null
  departDate:  string | null     // ISO YYYY-MM-DD
  returnDate:  string | null
  passengers:  { type: "adult" | "child" | "infant_without_seat"; count: number }[]
  cabinClass:  "economy" | "premium_economy" | "business" | "first"
  tripType:    "one_way" | "round_trip"
}

interface FlightStore {
  search:         SearchParams
  offerRequestId: string | null
  passengerIds:   string[]
  selectedOffer:  any | null         // Duffel offer object
  orderId:        string | null
  sortBy:         "total_amount" | "total_duration" | "departure_time" | "best"
  filters: {
    stops:         "all" | "direct" | "1stop" | "2plus"
    airlines:      string[]          // IATA codes
    departureTime: Array<"morning" | "afternoon" | "evening" | "night">  // chip multi-select
    priceRange:    [number, number]
  }
  setSearch:        (params: Partial<SearchParams>) => void
  setOfferRequest:  (id: string, passengerIds: string[]) => void
  setSelectedOffer: (offer: any) => void
  setOrderId:       (id: string) => void
  setSortBy:        (sort: FlightStore["sortBy"]) => void
  setFilter:        (filter: Partial<FlightStore["filters"]>) => void
}
```

---

## Responsive Breakpoints

| Breakpoint | Value | Change |
|------------|-------|--------|
| `sm` | 640px | Stack search form |
| `md` | 768px | Single-month calendar → dual |
| `lg` | 1024px | Show filter sidebar / booking sidebar |
| `xl` | 1280px | Max content width |

```tsx
// Pattern: show sidebar on desktop, sheet on mobile
<aside className="hidden lg:block w-[320px] shrink-0">...</aside>
<Sheet>  {/* mobile only */}
  <SheetTrigger className="lg:hidden">Filters</SheetTrigger>
  ...
</Sheet>
```

---

## Navigation Flow

```
/ (Search)
  → onSearch → push /results?orq={offerRequestId}

/results
  → onSelectFlight → setSelectedOffer() → push /passengers

/passengers
  → onConfirm → POST /api/orders → push /confirmation/{orderId}

/confirmation/[orderId]
  → "Search again" → push /
```
