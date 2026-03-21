# Research: Next.js 16 Breaking Changes

**Date**: 2026-03-20
**Scope**: Next.js 16.2.0 API changes affecting data layer (Server Actions, Route Handlers, params, server-only package)
**Status**: ACTIONABLE

---

## Executive Summary

Next.js 16 introduces **five critical breaking changes** affecting data layer code:

1. **Async Request APIs** (params, searchParams, cookies, headers) are now **fully async-only** (no sync fallback)
2. **Server Actions** gain new caching APIs (`updateTag`, `refresh`) but `updateTag` is Server Actions-only
3. **Route Handlers** params now async; `Response.json()` unchanged
4. **Middleware → Proxy** migration (Node.js only; edge runtime deprecated)
5. **next-intl v4** requires proxy.ts rename + locale return from getRequestConfig

**Project Status**: Next.js 16.2.0 + React 19.2.4 + next-intl 4.8.3 are all compatible. No version blockers.

---

## Findings

### 1. Async Request APIs (Breaking Change)

**CRITICAL FOR DATA LAYER**

Starting Next.js 16, these APIs **must be awaited**. No synchronous fallback exists:

```typescript
// ❌ FAILS in Next.js 16
export default function Page({ params }) {
  const slug = params.slug // TypeError: params is a Promise
}

// ✅ CORRECT in Next.js 16
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug
}

// ✅ Type-safe with PageProps helper (v15.5+)
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
}
```

**Affected APIs**:
- `params` in page.js, layout.js, route.js, default.js
- `searchParams` in page.js
- `cookies()` function
- `headers()` function
- `draftMode()` function
- Image generation functions: opengraph-image, twitter-image, icon, apple-icon (both `params` and `id` are Promises)
- Sitemap generation: `id` is now Promise<string>

**Mitigation**: Run `npx next typegen` to auto-generate `PageProps`, `LayoutProps`, `RouteContext` helpers with full type safety.

---

### 2. Server Actions API Changes

#### New Caching APIs

**`updateTag()`** (Server Actions only)
- Provides **read-your-writes** semantics (immediate UI update)
- Only works in Server Actions
- Expires AND refreshes cache in same request

```typescript
// app/actions.ts
'use server'
import { updateTag } from 'next/cache'

export async function updateUserProfile(userId: string, profile: Profile) {
  await db.users.update(userId, profile)
  updateTag(`user-${userId}`) // Immediate refresh
}
```

