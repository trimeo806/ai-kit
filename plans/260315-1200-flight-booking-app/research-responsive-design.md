# Research: Responsive Design with Tailwind CSS 3, shadcn/ui, and Next.js 14

**Date**: 2026-03-18
**Agent**: Researcher
**Scope**: Flight booking app (4 screens) — responsive design strategy
**Status**: ACTIONABLE

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Research Question](#research-question)
3. [Methodology](#methodology)
4. [Findings by Topic](#findings-by-topic)
5. [Code Examples](#code-examples)
6. [Recommendations](#recommendations)
7. [Unresolved Questions](#unresolved-questions)

---

## Executive Summary

**Key Verdict**: Mobile-first Tailwind CSS with container queries for components + viewport breakpoints for page layout is the proven pattern. shadcn/ui provides production-ready responsive patterns (Sidebar → Sheet, sticky layouts). Extract responsive patterns into CVA variants only when reused 3+ times; prefer inline utilities for single-use responsive elements.

**Critical decisions for flight booking app**:
- Use Tailwind's 5 default breakpoints (sm/md/lg/xl/2xl) — do not customize unless project metrics demand it
- Container queries (@container/@md) for FilterPanel, BookingSummary, ConfirmationCard
- Viewport breakpoints (md:, lg:) for page-level layout shifts
- 44×44px minimum touch targets enforced via `min-h-11 min-w-11` consistently on all interactive elements
- Spacing: Use 8px base grid (via tailwind.config.js) for consistency with 8px typography scale
- Typography: Fixed font sizes at breakpoints (not clamp) for flight booking — clamp adds complexity for marginal benefit

---

## Research Question

How to build responsive flight booking UI across 4 screens using Tailwind CSS 3, shadcn/ui, and Next.js 14 App Router while maintaining consistency, accessibility, and code clarity?

**Sub-questions addressed**:
1. Breakpoint strategy: sm/md/lg/xl/2xl or custom? When container queries vs. viewport breakpoints?
2. Mobile-first vs. desktop-first — which for this project?
3. Layout patterns: sidebar-to-sheet, sticky elements, search form stacking, confirmation card
4. Typography and spacing responsiveness — clamp() or breakpoint-based scaling?
5. Touch targets and accessibility — enforce 44×44px without bloat
6. Code organization — inline utilities vs. extracted components with CVA
7. Testing and debugging responsive designs
8. Maintainability rules — when to extract, naming conventions

---

## Methodology

### Knowledge Tiers

**Primary**: Context7 (official Tailwind CSS + shadcn/ui docs)
**Secondary**: WebSearch (blog posts, community patterns, 2024–2025)
**Tertiary**: GitHub (reference implementations, issue discussions)

### Sources Consulted

| Source | URL | Credibility | Date |
|--------|-----|-------------|------|
| Tailwind CSS Official Docs | https://tailwindcss.com/docs/responsive-design | High | Current |
| shadcn/ui Official Docs | https://github.com/shadcn/ui | High | Current |
| Tailwindcss.com — Responsive Design | https://tailwindcss.com/docs/responsive-design | High | 2025 |
| LogRocket — Container Queries | https://blog.logrocket.com/tailwind-css-dynamic-breakpoints-container-queries/ | High | 2024 |
| CSS Container Queries Baseline | Baseline 2023 (Chrome 105+, Firefox 110+, Safari 16+) | High | 2023+ |
| WCAG 2.5.5 Target Size | https://www.w3.org/WAI/WCAG21/Understanding/target-size.html | High | 2021 |
| CVA Documentation | https://cva.style/docs | High | Current |
| DEV Community — CVA + Tailwind | https://dev.to/webdevlapani/cva-vs-tailwind-variants-choosing-the-right-tool-for-your-design-system-12am | Medium | 2024 |
| Polypane + Tailwind Testing | https://polypane.app/tailwindcss/ | High | Current |
| Tailscan DevTools | https://tailscan.com/ | High | Current |

---

## Findings by Topic

### 1. Breakpoint Strategy

#### Default Breakpoints (Recommended)

Tailwind v3 provides 5 mobile-first breakpoints — use these:

| Breakpoint | Min-width | Use Case |
|------------|-----------|----------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets (iPad) |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |
| `2xl` | 1536px | Wide screens |

**Decision**: Use defaults. Flight booking users span small phones to desktop — the 5 breakpoints cover this spectrum well.

#### Container Queries vs. Viewport Breakpoints

**Use viewport breakpoints (md:, lg:) for**:
- Page-level layout shifts (main nav, sidebar position, grid columns)
- FilterPanel visibility toggle: `hidden lg:block`
- Sticky footer bar positioning on mobile

**Use container queries (@container/@md) for**:
- Components that appear in multiple layout contexts
- FilterPanel inside results — may be sidebar (lg width) or mobile full-width
- BookingSummary — appears beside form on desktop, stacks below on mobile
- ReusableCard components (flight card, seat selection, etc.)

**Container Query Support**:
- Baseline: 2023 (Chrome 105+, Firefox 110+, Safari 16+)
- Safe for production in 2025 — no polyfill needed for modern browsers

**Pattern for flight app**:
```
Page layout shifts → viewport breakpoints
Component internals → container queries
```

---

### 2. Mobile-First vs. Desktop-First

#### Tailwind's Default: Mobile-First

**How it works**:
- Unprefixed utilities apply at ALL breakpoints (mobile + desktop)
- Prefixed utilities (md:, lg:) apply at that breakpoint AND UP
- Base styles are for smallest screen; enhance upward with prefixes

**Example**:
```html
<!-- Mobile: flex-col, Desktop (md+): flex-row -->
<div class="flex flex-col md:flex-row">
```

#### Why Mobile-First for Flight Booking

1. **Reflects user base**: Mobile users are primary (high booking abandonment on mobile)
2. **Performance**: Unprefixed utilities loaded first, smaller initial CSS
3. **DRY**: Less repetition — don't override base styles everywhere
4. **Tailwind-native**: All ecosystem tooling assumes mobile-first

#### Can You Use Desktop-First?

Yes, but don't for this project:
- Requires custom config with max-width breakpoints (max-md:, max-lg:)
- More verbose, confusing specificity
- Community consensus: mobile-first is the norm
- shadcn/ui components assume mobile-first

**Verdict**: Use mobile-first. No custom breakpoint config needed.

---

### 3. Layout Patterns for Flight Booking

#### Pattern 1: Sidebar-to-Sheet (FilterPanel)

**Desktop**: Sidebar visible, pinned left
**Mobile**: Hidden by default, opens as bottom/side sheet

```jsx
// FilterPanel with responsive visibility
<div className="hidden lg:block w-80 border-r">
  {/* Desktop: sticky sidebar */}
  <div className="sticky top-0 h-screen overflow-y-auto">
    <FilterPanel />
  </div>
</div>

// Mobile: use Sheet component (shadcn/ui)
<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetTrigger asChild>
    <Button variant="outline" size="sm" className="lg:hidden">
      Filters
    </Button>
  </SheetTrigger>
  <SheetContent side="left">
    <FilterPanel />
  </SheetContent>
</Sheet>
```

**Key**: shadcn/ui's Sheet component handles mobile sliding drawer natively.

#### Pattern 2: Sticky Booking Summary

**Desktop**: Wide sidebar with sticky header/footer
**Mobile**: Collapsed to sticky footer bar with expandable drawer

```jsx
// Desktop: full sidebar
<aside className="hidden lg:block w-96">
  <div className="sticky top-0">
    <BookingSummary />
  </div>
</aside>

// Mobile: sticky footer (use Container Query)
<div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t">
  <div className="@container">
    <BookingSummaryMini />
  </div>
</div>
```

**Why container query**: Footer width varies; use @md to expand details when space allows.

#### Pattern 3: Search Form Stacking

**Desktop**: Horizontal grid (date from/to, passengers, class side-by-side)
**Mobile**: Vertical stack (full width)

```jsx
<form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <div>
    <label>From</label>
    <input />
  </div>
  <div>
    <label>To</label>
    <input />
  </div>
  <div>
    <label>Departure</label>
    <input type="date" />
  </div>
  <div>
    <label>Passengers</label>
    <select />
  </div>
</form>
```

Mobile: 1 column → Tablet: 2 columns → Desktop: 4 columns

#### Pattern 4: Confirmation Card

**Centered, max-width 640px** (fixed width, doesn't respond to breakpoints):

```jsx
<div className="mx-auto max-w-[640px] p-4 sm:p-6">
  <Card>
    {/* Confirmation details */}
  </Card>
</div>
```

The card itself doesn't change at breakpoints; padding increases on sm+.

---

### 4. Typography Responsiveness

#### Decision: Fixed Font Sizes at Breakpoints (NOT clamp())

**For flight booking app, use breakpoint-based sizing, not CSS clamp()**:
- Clamp requires precise vw/rem calculations and testing
- Flight app text hierarchy is simple (h1, body, captions)
- Breakpoint approach is predictable, easier to test
- shadcn/ui components use fixed sizes; mixing breaks consistency

#### Tailwind's Default Type Scale (8px grid)

Tailwind's fontSize utilities already follow an 8px pattern:

```
text-xs:     12px
text-sm:     14px
text-base:   16px
text-lg:     18px
text-xl:     20px
text-2xl:    24px
text-3xl:    30px
text-4xl:    36px
text-5xl:    48px
```

#### Responsive Typography Strategy

```jsx
// Heading: 24px mobile → 32px tablet → 40px desktop
<h1 className="text-2xl md:text-3xl lg:text-5xl font-bold">
  Book Your Flight
</h1>

// Body: 16px mobile → 16px tablet → 18px desktop (rare)
<p className="text-base lg:text-lg">
  Search millions of flights
</p>

// Small: 14px everywhere (no variation needed)
<p className="text-sm text-muted-foreground">
  Last updated 5 minutes ago
</p>
```

#### When to Use clamp()

Only if you have specific requirements:
- Very wide desktop screens (3000px+) that need continuous scaling
- Micro-interactions with smooth font growth
- Flight app doesn't need this — fixed breakpoints suffice

**If you did use clamp()**:
```js
// tailwind.config.js
theme: {
  extend: {
    fontSize: {
      'display': 'clamp(1.75rem, calc(1.25rem + 2.5vw), 3.5rem)',
    }
  }
}
```

But for flight booking: **skip clamp**. Use breakpoint-based sizing.

#### Line Height Rules

Always pair font size changes with line height adjustments:

```jsx
<h1 className="text-2xl md:text-3xl lg:text-5xl leading-tight md:leading-snug lg:leading-tight">
</h1>
```

Tight line height (1.25) works for headings; normal (1.5) for body.

---

### 5. Spacing Responsiveness

#### 8px Grid Base

Configure Tailwind to use 8px as the base spacing unit:

```js
// tailwind.config.js
module.exports = {
  theme: {
    spacing: {
      '0': '0',
      '1': '0.5rem',   // 8px
      '2': '1rem',     // 16px
      '3': '1.5rem',   // 24px
      '4': '2rem',     // 32px
      '6': '3rem',     // 48px
      // ...
    }
  }
}
```

Or use Tailwind's default (4px base) and multiply mentally.

#### Responsive Spacing Rules

**Padding**: Reduce on mobile, increase on desktop

```jsx
// Mobile: p-4 (16px), Desktop: p-8 (32px)
<div className="p-4 md:p-6 lg:p-8">
  {/* Content */}
</div>

// Form sections: tight mobile, loose desktop
<div className="space-y-4 md:space-y-6 lg:space-y-8">
  {/* Form fields */}
</div>
```

**Gap (flex/grid)**: Same principle

```jsx
// Grid items: gap-2 mobile → gap-4 desktop
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 lg:gap-6">
</div>
```

#### Rules for Small Screens

- Don't over-space on mobile (conserve vertical real estate)
- Use `p-4` or smaller as default (16px or 12px)
- Increase by 50% at md breakpoint
- Increase by 100% at lg breakpoint

Example: `p-4 md:p-6 lg:p-8` (16 → 24 → 32px)

---

### 6. Touch Targets (Accessibility)

#### Minimum Size: 44×44px (WCAG 2.5.5 AAA)

**Why 44px?** Users with motor impairments, older users, or those wearing gloves need larger tap targets.

**Spacing**: Minimum 10px between targets to prevent accidental taps.

#### Tailwind Implementation

```jsx
// Button: min-height 44px (11 units × 4px = 44px)
<Button className="min-h-11 min-w-11">
  Book Now
</Button>

// Link with padding
<a href="#" className="inline-flex items-center justify-center min-h-11 min-w-11 px-4">
  Filter Options
</a>

// Form input
<input className="min-h-11 px-3 py-2 rounded-md border" />
```

#### Enforcing Consistency

Create a button component with touch target built-in:

```jsx
// components/ui/button.tsx (shadcn-style)
export function Button({ children, ...props }) {
  return (
    <button
      className="min-h-11 min-w-11 inline-flex items-center justify-center px-4 py-2 rounded-md"
      {...props}
    >
      {children}
    </button>
  )
}
```

Now all buttons automatically have 44×44px minimum.

#### Don't Bloat Markup

- Use CSS to enforce min-height on interactive elements
- Extend shadcn/ui Button component once, reuse everywhere
- Don't add min-h-11 to every element — use components

---

### 7. Code Patterns

#### Utility Class Ordering Convention

Follow Concentric CSS order:

```jsx
<div className="
  // Layout & positioning
  relative flex flex-col

  // Box model (size, padding, margin)
  h-screen w-full p-4 md:p-6 lg:p-8 gap-4

  // Borders
  border border-gray-200

  // Backgrounds & colors
  bg-white text-gray-900

  // Typography
  text-base md:text-lg font-semibold

  // Effects & interactions
  hover:bg-gray-100 transition-colors
">
```

**Order**:
1. Layout (display, flex, grid, position)
2. Sizing (width, height, min/max)
3. Spacing (padding, margin, gap)
4. Borders
5. Background & text color
6. Typography (size, weight, line-height)
7. Effects (shadow, opacity, transitions)
8. Interactive states (hover, focus, active)

#### Responsive Prefix Placement

Group responsive prefixes together:

```jsx
// Good: responsive prefixes grouped per property
<div className="
  block md:flex lg:grid
  w-full md:w-1/2 lg:w-1/3
  p-4 md:p-6 lg:p-8
">

// Avoid: scattered responsive prefixes
<div className="block w-full p-4 md:flex md:w-1/2 md:p-6 lg:grid lg:w-1/3 lg:p-8">
```

#### CVA Pattern for Responsive Components

Extract responsive variants only when **reused 3+ times**:

```jsx
// components/flight-card.tsx
import { cva, type VariantProps } from "class-variance-authority"

const flightCardVariants = cva(
  "p-4 rounded-lg border transition-colors",
  {
    variants: {
      layout: {
        compact: "flex flex-col md:flex-row gap-2 md:gap-4",
        expanded: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
      },
      density: {
        tight: "p-2 md:p-3",
        normal: "p-4 md:p-6",
      },
    },
    defaultVariants: {
      layout: "compact",
      density: "normal",
    },
  }
)

export function FlightCard({ layout = "compact", density = "normal" }) {
  return (
    <div className={flightCardVariants({ layout, density })}>
      {/* Card content */}
    </div>
  )
}
```

**Benefits**:
- Type-safe variants
- Single source of truth for responsive behavior
- Reusable across 3+ instances
- Cleaner component props

#### Inline Utilities for Single-Use Elements

For one-off responsive layouts, inline utilities are fine:

```jsx
// Single confirmation card — no need for CVA
<div className="mx-auto max-w-[640px] p-4 md:p-6 lg:p-8">
  <ConfirmationCard />
</div>
```

---

### 8. Testing Responsive Designs

#### DevTools & Extensions

| Tool | Purpose | Free? |
|------|---------|-------|
| [Tailscan](https://tailscan.com/) | Visual Tailwind debugger + breakpoint display | Freemium |
| [DevTools for Tailwind CSS](https://devtoolsfortailwind.com/) | Browser extension to test utilities live | Free |
| [Tailwind Breakpoint Display](https://chromewebstore.google.com/detail/tailwind-responsive-break/incikpedlilahccgpfpgknfpokibpfij) | Shows current breakpoint on screen | Free |
| [Polypane](https://polypane.app/tailwindcss/) | Multi-viewport browser, Tailwind-optimized | Paid |
| Browser DevTools (native) | Right-click → Inspect → Styles panel | Free |

#### Manual Testing Process

1. **Chrome DevTools**:
   - Open DevTools (F12)
   - Click Responsive Design Mode (Ctrl+Shift+M)
   - Test at breakpoints: 375px, 640px, 768px, 1024px, 1280px, 1536px

2. **Physical devices** (final verification):
   - iPhone SE (375px) — smallest
   - iPad (768px) — tablet
   - Desktop 1080p (1920px) — desktop

3. **shadcn/ui Sheet/Sidebar**:
   - Test FilterPanel sheet opens/closes at lg breakpoint
   - Verify mobile sheet is keyboard accessible
   - Check Sidebar collapse animation smooth

#### Automated Testing (Future)

Use Playwright + Percy for visual regression:

```js
// e2e/responsive.spec.ts
import { test, expect } from '@playwright/test'

test('FilterPanel responsive at md breakpoint', async ({ page }) => {
  await page.goto('/results')

  // Mobile: Sheet hidden
  await page.setViewportSize({ width: 375, height: 812 })
  const sheet = page.locator('[data-filter-sheet]')
  await expect(sheet).toHaveCSS('display', 'none')

  // Desktop: Sheet visible
  await page.setViewportSize({ width: 1024, height: 768 })
  await expect(sheet).toHaveCSS('display', 'block')
})
```

---

### 9. Maintainability Rules

#### When to Extract to Component

Extract if **reused 3+ times** with same responsive structure:

```jsx
// If you're writing this 3+ times, extract:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
  {/* content */}
</div>

// Create a component:
export function ResponsiveGrid({ children }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {children}
    </div>
  )
}
```

#### When to Keep Inline

Single use, context-specific:

```jsx
// Confirmation card (appears once) — keep inline
<div className="mx-auto max-w-[640px] p-4 md:p-6">
  <ConfirmationCard />
</div>
```

#### Max Responsive Variants Per Element

Limit to **3–4 breakpoint prefixes** per element. If more, refactor:

```jsx
// Avoid: too many variants
<div className="
  text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl
  p-2 md:p-4 lg:p-6 xl:p-8 2xl:p-10
  block md:flex lg:grid
">
```

Refactor into component or extract repeated patterns.

#### Naming Conventions

Use descriptive classNames for complex responsive components:

```jsx
// Good: semantic, grid describes layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// Avoid: cryptic abbreviations
<div className="g-1 md:g-2 lg:g-3">
```

For CVA variants, use full words:

```js
variants: {
  layout: {
    stackedMobile: "flex flex-col md:grid md:grid-cols-2",
    sidebarDesktop: "flex lg:flex-row",
  }
}
```

#### Documentation Template

For complex responsive components, document the breakpoint strategy:

```jsx
/**
 * FilterPanel
 *
 * Responsive behavior:
 * - Mobile (< 1024px): Hidden, accessible via Sheet trigger
 * - Desktop (>= 1024px): Visible sidebar, sticky header/footer
 *
 * Uses container query for internal layout shifts
 */
export function FilterPanel() {
  return (
    <div className="hidden lg:block @container">
      {/* ... */}
    </div>
  )
}
```

---

## Code Examples

### Full Flight Search Form (Responsive)

```jsx
'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export function FlightSearchForm() {
  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6 lg:p-8">
      <form className="space-y-4">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
          Book Your Flight
        </h1>

        {/* Search grid: 1 col mobile → 2 col tablet → 4 col desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              From
            </label>
            <Input
              placeholder="Departure city"
              className="min-h-11"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              To
            </label>
            <Input
              placeholder="Arrival city"
              className="min-h-11"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Departure
            </label>
            <Input
              type="date"
              className="min-h-11"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Passengers
            </label>
            <Select className="min-h-11">
              <option>1</option>
              <option>2</option>
              <option>4</option>
            </Select>
          </div>
        </div>

        <Button className="w-full md:w-auto min-h-11">
          Search Flights
        </Button>
      </form>
    </div>
  )
}
```

### FilterPanel with Sidebar-to-Sheet

```jsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

export function FilterPanel() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile: Sheet trigger button */}
      <div className="lg:hidden mb-4">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full min-h-11">
              Filter Results
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <FilterContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Sidebar */}
      <aside className="hidden lg:block w-80 border-r border-gray-200">
        <div className="sticky top-0 h-screen overflow-y-auto p-4">
          <FilterContent />
        </div>
      </aside>
    </>
  )
}

function FilterContent() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Price</h3>
        <input type="range" className="w-full" />
      </div>

      <div>
        <h3 className="font-semibold mb-2">Airlines</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="min-h-4 min-w-4" />
            <span className="text-sm">Airline A</span>
          </label>
          {/* ... more airlines ... */}
        </div>
      </div>
    </div>
  )
}
```

### BookingSummary with Sticky Positioning

```jsx
'use client'

export function BookingSummary() {
  return (
    <>
      {/* Desktop: Sidebar */}
      <aside className="hidden lg:block w-96 bg-gray-50 p-6">
        <div className="sticky top-0 space-y-4">
          <h2 className="text-xl font-bold">Booking Summary</h2>
          <BookingSummaryContent />
        </div>
      </aside>

      {/* Mobile: Sticky footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="p-4 flex items-center justify-between">
          <div className="text-sm">
            <p className="text-gray-600">Total</p>
            <p className="text-lg font-bold">$299.99</p>
          </div>
          <button className="bg-blue-600 text-white min-h-11 px-6 rounded-md">
            Continue
          </button>
        </div>
      </div>

      {/* Spacer for mobile footer */}
      <div className="lg:hidden h-20" />
    </>
  )
}

function BookingSummaryContent() {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex justify-between">
        <span>Flight</span>
        <span className="font-semibold">$199.99</span>
      </div>
      <div className="flex justify-between">
        <span>Taxes</span>
        <span className="font-semibold">$50.00</span>
      </div>
      <div className="border-t pt-2 flex justify-between font-bold">
        <span>Total</span>
        <span>$249.99</span>
      </div>
    </div>
  )
}
```

### Responsive Flight Results Grid with Container Queries

```jsx
'use client'

export function FlightResultsGrid({ flights }) {
  return (
    <div className="@container">
      <div className="
        grid
        grid-cols-1
        @md:grid-cols-2
        @lg:grid-cols-3
        gap-4 @md:gap-6
      ">
        {flights.map(flight => (
          <FlightCard key={flight.id} flight={flight} />
        ))}
      </div>
    </div>
  )
}

function FlightCard({ flight }) {
  return (
    <div className="
      p-4 @md:p-6
      border rounded-lg
      hover:shadow-lg transition-shadow
    ">
      <div className="flex flex-col @md:flex-row @md:items-start @md:justify-between gap-3">
        <div>
          <p className="text-xs @md:text-sm text-gray-600">
            {flight.departure_time}
          </p>
          <h3 className="text-lg @md:text-xl font-semibold">
            {flight.from} → {flight.to}
          </h3>
          <p className="text-xs @md:text-sm text-gray-600">
            {flight.duration}
          </p>
        </div>

        <div className="text-right">
          <p className="text-2xl @md:text-3xl font-bold">
            ${flight.price}
          </p>
          <button className="mt-2 min-h-11 px-4 bg-blue-600 text-white rounded-md w-full @md:w-auto">
            Select
          </button>
        </div>
      </div>
    </div>
  )
}
```

### CVA Button Component with Responsive Variants

```jsx
// components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
        outline: "border border-gray-300 bg-white hover:bg-gray-50",
        ghost: "hover:bg-gray-100",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-8",
        // Responsive: 44px min touch target on mobile
        touch: "min-h-11 min-w-11 px-4 py-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  variant,
  size = "touch", // Default to touch size (accessible)
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
```

---

## Recommendations

### Priority 1: Setup (Day 1)

- [ ] Confirm default Tailwind breakpoints (no custom config)
- [ ] Extend shadcn/ui button to enforce 44×44px minimum
- [ ] Install Tailscan + Breakpoint Display Chrome extensions
- [ ] Review 4 screens, identify where sidebar-to-sheet pattern applies

### Priority 2: Component Architecture (Day 2–3)

- [ ] Build FilterPanel with Sheet + sidebar variant
- [ ] Build BookingSummary with sticky desktop + footer mobile
- [ ] Create responsive grid component for flight results
- [ ] Test all components at 375px, 768px, 1024px viewports

### Priority 3: Refinement (Day 4+)

- [ ] Add CVA variants for any component reused 3+ times
- [ ] Document responsive strategy in component docstrings
- [ ] Add Playwright test for responsive layout shifts
- [ ] Audit all interactive elements for 44×44px minimum

### Code Quality Rules

| Rule | Why |
|------|-----|
| No custom breakpoints | Stick with sm/md/lg/xl/2xl defaults |
| Mobile-first always | Unprefixed utilities first, then md:, lg: overrides |
| 44×44px buttons | Extend Button component, not inline utilities |
| Container queries for components | @container for multi-context elements |
| Viewport breakpoints for pages | md:, lg: for page-level layout shifts |
| Fixed typography sizes | Use text-2xl, text-3xl at breakpoints, skip clamp() |
| Extract at 3+ reuses | Inline utilities for 1–2 uses, CVA for 3+ |
| Group responsive prefixes | All md: classes together, then lg:, then xl: |

---

## Unresolved Questions

1. **Sidebar collapse strategy on md breakpoint**: Should FilterPanel collapse at md (tablet) or lg (desktop)? Depends on iPad usage — recommend lg for now, test with real iPad users later.

2. **Sticky footer height on mobile**: Does 80px footer work for all content? Might need adjustment if keyboard visible on mobile input focus.

3. **Container query size thresholds**: Should FilterPanel use @sm, @md, or @lg? Depends on actual container widths in your layout — recommend starting with @md, adjust after testing.

4. **Typography scaling on 2xl+ screens**: Do you need font size adjustments at 2xl (1536px+)? Flight booking likely doesn't; most users on < 1536px.

5. **Touch target spacing on mobile**: The 10px spacing rule between targets — how to enforce without bloat? Recommend padding-based spacing in flexbox/grid, not margin on each item.

---

## Sources

1. [Tailwind CSS — Responsive Design](https://tailwindcss.com/docs/responsive-design)
2. [Tailwind CSS — Container Queries (Official Docs)](https://tailwindcss.com/docs/responsive-design)
3. [shadcn/ui — Sidebar Component](https://github.com/shadcn/ui/blob/main/apps/v4/content/docs/components/base/sidebar.mdx)
4. [shadcn/ui — Sheet Component](https://github.com/shadcn/ui)
5. [LogRocket — Container Queries & Dynamic Breakpoints](https://blog.logrocket.com/tailwind-css-dynamic-breakpoints-container-queries/)
6. [WCAG 2.5.5 — Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
7. [CSS Clamp for Responsive Typography](https://davidhellmann.com/blog/development/tailwindcss-fluid-typography-with-css-clamp)
8. [Class Variance Authority — Docs](https://cva.style/docs)
9. [CVA vs Tailwind Variants — DEV Community](https://dev.to/webdevlapani/cva-vs-tailwind-variants-choosing-the-right-tool-for-your-design-system-12am)
10. [Tailscan DevTools](https://tailscan.com/)
11. [Polypane Multi-Viewport Browser](https://polypane.app/tailwindcss/)
12. [Tailwind Responsive Breakpoints (2025 Guide)](https://tailkits.com/blog/tailwind-breakpoints-complete-guide/)

---

## Verdict

**Status**: ACTIONABLE ✓

All 8 questions answered with concrete code examples and patterns ready for implementation. No blockers.

Flight booking responsive strategy:
- **Breakpoints**: Default 5 (sm/md/lg/xl/2xl)
- **Layout pattern**: Viewport breakpoints for pages, container queries for components
- **Mobile-first**: Yes, always
- **Typography**: Fixed breakpoint-based, no clamp()
- **Spacing**: 8px grid via tailwind.config.js
- **Touch targets**: 44×44px via extended Button component
- **Code**: Inline utilities for 1–2 uses, CVA for 3+ reuses
- **Testing**: Tailscan + manual DevTools at 375/768/1024px

Ready to implement.
