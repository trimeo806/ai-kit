# Responsive Plan — Flight Booking App

*Mobile-first · Tailwind CSS v3 · Container Queries · shadcn/ui · Next.js 14 App Router*

---

## Decision

| Question | Answer |
|----------|--------|
| Approach | **Mobile-first** (Tailwind default) |
| Breakpoints | Default 5 only: `sm` / `md` / `lg` / `xl` / `2xl` — no custom config |
| Layout shifts | Viewport breakpoints (`md:`, `lg:`) |
| Component internals | Container queries (`@container` / `@md`) |
| Typography scaling | Fixed sizes at breakpoints — no `clamp()` |
| Touch targets | 44×44px minimum via extended Button component |
| Component extraction | Inline for 1–2 uses, CVA for 3+ uses |

---

## Breakpoints

| Prefix | Min-width | Use in this app |
|--------|-----------|-----------------|
| *(none)* | 0 | Mobile base — stack everything |
| `sm` | 640px | Larger phones — minor padding changes |
| `md` | 768px | Tablet — 2-col search grid, dual-month calendar |
| `lg` | 1024px | Desktop — show sidebars, full horizontal layouts |
| `xl` | 1280px | Large desktop — max-content-width clamp |
| `2xl` | 1536px | Wide — not needed for this app |

**Rule**: Design mobile state first (unprefixed classes). Add `md:` / `lg:` overrides upward. Never write `max-md:` unless unavoidable.

---

## Mobile-First Authoring

```tsx
// Correct — mobile base, then larger
<div className="flex flex-col gap-4 lg:flex-row lg:gap-6">

// Wrong — desktop base overriding down
<div className="flex flex-row gap-6 max-lg:flex-col max-lg:gap-4">
```

**Unprefixed utility** = applies everywhere. Prefixed utility = applies at that breakpoint and up. Never fight the cascade.

---

## Layout Patterns

### Pattern 1 — Sidebar to Sheet (FilterPanel, Screen 2)

```tsx
// app/results/page.tsx
export default function ResultsPage() {
  return (
    <div className="flex h-screen flex-col">
      <StickyHeader />
      <SortBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop: pinned sidebar */}
        <aside className="hidden lg:flex w-[320px] shrink-0 flex-col
                          border-r border-border overflow-y-auto p-6">
          <FilterPanel />
        </aside>

        {/* Results list */}
        <main className="flex-1 overflow-y-auto p-6">
          <ResultsList />
        </main>
      </div>

      {/* Mobile: floating Sheet trigger */}
      <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-10">
        <FilterSheet />   {/* FilterSheet uses shadcn Sheet component */}
      </div>
    </div>
  )
}
```

**Breakpoint**: `lg` (1024px). Tablet users (768–1023px) get the Sheet; confirmed with standard flight-booking usage patterns.

---

### Pattern 2 — Sticky Booking Summary (PassengersPage, Screen 3)

```tsx
// app/passengers/page.tsx
export default function PassengersPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="px-6 pt-5">
        <ProgressStepper current={2} />
      </div>

      <div className="flex flex-1 items-start gap-0 p-6">
        {/* Form column */}
        <div className="flex-1 flex flex-col gap-6 pr-0 lg:pr-6">
          <PassengerAccordion />
          <Button size="lg" className="w-full">Confirm booking</Button>
        </div>

        {/* Desktop: sticky sidebar */}
        <aside className="hidden lg:flex w-[360px] shrink-0">
          <div className="sticky top-6 w-full">
            <BookingSummary />
          </div>
        </aside>
      </div>

      {/* Mobile: fixed footer bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-10
                      border-t border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-base text-muted-foreground">Total</p>
            <p className="text-2xl font-bold"><BookingTotal /></p>
          </div>
          <Button size="lg" className="shrink-0">Confirm booking</Button>
        </div>
      </div>

      {/* Spacer so footer doesn't overlap content */}
      <div className="lg:hidden h-24" />
    </div>
  )
}
```

**Mobile footer**: Only price + CTA — no detailed breakdown. Full summary visible on desktop sidebar.

---

### Pattern 3 — Search Form Stacking (Screen 1)

