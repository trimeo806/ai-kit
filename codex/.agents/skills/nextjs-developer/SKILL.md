---
name: nextjs-developer
description: "Use when building Next.js 16+ applications with App Router, Cache Components, Turbopack, and React 19.2 integration. Invoke to configure route handlers, implement middleware, set up API routes, configure Cache Components with Partial Pre-Rendering (PPR), write generateMetadata for SEO, scaffold loading.tsx/error.tsx boundaries, or deploy to Vercel. Triggers on: Next.js, Next.js 16, App Router, RSC, use server, Server Components, Server Actions, Cache Components, Turbopack, React 19.2, generateMetadata, loading.tsx, Next.js deployment, Vercel, Next.js performance, PPR."
license: MIT
metadata:
  author: https://github.com/Jeffallan
  version: "1.4.0"
  domain: frontend
  triggers: Next.js, Next.js 16, App Router, Server Components, Server Actions, React Server Components, Cache Components, Turbopack, React 19.2, Partial Pre-Rendering, PPR, Next.js deployment, Vercel, Next.js performance, React Compiler, hydration error, SSR, streaming
  role: specialist
  scope: implementation
  output-format: code
  related-skills: typescript-pro, react-expert
---

# Next.js Developer

Senior Next.js developer with expertise in Next.js 16+ App Router, Cache Components, Turbopack (stable), React 19.2 integration, and full-stack deployment with focus on performance and SEO excellence.

## Core Workflow

1. **Architecture planning** — Define app structure, routes, layouts, rendering strategy with Cache Components & PPR
2. **Implement routing** — Create App Router structure with layouts, templates, loading/error states, route deduplication
3. **Data layer** — Set up server components, data fetching, Cache Components, ISR, on-demand revalidation
4. **Optimize** — Images, fonts, Turbopack bundling (50%+ faster), streaming, edge runtime, React Compiler
5. **Deploy** — Production build (Turbopack default), environment setup, monitoring
   - Validate: run `next build` locally (fast with Turbopack), confirm zero type errors, check `NEXT_PUBLIC_*` and server-only env vars are set, run Lighthouse/PageSpeed to confirm Core Web Vitals > 90

## Reference Guide

Load detailed guidance based on context:

| Topic | Reference | Load When |
|-------|-----------|-----------|
| App Router | `references/app-router.md` | File-based routing, layouts, templates, route groups, layout deduplication |
| Cache Components & PPR | `references/cache-components.md` | Partial Pre-Rendering, opt-in caching, instant navigation |
| Turbopack | `references/turbopack.md` | Rust-based bundler, 50%+ faster builds, file system caching |
| Server Components | `references/server-components.md` | RSC patterns, streaming, client boundaries, React 19.2 |
| Server Actions | `references/server-actions.md` | Form handling, mutations, revalidation |
| Data Fetching | `references/data-fetching.md` | fetch, Cache Components, ISR, on-demand revalidation |
| React 19.2 Integration | `references/react-19-integration.md` | View Transitions, useEffectEvent, React Compiler support |
| Deployment | `references/deployment.md` | Vercel, self-hosting, Docker, Turbopack optimization |

## Large Page & Component Decomposition (Next.js)

### When to Decompose a Page
- `page.tsx` exceeds 150 lines
- Multiple data-fetching concerns in one async component
- Client and server logic tangled together
- Props threaded through 3+ levels to reach a leaf component

### Pattern 1 — Server Component as Data Container

Extract data-fetching into dedicated async server components instead of one monolithic page:

```tsx
// Before: single large page with all fetching
export default async function DashboardPage() {
  const [user, stats, activity] = await Promise.all([fetchUser(), fetchStats(), fetchActivity()]);
  return <div>...300 lines...</div>;
}

// After: page orchestrates focused async components
export default function DashboardPage() {
  return (
    <div className="dashboard">
      <Suspense fallback={<UserHeaderSkeleton />}>
        <UserHeader />           {/* fetches its own user data */}
      </Suspense>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsPanel />           {/* fetches its own stats */}
      </Suspense>
      <Suspense fallback={<ActivitySkeleton />}>
        <ActivityFeed />         {/* fetches its own activity */}
      </Suspense>
    </div>
  );
}

async function UserHeader() {
  const user = await fetchUser();
  return <header>{user.name}</header>;
}
```

