# UI/UX Research — Flight Booking App

*Synthesized from competitor analysis of 7 major OTAs + Skyscanner feature verification · 2026-03-18*

> **Full competitor analysis**: [research-ui-ux-competitor-analysis.md](./research-ui-ux-competitor-analysis.md)

---

## Table of Contents

1. [Reference Sites](#1-reference-sites)
2. [Design Direction](#2-design-direction)
3. [Screen 1 — Search Form](#3-screen-1--search-form)
4. [Screen 2 — Results Listing](#4-screen-2--results-listing)
5. [Screen 3 — Passenger Details](#5-screen-3--passenger-details)
6. [Screen 4 — Booking Confirmation](#6-screen-4--booking-confirmation)
7. [Design System](#7-design-system)
8. [Patterns to Adopt vs Avoid](#8-patterns-to-adopt-vs-avoid)

---

## 1. Reference Sites

| Screen | Reference | Why |
|--------|-----------|-----|
| **Search form** | Skyscanner | All required fields verified present; best-in-class combobox + date picker |
| **Results listing** | Skyscanner | Confirmed: filters (stops, airline, departure time), sort (cheapest, fastest, **outbound departure time**), skeleton loaders |
| **Passenger details** | AirAsia | Skyscanner redirects to airline for this step — AirAsia owns its full passenger form flow |
| **Booking confirmation** | AirAsia / Malaysia Airlines | Skyscanner redirects to partner for confirmation — airline direct booking is the right reference |

### Skyscanner Feature Verification (vs Assessment)

| Requirement | Present on Skyscanner |
|-------------|----------------------|
| Airport auto-suggest | ✅ |
| One-way + round-trip + return date | ✅ |
| Passenger count + cabin class | ✅ |
| Flight cards: price, airline, times, stops, duration | ✅ |
| Filter: stops, airlines, departure time range | ✅ |
| Sort: price (Cheapest) | ✅ |
| Sort: duration (Fastest) | ✅ |
| Sort: **departure time** (Outbound departure time) | ✅ — confirms this is a real, expected sort option |
| Passenger details form | ⚠️ Redirects to airline |
| Booking confirmation | ⚠️ Redirects to airline |

> **OQ-1 resolved**: Skyscanner confirms "sort by departure time" exists in production. Implement client-side — see [Section 4](#4-screen-2--results-listing).

---

## 2. Design Direction

**Chosen style: Skyscanner / Google Flights** — clean, minimal, trust-focused.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Color palette | Trust blues (primary `#0770E3`, dark `#084EB2`) | Matches Skyscanner; builds trust; strong contrast |
| Card density | Minimal — 7–8 fields at a glance | Industry best (Google Flights, Skyscanner score 8/10 vs Trip.com 5/10) |
| Filter placement | Left sidebar desktop / bottom drawer mobile | Most discoverable; Skyscanner + Google Flights pattern |
| Loading state | Skeleton loaders with shimmer | +50% perceived speed vs spinners |
| Pagination | "Load more" button | User control; no URL/state disruption |
| Price display | Total per person, all-in, tax included | Transparent; no surprise fees |
| Sort default | Best (price + speed combined) | Google Flights + Skyscanner default |
| Date picker desktop | Inline modal — 2-month range | Industry standard for round-trip |
| Date picker mobile | Full-screen bottom sheet — 1 month | Thumb-friendly; 44px+ tap targets |

---

## 3. Screen 1 — Search Form

**Reference**: Skyscanner home → [skyscanner.com](https://www.skyscanner.com)

### Layout

```
┌─────────────────────────────────────────────────────────┐
│                  [Hero background]                       │
│                                                         │
│   ┌─ [○ Round-trip  ○ One-way  ○ Multi-city] ──────┐   │
│   │                                                  │   │
│   │  [From ✈]  [⇄]  [To ✈]                         │   │
│   │                                                  │   │
│   │  [Depart ▾]   [Return ▾]   [1 Adult ▾] [Economy▾]│  │
│   │                                                  │   │
│   │                   [ Search flights → ]           │   │
│   └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Component Decisions

| Component | Design |
|-----------|--------|
| **Trip type** | Pill/tab buttons (Round-trip default); one-way hides return date field |
| **Origin / Destination** | shadcn `Combobox` — debounce 300ms, min 2 chars; display `IATA — Airport Name · City, Country`; swap `⇄` button between fields |
| **Departure date** | shadcn `Calendar` — single date picker; calendar modal on click |
| **Return date** | Same as departure — hidden when one-way selected; auto-focus after departure selection |
| **Passengers** | shadcn `Popover` with ± counters per type (Adult / Child / Infant); "1 Adult" default label |
| **Cabin class** | shadcn `Select` — Economy (default) / Premium Economy / Business / First |
| **CTA** | Full-width (mobile) / right-aligned (desktop) blue button; disabled until origin + destination + date filled |

### UX Rules
- Swap button reverses origin ↔ destination values instantly
- Return date auto-opens after departure date selected (round-trip mode)
- Combobox shows IATA code prominently: `KUL — Kuala Lumpur International · Kuala Lumpur, MY`
- Disable "Search" until minimum required fields filled (origin, destination, departure date)

---

## 4. Screen 2 — Results Listing

**Reference**: Skyscanner results — `skyscanner.com/transport/flights/{from}/{to}/{date}`

### Layout

```
Desktop (≥1024px)                     Mobile (<1024px)
┌────────┬──────────────────────┐     ┌─────────────────────┐
│Filters │ [Sort bar           ]│     │ [Compact search bar]│
│        │ ┌────────────────┐   │     │ [Filter ▾] [Sort ▾] │
│Stops   │ │ FlightCard     │   │     │ ┌─────────────────┐ │
│Airline │ ├────────────────┤   │     │ │ FlightCard      │ │
│Depart  │ │ FlightCard     │   │     │ ├─────────────────┤ │
│Price   │ ├────────────────┤   │     │ │ FlightCard      │ │
│        │ │ [Load more]    │   │     │ │ [Load more]     │ │
└────────┴──────────────────────┘     └─────────────────────┘
```

### Flight Card

```
┌──────────────────────────────────────────────────────┐
│ [Logo] British Airways          Nonstop  [€ 46.19]  │
│ 10:50 (KUL) ──────────────── 11:48 (SIN)      /pax  │
│ Terminal 2                 58m           Terminal 1  │
│ Economy · Basic    🧳 1 checked · 1 carry-on         │
└──────────────────────────────────────────────────────┘
```

| Field | Source | Display |
|-------|--------|---------|
| Airline logo | `owner.logo_symbol_url` | 32px square SVG |
| Airline name | `owner.name` | Medium weight |
| Departure time | `segments[0].departing_at` | `HH:MM` bold |
| Arrival time | `segments[last].arriving_at` | `HH:MM` bold |
| Duration | `slices[0].duration` | Parsed `PT58M` → "58m" |
| Stops | `segments.length - 1` | Badge: green "Nonstop" / amber "1 stop" / red "2+ stops" |
| Price | `total_amount + total_currency` | Large, right-aligned |
| Cabin | `segments[0].passengers[0].cabin_class_marketing_name` | Small text |
| Baggage | `segments[0].passengers[0].baggages` | Icon + quantity |

### Filter Panel

| Filter | Control | Source field |
|--------|---------|-------------|
| Stops | Checkbox group (Nonstop / 1 stop / 2+ stops) | `segments.length - 1` |
| Airlines | Checkbox list with logos | `owner.iata_code` |
| Departure time | Range slider (0–24h) or time-bucket chips (Morning / Afternoon / Evening / Night) | `segments[0].departing_at` hour |
| Price | Range slider | `parseFloat(total_amount)` |

### Sort Bar

| Option | Mechanism | Duffel support |
|--------|-----------|----------------|
| **Best** (default) | Client-side score: price + duration weighted | Client-side |
| **Cheapest** | Server-side `sort=total_amount` | `GET /air/offers?sort=total_amount` |
| **Fastest** | Server-side `sort=total_duration` | `GET /air/offers?sort=total_duration` |
| **Departure time** | Client-side sort on `slices[0].segments[0].departing_at` ascending | Client-side only — Duffel has no API param |

> **Note**: Cheapest and Fastest trigger a new API fetch with the `sort` param. Best and Departure time sort the already-fetched results in the browser.

### Zustand `sortBy` (updated — OQ-1 resolved)

```typescript
sortBy: 'best' | 'total_amount' | 'total_duration' | 'departure_time'
```

### Loading / Empty States

| State | Design |
|-------|--------|
| Loading | 3 skeleton cards with shimmer animation (`animate-pulse`) |
| Empty | Illustration + "No flights found" + "Try different dates" CTA back to search |
| Expired offer | Toast notification + redirect to search after 3s |
| API error | Inline error card with retry button |

---

## 5. Screen 3 — Passenger Details

**Reference**: AirAsia direct booking passenger form

### Layout

```
┌─ Step indicator: Search → Select → Passengers → Confirm ─┐
│                                                           │
│  Flight summary bar (compact — airline, times, price)     │
│                                                           │
│  ┌─ Passenger 1 (Adult) ──────────────────────────────┐  │
│  │ [Title ▾] [First name        ] [Last name         ]│  │
│  │ [Date of birth    ] [Gender ○M ○F]                 │  │
│  │ [Email address              ]                      │  │
│  │ [Phone number (+60)         ]                      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─ Passenger 2 (Adult) ─── [same fields] ───────────┐  │
│                                                           │
│           [ Continue to Confirmation → ]                  │
└───────────────────────────────────────────────────────────┘
```

### UX Rules

- Compact flight summary bar stays visible (airline, route, time, price) — prevents context loss
- Step indicator shows current position in flow (step 3 of 4)
- One accordion/card per passenger; all expanded by default if ≤2 passengers
- Validation: inline on blur (not on submit) — show error immediately under each field
- Phone field: prefix locked to `+` with E.164 hint; validate format
- If `passenger_identity_documents_required: true` on selected offer → show passport fields
- "Continue" button disabled until all passengers valid

---

## 6. Screen 4 — Booking Confirmation

**Reference**: AirAsia / Malaysia Airlines confirmation page

### Layout

```
┌──────────────────────────────────────────────┐
│  ✅  Booking Confirmed!                       │
│                                              │
│  Booking Reference: [ ABCDEF ]  ← large      │
│                                              │
│  ┌─ Itinerary ──────────────────────────┐    │
│  │ KUL → SIN · 15 May 2026              │    │
│  │ 10:50 → 11:48 · BA0105 · Economy     │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  ┌─ Passengers ─────────────────────────┐    │
│  │ Tony Stark · Adult                   │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  Total Paid: EUR 46.19                       │
│                                              │
│  [ Search another flight ]                   │
└──────────────────────────────────────────────┘
```

### States

| State | Design |
|-------|--------|
| Loading (POST in flight) | Spinner + "Confirming your booking…" text; disable button |
| Success | Green check icon; booking reference in large monospace font |
| Error | Red alert card; plain-language error message; "Try again" or "Go back" CTA |

### Data Displayed

| UI Element | Source |
|------------|--------|
| Booking reference | `booking_reference` — styled as `font-mono text-2xl` |
| Status | `status` ("confirmed") — green badge |
| Route + times | `slices[].segments[]` same as flight card |
| Passenger names | `passengers[].given_name + family_name` |
| Total paid | `total_amount + total_currency` |

---

## 7. Design System

### Colors

```
Primary:        #0770E3  (CTAs, active states, links)
Primary dark:   #084EB2  (hover)
Text:           #111236  (headings, primary text)
Text secondary: #68697F  (labels, captions, muted)
Border:         #E6E6E6  (inputs, cards, dividers)
Background:     #F1F2F8  (page bg — off-white, not harsh white)
Card:           #FFFFFF  (card surfaces)
Success:        #00A698  (nonstop/direct badge, confirmed state)
Warning:        #FF7733  (1-stop badge)
Error:          #E20A17  (2+ stops badge, error states)
```

### Typography

```
Font:        Inter (system fallback: system-ui, sans-serif)
H1 (hero):   28px / 700
H2 (section):20–24px / 700
Card title:  16px / 600
Body:        14–16px / 400
Small/label: 12px / 400–500
Price:       24px / 700 (right-aligned on card)
```

### Spacing

```
Base unit: 8px
Card padding: 16px
Card gap: 8px
Section gap: 24px
Form field gap: 12px
```

### Component Sizes

```
Search input height:  52px
Search button height: 52px
Primary button height: 48px
Card select button:   36px
Filter sidebar:       280px (desktop)
Card border-radius:   8px
Input border-radius:  4px
Button border-radius: 8px
Badge border-radius:  24px (pill)
Airline logo:         32×32px
```

---

## 8. Patterns to Adopt vs Avoid

### Adopt ✅

| Pattern | From | Why |
|---------|------|-----|
| Skeleton loaders (shimmer) | Google Flights / Skyscanner | +50% perceived speed vs spinner |
| Left sidebar filters | Google Flights / Skyscanner | Most discoverable; usability studies confirm |
| "Nonstop" green badge | Google Flights | Instant visual scan; color + text (not color alone) |
| Step indicator on passenger form | AirAsia | Reduces abandonment; user knows where they are |
| Compact flight summary bar on passenger form | Industry standard | Prevents context loss mid-flow |
| All-in pricing (tax included) | Skyscanner | Transparent; no surprise at checkout |
| Swap button between origin/destination | All major OTAs | Saves time on return-trip entry |
| "Try different dates" on empty results | Google Flights | Keeps user in flow vs dead end |
| Booking reference in monospace large font | All airlines | Scannable; easy to copy/screenshot |
| Inline validation on blur | Best practice | Less disruptive than on-submit; catches errors early |

### Avoid ❌

| Pattern | Seen On | Why |
|---------|---------|-----|
| Pre-selected add-ons (insurance, seats) | Expedia, Trip.com | Dark pattern; inflates cost +108%; trust damage |
| False urgency ("3 seats left!") | Trip.com | Dark pattern; user fatigue; legal risk |
| Fake social proof ("100 people looking") | Booking.com (hotels) | Dark pattern; erodes credibility |
| Hiding fees until checkout | Expedia, Trip.com | Top complaint; causes cart abandonment |
| Filter panel at bottom of page | Kayak (original) | 4/5 users failed to find filters in usability study |
| Spinner-only loading | Kayak (original) | Poor perceived performance; users think it's broken |
| Color as sole stop indicator | Some OTAs | Accessibility fail — always pair color with text/icon |
| Too many fields in initial search form | Trip.com | Cognitive overload; keep to 5–6 max |
| Pagination (numbered pages) | Outdated OTAs | Disrupts browsing flow; "Load more" preferred |
| No empty state guidance | Generic apps | Dead end; user abandons; always add CTA |
