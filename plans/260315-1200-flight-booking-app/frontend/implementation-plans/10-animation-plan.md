# Animation Plan — Flight Booking App

*Framer Motion (LazyMotion) · Tailwind CSS · shadcn/ui · Next.js 14 App Router*

---

## Decision

| Question | Answer |
|----------|--------|
| Library | **Framer Motion** with LazyMotion optimization |
| Simple micro-interactions | **Tailwind CSS** utilities only |
| Motion One | ❌ No React component API; no Radix patterns |
| GSAP | ❌ Overkill; 23KB baseline |
| Bundle target | ~7–9KB gzipped (LazyMotion + domAnimation) |

**Rule**: Use Framer Motion only where state drives the animation. Use Tailwind for static hover/focus effects.

---

## Setup

### 1. Install

```bash
npm install framer-motion
```

### 2. Root layout — LazyMotion provider

```tsx
// app/layout.tsx
import { LazyMotion, domAnimation } from "framer-motion"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="...">
        <LazyMotion features={domAnimation}>
          <TooltipProvider>
            {children}
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </LazyMotion>
      </body>
    </html>
  )
}
```

> Use `m` (not `motion`) everywhere — required for LazyMotion tree-shaking.

### 3. Directory structure

```
src/
├── lib/
│   └── animations/
│       ├── tokens.ts          # Duration, easing, stagger constants
│       ├── variants.ts        # Shared reusable variants (fade, slide, scale)
│       └── hooks.ts           # usePrefersReducedMotion
└── components/
    ├── search/
    │   └── SearchForm.animations.ts
    ├── results/
    │   ├── FlightList.animations.ts
    │   └── FlightCard.animations.ts
    └── shared/
        └── PageWrapper.tsx    # Page transition wrapper
```

---

## Animation Tokens

```ts
// lib/animations/tokens.ts

export const duration = {
  micro:      0.15,   // Button press, hover
  transition: 0.30,   // Page enter, modal open/close
  complex:    0.50,   // Multi-step sequences
} as const

export const easing = {
  easeOut:    "easeOut",    // Entering elements (decelerate to rest)
  easeInOut:  "easeInOut",  // Neutral / bidirectional
  easeIn:     "easeIn",     // Exiting elements (accelerate away)
} as const

export const stagger = {
  list:   0.05,   // Tight list items
  card:   0.08,   // Flight cards
  modal:  0.10,   // Modal sections
} as const
```

---

## Accessibility Hook

```ts
// lib/animations/hooks.ts
"use client"
import { useState, useEffect } from "react"

export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReduced(query.matches)
    const listener = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    query.addEventListener("change", listener)
    return () => query.removeEventListener("change", listener)
  }, [])

  return prefersReduced
}
```

**Rule**: Every animation that is not essential to understanding state must be skipped or minimised when `usePrefersReducedMotion()` returns `true`. Essential = progress indicators, loading states, error reveals. Non-essential = page slide, stagger, hover lift.

---

## Shared Variants

```ts
// lib/animations/variants.ts
import type { Variants } from "framer-motion"
import { duration, easing } from "./tokens"

export const fadeVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.transition, ease: easing.easeOut } },
  exit:    { opacity: 0, transition: { duration: duration.micro,      ease: easing.easeIn  } },
}

export const slideUpVariants: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0,  transition: { duration: duration.transition, ease: easing.easeOut } },
  exit:    { opacity: 0, y: -8,             transition: { duration: duration.micro,      ease: easing.easeIn  } },
}

export const scaleVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1,    transition: { duration: duration.transition, ease: easing.easeOut } },
  exit:    { opacity: 0, scale: 0.96, transition: { duration: duration.micro,      ease: easing.easeIn  } },
}
```

---

## Pattern 1 — Page Transitions

**Approach**: Enter-only fade. AnimatePresence is fragile in App Router; skip exit animations at page level.

```tsx
// components/shared/PageWrapper.tsx
"use client"
import { usePathname } from "next/navigation"
import { m } from "framer-motion"
import { usePrefersReducedMotion } from "@/lib/animations/hooks"

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reduced = usePrefersReducedMotion()

  return (
    <m.div
      key={pathname}
      initial={{ opacity: 0, y: reduced ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0.01 : 0.3 }}
    >
      {children}
    </m.div>
  )
}
```

**Placement**: Wrap `{children}` inside `app/layout.tsx` after the sticky header, OR wrap each page's outermost `<div>` individually.

```
/ (Search)     → enter fade + 10px slide up
/results       → enter fade + 10px slide up
/passengers    → enter fade + 10px slide up
/confirmation  → enter fade + 10px slide up
```

---

## Pattern 2 — Flight Card List Stagger