### Pattern 2 — Push `'use client'` to the Leaf

Keep the server component tree as deep as possible; push interactivity to the smallest leaf:

```tsx
// Bad: entire section is client just for one button
'use client'
export function ProductSection({ productId }: { productId: string }) {
  const product = use(fetchProduct(productId)); // blocks client bundle with data
  return (
    <div>
      <h1>{product.name}</h1>          {/* static — no reason to be client */}
      <p>{product.description}</p>     {/* static */}
      <AddToCartButton id={productId} /> {/* only this needs interactivity */}
    </div>
  );
}

// Good: server renders data; tiny client leaf handles interaction
async function ProductSection({ productId }: { productId: string }) {
  const product = await fetchProduct(productId);
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <AddToCartButton id={productId} />  {/* 'use client' lives here only */}
    </div>
  );
}
```

### Pattern 3 — Route Groups for Shared Layouts (no prop drilling)

Use route groups `(group)` to scope layouts and eliminate drilling shared data:

```
app/
  (dashboard)/
    layout.tsx        ← loads user session once; provides via Context
    page.tsx
    settings/page.tsx
    reports/page.tsx
  (auth)/
    layout.tsx
    login/page.tsx
```

```tsx
// (dashboard)/layout.tsx — data fetched once, available to all children
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  return (
    <SessionProvider session={session}>
      <DashboardShell>{children}</DashboardShell>
    </SessionProvider>
  );
}
```

### Pattern 4 — Parallel Routes for Independent Sections

Replace a single large page with parallel slots that load and refresh independently:

```
app/dashboard/
  @stats/page.tsx     ← stats slot
  @feed/page.tsx      ← activity feed slot
  layout.tsx          ← composes slots
```

```tsx
// layout.tsx
export default function DashboardLayout({
  stats,
  feed,
}: {
  stats: ReactNode;
  feed: ReactNode;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <section>{stats}</section>
      <section>{feed}</section>
    </div>
  );
}
```

### Decision Guide (Next.js)

| Symptom | Apply Pattern |
|---------|--------------|
| Monolithic `page.tsx` with multiple fetches | Server Component as Data Container + Suspense |
| Client component wrapping static data | Push `'use client'` to leaf |
| Same session/config prop threaded through levels | Route Group layout + Context |
| Page sections that load/refresh independently | Parallel Routes |
| Heavy component slowing initial load | `next/dynamic` with `ssr: false` |

## Hydration Error Prevention (CRITICAL)

Hydration errors occur when server-rendered HTML differs from client-rendered HTML. This is the #1 cause of runtime issues in Next.js 16+. Apply these patterns to eliminate hydration mismatches.

### Root Causes & Solutions

| Cause | ❌ Anti-Pattern | ✅ Solution |
|-------|-----------------|-----------|
| **Browser APIs in Server Components** | Using `window`, `localStorage`, `navigator` in server code | Move to `'use client'` components or use `useEffect` |
| **Conditional rendering (random/date)** | `{Math.random() > 0.5 ? <A /> : <B />}` on server then client | Use `useEffect` + state to conditionally render after hydration |
| **CSS-in-JS style mismatch** | Dynamic styles differ server-to-client | Use stable CSS classes or `suppressHydrationWarning` (last resort) |
| **useEffect on initial render** | Fetching data in `useEffect` causes content mismatch | Fetch on server; pass data as props or use Server Components |
| **Inline event handlers** | `onClick={() => ...}` function created fresh each render | Use stable function refs or memoize callbacks |
| **Timestamp/date differences** | `new Date().toLocaleString()` differs on server vs client | Format dates on server or pass serialized timestamp to client |
| **Third-party script interference** | External scripts modify DOM during hydration | Defer scripts or use `Script` component with `strategy="afterInteractive"` |
| **Context with non-serializable values** | Functions/instances in Context cause mismatches | Serialize all Context values; pass functions as callbacks in props |

### Pattern 1 — Browser APIs: Move to Client Boundary

```tsx
// ❌ HYDRATION ERROR: window is undefined on server
'use server'
export async function PageWithClientDetection() {
  const isDarkMode = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return <div>{isDarkMode ? 'dark' : 'light'}</div>;
}

// ✅ CORRECT: Push browser logic to client leaf
async function PageWithClientDetection() {
  return <ThemeDetector />;
}

'use client'
function ThemeDetector() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);
  return <div>{isDarkMode ? 'dark' : 'light'}</div>;
}
```

