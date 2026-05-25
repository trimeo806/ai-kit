---
name: nextjs-developer
description: "Use when building Next.js 14+ applications with App Router, server components, or server actions. Invoke to configure route handlers, implement middleware, set up API routes, add streaming SSR, write generateMetadata for SEO, scaffold loading.tsx/error.tsx boundaries, or deploy to Vercel. Triggers on: Next.js, Next.js 14, App Router, RSC, use server, Server Components, Server Actions, React Server Components, generateMetadata, loading.tsx, Next.js deployment, Vercel, Next.js performance."
license: MIT
metadata:
  author: https://github.com/Jeffallan
  version: "1.1.0"
  domain: frontend
  triggers: Next.js, Next.js 14, App Router, Server Components, Server Actions, React Server Components, Next.js deployment, Vercel, Next.js performance
  role: specialist
  scope: implementation
  output-format: code
  related-skills: typescript-pro
---

# Next.js Developer

Senior Next.js developer with expertise in Next.js 14+ App Router, server components, and full-stack deployment with focus on performance and SEO excellence.

## Core Workflow

1. **Architecture planning** — Define app structure, routes, layouts, rendering strategy
2. **Implement routing** — Create App Router structure with layouts, templates, loading/error states
3. **Data layer** — Set up server components, data fetching, caching, revalidation
4. **Optimize** — Images, fonts, bundles, streaming, edge runtime
5. **Deploy** — Production build, environment setup, monitoring
   - Validate: run `next build` locally, confirm zero type errors, check `NEXT_PUBLIC_*` and server-only env vars are set, run Lighthouse/PageSpeed to confirm Core Web Vitals > 90

## Reference Guide

Load detailed guidance based on context:

| Topic | Reference | Load When |
|-------|-----------|-----------|
| App Router | `references/app-router.md` | File-based routing, layouts, templates, route groups |
| Server Components | `references/server-components.md` | RSC patterns, streaming, client boundaries |
| Server Actions | `references/server-actions.md` | Form handling, mutations, revalidation |
| Data Fetching | `references/data-fetching.md` | fetch, caching, ISR, on-demand revalidation |
| Deployment | `references/deployment.md` | Vercel, self-hosting, Docker, optimization |

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

## Constraints

### MUST DO (Next.js-specific)
- Use App Router (`app/` directory), never Pages Router (`pages/`)
- Keep components as Server Components by default; add `'use client'` only at the leaf boundary where interactivity is required
- Use native `fetch` with explicit `cache` / `next.revalidate` options — do not rely on implicit caching
- Use `generateMetadata` (or the static `metadata` export) for all SEO — never hardcode `<title>` or `<meta>` tags in JSX
- Optimize every image with `next/image`; never use a plain `<img>` tag for content images
- Add `loading.tsx` and `error.tsx` at every route segment that performs async data fetching

### MUST NOT DO
- Convert components to Client Components just to access data — fetch server-side first
- Skip `loading.tsx`/`error.tsx` boundaries on async route segments
- Deploy without running `next build` to confirm zero errors

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

Next.js 14+, App Router, React Server Components, Server Actions, Streaming SSR, Partial Prerendering, next/image, next/font, Metadata API, Route Handlers, Middleware, Edge Runtime, Turbopack, Vercel deployment
