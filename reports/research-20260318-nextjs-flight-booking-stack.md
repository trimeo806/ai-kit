# Research: Next.js Flight Booking Application Stack Evaluation

**Date**: March 18, 2026
**Scope**: Technology evaluation for production-ready flight booking app (Next.js + React + TypeScript, Duffel Flights API)
**Status**: ACTIONABLE
**Methodology**: Context7 + WebSearch + Official Documentation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Areas Evaluated](#technology-areas-evaluated)
3. [Key Findings](#key-findings)
4. [Detailed Analysis](#detailed-analysis)
5. [Recommended Stack](#recommended-stack)
6. [Trade-offs & Considerations](#trade-offs--considerations)
7. [Unresolved Questions](#unresolved-questions)

---

## Executive Summary

For a production-ready flight booking application with Next.js 14+, the recommended technology stack balances performance, developer experience, and bundle size:

- **Rendering**: Next.js 14 App Router with Server Components by default, Client Components for interactive features
- **State Management**: React Context + TanStack Query (separate concerns: client state vs server state)
- **Data Fetching**: TanStack Query with optimistic mutations for booking workflow
- **Forms**: React Hook Form + Zod for validation
- **UI Components**: shadcn/ui (built on Radix UI, styled with Tailwind)
- **Styling**: Tailwind CSS v4
- **Date Handling**: date-fns (performance-optimized, tree-shakeable)
- **Duffel Integration**: Official JavaScript SDK via npm
- **Airport Search**: Headless UI Combobox or Radix UI Combobox for accessibility

**Bundle Impact**: ~85–95 KB (gzipped) core deps + Duffel SDK

---

## Technology Areas Evaluated

### 1. Next.js 14+ App Router — Rendering Strategy

**Overview**
Next.js 14 App Router defaults to Server Components; Client Components are opt-in via `'use client'` directive. Server Components render exclusively on the server, reducing client bundle size and enabling secure data fetching closer to the database.

**When to Use Each**

| Scenario | Rendering | Rationale |
|----------|-----------|-----------|
| Static layouts, data fetching, SEO | Server Component | Reduces JS bundle, enables caching, secure |
| Fetch airport list (once at init) | Server Component | Preload via `getStaticProps` equivalent (Server Component at page level) |
| Flight search form with state | Client Component | Requires useState, onChange handlers, browser APIs |
| Search results display | Server Component with Client children | Results fetched on server, filter/sort controls in Client |
| Passenger form multi-step flow | Client Component | Heavy state management, form steps, validation |
| Booking confirmation page | Server Component | Static or minimal client interactivity, display order details |

**Key Insights**
- Server Components naturally fit data-heavy pages (search results, confirmations).
- Client Components can nest Server Components via props (`children`), enabling optimal composition.
- Streaming works with Server Components for progressive UI rendering (improves perceived performance).
- Server-side auth checks prevent unauthorized access without client-side workarounds.

**Sources**:
- [Next.js Server and Client Components Guide](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js App Router Rendering](https://nextjs.org/docs/14/app/building-your-application/rendering/server-components)

---

### 2. State Management — Comparison

**Recommendations by Concern**

| Concern | Solution | Why |
|---------|----------|-----|
| **Client UI state** (form visibility, filters, pagination, modals) | React Context (built-in) or Zustand | Simple, no extra deps for basic state; Zustand for complex client state |
| **Server/Cache state** (flight offers, search results, bookings) | TanStack Query | Industry-standard, handles refetching, caching, mutations, devtools |
| **Global app state** (user session, auth token) | React Context + SessionStorage or small Zustand store | Lightweight, avoids prop-drilling |
| **Multi-step booking flow** | TanStack Query mutations + React Context (form state) | Separates concerns: server sync vs local form state |

**Library Comparison**

| Library | Bundle | Use Case | Verdict for This Project |
|---------|--------|----------|--------------------------|
| React Context | ~0 KB (built-in) | Simple client state, avoids prop-drilling | ✅ Use for session, auth, simple UI toggles |
| Zustand | ~2.5 KB | Client state with actions; minimal boilerplate | Optional; use if client state becomes complex |
| Jotai | ~3 KB | Atomic state model, fine-grained updates | Overkill for booking flow; skip unless needed |
| Redux Toolkit | ~25 KB | Complex, predictable state machines | Too heavy; not recommended |
| TanStack Query | ~16 KB (gzip) | Server state, mutations, caching, DevTools | ✅ Required for API data & booking mutations |

**Key Insight**: Don't conflate client UI state with server state. Use Context for UI (filter visibility, modal open/closed) and TanStack Query for API data.

**Sources**:
- [State Management in 2025: Context vs Zustand vs Jotai](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k)
- [TanStack Query vs Redux](https://www.alexisdata.com/2025/12/30/tanstack-query-vs-redux-complete-comparison-guide-for-state-management/)

---

### 3. Data Fetching — TanStack Query vs SWR vs Next.js Built-in

**Comparison**

| Aspect | TanStack Query | SWR | Next.js fetch() + unstable_cache |
|--------|-------|-----|------|
| **Bundle size (gzip)** | 13.4–16 KB | 4.2–5.3 KB | 0 KB (runtime) |
| **Caching** | Advanced (stale-while-revalidate, invalidation) | Basic (stale-while-revalidate) | ISR, on-demand revalidation |
| **Mutations** | Full support (optimistic, rollback, onSuccess) | Via separate call | Via Server Actions |
| **DevTools** | Yes (browser extension) | No | No |
| **Infinite scroll/pagination** | Built-in helpers | Manual | Manual |
| **Flight search use case** | ✅ Ideal (short cache, frequent refresh) | ✅ Acceptable | ⚠ Weak (ISR not ideal for real-time) |
| **Weekly downloads** | 12.3M | 7.7M | — |

**Verdict for Flight Booking**

**Use TanStack Query** because:
1. Flight search results change frequently → need aggressive cache invalidation
2. Mutations (create offer, place order) need optimistic updates
3. DevTools help debug multi-request booking flows
4. Pagination on search results is easier with built-in helpers

**When NOT to use**: Read-only, cache-friendly pages (static docs, public price lists) → use Next.js `fetch()` with `revalidateOnDeploy` or ISR.

**Sources**:
- [TanStack Query vs SWR vs RTK Query 2025](https://medium.com/better-dev-nextjs-react/tanstack-query-vs-rtk-query-vs-swr-which-react-data-fetching-library-should-you-choose-in-2025-4ec22c082f9f)
- [React Query vs TanStack Query vs SWR](https://refine.dev/blog/react-query-vs-tanstack-query-vs-swr-2025/)

---

### 4. Form Handling & Validation

**Comparison**

| Aspect | React Hook Form + Zod | Formik + Yup | TanStack Form |
|--------|--------|--------|--------|
| **Bundle (gzip)** | ~10 KB (RHF) + ~12 KB (Zod) = **22 KB** | ~45 KB | ~20 KB (TF) + ~12 KB (Zod) = **32 KB** |
| **Approach** | Uncontrolled components, field-level registration | Controlled components | Flexible, supports both |
| **Re-renders** | Minimal (only dirty fields) | More (full form on change) | Minimal |
| **TypeScript support** | ✅ Excellent (Zod infers types) | ✅ Good (Yup less ideal) | ✅ Excellent |
| **Dynamic/nested fields** | Good | Better | Best |
| **Learning curve** | Moderate | Easy | Steep |
| **Multi-step form (booking wizard)** | ✅ Works well | Works | ✅ Designed for this |

**Verdict for Passenger Form**

**Use React Hook Form + Zod** because:
1. Smallest bundle size for this use case
2. Minimal re-renders → faster form interaction on mobile
3. Zod schema provides both validation + TypeScript types
4. Excellent integration with shadcn/ui form components
5. Simple 2–3 step booking flow doesn't need TanStack Form complexity

**Example Pattern**:
```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const passengerSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Invalid email'),
  dateOfBirth: z.string().refine((d) => new Date(d) < new Date(), 'Must be in past'),
  nationality: z.string().min(2, 'Select a country'),
})

type PassengerForm = z.infer<typeof passengerSchema>

export function PassengerForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<PassengerForm>({
    resolver: zodResolver(passengerSchema),
  })

  return (
    <form onSubmit={handleSubmit(async (data) => {
      // Submit to Duffel create-order endpoint
    })}>
      {/* fields... */}
    </form>
  )
}
```

**Sources**:
- [Composable Form Handling 2025](https://makersden.io/blog/composable-form-handling-in-2025-react-hook-form-tanstack-form-and-beyond)
- [React Hook Form Documentation](https://context7.com/react-hook-form/documentation/llms.txt)
- [TanStack Form vs React Hook Form](https://dev.to/josephmaina/crafting-forms-in-react-vanilla-vs-react-hook-form-vs-formik-43fl)

---

### 5. UI Component Library

**Comparison**

| Aspect | shadcn/ui | Radix UI | Headless UI | MUI | Ant Design |
|--------|-----------|----------|------------|-----|-----------|
| **Foundation** | Radix primitives + Tailwind | Unstyled headless | Unstyled headless | Styled (MUI design system) | Styled (Ant design tokens) |
| **Bundle impact** | ~8–12 KB per component (copied) | ~3–5 KB per | ~2–4 KB per | Large (~50+ KB) | Large (~40+ KB) |
| **Customization** | Excellent (own CSS via Tailwind) | Excellent (full control) | Excellent (full control) | Limited (theme overrides) | Limited (token overrides) |
| **Date picker quality** | Via compound (Good) | Via Radix + custom styling | Via Headless UI + custom | MUI DatePicker (excellent) | Ant DatePicker (good) |
| **Combobox (airport search)** | ✅ Built-in Command combobox | ✅ Excellent primitives | ✅ Combobox component | Autocomplete (good) | Select (good) |
| **Accessibility (WCAG)** | ✅ Excellent | ✅ Excellent | ✅ Excellent | ✅ Good | ✅ Good |
| **TypeScript** | ✅ First-class | ✅ Excellent | ✅ Good | ✅ Excellent | ✅ Good |
| **Production-ready polish** | ✅ Yes | ⚠ Minimal (headless) | ⚠ Minimal | ✅ Yes | ✅ Yes |
| **Responsiveness out-of-box** | Needs Tailwind work | Needs custom styling | Needs custom styling | ✅ Built-in | ✅ Built-in |

**Verdict for Flight Booking**

**Use shadcn/ui** because:
1. Built on Radix (battle-tested, accessible primitives)
2. Styled with Tailwind → perfect pairing for this stack
3. Components copied into project → full control over styling
4. Pre-styled combobox, date picker, form layouts save time
5. Responsiveness via Tailwind is flexible and modern
6. Community is large; patterns well-documented

**Alternative**: If you want unstyled primitives and full design control, use **Radix UI directly** + custom Tailwind styling.

**Avoid**: MUI/Ant Design for this use case—bundle bloat for styled components you'll customize anyway.

**Sources**:
- [shadcn/ui vs Radix vs Headless UI 2025](https://javascript.plainenglish.io/shadcn-ui-vs-radix-ui-vs-tailwind-ui-which-should-you-choose-in-2025-b8b4cadeaa25)
- [React UI libraries comparison 2025](https://makersden.io/blog/react-ui-libs-2025-comparing-shadcn-radix-mantine-mui-chakra)

---

### 6. Styling — Tailwind CSS vs CSS Modules vs Styled Components

**Comparison**

| Aspect | Tailwind CSS | CSS Modules | Styled Components |
|--------|-------------|------------|-------------------|
| **Build time** | 10x faster than v3, 7x faster than Styled (2025) | Fast (webpack) | Slow (runtime CSS-in-JS) |
| **Bundle size** | ~10 KB (purged tree-shake) | ~5 KB (minimal) | ~25–40 KB (runtime) |
| **Customization** | Via `tailwind.config.ts` (design tokens) | Per-file scoped CSS | Dynamic props-driven theming |
| **Design system** | ✅ Excellent (shareable config) | ⚠ Manual token management | ✅ Good (ThemeProvider) |
| **Runtime overhead** | 0 (static) | 0 (static) | Runtime CSS generation |
| **Learning curve** | Moderate (utility names) | Low (standard CSS) | Moderate (tagged templates) |
| **Responsive design** | Excellent (mobile-first utilities) | Manual media queries | Manual (requires helpers) |
| **Dark mode** | Built-in (class/system strategy) | Manual | Via theme object |
| **Production polish** | ✅ Industry standard 2025 | ✅ Traditional, solid | ⚠ Overkill for most projects |

**Verdict for Flight Booking**

**Use Tailwind CSS v4** because:
1. Massive performance gains in v4 (10x build time vs v3)
2. Design tokens (colors, spacing, fonts) can be centralized in config
3. Utility-first → fast prototyping + polished UI
4. Pairs perfectly with shadcn/ui (shadcn uses Tailwind by default)
5. Zero runtime cost (all static)
6. Excellent responsive/mobile design support
7. Industry standard for modern production apps

**Design System Pattern**:
```ts
// tailwind.config.ts
export default {
  theme: {
    colors: {
      primary: '#0066cc',   // Flight blue
      success: '#10b981',   // Booking confirmation
      warning: '#f59e0b',   // Price changes
      danger: '#ef4444',    // Cancellation
    },
    spacing: {
      card: '1rem',
      section: '2rem',
    },
  },
}
```

**Sources**:
- [Tailwind v4 why I chose CSS-first 2025](https://dev.to/themachinepulse/tailwind-css-v4-why-i-chose-css-first-config-over-styled-components-270f)
- [Tailwind CSS vs CSS Modules vs Styled Components 2025](https://medium.com/@salmanmuhammed827/tailwind-css-vs-css-modules-in-2025-which-should-you-choose-7edfe9a75254)

---

### 7. Date Handling — date-fns vs dayjs vs Luxon

**Comparison**

| Aspect | date-fns | dayjs | Luxon |
|--------|----------|-------|-------|
| **Bundle (gzip)** | ~18 KB (no locales) | ~6 KB | Varies (uses native Intl) |
| **Tree-shaking** | ✅ Excellent (import only what you need) | ✅ Good (plugins) | ⚠ Limited |
| **Performance** | ✅ Fastest (works directly with Date) | Fast | ⚠ Slower (Intl overhead) |
| **API style** | Functional (explicit imports) | Chainable (familiar) | Object-oriented (Luxon native) |
| **Timezone support** | Via date-fns-tz plugin (~3 KB) | Via plugin | Built-in (native Intl) |
| **Localization** | Via separate locale bundles | Via plugins | No bundled locales (uses Intl) |
| **Flight use case** | Display flight times, durations | Lightweight display-only | Heavy timezone manipulation |
| **Immutability** | ✅ All functions immutable | ✅ Immutable | ✅ Immutable |

**Verdict for Flight Booking**

**Use date-fns** because:
1. Flight times/durations are mostly display-only (no complex timezone math on client)
2. Tree-shaking keeps bundle small (~8 KB with common utilities)
3. Functional API encourages importing only what's needed
4. Performance advantage for rapid re-renders (flight list with times)
5. If timezone support needed: use `date-fns-tz` add-on

**Common Flight Utilities**:
```tsx
import { format, formatDuration, parseISO } from 'date-fns'

// Flight departure time: 2025-03-20T14:30:00Z
export const departureTime = format(new Date(flight.departure_at), 'HH:mm')

// Duration: PT2H30M (ISO 8601)
export const duration = formatDuration({
  hours: 2,
  minutes: 30,
}) // "2 hours 30 minutes"

// Display in user's timezone (if needed)
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'
```

**Sources**:
- [date-fns vs dayjs vs luxon 2025](https://npmtrends.com/date-fns-vs-dayjs-vs-luxon-vs-moment)
- [You might not need date-fns](https://dev.to/dmtrkovalenko/you-might-not-need-date-fns-23f7)

---

### 8. Airport Auto-suggest Implementation

**Approach**

Build a Combobox (autocomplete) with these components:

| Layer | Component | Source |
|-------|-----------|--------|
| **Base headless** | Radix UI Combobox or Headless UI Combobox | Radix/Headless |
| **Styled wrapper** | shadcn/ui Command (built on Radix) | shadcn/ui |
| **Data source** | Duffel Airport API or local airport list (IATA codes) | Duffel API or static JSON |
| **Search logic** | Client-side filter (for performance) or API search (for real-time sync) | useCallback + Array.filter or TanStack Query |

**Implementation Pattern**:

```tsx
import { useState, useCallback } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Airport {
  iata_code: string
  name: string
  city: string
  country: string
}

export function AirportCombobox({ value, onSelect }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [airports, setAirports] = useState<Airport[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Option 1: Client-side filter (fast, good for <5k airports)
  const filtered = airports.filter(
    (apt) =>
      apt.iata_code.includes(search.toUpperCase()) ||
      apt.name.toLowerCase().includes(search.toLowerCase()) ||
      apt.city.toLowerCase().includes(search.toLowerCase())
  )

  // Option 2: API search (if airports list is large)
  const searchAirports = useCallback(async (query: string) => {
    if (!query) {
      setAirports([])
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/airports?search=${encodeURIComponent(query)}`)
      const data = await res.json()
      setAirports(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full">
          {value ? `${value.iata_code} - ${value.name}` : 'Select airport...'}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-full">
        <Command>
          <CommandInput
            placeholder="Search airport..."
            value={search}
            onValueChange={(s) => {
              setSearch(s)
              searchAirports(s) // Option 2
            }}
          />
          <CommandEmpty>No airport found.</CommandEmpty>
          <CommandGroup>
            {filtered.map((airport) => (
              <CommandItem
                key={airport.iata_code}
                value={airport.iata_code}
                onSelect={(code) => {
                  const selected = airports.find((a) => a.iata_code === code)
                  onSelect(selected)
                  setOpen(false)
                }}
              >
                <span className="font-semibold">{airport.iata_code}</span>
                <span className="text-sm text-gray-600">
                  {airport.city}, {airport.country}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

**Data Strategy**

1. **Preload airports on app init** (Server Component or useEffect):
   - Fetch all ~10k airports once
   - Cache locally or in React Query
   - Do NOT fetch per keystroke (overhead)

2. **Client-side filter for <100ms search** (for LAX, SFO, etc.):
   - Array.filter on IATA code + city name
   - Fast enough for production

3. **API search for backend sync** (optional):
   - If airports change frequently or need backend filtering by airline/availability
   - Use TanStack Query with debounce

**Accessibility**

- Radix Combobox & Headless UI handle ARIA attributes automatically
- shadcn/ui Command wraps this with proper roles
- Test with screen reader (NVDA, JAWS)

**Sources**:
- [React Aria Combobox Guide](https://react-spectrum.adobe.com/blog/building-a-combobox.html)
- [Reach UI Combobox](https://reach.tech/combobox/)
- [Headless UI Combobox](https://headlessui.com/v1/react/combobox)

---

### 9. Duffel Flights API

**Overview**

Duffel is a travel API aggregator that provides a standardized interface to multiple airlines. JavaScript SDK available via npm.

**Booking Flow**

```
1. Offer Request
   POST /v1/offer_requests
   {
     "passengers": [{ "type": "adult", "age": 32 }],
     "slices": [{ "origin": "LAX", "destination": "JFK", "departure_date": "2025-04-01" }]
   }

2. Poll Offer Request (async)
   GET /v1/offer_requests/{id}
   → Returns "created" status when offers available

3. Get Offers
   GET /v1/offers?offer_request_id={id}
   → List of available flights with prices

4. Select Offer + Retrieve (best practice: refresh before booking)
   GET /v1/offers/{id}
   → Confirm price still valid

5. Create Order
   POST /v1/orders
   {
     "offer_id": "off_...",
     "passengers": [
       {
         "id": "pas_...",
         "first_name": "John",
         "last_name": "Doe",
         "born_at": "1992-03-20",
         "email": "john@example.com",
         "phone_number": "+1234567890",
         "nationality": "US",
         "document": { "type": "passport", "number": "..." }
       }
     ],
     "payments": [{ "type": "balance", "amount": "..." }]
   }

6. Order Confirmation
   Response includes order_id, itinerary, receipt
```

**Key Concepts**

- **Async Offer Requests**: Request takes 2–10 seconds; must poll for completion
- **Offer Expiry**: Offers expire after ~5 minutes; must refresh before payment
- **Price Verification**: Always retrieve offer again right before creating order
- **Passenger Details**: Full name, DOB, nationality, document number required for order

**SDK Integration**

```tsx
import Duffel from '@duffel/api'

const duffel = new Duffel({
  token: process.env.DUFFEL_API_KEY,
})

// Search flights (from Next.js Server Action or API route)
export async function searchFlights(searchParams) {
  const offerRequest = await duffel.offerRequests.create({
    passengers: [{ type: 'adult', age: 30 }],
    slices: [
      {
        origin: searchParams.from,
        destination: searchParams.to,
        departure_date: searchParams.date,
      },
    ],
  })

  // Poll until ready
  let offers = []
  let attempts = 0
  while (attempts < 30) {
    const completed = await duffel.offerRequests.get(offerRequest.id)
    if (completed.live_mode || completed.offers) {
      offers = await duffel.offers.list({ offer_request_id: completed.id })
      break
    }
    await new Promise((r) => setTimeout(r, 500))
    attempts++
  }

  return offers
}

// Create order (Server Action)
export async function createOrder(offerId, passengerData, payment) {
  const offer = await duffel.offers.get(offerId) // Refresh price

  const order = await duffel.orders.create({
    offer_id: offerId,
    passengers: passengerData,
    payments: [payment],
  })

  return order
}
```

**API Availability**

- **Endpoint**: `https://api.duffel.com/v2`
- **Auth**: Bearer token (API key)
- **Rate limits**: Check docs for tier-specific limits
- **Testing**: Sandbox mode available

**Client Libraries**

- **JavaScript (npm)**: [@duffel/api](https://www.npmjs.com/package/@duffel/api)
- **Python, Ruby, C#, Java**: Also available
- **Postman Collection**: For quick testing

**Sources**:
- [Duffel Flights API Documentation](https://duffel.com/docs)
- [Getting Started with Flights](https://duffel.com/docs/guides/getting-started-with-flights)
- [Duffel GitHub Hackathon Starter Kit](https://github.com/duffelhq/hackathon-starter-kit)

---

## Detailed Analysis

### Rendering Strategy for Flight Booking Workflow

```
┌─ Page (Server Component)
│  └─ Fetch initial data (airports, currencies)
│     └─ Serialize to client
│
├─ SearchForm (Client Component)
│  └─ useState: departure, arrival, date, passengers
│  └─ TanStack Query: searchFlights mutation
│  └─ On submit → trigger search
│
├─ SearchResults (mixed)
│  ├─ Server fetches initial offer list (first request)
│  └─ Client: filter/sort (with Client Component)
│     └─ TanStack Query: refetch, pagination
│
├─ FlightCard (Server Component fragment)
│  └─ Display flight details (pure markup)
│
├─ SelectButton (Client Component)
│  └─ onClick → navigate to passenger form
│     └─ TanStack Query: cache selected offer
│
├─ PassengerForm (Client Component)
│  └─ React Hook Form + Zod validation
│  └─ Multi-step: passenger details → payment
│  └─ TanStack Query mutation: createOrder
│
└─ Confirmation (Server Component)
   └─ Fetch order from Duffel by ID
   └─ Display receipt
```

**Data Flow Summary**

1. **SSR (Server Components)**: Fetch airports list, currencies, exchange rates once during page load
2. **SWR (TanStack Query)**: Flight search results cache with 2-minute stale-while-revalidate
3. **Mutations (TanStack Query)**: Create offer request, create order with optimistic updates
4. **Client State (Context)**: Filter visibility, modal open/closed, form step indicator

---

### Bundle Size Estimate

```
Core Next.js + React          ~45 KB (gzip)
Tailwind CSS (purged)          ~10 KB
shadcn/ui (10 components)      ~15 KB
React Hook Form + Zod          ~22 KB
TanStack Query                 ~16 KB
date-fns (common utilities)    ~8 KB
Duffel SDK                     ~5 KB (estimated)
─────────────────────────────────────
Total core dependencies        ~121 KB

Additional libraries (if needed):
  • Zustand (client state)     ~2.5 KB
  • clsx (classname helper)    ~1 KB
  • geist/next (fonts, optional) ~0 KB (external)

Production build estimate:
  HTML + JS (gzip): ~130–150 KB
  + Images/assets: ~200–500 KB (flight photos)
  ────────────────────────────
  Total first load: ~330–650 KB (depending on imagery)
```

### Security Considerations

| Concern | Solution |
|---------|----------|
| **API Key exposure** | Keep Duffel token in `.env.local`, use Server Actions or API routes to proxy calls |
| **Booking details leakage** | Fetch order confirmation server-side; don't log PII to console |
| **Form data in transit** | Use HTTPS/TLS (Next.js enforces by default in production) |
| **CSRF on order creation** | Next.js Server Actions include CSRF tokens automatically |
| **XSS via user input** | Sanitize airport names/flight data from Duffel API before rendering |

---

### Performance Optimization Tips

1. **Image lazy-loading** for airline logos, flight images
2. **Code splitting** for passenger form (only load when needed)
3. **Prefetch offers** on form focus to reduce perceived latency
4. **Pagination** of search results (show 10, load more on scroll)
5. **TanStack Query DevTools** in dev, disable in production
6. **Dynamic date picker** import (optional: load only on passenger form)

---

## Recommended Stack

### Final Tech Stack

```json
{
  "framework": {
    "next": "^14.0.0 or ^15.0.0",
    "react": "^19.0.0",
    "typescript": "^5.0.0"
  },
  "rendering": "Next.js App Router (Server Components by default)",
  "stateManagement": {
    "client": "React Context (UI state)",
    "server": "TanStack Query (API data, mutations)"
  },
  "forms": {
    "library": "React Hook Form ^7.48.0",
    "validation": "Zod ^3.22.0"
  },
  "ui": {
    "headless": "Radix UI (via shadcn/ui)",
    "styled": "shadcn/ui ^0.8.0",
    "styling": "Tailwind CSS ^4.0.0"
  },
  "dateTime": "date-fns ^3.0.0",
  "dataFetching": "TanStack Query ^5.28.0",
  "api": {
    "client": "@duffel/api ^latest"
  },
  "devTools": {
    "eslint": "eslint-config-next",
    "formatter": "prettier",
    "testing": "vitest + @testing-library/react (if adding tests)"
  }
}
```

### Installation Command

```bash
npm install \
  react@19 next@latest \
  react-hook-form zod @hookform/resolvers \
  @tanstack/react-query \
  tailwindcss tailwindcss-animate \
  shadcn-ui @radix-ui/react-* class-variance-authority \
  clsx tailwind-merge \
  date-fns \
  @duffel/api

# Dev dependencies
npm install -D \
  typescript @types/react @types/node \
  autoprefixer postcss \
  prettier eslint eslint-config-next
```

### Project Structure

```
flight-booking-app/
├── app/
│   ├── (root)/
│   │   ├── page.tsx              # Search form (Client)
│   │   ├── results/page.tsx       # Search results (mixed)
│   │   ├── booking/[id]/page.tsx  # Passenger form (Client)
│   │   └── confirmation/page.tsx  # Order confirmation (Server)
│   │
│   ├── api/
│   │   ├── search/route.ts        # POST: create offer request
│   │   ├── offers/route.ts        # GET: fetch offers by ID
│   │   └── orders/route.ts        # POST: create order
│   │
│   └── layout.tsx                 # Root layout (Server)
│
├── components/
│   ├── ui/                        # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── combobox.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   └── ...
│   │
│   ├── SearchForm.tsx             # Client Component
│   ├── SearchResults.tsx          # Client Component
│   ├── FlightCard.tsx             # Server Component
│   ├── AirportCombobox.tsx        # Client Component
│   └── PassengerForm.tsx          # Client Component
│
├── lib/
│   ├── duffel.ts                  # Duffel client + helpers
│   ├── validation.ts              # Zod schemas
│   └── utils.ts                   # Helpers (format date, etc.)
│
├── hooks/
│   ├── useSearchFlights.ts        # Custom TanStack Query hook
│   ├── useCreateOrder.ts          # Custom TanStack Query hook
│   └── useAirports.ts             # Custom hook (fetch + cache airports)
│
├── types/
│   ├── duffel.ts                  # Duffel API response types
│   └── forms.ts                   # Form schema types
│
├── env.example                    # Environment variables template
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## Trade-offs & Considerations

### Why NOT These Alternatives?

| Technology | Why Not | Trade-off |
|-----------|---------|-----------|
| **SWR (instead of TanStack Query)** | No mutation/optimistic updates support | Lighter bundle (+2 KB), but manual booking state management |
| **Redux Toolkit** | Over-engineered for this scope | Predictable but slower dev velocity; +25 KB bundle |
| **Formik + Yup** | Larger bundle than Hook Form + Zod | Easier learning curve, but +23 KB overhead |
| **MUI/Ant Design** | Pre-styled, large bundle bloat | Faster initial prototype, but +50–80 KB + less customization |
| **Moment.js** | Deprecated; massive bundle (67 KB!) | Old codebase compatibility only |
| **CSS Modules** | Scoped but verbose for utility-first | Better IDE autocomplete, but slower polish |
| **Styled Components** | Runtime cost + bundle + SSR complexity | Dynamic theming, but not needed here |

### Known Limitations

1. **Duffel API latency**: Offer requests take 2–10 seconds; must show loading UI
2. **Offer expiry**: Must refresh before booking (adds extra API call)
3. **Passenger form complexity**: International rules vary (some countries don't require DOB); Duffel may require different fields per airline
4. **Date picker accessibility**: shadcn/ui date picker (via Radix) is accessible but requires careful implementation in multi-step form
5. **Timezone handling**: Flight times are in UTC; must convert to user's timezone (date-fns-tz adds ~3 KB)
6. **Mobile responsiveness**: Tailwind handles this, but testing on real devices is critical for form UX

### Production Readiness Checklist

- [ ] Environment variables secured (API keys in .env.local, never committed)
- [ ] Error handling for Duffel API failures (timeout, rate limit)
- [ ] Loading states for all async operations (search, booking)
- [ ] Form validation on client AND server (Server Action validation)
- [ ] HTTPS enforced in production
- [ ] Analytics integrated (Vercel Web Vitals, custom event tracking)
- [ ] E2E tests with Playwright or Cypress (not included in this stack evaluation)
- [ ] Accessibility audit (axe-core, manual WCAG 2.1 AA review)
- [ ] SEO: meta tags, robots.txt, sitemap (Next.js metadata API)
- [ ] CSP headers configured (Content Security Policy)

---

## Unresolved Questions

1. **Duffel availability by region**: Does API support all airports/airlines in your target markets? (Verify via docs)
2. **Multi-currency handling**: Does Duffel handle FX? Should this be on client or server? (Duffel likely handles)
3. **Payment processing**: How is payment integrated? (Stripe, PayPal, Duffel payment API?) → Requires separate research
4. **Booking confirmation email**: Send via server-side email service (SendGrid, Resend) or rely on Duffel? (Likely both)
5. **Offline support**: Service Worker + offline caching? (Out of scope for MVP; add post-launch)
6. **Accessibility testing**: Do shadcn/ui components meet your WCAG level? (Radix UI targets WCAG 2.1 AA; test manually)
7. **Analytics**: Which events should be tracked? (Search, view offer, checkout step, order confirmation)

---

## Verdict: ACTIONABLE

All recommended technologies are **production-ready, actively maintained, and widely used in 2025+**. The stack prioritizes:

1. **Performance**: Zero runtime CSS, tree-shaken imports, minimal re-renders
2. **Developer experience**: TypeScript-first, excellent DX with React Hook Form + Zod
3. **Polished UI**: shadcn/ui + Tailwind enables rapid, professional styling
4. **Bundle efficiency**: ~130 KB gzipped core dependencies
5. **Scalability**: Clear separation of concerns (Server Components, Client Components, mutations)

**Next step**: Create boilerplate with this stack and validate Duffel API integration with sandbox credentials.

---

## References

### Official Documentation
- [Next.js App Router](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)
- [TanStack Query](https://tanstack.com/query/latest)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [date-fns](https://date-fns.org/)
- [Duffel API](https://duffel.com/docs)

### Comparisons & Guides
- [State Management 2025](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k)
- [TanStack Query vs SWR 2025](https://medium.com/better-dev-nextjs-react/tanstack-query-vs-rtk-query-vs-swr-which-react-data-fetching-library-should-you-choose-in-2025-4ec22c082f9f)
- [React Hook Form vs Formik](https://makersden.io/blog/composable-form-handling-in-2025-react-hook-form-tanstack-form-and-beyond)
- [UI Component Libraries 2025](https://makersden.io/blog/react-ui-libs-2025-comparing-shadcn-radix-mantine-mui-chakra)
- [Tailwind CSS v4 Improvements](https://dev.to/themachinepulse/tailwind-css-v4-why-i-chose-css-first-config-over-styled-components-270f)
- [date-fns vs dayjs vs Luxon](https://npmtrends.com/date-fns-vs-dayjs-vs-luxon-vs-moment)
- [React Aria Combobox](https://react-spectrum.adobe.com/blog/building-a-combobox.html)

---

**Report Generated**: March 18, 2026
**Research Scope**: Complete technology stack evaluation for production-ready flight booking application