### Pattern 2 — Random/Conditional Rendering: Defer to Client

```tsx
// ❌ HYDRATION ERROR: Random values differ server → client
'use client'
export function RandomGreeting() {
  const greetings = ['Hi', 'Hello', 'Howdy'];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  return <p>{greeting}!</p>;
}

// ✅ CORRECT: Use state + useEffect to ensure match
'use client'
export function RandomGreeting() {
  const [greeting, setGreeting] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const greetings = ['Hi', 'Hello', 'Howdy'];
    setGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
    setIsHydrated(true);
  }, []);

  // Render placeholder during hydration, real content after
  if (!isHydrated) return <p aria-busy="true"></p>;
  return <p>{greeting}!</p>;
}
```

### Pattern 3 — Date/Time Formatting: Format on Server

```tsx
// ❌ HYDRATION ERROR: Client-side toLocaleString() differs by timezone/locale
'use client'
export function PostTime({ timestamp }: { timestamp: number }) {
  return <time>{new Date(timestamp).toLocaleString()}</time>;
}

// ✅ CORRECT: Format on server; pass formatted string
import { formatDate } from '@/lib/date-utils';

export function PostTime({ timestamp }: { timestamp: number }) {
  const formatted = formatDate(timestamp); // runs on server
  return <time dateTime={new Date(timestamp).toISOString()}>{formatted}</time>;
}
```

### Pattern 4 — Data Fetching: Server First, Not useEffect

```tsx
// ❌ HYDRATION ERROR: useEffect fetching causes mismatch (no data on first render)
'use client'
export function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetch(`/api/users/${userId}`).then(r => r.json()).then(setUser);
  }, [userId]);

  return <div>{user?.name || 'Loading...'}</div>; // mismatch!
}

// ✅ CORRECT: Fetch on server; pass data to client
async function UserProfile({ userId }: { userId: string }) {
  const user = await fetch(`http://internal-api/users/${userId}`).then(r => r.json());
  return <UserProfileClient user={user} />;
}

'use client'
function UserProfileClient({ user }: { user: User }) {
  return <div>{user.name}</div>; // no fetching, no mismatch
}
```

### Pattern 5 — CSS Classes: Use Stable Classes, Not Dynamic Inline Styles

```tsx
// ❌ HYDRATION ERROR: Inline style depends on random or client-only value
'use client'
export function Card({ color }: { color?: string }) {
  const bgColor = color || (Math.random() > 0.5 ? 'blue' : 'green');
  return <div style={{ backgroundColor: bgColor }}>Content</div>;
}

// ✅ CORRECT: Use Tailwind classes or stable CSS
'use client'
export function Card({ color = 'blue' }: { color: 'blue' | 'green' }) {
  const bgClass = color === 'blue' ? 'bg-blue-500' : 'bg-green-500';
  return <div className={bgClass}>Content</div>;
}

// Even better: pass color from server so it's deterministic
async function CardPage({ colorFromDb }: { colorFromDb: 'blue' | 'green' }) {
  return <Card color={colorFromDb} />;
}
```

### Pattern 6 — Context with Complex Values: Serialize & Pass Props

```tsx
// ❌ HYDRATION ERROR: Context value includes function that differs server → client
const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {}, // functions recreated on each render
});

'use client'
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState('light');
  const value = { theme, toggleTheme: () => setTheme(t => t === 'light' ? 'dark' : 'light') };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ✅ CORRECT: Server-pass theme; client controls toggle
type ThemeContextValue = {
  theme: 'light' | 'dark';
  onToggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Server component fetches theme once
async function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = await getThemeFromDb(); // server-side
  return <ThemeProviderClient theme={theme}>{children}</ThemeProviderClient>;
}

