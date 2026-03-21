# Research: Animation Libraries for Next.js 14 Flight Booking App

**Date**: 2026-03-18
**Scope**: Library evaluation + integration patterns for Next.js 14 App Router, shadcn/ui, Tailwind CSS
**Status**: ACTIONABLE

---

## Research Question

Which animation library should power the flight booking frontend? Compare Framer Motion, Motion One (motion.dev), and CSS-only (Tailwind animate) across:
1. Bundle size impact
2. SSR compatibility with Next.js App Router
3. Integration with shadcn/ui Radix primitives
4. Developer ergonomics
5. Maintainability & accessibility patterns

---

## Executive Summary

**Recommendation: Framer Motion (with LazyMotion optimization) for animations + Tailwind CSS for simple micro-interactions.**

Framer Motion offers the best balance of ergonomics, Radix integration maturity, and proven patterns with Next.js App Router. Motion One is lighter but has weaker Radix/shadcn integration tooling. CSS-only Tailwind is insufficient for complex page transitions and modal animations. Hybrid approach (Framer Motion for complex, Tailwind for simple) optimizes bundle and maintainability.

---

## Methodology

| Tier | Source | Tool | Coverage |
|------|--------|------|----------|
| L1 | Official documentation | Context7, WebFetch | Framer Motion SSR, API docs |
| L2 | GitHub discussions | WebSearch | Real-world patterns, Next.js App Router challenges |
| L3 | Community resources | WebSearch | Integration patterns, best practices |
| L4 | Blog posts & benchmarks | WebSearch | Bundle size comparisons, 2025 trends |

**Coverage Gaps**: Motion One official documentation not fully indexed by Context7. Supplemented with WebSearch results and community discussion.

---

## Key Findings

### 1. Bundle Size Comparison

| Library | Bundle (gzipped) | Context | Notes |
|---------|-----------------|---------|-------|
| **CSS-only (Tailwind)** | ~2KB | Existing Tailwind base | Limited to keyframe animations; no state tracking |
| **Motion One** | **3.8KB** (animate fn) | Lightweight animation | WAAPI-based; no React component API |
| **Framer Motion (full)** | ~32KB | Full feature set | Includes AnimatePresence, layout, gestures |
| **Framer Motion (LazyMotion + m)** | **~4.6KB** | Optimized entry point | Lazy-loads domAnimation; tree-shakeable |
| **Framer Motion (useAnimate)** | **~2.3KB** | Hook-only API | No motion components |
| **GSAP** | ~23KB | Baseline for comparison | Plugin-heavy; powerful but overkill |

**Verdict**: With LazyMotion optimization, Framer Motion + m component is competitive with Motion One in bundle impact while offering far superior Radix integration.

---

### 2. SSR Compatibility with Next.js 14 App Router

#### Framer Motion

**Status**: PROVEN, documented patterns exist.

**How it works**:
- Motion components are safe in Server Components—they don't run animation code on the server
- Client components ("use client") required only at leaves where animation actually runs
- LazyMotion supports both synchronous (domAnimation) and async (code-split) loading

**Recommended pattern**:
```typescript
// layout.tsx (Server Component)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <LazyMotion features={domAnimation}>
          {children}
        </LazyMotion>
      </body>
    </html>
  )
}

// page.tsx or component.tsx (Server Component—safe)
import { m } from "framer-motion"

export default function SearchPage() {
  return (
    <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Server content here */}
    </m.div>
  )
}
```

**Hydration-aware optimization**:
- Framer Motion v13+ includes `startOptimizedAppearAnimation` for WAAPI-driven appear animations
- Runs on server-rendered HTML without waiting for React hydration
- Avoids visual jank on slow clients

**Exit animations challenge**:
- AnimatePresence does NOT work in Next.js App Router (layoutId-based routing breaks its unmount tracking)
- Workaround: Use `useSelectedLayoutSegment()` as key instead of `usePathname()` for manual AnimatePresence control
- Status: Fragile, relies on unexposed Next.js internals; can break on Next.js upgrades

---

#### Motion One

**Status**: UNTESTED in standard App Router patterns; WAAPI-first, React second.