```ts
// components/results/FlightList.animations.ts
import type { Variants } from "framer-motion"
import { stagger, duration, easing } from "@/lib/animations/tokens"

export const listVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: stagger.card,
      delayChildren:   0.1,
    },
  },
}

export const cardVariants: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.transition, ease: easing.easeOut },
  },
}
```

```tsx
// components/results/FlightList.tsx
"use client"
import { m } from "framer-motion"
import { listVariants, cardVariants } from "./FlightList.animations"
import { usePrefersReducedMotion } from "@/lib/animations/hooks"

export function FlightList({ flights }: { flights: Offer[] }) {
  const reduced = usePrefersReducedMotion()

  // Skip stagger entirely for reduced-motion users
  if (reduced) {
    return (
      <div className="flex flex-col gap-3">
        {flights.map(f => <FlightCard key={f.id} flight={f} />)}
      </div>
    )
  }

  return (
    <m.div
      variants={listVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-3"
    >
      {flights.map(f => (
        <m.div key={f.id} variants={cardVariants}>
          <FlightCard flight={f} />
        </m.div>
      ))}
    </m.div>
  )
}
```

---

## Pattern 3 — Sheet / Dialog Open–Close

Radix portals require `forceMount` to keep the element in the DOM during exit.

```tsx
// components/results/FilterSheet.tsx — custom animated wrapper
"use client"
import { useState } from "react"
import { m, AnimatePresence } from "framer-motion"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { FilterPanel } from "./FilterPanel"
import { duration } from "@/lib/animations/tokens"

export function FilterSheet() {
  const [open, setOpen] = useState(false)

  return (
    <SheetPrimitive.Root open={open} onOpenChange={setOpen}>
      <SheetPrimitive.Trigger asChild>
        <Button variant="outline" className="lg:hidden h-10 px-6">
          Filters
        </Button>
      </SheetPrimitive.Trigger>

      <AnimatePresence>
        {open && (
          <SheetPrimitive.Portal forceMount>
            {/* Overlay */}
            <m.div
              asChild
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration.transition }}
            >
              <SheetPrimitive.Overlay className="fixed inset-0 bg-black/40 z-40" />
            </m.div>

            {/* Panel */}
            <m.div
              asChild
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: duration.transition, ease: "easeOut" }}
            >
              <SheetPrimitive.Content
                className="fixed left-0 top-0 bottom-0 w-[320px] bg-card border-r z-50 p-6 overflow-y-auto"
              >
                <FilterPanel />
              </SheetPrimitive.Content>
            </m.div>
          </SheetPrimitive.Portal>
        )}
      </AnimatePresence>
    </SheetPrimitive.Root>
  )
}
```

> **Note**: This requires using the Radix primitive directly, not the pre-built shadcn Sheet. Create `FilterSheet` as its own component. Keep shadcn's `sheet.tsx` untouched.

---

## Pattern 4 — Skeleton Shimmer

Pure Tailwind — no Framer Motion needed. Add to `tailwind.config.ts`:

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "-800px 0" },
          "100%": { backgroundPosition:  "800px 0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s ease-in-out infinite",
      },
    },
  },
}
```

```tsx
// components/results/FlightCardSkeleton.tsx
export function FlightCardSkeleton() {
  return (
    <div className="grid grid-cols-[2fr_1.5fr_1.5fr] items-center gap-3 p-6 rounded-lg border">
      {/* Airline + times column */}
      <div className="flex flex-col gap-3">
        <div className="h-10 w-10 rounded animate-shimmer
                        bg-gradient-to-r from-muted via-muted-foreground/10 to-muted
                        bg-[length:800px_100%]" />
        <div className="h-8 w-32 rounded animate-shimmer
                        bg-gradient-to-r from-muted via-muted-foreground/10 to-muted
                        bg-[length:800px_100%]" />
      </div>
      {/* Duration + badge column */}
      <div className="flex flex-col gap-2 items-center">
        <div className="h-8 w-20 rounded-full animate-shimmer
                        bg-gradient-to-r from-muted via-muted-foreground/10 to-muted
                        bg-[length:800px_100%]" />
      </div>
      {/* Price + button column */}
      <div className="flex flex-col gap-2 items-end">
        <div className="h-8 w-24 rounded animate-shimmer
                        bg-gradient-to-r from-muted via-muted-foreground/10 to-muted
                        bg-[length:800px_100%]" />
        <div className="h-10 w-24 rounded-md animate-shimmer
                        bg-gradient-to-r from-muted via-muted-foreground/10 to-muted
                        bg-[length:800px_100%]" />
      </div>
    </div>
  )
}
```

---

## Pattern 5 — Micro-interactions

### Tailwind-only (preferred)

```tsx
// FlightCard hover lift — pure CSS
<div className="
  transition-shadow duration-150
  hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]
  cursor-pointer
