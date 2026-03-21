# Research: Flight Booking UI/UX — Skyscanner Reference

**Date**: 2026-03-18
**Scope**: Skyscanner UI/UX patterns mapped to frontend assessment requirements
**Status**: ACTIONABLE

> Competitor comparison conducted across 7 major platforms (Google Flights, Skyscanner, Kayak, Expedia, Trip.com, AirAsia, Booking.com); **Skyscanner selected as primary reference** for its clean design, transparent pricing, and 1:1 mapping to the 4 required assessment screens.

---

## Skyscanner (skyscanner.com) — Primary Reference

**UX Score**: 8/10 | Load Time: ~5 sec | Booking Time: ~75 sec

> Clean, minimal design with transparent pricing. Covers all 4 assessment screens (Search → Results → Passenger Details → Confirmation) in a well-documented, replicable pattern. Avoids dark UX patterns. Visually polished without requiring complex custom components.

### Search Form
- **Layout**: Hero section (white card, subtle shadow) over gradient background on home; shrinks to compact persistent bar on results page
- **Trip type selector**: Three pill-buttons "One-way / Round-trip / Multi-city" — active pill gets solid blue fill (`#0770E3`); inactive are ghost buttons
- **Origin/Destination**:
  - Two large inputs (height ~52px) side-by-side on desktop, stacked on mobile
  - Left input labeled "From"; right input labeled "To"
  - Swap button (⇄ arrows icon) centered between the two inputs; hover rotates icon 180°
  - Autocomplete dropdown: flag emoji + city name + airport code (e.g., 🇬🇧 London Heathrow — LHR); groups by "Recent", "Popular"
  - Dropdown closes on outside click or Escape
- **Date picker**:
  - Opens an inline floating panel
  - Two calendar months side by side (desktop); single month (mobile)
  - Departure click → start; return click → end; range highlighted in light blue
  - Selected date: solid blue circle; range dates: light blue background
  - Keyboard: Arrow keys navigate days; Enter selects; Escape closes
- **Passengers/Cabin**:
  - Single compact trigger button showing "1 adult, Economy"
  - Opens a popover: Adults/Children counters (+/−); Cabin as radio pills (Economy / Premium Economy / Business / First)
  - "Done" closes popover; button label updates live
- **CTA**: Full-width blue button "Search flights"; 52px height; 8px border-radius; disabled until origin + destination + date filled

### Results Page
- **Layout**: Two-column — left sidebar 280px (sticky); right column fills remaining width
- **Header**: Compact search bar showing current search ("LHR → CDG · 20 Mar · 1 adult"); click to modify
- **Flight cards**:
  - White card, 1px border (`#E6E6E6`), 8px border-radius, 16px padding, subtle hover shadow
  - **Left** (40%): Airline logo 32×32px + name; dep time bold 18px; arr time bold 18px; city codes 12px grey
  - **Center** (30%): Duration centered; thin line + plane icon; stop badge below
  - **Right** (30%): Price 24px bold; "per person" 12px grey; "Select" outlined button 36px
  - Stop colors: Green "Direct" / Orange "1 stop (1h layover)" / Red "2+ stops"
  - Expanding: click card body (not Select) → inline panel with layover detail, baggage, amenities
- **Filter panel** (left sidebar):
  - Header "Filters" + "Clear all" link right-aligned
  - Stops: Radio (All / Direct / 1 stop / 2+ stops) + match count "(12)"
  - Departure time: Time-of-day pills (Morning / Afternoon / Evening)
  - Airlines: Checkbox list — logo 16px + name + count; "Show more" if >5
  - Price: Dual-range slider with min/max labels
  - Filters apply in real-time; result count updates ("Showing 12 of 45 flights")
- **Sort bar**: Tabs — "Recommended · Cheapest · Fastest · Earliest"; active = bottom-border `2px solid #0770E3`
- **Loading**: 4 skeleton cards with CSS shimmer animation
- **Empty state**: "No flights found" + "Try adjusting your filters or different dates" + action buttons
- **Pagination**: "Show more results" grey outline button at bottom
- **Mobile**: Filters behind "Filters" button → full-screen drawer; sort in horizontal scroll row; cards full-width

### Passenger Details Form
- **Layout**: Single centered column (max-width 640px), card-based sections
- **Progress bar**: "1. Search → 2. Results → 3. Passenger details → 4. Confirm" — current step highlighted
- **Per passenger card** (collapsible accordion):
  - Header: "Passenger 1 — Adult" + collapse chevron
  - Fields: Title (select) · First name · Last name · Date of birth · Email (lead only) · Phone (lead only)
  - Labels above inputs; validation inline below field on blur; red border + red 12px error text
- **Booking summary sidebar** (desktop, 300px, sticky): selected flight mini-card + total price
- **CTA**: "Continue to payment" full-width blue button