**Limitations**:
- No React component API (no `<motion.div>`)—requires imperative `animate()` function calls
- No built-in AnimatePresence equivalent for declarative mount/unmount animations
- Requires manual effect hooks to wire animations to React state changes
- Poor integration with Radix primitives (no patterns documented)

**Use case**: Pure imperative animation in isolated components. Not recommended for declarative UI workflows.

---

#### CSS-only (Tailwind)

**Status**: SAFE for SSR, but insufficient for complex scenarios.

**Capabilities**:
- All Tailwind animation utilities are static CSS (no JavaScript required)
- Works perfectly with SSR; no hydration concerns
- Standard `@keyframes` animation syntax

**Limitations**:
- Cannot animate in response to state changes (no enter/exit animations for modals)
- Cannot orchestrate multi-element sequences (stagger requires JavaScript or inline styles)
- No layout animations (cannot re-arrange DOM and smoothly animate to new positions)

---

### 3. Integration with shadcn/ui Radix Primitives

#### Framer Motion + asChild Pattern

**Best practice**: Wrap Radix component content, not the component itself.

```typescript
'use client'
import { m } from "framer-motion"
import * as Dialog from "@radix-ui/react-dialog"

export function AnimatedDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Portal forceMount>
        {/* Overlay animation */}
        <m.div
          asChild
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Dialog.Overlay />
        </m.div>

        {/* Content animation */}
        <m.div
          asChild
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
        >
          <Dialog.Content>
            {/* Your content */}
          </Dialog.Content>
        </m.div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

**Key patterns**:
- Use `forceMount` prop on Portal to keep components in DOM during exit animation
- Wrap Radix parts in `m.div` with `asChild` prop (merges animation props onto Radix element)
- AnimatePresence required only for components that unmount (Dialog/Sheet/Popover)

**Radix Documentation**: [Radix Animation Guide](https://www.radix-ui.com/primitives/docs/guides/animation)

---

#### Motion One

**Status**: No documented patterns. Community has NOT standardized on Motion One for Radix.

**Blocker**: Motion One has no React component syntax. Would require imperative wrappers:
```typescript
// Not ergonomic; requires useEffect + animate()
const dialogRef = useRef(null)
useEffect(() => {
  if (isOpen) {
    animate(dialogRef.current, { opacity: [0, 1] })
  }
}, [isOpen])
```

**Verdict**: Not recommended for shadcn/ui. Framer Motion's integration is proven, documented, and community-standard.

---

#### CSS-only (Tailwind)

**Status**: Works, but limited without state-driven animations.

**Use case**: Static hover/focus animations only.

```typescript
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"

export function StaticSheet() {
  return (
    <Sheet>
      <SheetTrigger className="hover:scale-105 transition-transform">
        Open
      </SheetTrigger>
      <SheetContent className="animate-in slide-in-from-right duration-300">
        {/* Content */}
      </SheetContent>
    </Sheet>
  )
}
```

**Limitation**: `animate-in` classes run on mount only—no control over state or timing. Cannot implement "exit" animations.

---

### 4. Developer Ergonomics

#### Framer Motion

**Strengths**:
- Declarative API mirrors React mental model
- Variants system enables reusable animation definitions
- Rich ecosystem (examples, tutorials, community components)
- Type-safe with full TypeScript support
- Built-in gesture handling (drag, hover)

**Example**:
```typescript
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
}