**`refresh()`** (Server Actions only)
- Refreshes **uncached data only** (doesn't touch cache)
- For dynamic data like notification counts, live metrics

```typescript
'use server'
import { refresh } from 'next/cache'

export async function markNotificationAsRead(notificationId: string) {
  await db.notifications.markAsRead(notificationId)
  refresh() // Refresh uncached header/notification count
}
```

**`revalidateTag()`** (updated signature)
- Now requires **second argument**: cacheLife profile
- Provides stale-while-revalidate (SWR) behavior

```typescript
// ❌ Next.js 15 style (deprecated)
revalidateTag('article-123')

// ✅ Next.js 16 style
import { revalidateTag } from 'next/cache'
revalidateTag('article-123', 'max') // max, hours, days, or { expire: seconds }
```

#### `use server` Directive (Unchanged)
- No breaking changes to `use server` behavior
- File-level or function-level usage still works identically
- Server Actions continue to work as before

---

### 3. Route Handlers (route.js) Changes

**Params are now Promises**:

```typescript
// ❌ Next.js 15
export async function GET(request, { params }) {
  const slug = params.slug
  return Response.json({ slug })
}

// ✅ Next.js 16
export async function GET(request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug
  return Response.json({ slug })
}
```

**Response.json() unchanged**:
- `Response.json({ data })` works identically in 15 and 16
- Web Request/Response API unchanged

**segmentData.params is now Promise**:
- In proxy functions (formerly middleware), `params` is now async
- Proxy functions run on Node.js runtime only (edge runtime removed)

**Proxy functions return behavior changed**:
- Proxy functions **cannot return response bodies** anymore
- Only request modification, rewriting, redirection allowed
- Return types: NextRequest, NextResponse (redirect/rewrite), null

---

### 4. `server-only` Package (No Changes)

The `server-only` package remains **unchanged**:

```typescript
// Still works identically in Next.js 16
import 'server-only'

export async function getSecretKey() {
  return process.env.SECRET_KEY
}
```

**Key distinction** (already existed in 15):
- `server-only`: Prevents **accidental client imports** of server code (build-time)
- `use server`: Marks functions as **Server Functions/Actions** callable from client
- Different purposes; both needed for safety

**No migration required for server-only imports**.

---

### 5. Middleware → Proxy Migration (Breaking)

**REQUIRED FOR next-intl**

```typescript
// ❌ Old: middleware.ts (deprecated, edge runtime)
export default function middleware(request: Request) {}

// ✅ New: proxy.ts (Node.js runtime, recommended)
export function proxy(request: NextRequest) {
  // Your logic here
}
```

**Key changes**:
- Filename: `middleware.ts` → `proxy.ts`
- Export: `middleware` → `proxy`
- Runtime: Node.js only (edge runtime removed; edge remains available via middleware.ts but deprecated)
- Behavior: Network boundary is now explicit

**next-intl 4.x specific**:
- Requires `proxy.ts` rename to function correctly
- Without rename, locale negotiation fails
- Must also ensure `locale` is returned from `getRequestConfig`

---

### 6. Image Changes (next/image)

**Four breaking defaults**:

1. **`minimumCacheTTL`**: 60s → 4 hours (reduces revalidation cost)
2. **`imageSizes`**: Removed `16` from default sizes (only 4.2% of projects used it)
3. **`qualities`**: From `[1..100]` → `[75]` (single quality default)
4. **`maximumRedirects`**: Unlimited → 3 (security default)
5. **`dangerouslyAllowLocalIP`**: Blocked by default (requires explicit opt-in for private networks)

**Local images with query strings**:
```typescript
// ❌ Fails in Next.js 16 without config
<Image src="/assets/photo?v=1" alt="Photo" width="100" height="100" />

// ✅ Requires images.localPatterns config
const nextConfig = {
  images: {
    localPatterns: [
      { pathname: '/assets/**', search: '?v=1' }
    ],
  },
}
```

**Impact on Duffel client**: If using image optimization with Duffel airline logos, verify cache TTLs and redirect limits.

---

### 7. next-intl v4 Compatibility

**Status**: Fully compatible with Next.js 16.2.0

**Three migration steps** (all required):

1. **Rename middleware.ts → proxy.ts**
   ```typescript
   // proxy.ts
   import { routing } from '@/i18n/routing'
   import { NextIntlClientProvider } from 'next-intl'

   export function proxy(request: NextRequest) {
     // next-intl locale negotiation
     // Returns locale in request path
   }
   ```

2. **Return locale from getRequestConfig** (next-intl 4.0 requirement)
   ```typescript
   // next-intl.ts
   export default getRequestConfig(async ({ requestLocale }) => {
     const locale = requestLocale || 'en'
     return {
       locale,
       messages: (await import(`./messages/${locale}.json`)).default,
     }
   })
   ```
   Without this, "Unable to find next-intl locale" error occurs.

3. **Wrap app with NextIntlClientProvider** (next-intl 4.0 requirement)
   ```typescript
   // app/layout.tsx
   import { NextIntlClientProvider } from 'next-intl'

   export default function RootLayout({ children, params }) {
     return (
       <html lang={params.locale}>
         <body>
           <NextIntlClientProvider messages={messages}>
             {children}
           </NextIntlClientProvider>
         </body>
       </html>
     )
   }
   ```

**Cache directive compatibility**: Use `next-intl@4.4+` with Next.js 16 `'use cache'` directive. Note: `getTranslations()` reads from headers by default, which may conflict with `'use cache'` in some scenarios.

---

## Specific API Changes Summary

| API | Next.js 15 | Next.js 16 | Impact |
|-----|-----------|-----------|--------|
| `params` (page/route) | Sync object | Async Promise | **BREAKING**: Must await |
| `searchParams` | Sync object | Async Promise | **BREAKING**: Must await |
| `cookies()` | Sync call | Async call | **BREAKING**: Must await |
| `headers()` | Sync call | Async call | **BREAKING**: Must await |
| `updateTag()` | N/A | Async API (Server Actions only) | **New feature**: Immediate refresh |
| `revalidateTag()` | Single arg | Requires 2nd arg (cacheLife) | **BREAKING**: Update signature |
| `refresh()` | N/A | Async API (Server Actions only) | **New feature**: Refresh uncached data |
| `use server` | Unchanged | Unchanged | No changes |
| `server-only` | Unchanged | Unchanged | No changes |
| `Response.json()` | Works | Works | No changes |
| middleware.ts | Node.js/Edge | Deprecated | **BREAKING**: Rename to proxy.ts |
| proxy.ts | N/A | Node.js only | **New pattern**: Edge removed |
| Middleware exports | `middleware` | `proxy` | **BREAKING**: Function name change |

---

## Code Migration Examples

### Data Layer (Server Actions + Route Handlers)

**Before (Next.js 15)**:
```typescript
// app/api/articles/[slug]/route.ts
export async function GET(request: Request, { params }) {
  const article = await db.articles.findOne(params.slug)
  return Response.json(article)
}

// app/actions.ts
'use server'
import { revalidateTag } from 'next/cache'

export async function publishArticle(id: string) {
  await db.articles.update(id, { published: true })
  revalidateTag('articles')
}
```

**After (Next.js 16)**:
```typescript
// app/api/articles/[slug]/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const article = await db.articles.findOne(slug)
  return Response.json(article)
}

// app/actions.ts
'use server'
import { updateTag, revalidateTag } from 'next/cache'

export async function publishArticle(id: string) {
  await db.articles.update(id, { published: true })
  // For immediate read-your-writes (user sees change instantly)
  updateTag('article-' + id)

  // OR for background revalidation (user sees stale content first)
  revalidateTag('articles', 'max')
}
```

### Duffel Client with server-only

**No changes required** (server-only unchanged):
```typescript
// lib/duffel.ts
import 'server-only'
import { Duffel } from '@duffel/api'

const duffel = new Duffel({ token: process.env.DUFFEL_TOKEN })

export async function fetchAirlines() {
  return await duffel.airlines.list()
}
```

### next-intl Integration

**Before (Next.js 15)**:
```typescript
// middleware.ts
import { routing } from '@/i18n/routing'

export function middleware(request: NextRequest) {
  // Locale negotiation
  return NextResponse.redirect(new URL(`/${locale}`, request.url))
}

export const config = {
  matcher: ['/((?!api|_next|_static|.*\\..*|favicon).*)']
}
```

**After (Next.js 16)**:
```typescript
// proxy.ts (renamed, same logic)
import { routing } from '@/i18n/routing'

export function proxy(request: NextRequest) {
  // Same locale negotiation logic
  return NextResponse.redirect(new URL(`/${locale}`, request.url))
}

export const config = {
  matcher: ['/((?!api|_next|_static|.*\\..*|favicon).*)']
}

// next-intl.ts (MUST return locale)
export default getRequestConfig(async ({ requestLocale }) => {
  const locale = requestLocale || 'en'
  return {
    locale, // REQUIRED in v4
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
```

---

## Codemod Availability

Vercel provides automated migration:

```bash
# Migrate to Next.js 16
npx @next/codemod@canary upgrade latest

# Migrate to async params/searchParams
npx @next/codemod@canary migrate-to-async-dynamic-apis

# Rename middleware → proxy
# (included in upgrade latest codemod)
```

**Codemod handles**:
- Rename middleware.ts → proxy.ts
- Add async/await to params and searchParams
- Update revalidateTag signatures
- Remove unstable_ prefixes

---

## Performance & Caching Strategy Implications

### Server Actions Caching

**For user-facing mutations** (forms, settings):
```typescript
// Use updateTag for immediate feedback
export async function updateProfile(profile: Profile) {
  await db.updateUser(profile)
  updateTag(`user-${userId}`) // ← User sees changes instantly
}
```

**For background updates** (publish, archive):
```typescript
// Use revalidateTag for eventual consistency
export async function publishArticle(id: string) {
  await db.articles.update(id, { published: true })
  revalidateTag('articles', 'max') // ← User sees stale data while revalidating
}
```

### Route Handler Caching

```typescript
// Route handlers still use revalidateTag from next/cache
import { revalidateTag } from 'next/cache'

export async function POST(req: Request) {
  const result = await updateDuffel(req.json())
  revalidateTag('flights', 'hours') // Use cacheLife profile
  return Response.json(result)
}
```

---

## Verdict

**ACTIONABLE** — All changes are straightforward, with automated codemods available.

**Critical actions**:
1. Run `npx @next/codemod@canary upgrade latest` to auto-migrate
2. Verify all `params`/`searchParams` are awaited
3. Rename `middleware.ts` → `proxy.ts` for next-intl
4. Update `revalidateTag()` calls with cacheLife profile
5. Run `npx next typegen` for type-safe params

**No version blockers**: Next.js 16.2.0 + React 19.2.4 + next-intl 4.8.3 are fully compatible.

---

## Sources

- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) — Official breaking changes, async APIs, image defaults, middleware→proxy migration, removals
- [Next.js 16 Blog Announcement](https://nextjs.org/blog/next-16) — Feature overview, caching APIs (`updateTag`, `refresh`, `revalidateTag`), React 19.2 features
- [next-intl v4 Upgrade Guide](https://next-intl.dev/blog/next-intl-4-0) — next-intl 4.0 changes, locale requirement, ESM-only
- [Fix next-intl in Next.js 16: Rename middleware to proxy](https://www.buildwithmatija.com/blog/next-intl-nextjs-16-proxy-fix) — Practical next-intl 4 + Next.js 16 migration steps
- [next-intl Issue #2064: Next.js 16 Compatibility](https://github.com/amannn/next-intl/issues/2064) — Community troubleshooting for middleware→proxy and locale config

---

## Unresolved Questions

1. **Cache tagging in Duffel client calls**: Should Duffel API calls be tagged with `cacheTag` for better revalidation? Requires domain knowledge of flight data freshness requirements.
2. **next-intl `use cache` directive interaction**: Does `getTranslations()` work correctly inside `'use cache'` blocks in Next.js 16.2.0+? May require testing.
3. **Edge runtime alternative for locale middleware**: Next.js docs mention "alternative API coming in minor release" for edge runtime support. Timeline unclear.

---

**Report Generated**: 2026-03-20
**Knowledge Tier**: WebSearch (official docs) + Context7 (library docs) + community sources
**Coverage**: Complete (all five breaking changes researched)