```tsx
// components/search/SearchForm.tsx
export function SearchForm() {
  return (
    <div className="flex flex-col gap-4">
      <TripTypePills />

      {/* Origin / Destination row */}
      <div className="flex flex-col gap-3 md:flex-row">
        <AirportCombobox placeholder="From" className="flex-1" />
        <SwapButton className="self-center" />   {/* hidden on mobile or rotated */}
        <AirportCombobox placeholder="To" className="flex-1" />
      </div>

      {/* Date / Passengers row */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <DateRangePicker className="flex-1" />
        <PassengerSelector className="sm:w-[200px]" />
      </div>

      <Button size="lg" className="w-full h-[56px] text-base font-semibold">
        Search flights
      </Button>
    </div>
  )
}
```

| Screen | Origin/Dest | Dates + Passengers |
|--------|-------------|-------------------|
| Mobile (`< sm`) | Stacked vertically | Stacked vertically |
| Tablet (`sm+`) | Stacked vertically | Dates + Pax side-by-side |
| Desktop (`md+`) | Side-by-side with swap | Side-by-side |

---

### Pattern 4 — Confirmation Card (Screen 4)

The card does not change at breakpoints — only the surrounding padding scales.

```tsx
// app/confirmation/[orderId]/page.tsx
<main className="flex flex-1 items-start justify-center p-6 md:p-10">
  <div className="w-full max-w-[640px] overflow-hidden rounded-lg border border-border bg-card">
    <ConfirmationCard order={order} />
  </div>
</main>
```

---

## Typography Responsiveness

**Rule**: Fixed sizes at named breakpoints. No `clamp()`. Hierarchy via weight and color, not size reduction.

### Scale in use

| Role | Mobile | Desktop | Classes |
|------|--------|---------|---------|
| Hero heading | 32px | 40px | `text-[32px] lg:text-[40px] font-bold tracking-tight` |
| Section heading | 24px | 32px | `text-2xl lg:text-[32px] font-bold tracking-tight` |
| Card title | 24px | 24px | `text-2xl font-semibold` (no change) |
| Body / Label / Caption | 16px | 16px | `text-base` (no change) |
| Price / Flight time | 24px | 24px | `text-2xl font-bold` (no change) |
| Booking reference | 24px | 24px | `font-mono text-2xl font-bold tracking-widest` |

**Rule**: Only hero and section headings change size at breakpoints. All body text is fixed 16px — never `text-sm` or `text-xs` for UI text.

---

## Spacing Responsiveness

Follow the 8px grid. Scale padding 50% at `md`, 100% at `lg` relative to the mobile base.

```
Mobile base   → md (+50%)  → lg (+100%)
p-4 (16px)    → p-6 (24px) → p-8 (32px)
gap-4 (16px)  → gap-6 (24px) → gap-6 (24px)
```

```tsx
// Page container
<div className="p-4 md:p-6 lg:p-8">

// Form field group
<div className="flex flex-col gap-4 md:gap-6">

// Card internal padding (fixed — follows component size spec)
<div className="p-6">   {/* always 24px per design token */}
```

**Rule**: Cards and components use fixed padding (24px = `p-6`) per the design token spec. Only page/section wrappers scale padding at breakpoints.

---

## Touch Targets

WCAG 2.5.5 — minimum 44×44px tap target with 10px spacing between targets.

### Button component extension

```tsx
// components/ui/button.tsx (shadcn — edit the size variants)
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium transition-colors ...",
  {
    variants: {
      size: {
        default: "h-12 px-8",              // 48px — primary button
        sm:      "h-10 px-6",              // 40px — small button
        lg:      "h-12 px-8",              // 48px — same as default
        search:  "h-[56px] px-8",          // 56px — hero search CTA
        icon:    "h-10 w-10 min-h-[44px] min-w-[44px]",  // icon buttons — enforce 44px
      },
    },
    defaultVariants: { size: "default" },
  }
)
```

**All `h-12` buttons (48px) already exceed the 44px minimum.** Only icon buttons need explicit `min-h-[44px]`.

### Interactive element rules