export function FlightList() {
  return (
    <m.div variants={containerVariants} initial="hidden" animate="visible">
      {flights.map((flight) => (
        <m.div key={flight.id} variants={itemVariants}>
          <FlightCard flight={flight} />
        </m.div>
      ))}
    </m.div>
  )
}
```

---

#### Motion One

**Strengths**:
- Minimal bundle footprint
- WAAPI-native (browser animations, not JS-driven)
- Good for performance-critical apps

**Weaknesses**:
- Imperative API (animate function calls vs. declarative)
- No variants or composition system
- Requires manual effect wiring for state sync
- Limited example ecosystem
- Steeper learning curve for React developers

---

#### CSS-only (Tailwind)

**Strengths**:
- Zero JavaScript overhead
- Familiar to TailwindCSS users
- Built into every project already
- Instant feedback in devtools

**Weaknesses**:
- Cannot respond to state changes
- Naming collisions (class strings grow)
- No composition/reusability
- Limited timing control (no stagger without JavaScript)

---

### 5. Page Transitions (Search → Results → Passengers → Confirmation)

#### Challenge: AnimatePresence Doesn't Work in App Router

Next.js App Router's navigation model breaks Framer Motion's AnimatePresence because:
1. Router changes `usePathname()` immediately
2. React unmounts old page component before AnimatePresence can detect exit
3. No standard way to delay route transition until animation completes

**Two Solutions**:

**Solution A: FrozenRouter Pattern** (fragile but works)
```typescript
'use client'
import { useSelectedLayoutSegment } from "next/navigation"
import { AnimatePresence, m } from "framer-motion"

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment() // Stays stable longer than pathname

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={segment}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
      >
        {children}
      </m.div>
    </AnimatePresence>
  )
}
```

**Risk**: Uses internal Next.js API; can break on version upgrades. Verify with each Next.js release.

---

**Solution B: Skip AnimatePresence** (more stable)
```typescript
'use client'
import { usePathname } from "next/navigation"
import { m } from "framer-motion"

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // No AnimatePresence; animate entry only
  return (
    <m.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </m.div>
  )
}
```

**Tradeoff**: Smooth enter-only, no exit animation. Simpler, more stable, still good UX.

---

**Recommended**: Use **Solution B** (enter-only page transitions) for production stability. Add exit animations only to specific interactive elements (Sheet, Dialog) where you control the timing.

---

### 6. Accessibility: prefers-reduced-motion

#### Requirements

WCAG 2.3.3 requires animations triggered by user actions to be disableable. The `prefers-reduced-motion` media query detects OS accessibility settings.

**Affected users**: ~70 million people with vestibular disorders + cognitive concerns (ADHD, epilepsy, migraine triggers).

#### Implementation Pattern

**Tailwind CSS approach**:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Framer Motion approach**:
```typescript
export const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

export const pageTransition = {
  duration: 0.3,
}

// Use media query context
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const safePageTransition = prefersReducedMotion
  ? { duration: 0.01 }
  : pageTransition
```

**Better: Custom hook**:
```typescript
export function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(query.matches)

    const listener = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }, [])

  return prefersReduced
}

// In component
const prefersReduced = usePrefersReducedMotion()
const transition = prefersReduced ? { duration: 0.01 } : { duration: 0.3 }
```

**Verdict**: Always respect `prefers-reduced-motion`. Most animations (fades, slides) can be removed entirely for these users. Essential animations (progress feedback, state changes) should run with minimal duration.

---

## Recommended Architecture

### Library Choice

**Primary**: Framer Motion (with LazyMotion + m component optimization)
**Secondary**: Tailwind CSS utilities (for simple micro-interactions)
**Avoid**: Motion One (insufficient Radix integration)

**Bundle Estimate**:
- LazyMotion + domAnimation: ~5KB gzipped
- m component tree-shakeable: +0-2KB per animated component
- **Total**: ~7-9KB for flight booking animations (acceptable)

---

### File Organization

**Co-located animation variants** (with components):

```
src/
├── components/
│   ├── flight-card/
│   │   ├── flight-card.tsx
│   │   ├── flight-card.animations.ts  // Variants, transitions
│   │   └── flight-card.test.tsx
│   ├── page-wrapper/
│   │   ├── page-wrapper.tsx
│   │   └── page-wrapper.animations.ts
│   └── ui/
│       ├── sheet.tsx (shadcn with animation wrapping)
│       └── dialog.tsx
├── lib/
│   ├── animations/
│   │   ├── common.ts       // Shared variants (fade, slide, scale)
│   │   ├── timing.ts       // Easing functions, duration tokens
│   │   └── accessibility.ts // prefers-reduced-motion helper
│   └── constants.ts
```

**Shared animation tokens** (`lib/animations/timing.ts`):

```typescript
export const ANIMATION_DURATION = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
}