'use client'
function ThemeProviderClient({ theme: initialTheme, children }: { theme: 'light' | 'dark'; children: ReactNode }) {
  const [theme, setTheme] = useState(initialTheme);
  const value = { theme, onToggle: () => setTheme(t => t === 'light' ? 'dark' : 'light') };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
```

### Hydration Checklist

When generating client components:
- [ ] No `window`, `localStorage`, `document` access outside `useEffect`
- [ ] No `Math.random()` or `Date.now()` in JSX (move to `useEffect` + state)
- [ ] No inline styles that depend on client-only values
- [ ] All conditional rendering is deterministic (data-driven, not random)
- [ ] Data comes from props or server fetch, not `useEffect`
- [ ] CSS classes are stable (Tailwind or CSS modules, not inline)
- [ ] `useId()` for any element that needs a unique ID
- [ ] All Context values are serializable (no functions)
- [ ] Third-party scripts use `<Script>` component with strategy

## Constraints

### MUST DO (Next.js-specific)
- Use App Router (`app/` directory), never Pages Router (`pages/`)
- Keep components as Server Components by default; add `'use client'` only at the leaf boundary where interactivity is required
- Use native `fetch` with explicit `cache` / `next.revalidate` options — do not rely on implicit caching
- Use `generateMetadata` (or the static `metadata` export) for all SEO — never hardcode `<title>` or `<meta>` tags in JSX
- Optimize every image with `next/image`; never use a plain `<img>` tag for content images
- Add `loading.tsx` and `error.tsx` at every route segment that performs async data fetching
- **Fetch data on the server first** — pass data to client as props, never fetch in `useEffect` on first render
- **No browser APIs in server code** — move `window`, `localStorage`, `document` access to `'use client'` components
- **Use `useEffect` + state for client-only logic** — ensure server render matches client hydration
- **Format dates/times on the server** — don't rely on client-side locale formatting

### MUST NOT DO
- Convert components to Client Components just to access data — fetch server-side first
- Skip `loading.tsx`/`error.tsx` boundaries on async route segments
- Deploy without running `next build` to confirm zero errors
- **Use `Math.random()` or `Date.now()` in JSX** — these cause hydration mismatches
- **Access browser APIs (`window`, `localStorage`) outside `useEffect`** — causes hydration errors
- **Fetch data in `useEffect` without a fallback** — creates server/client mismatch
- **Put functions or non-serializable values in Context** — causes hydration mismatches across component boundaries
- **Conditionally render based on client-only state** — defer to client with a state + useEffect guard
- **Use inline styles that differ between server and client** — use stable CSS classes instead

## Code Examples

### Server Component with data fetching and caching
```tsx
// app/products/page.tsx
import { Suspense } from 'react'

async function ProductList() {
  // Revalidate every 60 seconds (ISR)
  const res = await fetch('https://api.example.com/products', {
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error('Failed to fetch products')
  const products: Product[] = await res.json()

  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <ProductList />
    </Suspense>
  )
}
```

### Server Action with form handling and revalidation
```tsx
// app/products/actions.ts
'use server'

import { revalidatePath } from 'next/cache'

export async function createProduct(formData: FormData) {
  const name = formData.get('name') as string
  await db.product.create({ data: { name } })
  revalidatePath('/products')
}

// app/products/new/page.tsx
import { createProduct } from '../actions'

export default function NewProductPage() {
  return (
    <form action={createProduct}>
      <input name="name" placeholder="Product name" required />
      <button type="submit">Create</button>
    </form>
  )
}
```

### generateMetadata for dynamic SEO
```tsx
// app/products/[id]/page.tsx
import type { Metadata } from 'next'

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const product = await fetchProduct(params.id)
  return {
    title: product.name,
    description: product.description,
    openGraph: { title: product.name, images: [product.imageUrl] },
  }
}
```

## Output Templates

When implementing Next.js features, provide:
1. App structure (route organization)
2. Layout/page components with proper data fetching
3. Server actions if mutations needed
4. Configuration (`next.config.js`, TypeScript)
5. Brief explanation of rendering strategy chosen

## Knowledge Reference

Next.js 16+, App Router, React Server Components, Server Actions, Streaming SSR, Partial Pre-Rendering (PPR), Cache Components, Turbopack (stable, 50%+ faster), React 19.2 integration, next/image, next/font, Metadata API, Route Handlers, Middleware, Edge Runtime, Build Adapters (stable), Incremental Prefetching, Layout Deduplication, React Compiler support, View Transitions, Vercel deployment, **Hydration Error Prevention** (server-client consistency, no browser APIs on server, useEffect guards, serializable Context, stable CSS classes, server-side data fetching, date formatting)