| Element | Height | Enforced by |
|---------|--------|-------------|
| Primary button | 48px (`h-12`) | CVA default size |
| Small button | 40px (`h-10`) — add `min-h-[44px]` if standalone | `min-h-[44px]` |
| Search input | 56px (`h-[56px]`) | Component spec |
| Standard input | 48px (`h-12`) | Component spec |
| Checkbox / Radio row | 48px min (`min-h-[48px]`) | Wrapper div |
| Sort tab | 48px (`h-[48px]`) | SortBar component |
| Icon button (swap, close) | 40px + `min-h-[44px]` | Explicit |
| Filter row (checkbox label) | `min-h-[48px] py-3` | `<label>` element |

---

## Container Queries

Use for components that appear in multiple width contexts (sidebar vs. full-width modal).

```bash
# Container query support is built into Tailwind v3.2+ via the plugin
npm install @tailwindcss/container-queries

# tailwind.config.ts
plugins: [require("@tailwindcss/container-queries")]
```

```tsx
// FilterPanel — responds to its container, not the viewport
<div className="@container">
  <div className="flex flex-col gap-4 @md:flex-row @md:gap-6">
    {/* At container ≥ 768px: horizontal; below: vertical */}
  </div>
</div>
```

**When to use `@container` vs `md:`**:

| Situation | Use |
|-----------|-----|
| FilterPanel visible in sidebar (320px) vs Sheet (full-width) | `@container` |
| BookingSummary content adapts to sidebar vs full card | `@container` |
| Page-level: sidebar visible vs hidden | `lg:` viewport |
| Header collapses on small screens | `md:` viewport |

---

## CVA Pattern

Extract to CVA only when the same responsive structure appears **3+ times**.

```tsx
// Example: FlightCard layout variant used in list, search-result preview, and confirmation summary
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const flightCardVariants = cva(
  "rounded-lg border bg-card transition-shadow",
  {
    variants: {
      layout: {
        default: "grid grid-cols-[2fr_1.5fr_1.5fr] items-center gap-3 p-6",
        compact: "flex items-center justify-between gap-4 p-4",
      },
    },
    defaultVariants: { layout: "default" },
  }
)

export function FlightCard({ layout, className, ...props }: FlightCardProps) {
  return (
    <div className={cn(flightCardVariants({ layout }), className)} {...props} />
  )
}
```

**Single-use layouts** stay inline:
```tsx
{/* Confirmation card wrapper — appears once, keep inline */}
<div className="mx-auto w-full max-w-[640px] p-6 md:p-10">
```

---

## Utility Class Ordering

Follow this order to keep classes scannable:

```tsx
<div className="
  relative flex flex-col          // 1. Layout & position
  h-screen w-full                 // 2. Sizing
  p-4 md:p-6 gap-4                // 3. Spacing
  border border-border            // 4. Borders
  bg-card text-foreground         // 5. Colors
  text-base font-medium           // 6. Typography
  hover:shadow-md transition-all  // 7. Effects + interactions
">
```

**Responsive prefix grouping** — keep breakpoint prefixes together per property:

```tsx
// Correct
<div className="block md:flex lg:grid  w-full md:w-1/2 lg:w-1/3  p-4 md:p-6 lg:p-8">

// Wrong — prefixes scattered across properties
<div className="block w-full p-4  md:flex md:w-1/2 md:p-6  lg:grid lg:w-1/3 lg:p-8">
```

---

## Max Responsive Variants Per Element

Limit to **3–4 breakpoint prefixes per property** before refactoring:

```tsx
// OK — 3 breakpoints, readable
<h1 className="text-[32px] lg:text-[40px] font-bold">

// Refactor — 5 breakpoints, extract to component
<div className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl
                p-2 sm:p-3 md:p-4 lg:p-6 xl:p-8
                col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4">
```

---

## Testing

### Manual (required)

Test at exactly these 3 viewport widths in Chrome DevTools (Ctrl+Shift+M):

| Viewport | Breakpoint | What to check |
|----------|------------|---------------|
| 375px | Mobile | All inputs stacked; Sheet trigger visible; footer bar shows |
| 768px | `md` | 2-col search grid; Sheet trigger still visible; sidebar hidden |
| 1024px | `lg` | FilterPanel sidebar visible; BookingSummary sidebar visible; footer gone |

