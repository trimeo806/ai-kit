# TanStack Start Framework Research Report

**Date**: 2025-03-15
**Agent**: researcher
**Status**: ACTIONABLE

---

## Executive Summary

TanStack Start is a modern, full-stack React framework built on TanStack Router that provides seamless server-client integration, streaming SSR, type-safe APIs, and universal deployment. It eliminates the traditional API layer by allowing server functions to be called directly from client code with automatic network marshaling. The framework prioritizes developer experience through clear code execution boundaries and follows isomorphic-by-default architecture with explicit controls for server-only and client-only code.

---

## Research Question

Provide comprehensive documentation on TanStack Start including core concepts, file-based routing, SSR/data loading patterns, key APIs, authentication, deployment, project structure, and TypeScript integration.

---

## Sources Consulted

1. [TanStack Start Overview](https://tanstack.com/start/latest/docs/framework/react/overview) - Official docs (HIGH)
2. [Getting Started Guide](https://tanstack.com/start/latest/docs/framework/react/getting-started) - Official docs (HIGH)
3. [Routing Documentation](https://tanstack.com/start/latest/docs/framework/react/guide/routing) - Official docs (HIGH)
4. [Data Loading](https://tanstack.com/router/latest/docs/guide/data-loading) - Official docs (HIGH)
5. [Server Functions Guide](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions) - Official docs (HIGH)
6. [Code Execution Patterns](https://tanstack.com/start/latest/docs/framework/react/guide/code-execution-patterns) - Official docs (HIGH)
7. [Execution Model](https://tanstack.com/start/latest/docs/framework/react/guide/execution-model) - Official docs (HIGH)
8. [Build from Scratch](https://tanstack.com/start/latest/docs/framework/react/build-from-scratch) - Official docs (HIGH)
9. [Authentication Guide](https://tanstack.com/start/latest/docs/framework/react/guide/authentication) - Official docs (HIGH)
10. [Hosting & Deployment](https://tanstack.com/start/latest/docs/framework/react/guide/hosting) - Official docs (HIGH)
11. [Error Boundaries](https://tanstack.com/start/latest/docs/framework/react/guide/error-boundaries) - Official docs (HIGH)
12. [Better Auth Integration](https://better-auth.com/docs/integrations/tanstack) - Third-party (MEDIUM)
13. [Clerk Integration](https://clerk.com/docs/tanstack-react-start/getting-started/quickstart) - Third-party (MEDIUM)
14. [TanStack Start v1 Release - InfoQ](https://www.infoq.com/news/2025/11/tanstack-start-v1/) - Industry news (MEDIUM)
15. [Netlify Deployment Guide](https://docs.netlify.com/build/frameworks/framework-setup-guides/tanstack-start/) - Official (HIGH)
16. [Cloudflare Deployment](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/) - Official (HIGH)
17. [Vercel Integration](https://vercel.com/docs/frameworks/full-stack/tanstack-start) - Official (HIGH)
18. [LogRocket: Full-Stack with TanStack Start](https://blog.logrocket.com/full-stack-app-with-tanstack-start/) - Technical blog (MEDIUM)
19. [Frontend Masters: Introducing TanStack Start](https://frontendmasters.com/blog/introducing-tanstack-start/) - Technical blog (MEDIUM)
20. [Selective SSR in TanStack Start](https://blog.logrocket.com/selective-ssr-tanstack-start/) - Technical blog (MEDIUM)

---

## 1. Core Concepts & Architecture

### Framework Philosophy

TanStack Start is designed to **eliminate the traditional API layer** by providing seamless server-client integration. Core principles:

- **Isomorphic by Default**: All code runs in both server and client bundles unless explicitly constrained
- **Type Safety Across Network Boundary**: TypeScript types flow through server functions to client calls
- **Developer Experience**: Clear patterns for code execution location (server vs. client)
- **Streaming SSR**: Modern approach to server-side rendering with incremental HTML delivery
- **Universal Deployment**: Works on any Vite-compatible hosting provider

### Architecture Foundation

```
TanStack Start = TanStack Router + SSR + Server Functions + Dual-Bundle Build
```

Built on:
- **TanStack Router**: File-based, type-safe routing
- **Vite**: Build tool and dev server
- **Vinxi**: Dual-bundle build system (client + server bundles)

### Dual-Bundle System

The Vite plugin performs source transforms at bundle time:
- **Client bundle**: Server function calls → HTTP fetch calls
- **Server bundle**: Full function implementation runs
- **Same source file**: Compiled differently for each target
- **Seamless calling**: Single function definition, different execution contexts

---

## 2. File-Based Routing System

### Route Organization

Routes live in `src/routes/` directory with automatic route generation:
- File path maps to URL path (e.g., `src/routes/posts/$postId.tsx` → `/posts/:postId`)
- Nested structures create nested routes
- Special file names: `__root.tsx` (root layout), `$.tsx` (catch-all)

### Route Definition APIs

#### createRootRoute()

```typescript
// src/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { HeadContent, Scripts } from '@tanstack/react-start'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
    ],
  }),
  component: () => (
    <>
      <HeadContent />
      <Outlet />
      <Scripts />
    </>
  ),
})
```

Key aspects:
- Root route in `src/routes/__root.tsx` (must be named `__root.tsx`)
- Top-most route that encapsulates all others
- Must include `<Outlet />` for child routes
- Must include `<HeadContent />` and `<Scripts />` from `@tanstack/react-start`

#### createFileRoute()

```typescript
// src/routes/posts/$postId.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/$postId')({
  component: PostDetail,
})

function PostDetail() {
  const { postId } = Route.useParams()
  return <div>Post: {postId}</div>
}
```

Key aspects:
- Takes path string argument (e.g., `/posts/$postId`)
- Returns function accepting route configuration
- Support for dynamic segments (`$paramName`)
- Export as `Route` constant

### Route Types

| Type | Usage | Example |
|------|-------|---------|
| **Static route** | Simple pages | `/about.tsx` → `/about` |
| **Dynamic route** | Parameterized | `/$id.tsx` → `/:id` |
| **Nested route** | Child routes | `posts/index.tsx` + `posts/$id.tsx` |
| **Server route** | API endpoints | `api/users.ts` with `createServerFn` |
| **Catch-all route** | Fallback | `$.tsx` matches unmatched paths |

---

## 3. Server-Side Rendering & Data Loading

### Execution Model Overview

All code is **isomorphic by default** (runs in both bundles) unless explicitly constrained:

```typescript
// This runs on both server and client by default
export const getUser = async (id: string) => {
  const data = await fetch(`/api/users/${id}`)
  return data.json()
}

// This only runs on server
export const getSecret = createServerFn(
  { method: 'POST' } as const,
  async (userId: string) => {
    // Access secrets, database, etc.
    const secret = process.env.SECRET_KEY
    return secret
  }
)

// Client-only function
export const analytics = createClientOnlyFn(() => {
  // Track events, etc.
})

// Server-only function (crashes on client)
export const dbQuery = createServerOnlyFn(async () => {
  // Database operations
})
```

### Data Loading with Loaders

Loaders run on both server and client to fetch and prepare data:

```typescript
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    // Runs on server during SSR and on client for client-side navigation
    const post = await fetch(`/api/posts/${params.postId}`).then(r => r.json())
    return { post }
  },
  component: PostComponent,
})

function PostComponent() {
  const { post } = Route.useLoaderData()
  return <div>{post.title}</div>
}
```

**Important**: Loaders are isomorphic. Never put secrets in loaders—they're exposed to client bundle.

### beforeLoad Hook

Runs before loader to validate permissions, check auth, etc.:

```typescript
export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ context }) => {
    const { user } = context
    if (!user?.isAdmin) {
      throw new Error('Unauthorized')
    }
  },
  loader: async () => {
    // Safe to fetch admin data here
  },
  component: AdminPanel,
})
```

### Server Functions Pattern

For server-only operations, use `createServerFn`:

```typescript
// src/routes/posts/mutations.functions.ts
import { createServerFn } from '@tanstack/react-start'

export const createPost = createServerFn(
  { method: 'POST' } as const,
  async (data: { title: string; content: string }) => {
    // Database write
    const post = await db.posts.create(data)
    return post
  }
)

// src/routes/posts/create.tsx
export const Route = createFileRoute('/posts/create')({
  component: () => {
    const [title, setTitle] = useState('')

    const handleSubmit = async (e) => {
      e.preventDefault()
      const newPost = await createPost({ title, content: '' })
      // newPost is type-safe!
    }

    return (
      <form onSubmit={handleSubmit}>
        <input value={title} onChange={e => setTitle(e.target.value)} />
        <button type="submit">Create</button>
      </form>
    )
  },
})
```

### Streaming SSR

Modern streaming approach sends HTML incrementally:

```typescript
export const Route = createFileRoute('/dashboard')({
  loader: async () => {
    // Fast data (required for initial render)
    const user = await fetchUser()

    // Slow data (streamed after initial HTML)
    const expensiveData = fetchExpensiveData()

    return { user, expensiveData }
  },
  component: Dashboard,
})
```

Benefits:
- Initial HTML sent while slow data loads
- Browser renders critical content immediately
- Slow data streams without blocking page
- Better perceived performance
- Full page not blocked by slowest data

### Selective SSR

Fine-grained control over rendering:

```typescript
export const Route = createFileRoute('/page')({
  ssr: 'data-only', // Only run beforeLoad/loader on server
  // Component NOT rendered on server, only on client
  component: ClientOnlyPage,
})
```

---

## 4. Key APIs

### Router Configuration

```typescript
// src/router.tsx
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
```

The `routeTree.gen.ts` is auto-generated from files in `src/routes/`.

### Server Functions Core APIs

```typescript
// Basic server function
export const getUser = createServerFn(
  async (userId: string) => {
    return db.users.findUnique(userId)
  }
)

// With HTTP method specification
export const updateUser = createServerFn(
  { method: 'POST' } as const,
  async (userId: string, data: UpdateUserInput) => {
    return db.users.update(userId, data)
  }
)

// With input validation (Zod example)
import { z } from 'zod'

export const createPost = createServerFn(
  { method: 'POST' } as const,
  async (data) => {
    // Validates on both client and server
    return db.posts.create(data)
  }
).inputValidator(() => z.object({
  title: z.string(),
  content: z.string(),
}))

// Static server function (cached at build time)
export const getStaticData = createServerFn(
  async () => {
    return await fetchStaticContent()
  }
)
// Apply middleware to make it static
export const getStaticDataWithMiddleware = staticFunctionMiddleware(
  getStaticData
)
```

### Code Execution Functions

```typescript
// Server-only (crashes on client)
export const secret = createServerOnlyFn(async () => {
  return process.env.SECRET
})

// Client-only (crashes on server)
export const track = createClientOnlyFn(() => {
  window.gtag?.('event', 'page_view')
})

// Isomorphic (different implementation per environment)
export const log = createIsomorphicFn(
  async (message) => {
    // Client implementation
    console.log(message)
  },
  async (message) => {
    // Server implementation
    await db.logs.create(message)
  }
)
```

### Error Handling

```typescript
export const Route = createFileRoute('/posts/$postId')({
  beforeLoad: async ({ params }) => {
    const post = await db.posts.findUnique(params.postId)
    if (!post) {
      throw new Error('Post not found') // Will be caught by error boundary
    }
  },
  errorComponent: ({ error }) => (
    <div>Error: {error.message}</div>
  ),
  component: PostDetail,
})

// Route-level error boundary
export const Route = createFileRoute('/admin')({
  onError: (error) => {
    // Custom error handling
    logger.error(error)
  },
  errorComponent: AdminErrorPage,
})
```

---

## 5. Authentication Patterns

### Overview

TanStack Start supports multiple auth solutions with seamless integration:

1. **Better Auth** - Type-safe auth library with social login
2. **Clerk** - Prebuilt authentication UI
3. **Auth.js** - Flexible auth framework
4. **Supabase** - Backend-as-a-service with auth
5. **WorkOS** - Enterprise SSO

### Context-Based Authentication

```typescript
// src/router.tsx
declare module '@tanstack/react-router' {
  interface Register {
    context: {
      user: User | null
      isAuthenticated: boolean
    }
  }
}

// src/routes/__root.tsx
export const Route = createRootRoute({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    return { user, isAuthenticated: !!user }
  },
  component: RootLayout,
})

// Any route can access auth context
export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: Dashboard,
})
```

### Protected Routes

```typescript
function ProtectedRoute() {
  const { user } = Route.useRouteContext()

  if (!user) {
    return <Navigate to="/login" />
  }

  return <Dashboard user={user} />
}

// Or with beforeLoad (server and client)
export const Route = createFileRoute('/protected')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
  },
})
```

### Server-Side Session Management

```typescript
export const getSession = createServerFn(
  async (req) => {
    // Access request headers for session validation
    const sessionId = req.headers.cookie?.split('sessionId=')[1]
    if (!sessionId) return null

    return await db.sessions.findUnique(sessionId)
  }
)

// Used in beforeLoad
export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session?.user?.isAdmin) {
      throw redirect({ to: '/forbidden' })
    }
    return { session }
  },
})
```

---

## 6. Project Structure & Conventions

### Recommended Directory Layout

```
src/
├── routes/                  # File-based routes
│   ├── __root.tsx          # Root layout
│   ├── index.tsx           # Home page
│   ├── about.tsx           # Static page
│   ├── posts/
│   │   ├── index.tsx       # /posts
│   │   ├── $postId.tsx     # /posts/:postId
│   │   └── mutations.functions.ts
│   ├── admin/
│   │   ├── __layout.tsx    # Nested layout
│   │   └── dashboard.tsx
│   └── api/
│       ├── users/
│       │   └── [id].ts     # /api/users/:id
│       └── posts.ts        # /api/posts
├── components/             # Reusable UI components
│   ├── common/
│   ├── layout/
│   └── posts/
├── lib/                    # Utilities & helpers
│   ├── utils.ts
│   ├── hooks.ts
│   └── types.ts
├── server/                 # Server-only code
│   ├── db.ts              # Database client
│   ├── auth.ts            # Auth utilities
│   └── email.ts           # Email service
├── router.tsx             # Router configuration
├── routeTree.gen.ts       # Auto-generated route tree
└── entry.client.tsx       # Client entry point
public/
├── index.html             # HTML template
└── favicon.ico
vite.config.ts            # Vite configuration
tsconfig.json             # TypeScript config
package.json
```

### File Organization Patterns

**Pattern 1: Colocation by Feature**
```
src/routes/posts/
├── index.tsx                    # Page component
├── $id.tsx                      # Detail page
├── mutations.functions.ts       # Server functions (safe to import anywhere)
├── queries.functions.ts         # Query functions
├── posts.server.ts              # Server-only helpers (can't import on client)
├── posts.types.ts               # Shared types
└── components/
    ├── PostCard.tsx
    └── PostList.tsx
```

**Pattern 2: Separate Concerns**
```
src/
├── routes/                      # Route components only
├── server/
│   ├── db.ts                   # Database layer
│   ├── auth.ts                 # Auth logic
│   └── mutations/
│       └── posts.ts            # Post mutations
├── client/
│   ├── hooks/
│   ├── queries/
│   └── mutations/
└── shared/
    └── types.ts
```

---

## 7. TypeScript Integration

### Strict Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "moduleResolution": "Bundler",
    "module": "ESNext",
    "target": "ES2022",
    "skipLibCheck": true,
    "strictNullChecks": true,
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "~/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

### Type-Safe Route Parameters

```typescript
// src/routes/posts/$postId.tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    // params is typed: { postId: string }
    const post = await getPost(params.postId)
    return { post }
  },
  component: ({ useLoaderData }) => {
    const { post } = useLoaderData()
    // post is typed based on loader return
    return <h1>{post.title}</h1>
  },
})
```

### Type-Safe Server Functions

```typescript
export const createPost = createServerFn(
  { method: 'POST' } as const,
  async (data: { title: string; content: string }) => {
    const post = await db.posts.create(data)
    return post // Return type inferred
  }
)

// Client call is fully typed
const post = await createPost({ title: 'Hello' }) // ✓ Type-safe
const post = await createPost({ title: 123 }) // ✗ Type error
```

### Extending Router Context

```typescript
// src/types.ts
export interface User {
  id: string
  name: string
  email: string
  isAdmin: boolean
}

// src/router.tsx
declare module '@tanstack/react-router' {
  interface Register {
    context: {
      user: User | null
      isLoading: boolean
    }
  }
}
```

---

## 8. Vite & Build Configuration

### vite.config.ts

```typescript
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import tanstackStart from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tanstackStart(), // Must be before viteReact
    viteReact(),
  ],
})
```

### TanStack Start Plugin Options

```typescript
tanstackStart({
  srcDirectory: 'src',           // Route source directory
  router: {
    routesDirectory: 'routes',   // Relative to srcDirectory
    generatedRouteTree: 'routeTree.gen.ts',
    routeFileIgnorePrefix: '-',  // Ignore files starting with -
    quoteStyle: 'single',        // Generated imports quote style
  },
})
```

### Build Output

- **Client bundle**: Optimized for browser, includes React, routing
- **Server bundle**: Includes server functions, database client, secrets
- **Both include**: Shared types, components, utilities

---

## 9. Deployment Options

### Supported Platforms

| Platform | Adapter | Partner Status | Notes |
|----------|---------|----------------|-------|
| **Netlify** | @netlify/vite-plugin-tanstack-start | Official | Recommended, CLI v17.31+ |
| **Cloudflare** | @cloudflare/vite-plugin | Official | Workers, Pages, Auto-detection |
| **Vercel** | Nitro adapter | Supported | With Nitro integration |
| **Railway** | node-server | Supported | Docker deployment |
| **Node.js** | node-server | Built-in | Any Node.js hosting |
| **Bun** | bun | Built-in | Bun runtime |

### Netlify Deployment

```bash
# Install plugin
npm install -D @netlify/vite-plugin-tanstack-start

# vite.config.ts
import netlifyPlugin from '@netlify/vite-plugin-tanstack-start/vite'

export default defineConfig({
  plugins: [
    netlifyPlugin(),
    tanstackStart(),
    viteReact(),
  ],
})

# Deploy
netlify deploy
```

### Cloudflare Deployment

```bash
# Install tools
npm install -D @cloudflare/vite-plugin wrangler

# vite.config.ts
import { defineConfig } from 'vite'
import cloudflarePlugin from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [cloudflarePlugin(), tanstackStart(), viteReact()],
})

# Deploy (auto-detection)
wrangler deploy
```

### Vercel Deployment

```bash
# Works with Nitro adapter
# vite.config.ts includes Nitro configuration

# Deploy normally
vercel deploy
```

---

## 10. Advanced Patterns

### Static Server Functions

Build-time execution cached as static assets:

```typescript
// Use middleware to enable static generation
import { staticFunctionMiddleware } from '@tanstack/react-start/server'

export const getStaticPosts = staticFunctionMiddleware(
  createServerFn(async () => {
    return db.posts.findAll()
  })
)

// Route using static function
export const Route = createFileRoute('/posts')({
  loader: () => getStaticPosts(), // Cached at build time
})
```

### Environment Functions

Safely access environment variables:

```typescript
export const getConfig = createServerFn(async () => {
  return {
    apiUrl: process.env.PUBLIC_API_URL,
    // Never expose secrets through loaders
  }
})
```

### Deferred Data Loading

Split fast and slow data:

```typescript
export const Route = createFileRoute('/dashboard')({
  loader: async () => {
    // Fast data
    const user = await fetchUser()

    // Slow data (doesn't block initial render)
    const slowData = fetchExpensiveData()

    return { user, slowData }
  },
  component: Dashboard,
})

function Dashboard() {
  const { user, slowData } = Route.useLoaderData()

  return (
    <div>
      <UserHeader user={user} />
      <Suspense fallback={<Loading />}>
        <SlowContent data={slowData} />
      </Suspense>
    </div>
  )
}
```

### Middleware

Intercept requests/responses:

```typescript
export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    // Logging, validation, auth checks
    console.log('Route loaded')
    return context
  },
})
```

---

## Technology Comparison

| Aspect | TanStack Start | Next.js | Remix |
|--------|---|---|---|
| **Routing** | File-based (TanStack Router) | File-based | File-based |
| **Server Functions** | Native (createServerFn) | API routes | Actions/Loaders |
| **Type Safety** | Full end-to-end | Partial | Partial |
| **SSR** | Streaming | Streaming | Streaming |
| **Flexibility** | High (any host) | Vercel-first | Any Node.js |
| **Learning Curve** | Moderate | Moderate | Moderate |
| **Maturity** | v1 (2025) | Stable | Stable |
| **Deployment** | Universal | Vercel optimized | Node.js required |
| **Data Fetching** | Server Functions | API routes | Loaders/Actions |
| **ORM Integration** | Any | Any | Any |

---

## Best Practices

### Security
- Never put secrets in loaders—use `createServerFn` instead
- Always validate server function inputs with Zod or similar
- Use `createServerOnlyFn` for sensitive operations
- Validate auth in `beforeLoad` before accessing data

### Performance
- Use streaming SSR for pages with slow data
- Defer non-critical data with `Suspense`
- Split server functions into separate files
- Use `staticFunctionMiddleware` for static content

### Developer Experience
- Follow feature-based folder structure
- Colocate related files (components, functions, types)
- Use `.functions.ts` for server function files
- Use `.server.ts` for server-only utilities
- Keep isomorphic code minimal

### File Organization
```
Feature organization preferred:
posts/
├── posts.tsx (page)
├── posts.functions.ts (server functions)
├── posts.server.ts (server utilities)
├── posts.types.ts (types)
└── components/ (feature components)
```

### Testing
- Test server functions independently
- Mock database for unit tests
- Use streaming SSR in integration tests
- Type tests with TypeScript strict mode

---

## Code Examples

### Complete Feature Example

```typescript
// src/routes/posts/mutations.functions.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '~/server/db'

export const createPost = createServerFn(
  { method: 'POST' } as const,
  async (data) => {
    const post = await db.posts.create(data)
    return post
  }
).inputValidator(() => z.object({
  title: z.string().min(1),
  content: z.string(),
}))

// src/routes/posts/create.tsx
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { createPost } from './mutations.functions'

export const Route = createFileRoute('/posts/create')({
  component: CreatePost,
})

function CreatePost() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = Route.useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newPost = await createPost({ title, content })
      await navigate({ to: `/posts/${newPost.id}` })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        required
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Content"
      />
      <button type="submit">Create Post</button>
    </form>
  )
}

// src/routes/posts/$postId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/server/db'

export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    const post = await db.posts.findUnique(params.postId)
    if (!post) throw new Error('Post not found')
    return { post }
  },
  errorComponent: () => <div>Post not found</div>,
  component: PostDetail,
})

function PostDetail() {
  const { post } = Route.useLoaderData()

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  )
}
```

---

## Unresolved Questions

1. **Real-time subscriptions**: How to implement WebSocket/real-time updates?
2. **Batch operations**: How to optimize multiple server function calls?
3. **Middleware ordering**: What's the execution order for multiple middlewares?
4. **Cache invalidation**: Best practices for invalidating cached server function results?
5. **Large file uploads**: Streaming uploads and progress tracking patterns?
6. **Multi-region deployment**: How to handle data residency requirements?

---

## Verdict: ACTIONABLE

TanStack Start is production-ready with:
- ✓ Clear documentation for core concepts
- ✓ Comprehensive API surface with examples
- ✓ Multiple deployment options (Netlify, Cloudflare, Vercel)
- ✓ Strong TypeScript support
- ✓ Active development (v1 released 2025)
- ✓ Growing ecosystem (auth integrations, templates)

**Recommendation**: Suitable for new full-stack React projects, especially those requiring:
- Fine-grained control over code boundaries
- Streaming SSR and progressive enhancement
- Universal deployment flexibility
- Type-safe client-server communication

---

## Knowledge Artifacts

**Generated**: 2025-03-15
**Report Path**: `/reports/research-tanstack-start-2025-03-15.md`
**Status**: Ready for team reference and decision-making