export const ANIMATION_EASING = {
  easeOut: 'easeOut',
  easeInOut: 'easeInOut',
  easeIn: 'easeIn',
  circOut: [0.23, 1, 0.320, 1], // Custom cubic-bezier
}

export const STAGGER = {
  list: 0.05,
  card: 0.08,
  modal: 0.1,
}
```

---

### Animation Patterns by Use Case

#### 1. Page Transitions (Search → Results → Passengers → Confirmation)

**Pattern**: Enter-only (Solution B above).

```typescript
// layout.tsx or root provider
'use client'
import { usePathname } from "next/navigation"
import { m } from "framer-motion"

export function PageTransitionWrapper({ children }: Props) {
  const pathname = usePathname()

  return (
    <m.div
      key={pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </m.div>
  )
}
```

---

#### 2. List Stagger (Flight Cards)

**Pattern**: Container variants + child stagger.

```typescript
// flight-list.animations.ts
export const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
}

// flight-list.tsx
'use client'
import { m } from "framer-motion"
import { listVariants, itemVariants } from "./flight-list.animations"

export function FlightList({ flights }: Props) {
  return (
    <m.div
      variants={listVariants}
      initial="hidden"
      animate="visible"
    >
      {flights.map((flight) => (
        <m.div
          key={flight.id}
          variants={itemVariants}
        >
          <FlightCard flight={flight} />
        </m.div>
      ))}
    </m.div>
  )
}
```

---

#### 3. Sheet/Modal Open-Close

**Pattern**: Radix Portal + AnimatePresence workaround.

```typescript
'use client'
import { useState } from "react"
import { m, AnimatePresence } from "framer-motion"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"

export function FilterSheet() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger>Filters</SheetTrigger>
      <AnimatePresence mode="wait">
        {isOpen && (
          <m.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50"
          >
            <SheetContent>
              {/* Filters */}
            </SheetContent>
          </m.div>
        )}
      </AnimatePresence>
    </Sheet>
  )
}
```

**Note**: This requires custom Sheet wrapping. Standard shadcn Sheet won't work with AnimatePresence without modifications.

---

#### 4. Skeleton Shimmer (Loading)

**Pattern**: Pure Tailwind CSS (no state tracking needed).

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
      },
    },
  },
}

// component
export function SkeletonCard() {
  return (
    <div className="animate-shimmer bg-gradient-to-r from-gray-300 via-white to-gray-300 h-12 w-full rounded" />
  )
}
```

---

#### 5. Micro-interactions (Hover, Button Press)

**Pattern A: CSS-only (preferred for simplicity)**

```typescript
export function FlightCard({ flight }: Props) {
  return (
    <div className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer">
      {/* Card content */}
    </div>
  )
}
```

**Pattern B: Framer Motion (if state-driven)**

```typescript
'use client'
import { m } from "framer-motion"

export function SelectableCard({ flight }: Props) {
  const [isSelected, setIsSelected] = useState(false)

  return (
    <m.div
      animate={{
        scale: isSelected ? 1.02 : 1,
        boxShadow: isSelected
          ? '0 10px 25px rgba(0,0,0,0.1)'
          : '0 1px 3px rgba(0,0,0,0.1)',
      }}
      onClick={() => setIsSelected(!isSelected)}
    >
      {/* Card content */}
    </m.div>
  )
}
```

---

## Naming Conventions

**Animation variable naming** (in animations.ts files):

```typescript
// Verb-based for clarity
export const fadeVariants = { /* ... */ }
export const slideUpVariants = { /* ... */ }
export const scaleVariants = { /* ... */ }

// Grouped by component/feature
export const dialogAnimations = {
  overlay: { /* ... */ },
  content: { /* ... */ },
}

// Timing tokens (duration, easing)
export const durations = {
  microInteraction: 0.15,  // Buttons, hovers
  transition: 0.3,         // Page/modal transitions
  complex: 0.5,            // Multi-element sequences
}

export const easings = {
  easeOut: 'easeOut',    // Entering (decelerate)
  easeInOut: 'easeInOut', // Neutral
  easeIn: 'easeIn',      // Exiting (accelerate)
}
```