### Booking Confirmation
- **Layout**: Centered card (max-width 560px), green checkmark at top
- **Success**: ✅ circle + "Booking confirmed!" heading + reference number (monospace) + flight summary card + passenger list + price breakdown + "Download receipt" + "New search" buttons
- **Error**: ❌ icon + "Booking failed" + API error message + "Try again" + "Search again"

### Visual Style

**Colors**:
| Token | Value | Use |
|-------|-------|-----|
| Primary | `#0770E3` | CTAs, active states, links |
| Primary dark | `#084EB2` | Hover |
| Text | `#111236` | Headings |
| Text secondary | `#68697F` | Labels, captions |
| Border | `#E6E6E6` | Inputs, cards |
| Background | `#F1F2F8` | Page bg |
| Card | `#FFFFFF` | Card/panel bg |
| Success | `#00A698` | Direct badge |
| Warning | `#FF7733` | 1-stop badge |
| Error | `#E20A17` | 2+ stops, form errors |

**Typography**: Use `Inter, system-ui, sans-serif` (substitute for Skyscanner Relative)
- Headings: 20–28px / weight 700
- Body: 14–16px / weight 400
- Labels/captions: 12px / weight 400–500

**Spacing**: 8px base unit; cards 16px internal padding; 8px gaps between cards

**Border radius**: inputs 4px · cards 8px · buttons 8px · pills/badges 24px

---

## Skyscanner Implementation Reference (Assessment-Mapped)

> Maps Skyscanner patterns to the 4 required assessment screens. Includes behavior specs, TypeScript shapes, and component hints for Next.js/React.

---

### Screen 1 — Search (`/` home page)

**Assessment requirement**: Origin/destination with airport auto-suggest, departure/return dates, passengers, cabin class.

#### Origin/Destination Autocomplete
- **Visual**: Two inputs, placeholder "From" / "To"; 52px tall; border `#E6E6E6`; focus ring `#0770E3`
- **Behavior**:
  1. User types ≥2 chars → debounced fetch to Duffel Places API (`/air/airports?query=...`)
  2. Dropdown: flag + city name + airport code + country
  3. Keyboard: ArrowDown/Up navigate; Enter selects; Escape closes
  4. After selection input shows: "London Heathrow (LHR)"
- **Component**: `AirportCombobox` — `<input>` + `<ul role="listbox">` with ARIA `role="combobox"`
- **Swap button**: `⇄` icon; `onClick` swaps `origin`/`destination` state values

#### Date Picker
- **Visual**: Two date trigger buttons (departure / return); clicking opens floating calendar
- **Behavior**:
  - Desktop: 2-month inline panel; range highlight
  - Mobile (<768px): full-screen modal; single month; 44px tap targets
  - One-way: hide return date field
- **Component**: `DateRangePicker` — `react-day-picker` or `date-fns`

#### Passengers & Cabin Popover
- **Visual**: Button "1 adult · Economy"; opens popover on click
- **Behavior**: Adult/child counters (+/−); Cabin radio options; "Done" closes; label updates live
- **Component**: `PassengerSelector` — `useRef` + click-outside detection

#### Search CTA
- Full-width blue button; disabled until origin + destination + departure date filled
- On submit: push to `/results?origin=LHR&destination=CDG&date=2025-03-20&...`

---

### Screen 2 — Results (`/results`)

**Assessment requirement**: Flight cards with price/airline/times/stops/duration; filter by stops, airlines, departure time; sort by price, duration, departure time.

#### Page Layout
```
┌─ Sticky header: compact search bar + "Modify search" ─────────────────┐
├─ Sort tabs (Recommended · Cheapest · Fastest · Earliest) ─────────────┤
├─ [Filter sidebar 280px] ┆ [Results list] ──────────────────────────────┤
│  Stops                  ┆  [FlightCard]                                │
│  Departure time         ┆  [FlightCard]                                │
│  Airlines               ┆  [SkeletonCard × 4 while loading]           │
│  Price range            ┆  [Show more results button]                  │
└────────────────────────────────────────────────────────────────────────┘
```

#### FlightCard Component
```tsx
interface FlightCardProps {
  airline: { name: string; logoUrl: string; iataCode: string }
  departure: { time: string; iata: string; city: string }
  arrival:   { time: string; iata: string; city: string }
  duration:  string   // "2h 25m"
  stops:     number   // 0 = Direct
  price:     { amount: string; currency: string }
  onSelect:  () => void
}
```
- **Layout**: CSS Grid `40% / 30% / 30%`
- **Left**: Logo 32×32 + airline name + dep/arr times (18px bold) + city codes (12px grey)
- **Center**: Duration + horizontal line + plane icon + stop badge
- **Right**: Price (24px bold blue) + "per person" (12px grey) + "Select" button
- **Stop badge**: Direct = `bg-green-100 text-green-700`; 1 stop = `bg-orange-100 text-orange-700`; 2+ = `bg-red-100 text-red-700`
- **Expandable row**: Click card body → slide-down panel with layover detail + baggage info