### Browser extensions

- **Tailwind Breakpoint Display** — shows current active breakpoint in corner
- **Tailscan** — inspect element Tailwind classes visually

### Playwright (future)

```ts
// e2e/responsive.spec.ts
test("FilterPanel: sidebar at lg, sheet at md", async ({ page }) => {
  await page.goto("/results")

  // Mobile
  await page.setViewportSize({ width: 375, height: 812 })
  await expect(page.locator("aside.lg\\:flex")).toBeHidden()
  await expect(page.getByRole("button", { name: "Filters" })).toBeVisible()

  // Desktop
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(page.locator("aside.lg\\:flex")).toBeVisible()
  await expect(page.getByRole("button", { name: "Filters" })).toBeHidden()
})
```

---

## Component Responsive Map

| Component | Mobile | Tablet (md) | Desktop (lg) |
|-----------|--------|-------------|--------------|
| `SearchForm` | Stacked full-width | 2-col dates/pax row | Full horizontal |
| `FilterPanel` | Sheet (bottom trigger) | Sheet | Sticky sidebar 320px |
| `ResultsList` | Full width, p-4 | Full width, p-6 | Flex-1, p-6 |
| `FlightCard` | 3-col grid (unchanged) | 3-col grid | 3-col grid |
| `BookingSummary` | Fixed footer bar | Fixed footer bar | Sticky sidebar 360px |
| `ProgressStepper` | Full width, truncate labels | Full width | Full width |
| `ConfirmationCard` | Full width, p-6 | max-w-[640px], p-6 | max-w-[640px], p-10 |
| `PassengerCard` | Full width accordion | Full width accordion | Flex-1 column |
| `SortBar` | Horizontal scroll | Horizontal | Horizontal |
| `AirlineLogo` | 40×40 fixed | 40×40 fixed | 40×40 fixed |

---

## Conventions Summary

| Rule | Rationale |
|------|-----------|
| Mobile-first always (`md:` overrides up) | Tailwind-native; simpler cascade |
| No custom breakpoints | Default 5 cover all flight-booking use cases |
| `lg:` for sidebar show/hide | 1024px — full layout visible |
| `@container` for components in multiple width contexts | Components portable between sidebar/full-width |
| Fixed 16px body text — no `text-sm` for UI text | Design token requirement |
| Hero heading scales: `text-[32px] lg:text-[40px]` | Only 2 breakpoints; predictable |
| Cards use fixed `p-6` | Component spec — not responsive |
| Page wrappers: `p-4 md:p-6 lg:p-8` | 8px grid ×2 each step |
| All buttons ≥ 44px tall | WCAG 2.5.5 touch target |
| Extract to CVA at 3+ reuses | Balance DRY vs. premature abstraction |
| ≤ 3–4 breakpoint prefixes per element | Beyond that, extract to component |

---

## Implementation Checklist

### Setup
- [ ] Verify `tailwind.config.ts` uses default breakpoints (no custom `screens`)
- [ ] Install `@tailwindcss/container-queries` plugin
- [ ] Add `plugin: [require("@tailwindcss/container-queries")]` to config
- [ ] Extend shadcn Button with `icon` size variant (`min-h-[44px] min-w-[44px]`)
- [ ] Install Tailwind Breakpoint Display browser extension

### Components
- [ ] `SearchForm` — stacked → horizontal grid at `sm` and `md`
- [ ] `FilterPanel` — `hidden lg:flex` sidebar + `<FilterSheet>` for mobile
- [ ] `ResultsList` — `p-6` container; `FlightCard` grid unchanged
- [ ] `BookingSummary` — `hidden lg:flex` sidebar + fixed mobile footer
- [ ] `ProgressStepper` — full-width, label truncation on mobile confirmed
- [ ] `ConfirmationCard` — centered `max-w-[640px]`, padding scales at `md`

### QA
- [ ] Test 375px, 768px, 1024px viewports
- [ ] Verify all interactive elements ≥ 44px tall
- [ ] No horizontal scroll on 375px
- [ ] Sticky footer not overlapping content on passengers page
- [ ] FilterPanel Sheet accessible via keyboard on mobile