**CSS class naming** (custom Tailwind animations):

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'skeleton-shimmer': 'shimmer 2s infinite',
      },
    },
  },
}

// Usage
<div className="animate-fade-in" />
```

---

## Implementation Checklist

### Setup Phase

- [ ] Install `framer-motion`
- [ ] Add LazyMotion wrapper to root layout
- [ ] Create `lib/animations/` directory structure
- [ ] Define shared animation tokens (duration, easing, stagger)
- [ ] Add `usePrefersReducedMotion` hook
- [ ] Configure Tailwind custom animations

### Component Phase

- [ ] Create co-located `.animations.ts` files per component
- [ ] Export variants, transitions, container/item patterns
- [ ] Wrap Radix primitives in `m.div` with `asChild` (where needed)
- [ ] Test hydration: verify animations don't break SSR
- [ ] Test accessibility: verify `prefers-reduced-motion` respected

### Testing Phase

- [ ] E2E: Page transitions work in Playwright
- [ ] Visual: Animations smooth at 60fps (DevTools performance)
- [ ] A11y: Screen reader announcements not interrupted
- [ ] A11y: prefers-reduced-motion disables non-essential motion
- [ ] Bundle: Verify LazyMotion cuts bundle size as expected

---

## Trade-offs & Recommendations

### Framer Motion vs Motion One

| Aspect | Framer Motion | Motion One |
|--------|---------------|-----------|
| **Bundle (optimized)** | 4.6KB | 3.8KB |
| **React API** | ✅ (m components) | ❌ (imperative only) |
| **Radix integration** | ✅ (mature patterns) | ❌ (no docs) |
| **Variants system** | ✅ | ❌ |
| **Page transitions** | ✅ (documented workarounds) | ⚠️ (untested) |
| **Community** | ✅ (large ecosystem) | ⚠️ (emerging) |
| **Learning curve** | Medium | Steep |

**Verdict**: Framer Motion. 0.8KB extra bundle is worth the ergonomics & maturity.

---

### Framer Motion vs CSS-only

| Use Case | Recommend |
|----------|-----------|
| Page transitions | Framer Motion |
| List stagger | Framer Motion |
| Modal/Sheet open-close | Framer Motion |
| Skeleton shimmer | Tailwind CSS |
| Hover/focus states | Tailwind CSS |
| Button press feedback | Tailwind CSS (unless state-driven) |

**Verdict**: Hybrid. Use Framer Motion for state-driven/sequential animations, Tailwind for static styles.

---

## Unresolved Questions

1. **AnimatePresence fragility**: How often does Next.js change internal routing APIs? Should we monitor `useSelectedLayoutSegment` behavior across versions?

2. **Sheet customization**: Does shadcn/ui provide an extension pattern for wrapping with animations, or must consumers fork it?

3. **Performance on lower-end devices**: Should we add device-class detection (e.g., `navigator.hardwareConcurrency`) and disable complex animations on slow hardware?

4. **TypeScript animation types**: Should we create strict typed variant objects to prevent animation property typos? (e.g., `variants satisfies Record<string, TargetAndTransition>`)

---

## Sources

- [Framer Motion: Complete React & Next.js Guide 2026](https://inhaq.com/blog/framer-motion-complete-guide-react-nextjs-developers.html)
- [Framer Motion vs Motion One: Mobile Animation Performance in 2025 - React Libraries](https://reactlibraries.com/blog/framer-motion-vs-motion-one-mobile-animation-performance-in-2025)
- [Reduce bundle size of Framer Motion | Motion](https://motion.dev/docs/react-reduce-bundle-size)
- [Motion & Framer Motion upgrade guide | Motion](https://motion.dev/docs/react-upgrade-guide)
- [Should I use Framer Motion or Motion One? - Motion Magazine](https://motion.dev/magazine/should-i-use-framer-motion-or-motion-one)
- [Animate UI - Free React Nextjs Template](https://www.shadcn.io/template/animate-ui-animate-ui)
- [Shadcn framer motion · shadcn-ui/ui · Discussion #1636](https://github.com/shadcn-ui/ui/discussions/1636)
- [Animating Radix Primitives with Framer Motion · OlegWock](https://sinja.io/blog/animating-radix-primitives-with-framer-motion)
- [20+ Animated UI Components with shadcn/ui & Framer Motion - Indie UI](https://next.jqueryscript.net/shadcn-ui/ui-components-framer-motion-indie/)
- [Radix: How to Add Animations to Radix | Motion](https://motion.dev/docs/radix)
- [Getting Started: Server and Client Components | Next.js](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [RSC Architecture Patterns & Best Practices | LearnWebCraft](https://learnwebcraft.com/blog/react-server-components-next-js-14-guide)
- [animation - Transitions & Animation - Tailwind CSS](https://tailwindcss.com/docs/animation)
- [Tailwind CSS Animations: Tutorial and 40+ Examples](https://prismic.io/blog/tailwind-animations)
- [How to Create Smooth Motion Animations with Tailwind CSS](https://strapi.io/blog/create-strapi-motion-animations-tailwind-css)
- [Create Staggered Text Animation with Tailwind CSS and React](https://www.builder.io/blog/stagger-text-animation-tailwind)
- [Framer Motion + Tailwind: The 2025 Animation Stack - DEV Community](https://dev.to/manukumar07/framer-motion-tailwind-the-2025-animation-stack-1801)
- [Animating with Tailwind CSS | Motion](https://motion.dev/docs/react-tailwind)
- [How do I use Radix with Tailwindcss? · radix-ui/primitives · Discussion #1000](https://github.com/radix-ui/primitives/discussions/1000)
- [Level Up Your UI Game: Combining Radix UI Primitives with Tailwind CSS | by Thiago Rodrigues | Medium](https://medium.com/@fthiagorodrigues10/level-up-your-ui-game-combining-radix-ui-primitives-with-tailwind-css-8f6d91b044eb)
- [Building a Modern UI Kit with Tailwind, ShadCN, and Framer Motion | by Zar Nabi | Medium](https://medium.com/@colorsong.nabi/building-a-modern-ui-kit-with-tailwind-shadcn-and-framer-motion-f162f6695ce5)
- [Animation – Radix Primitives](https://www.radix-ui.com/primitives/docs/guides/animation)
- [Slot – Radix Primitives](https://www.radix-ui.com/primitives/docs/utilities/slot)
- [Unpacking the Slot Component | Yisu Kim](https://www.yisukim.com/en/posts/unpacking-the-slot-component)
- [Understanding asChild and Slot in React: Clean, Flexible Component Rendering](https://peerlist.io/jagss/articles/understanding-aschild-and-slot-in-react-clean-flexible-compo)
- [Core Concepts | Vercel Academy](https://vercel.com/academy/shadcn-ui/core-concepts)
- [Composition – Radix Primitives](https://www.radix-ui.com/primitives/docs/guides/composition)
- [React Slot/asChild Composition Pattern](https://boda.sh/blog/react-slot-aschild-pattern/)
- [Implement Radix's asChild pattern in React](https://www.jacobparis.com/content/react-as-child)
- [How to animate route transitions in `app` directory? · vercel/next.js · Discussion #42658](https://github.com/vercel/next.js/discussions/42658)
- [How to make Page Transitions In Nexjs14 App Dir in the layout.tsx. · vercel/next.js · Discussion #59349](https://github.com/vercel/next.js/discussions/59349)
- [In-and-Out Page Transitions and Next.js App Router](https://medium.com/@camille.fontaine93/in-and-out-page-transitions-and-next-js-app-router-62f2b1637ad8)
- [Advanced page transitions with Next.js and Framer Motion - LogRocket Blog](https://blog.logrocket.com/advanced-page-transitions-next-js-framer-motion/)
- [How to Make Creative Page Transitions using Next.js and Framer Motion](https://blog.olivierlarose.com/articles/nextjs-page-transition-guide)
- [Animated Page Transitions in Next.js](https://www.letsbuildui.dev/articles/animated-page-transitions-in-nextjs/)
- [Next.js: Page Transitions with Framer Motion – Max Schmitt](https://maxschmitt.me/posts/nextjs-page-transitions-framer-motion)
- [Animating Next.js page transitions with Framer Motion - DEV Community](https://dev.to/jameswallis/animating-next-js-page-transitions-with-framer-motion-1g9j)
- [Solving Framer Motion Page Transitions in Next.js App Router](https://www.imcorfitz.com/posts/adding-framer-motion-page-transitions-to-next-js-app-router)
- [Nextjs Page Transition With Framer-Motion - DEV Community](https://dev.to/joseph42a/nextjs-page-transition-with-framer-motion-33dg)
- [GSAP vs Motion: A detailed comparison | Motion](https://motion.dev/docs/gsap-vs-motion)
- [Web Animation for Your React App: Framer Motion vs GSAP - Semaphore](https://semaphore.io/blog/react-framer-motion-gsap)
- [Framer vs GSAP: Which Animation Library Should You Choose?](https://pentaclay.com/blog/framer-vs-gsap-which-animation-library-should-you-choose)
- [Migrate from GSAP to Motion | Motion](https://motion.dev/docs/migrate-from-gsap-to-motion)
- [Framer Motion vs GSAP](https://www.gabrielveres.com/blog/framer-motion-vs-gsap)
- [Exploring Motion One from Framer Motion - LogRocket Blog](https://blog.logrocket.com/exploring-motion-one-framer-motion/)
- [Comparing the best React animation libraries for 2026 - LogRocket Blog](https://blog.logrocket.com/best-react-animation-libraries/)
- [Should I use Framer Motion or Motion One? - Motion Blog](https://motion.dev/blog/should-i-use-framer-motion-or-motion-one)
- [prefers-reduced-motion | CSS-Tricks](https://css-tricks.com/almanac/rules/m/media/prefers-reduced-motion/)
- [Design accessible animation and movement with code examples - Pope Tech Resources](https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/)
- [What to Know About the CSS Prefers-Reduced-Motion Feature](https://www.boia.org/blog/what-to-know-about-the-css-prefers-reduced-motion-feature)
- [Understanding Success Criterion 2.3.3: Animation from Interactions | WAI | W3C](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
- [prefers-reduced-motion - CSS | MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
- [Using media queries for accessibility - CSS | MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries_for_accessibility)
- [Accessibility Animation: Designing Motion for Inclusion](https://educationalvoice.co.uk/accessibility-animation/)
- [Accessibility in Practice: Animated Content](https://www.rapiddg.com/article/accessibility-practice-animated-content)
- [Exploring Typesafe design tokens in Tailwind 4 - DEV Community](https://dev.to/wearethreebears/exploring-typesafe-design-tokens-in-tailwind-4-372d)
- [How to Build a Design Token System for Tailwind That Scales Forever | by Hex Shift | Medium](https://hexshift.medium.com/how-to-build-a-design-token-system-for-tailwind-that-scales-forever-84c4c0873e6d)
- [Tailwind CSS 4 @theme: The Future of Design Tokens (A 2025 Guide) | by Suresh Kumar Ariya Gowder | Medium](https://medium.com/@sureshdotariya/tailwind-css-4-theme-the-future-of-design-tokens-at-2025-guide-48305a26af06)
- [Adding custom styles - Core concepts - Tailwind CSS](https://tailwindcss.com/docs/adding-custom-styles)
- [Integrating Design Tokens With Tailwind · Michael Mangialardi](https://www.michaelmang.dev/blog/integrating-design-tokens-with-tailwind/)
- [Unlocking Power of Design Tokens: Practical Steps for Your Next Project - DEV Community](https://dev.to/annwebdotdev/syncing-design-tokens-with-tailwind-css-theme-4d4d)
- [Design Tokens That Scale in 2026 (Tailwind v4 + CSS Variables) | Mavik Labs](https://www.maviklabs.com/blog/design-tokens-tailwind-v4-2026)
- [How to sync your design tokens from Figma to Tailwind | Specify](https://specifyapp.com/blog/specify-to-tailwind)

---

**Report Status**: ACTIONABLE — Proceed with Framer Motion + hybrid approach.