">
```

```tsx
// Button press feedback — pure CSS
<Button className="active:scale-[0.98] transition-transform duration-150">
  Select flight
</Button>
```

### Framer Motion (only if state-driven selection)

```tsx
"use client"
import { m } from "framer-motion"

export function SelectableFlightCard({ flight, isSelected, onSelect }: Props) {
  return (
    <m.div
      animate={{
        boxShadow: isSelected
          ? "0 0 0 2px var(--brand-primary)"
          : "0 0 0 1px var(--color-border)",
      }}
      transition={{ duration: 0.15 }}
      onClick={onSelect}
      className="cursor-pointer rounded-lg p-6"
    >
      {/* Card content */}
    </m.div>
  )
}
```

---

## Component Animation Map

| Component | Pattern | Library | Trigger |
|-----------|---------|---------|---------|
| `PageWrapper` | Fade + slide-up 10px | Framer Motion | Route change |
| `FlightList` | Stagger 0.08s per card | Framer Motion | Data load |
| `FlightCard` (hover) | Shadow lift | Tailwind `hover:` | CSS hover |
| `FlightCard` (selected) | Ring border | Framer Motion | State change |
| `FlightCardSkeleton` | Shimmer sweep | Tailwind `animate-shimmer` | Always on |
| `FilterSheet` | Slide from left | Framer Motion + AnimatePresence | `open` state |
| `PassengerCard` (Accordion) | Radix built-in | shadcn default | Expand/collapse |
| `ProgressStepper` (step advance) | — | None (instant) | Route change |
| `SearchForm` (search button) | Press scale | Tailwind `active:scale-[0.98]` | CSS active |
| `Toaster` (offer expired) | Slide in | sonner built-in | Toast trigger |

---

## Naming Conventions

| What | Convention | Example |
|------|------------|---------|
| Variant objects | `{name}Variants` | `listVariants`, `fadeVariants` |
| Co-located file | `{Component}.animations.ts` | `FlightList.animations.ts` |
| Shared token | camelCase noun | `duration.transition`, `stagger.card` |
| Custom Tailwind animation | kebab-case | `animate-shimmer`, `animate-fade-in` |

---

## Rules

1. **Use `m` not `motion`** — LazyMotion requires the `m` import or bundle grows to 32KB.
2. **Co-locate first** — put variants in `Component.animations.ts` beside the component. Move to `lib/animations/variants.ts` only when shared by 3+ components.
3. **Skip stagger for ≤ 3 items** — stagger on 2 cards looks broken; animate as a group instead.
4. **No AnimatePresence for page transitions** — use enter-only (Solution B). Exit animations at page level are fragile in App Router.
5. **AnimatePresence only in controlled components** — Sheet, Dialog, Popover where you own the `open` state.
6. **Respect reduced motion** — wrap non-essential animations in `usePrefersReducedMotion()` checks.
7. **Never animate layout shifts** — don't use Framer Motion layout animations (prone to jank); use CSS Grid transitions instead.
8. **Tailwind for static states** — hover, focus, active, disabled → always Tailwind. Framer Motion only where React state controls the animation.

---

## Tailwind Global Reduced-Motion Fallback

Add to `globals.css` as a safety net alongside the hook:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration:            0.01ms !important;
    animation-iteration-count:     1      !important;
    transition-duration:           0.01ms !important;
    scroll-behavior:               auto   !important;
  }
}
```

---

## Implementation Checklist

### Setup
- [ ] `npm install framer-motion`
- [ ] Wrap root layout in `<LazyMotion features={domAnimation}>`
- [ ] Create `lib/animations/tokens.ts`, `variants.ts`, `hooks.ts`
- [ ] Add shimmer keyframe to `tailwind.config.ts`
- [ ] Add reduced-motion CSS block to `globals.css`

### Components
- [ ] `PageWrapper` — enter fade/slide
- [ ] `FlightList` — stagger list with reduced-motion fallback
- [ ] `FilterSheet` — custom Radix + AnimatePresence slide
- [ ] `FlightCard` — Tailwind hover shadow; Framer Motion ring when selected
- [ ] `FlightCardSkeleton` — shimmer (Tailwind only)
- [ ] `SearchForm` button — `active:scale-[0.98]`

### QA
- [ ] Verify SSR: no hydration mismatch on first load
- [ ] DevTools: all animations ≥ 60fps (no jank)
- [ ] A11y: enable OS reduce-motion → all non-essential animations suppressed
- [ ] Bundle: check `framer-motion` in next-bundle-analyzer — should be ~5KB