#### Filter Panel
```tsx
interface FilterState {
  stops: 'all' | 'direct' | '1stop' | '2plus'
  airlines: string[]                     // IATA codes
  departureTimeRange: [number, number]   // hours [0, 23]
  priceRange: [number, number]           // min/max
}
```
- Stops: radio group; shows match count
- Airlines: checkbox list sorted by count; logo 16px + name + count badge
- Departure time: 4 time-of-day pill buttons or range slider
- Price: dual-range slider
- All filters → client-side on Duffel offers array (no re-fetch)
- "Clear all" resets to defaults

#### Sort Bar
- Tabs: Recommended (default) / Cheapest / Fastest / Earliest Departure
- Active: `border-b-2 border-[#0770E3]`; inactive: grey text
- Sort functions applied to filtered offers array

#### Loading / Empty States
- **Loading**: 4 `<SkeletonCard />` with `@keyframes shimmer`
- **Empty**: "No flights found" + "Try different dates or adjust filters" + buttons

---

### Screen 3 — Passenger Details (`/passengers`)

**Assessment requirement**: Collect passenger info required by Duffel API; client-side validation.

#### Duffel Required Fields (per passenger)
```
title        — "mr" | "ms" | "mrs" | "miss" | "dr"
given_name   — string
family_name  — string
born_on      — "YYYY-MM-DD"
email        — string (lead passenger only)
phone_number — string (lead passenger only, E.164 e.g. "+447911123456")
```

#### Form Layout
- One collapsible `<PassengerCard>` per passenger (accordion)
- Each card: "Passenger 1 — Adult" header + chevron
- Fields: Title select (120px) · First/Last name side-by-side · Date of birth · Email · Phone
- Labels above inputs (not placeholder-only)
- **Validation**: `react-hook-form` + `zod`; validate on blur; red border + red 12px error text; scroll to first error on submit

#### Booking Summary Sidebar (desktop, 300px, sticky)
Selected flight mini-card + passenger count + total price

#### State Flow
- Selected offer → URL param or Zustand store
- On submit → POST to `/api/orders` (Next.js route handler) → Duffel create order

---

### Screen 4 — Booking Confirmation (`/confirmation`)

**Assessment requirement**: Submit booking via Duffel API; display confirmation; handle API errors.

#### Success Layout
```
┌─────────────────────────────────────┐
│         ✅ (green circle 64px)       │
│      Booking Confirmed!              │
│   Reference: ABC-123456-DEF         │
├─────────────────────────────────────┤
│  Flight Summary Card                │
│  [Logo] LHR → CDG  20 Mar 2025      │
│  08:00 → 10:25  ·  Direct           │
├─────────────────────────────────────┤
│  Passengers                         │
│  1. John Smith                      │
├─────────────────────────────────────┤
│  Base fare:    £180.00              │
│  Taxes:         £25.00              │
│  Total:        £205.00              │
├─────────────────────────────────────┤
│  [Download receipt]  [New search]   │
└─────────────────────────────────────┘
```

#### Error State
- Red ❌ icon + "Booking failed" + Duffel error message
- Duffel error → user message mapping:
  - `offer_no_longer_available` → "This flight is no longer available. Please search again."
  - `passenger_details_invalid` → "One or more passenger details are incorrect. Please review."
  - `payment_declined` → "Payment was declined. Please try a different payment method."
- Buttons: "Try again" + "Search again"

#### API Route Handler
```ts
// app/api/orders/route.ts
export async function POST(req: Request) {
  const body = await req.json()
  const duffel = new Duffel({ token: process.env.DUFFEL_API_KEY })
  const order = await duffel.orders.create(body)
  return Response.json(order.data)
}
```
> Never expose `DUFFEL_API_KEY` to the client — always proxy through Next.js route handler.

---

### CSS Tokens

```css
:root {
  --color-primary:        #0770E3;
  --color-primary-dark:   #084EB2;
  --color-text:           #111236;
  --color-text-secondary: #68697F;
  --color-border:         #E6E6E6;
  --color-bg:             #F1F2F8;
  --color-card:           #FFFFFF;
  --color-success:        #00A698;
  --color-warning:        #FF7733;
  --color-error:          #E20A17;
}
```

### Component Sizing

| Component | Height | Padding | Font | Radius |
|-----------|--------|---------|------|--------|
| Search input | 52px | 12px 16px | 16px | 4px |
| Search button | 52px | 0 24px | 16px 600 | 8px |
| Flight card | auto | 16px | — | 8px |
| Select button (card) | 36px | 0 16px | 14px 600 | 8px |
| Filter checkbox row | 40px | 8px 0 | 14px | — |
| Sort tab | 44px | 0 16px | 14px 500 | 0 |
| Stop badge | 20px | 2px 8px | 12px 500 | 24px |
| Primary button | 48px | 0 24px | 16px 600 | 8px |
