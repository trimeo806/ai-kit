---
name: tanstack-start
description: "Use when building full-stack React applications with TanStack Start — file-based routing, server functions, SSR, or type-safe client-server integration. Invoke whenever the user mentions TanStack Start, TanStack Router, createServerFn, createFileRoute, createRootRoute, or wants to scaffold a new TanStack Start project from scratch. Also trigger for questions about data loading with loaders, beforeLoad hooks, streaming SSR, or deploying TanStack Start to Netlify, Cloudflare, or Vercel."
license: MIT
metadata:
  version: "1.0.0"
  domain: frontend
  triggers: TanStack Start, TanStack Router, createFileRoute, createRootRoute, createServerFn, file-based routing, tanstack, fullstack react, vite ssr, useQuery, useMutation, @tanstack/react-query, TanStack Query
  role: specialist
  scope: implementation
  output-format: code
  platforms: [web]
  related-skills: react-expert, typescript-pro, fullstack-guardian
---

# TanStack Start Developer

Senior TanStack Start specialist for building full-stack React apps with type-safe routing, server functions, and streaming SSR.

TanStack Start = **TanStack Router + SSR + Server Functions + Vite (Vinxi dual-bundle)**. The key insight: server functions eliminate the traditional API layer — you call them directly from components, and the build system transforms them into secure HTTP calls automatically.

## Core Workflow

1. **Scaffold** — Init project, install deps, configure Vite plugin
2. **Route tree** — Define `__root.tsx` layout, then page routes with `createFileRoute`
3. **Data loading** — Add `loader` and `beforeLoad` to routes; use `createServerFn` for server-only ops
4. **Mutations** — Write server functions in `*.functions.ts` files, call them from components
5. **Auth** — Set up context in root `beforeLoad`, guard routes with `beforeLoad` redirect
6. **Deploy** — Add platform adapter plugin (Netlify/Cloudflare/Vercel)
7. **Validate** — `tsc --noEmit` must pass; loaders return correct shape; no secrets in loaders

## Reference Guide

Load detailed guidance based on context:

| Topic | Reference | Load When |
|-------|-----------|-----------|
| File-based routing | `references/routing.md` | Route setup, layouts, nested routes, catch-all |
| Server functions | `references/server-functions.md` | `createServerFn`, validation, execution model |
| Data loading | `references/data-loading.md` | Loaders, `beforeLoad`, streaming, deferred data |
| Authentication | `references/auth.md` | Context-based auth, protected routes, sessions |
| Deployment | `references/deployment.md` | Netlify, Cloudflare, Vercel, Node.js adapters |
| TanStack Query | `references/tanstack-query.md` | `useQuery`, `useMutation`, client-side caching, SSR prefetch |

## Project Setup

```bash
npm create tanstack@latest
# or from scratch:
npm install @tanstack/react-start @tanstack/react-router vinxi vite @vitejs/plugin-react
```

**`vite.config.ts`** (plugin order matters):
```ts
import { defineConfig } from 'vite'
import tanstackStart from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tanstackStart(),   // MUST come before viteReact
    viteReact(),
  ],
})
```

**`tsconfig.json`**:
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "moduleResolution": "Bundler",
    "module": "ESNext",
    "target": "ES2022",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "paths": { "~/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

## Standard Project Structure

```
src/
├── routes/
│   ├── __root.tsx          # Root layout (required)
│   ├── index.tsx           # Home page /
│   ├── about.tsx           # /about
│   └── posts/
│       ├── index.tsx           # /posts
│       ├── $postId.tsx         # /posts/:postId
│       ├── mutations.functions.ts  # Server functions
│       └── components/
├── server/
│   ├── db.ts               # Database client (server-only)
│   └── auth.ts             # Auth helpers
├── components/             # Shared UI
├── lib/                    # Shared utilities
├── router.tsx              # Router config + type registration
└── entry.client.tsx        # Client entry point
```

## Key Patterns

### Root Layout (`src/routes/__root.tsx`)
```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { HeadContent, Scripts } from '@tanstack/react-start'

export const Route = createRootRoute({
  head: () => ({
    meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  }),
  component: () => (
    <html>
      <head><HeadContent /></head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
})
```

### Page Route (`src/routes/posts/$postId.tsx`)
```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    const post = await fetchPost(params.postId)
    if (!post) throw new Error('Post not found')
    return { post }
  },
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
  component: PostDetail,
})

function PostDetail() {
  const { post } = Route.useLoaderData()
  return <article><h1>{post.title}</h1></article>
}
```

### Server Function (`src/routes/posts/mutations.functions.ts`)
```tsx
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const createPost = createServerFn({ method: 'POST' } as const, async (data) => {
  return db.posts.create(data)
}).inputValidator(() => z.object({ title: z.string().min(1), content: z.string() }))
```

### Router Config (`src/router.tsx`)
```ts
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
```

## Critical Rules

**Security:**
- Never put secrets or direct DB calls in `loader` — loaders are isomorphic (run client-side too). Use `createServerFn` for sensitive operations.
- Always validate server function inputs with Zod or similar.
- Guard protected routes in `beforeLoad`, not in the component render.

**TypeScript:**
- `routeTree.gen.ts` is auto-generated; never edit it manually.
- Use `Route.useLoaderData()`, `Route.useParams()`, `Route.useRouteContext()` — these are fully typed per-route.
- Register the router type globally in `router.tsx` via `declare module '@tanstack/react-router'`.

**Build:**
- `tanstackStart()` plugin must come before `viteReact()` in `vite.config.ts`.
- File-naming conventions: `__root.tsx` for root, `$param.tsx` for dynamic segments, `$.tsx` for catch-all.

## Output Template

When implementing a TanStack Start feature, deliver:
1. **Files to create/modify** with full paths
2. **Route files** with proper `createFileRoute` / `createRootRoute` exports
3. **Server functions** in separate `.functions.ts` files
4. **Type registrations** if adding router context
5. Brief note on any security or execution-model decisions

## Knowledge Reference

TanStack Start v1, TanStack Router, createServerFn, createFileRoute, createRootRoute, Vite/Vinxi, streaming SSR, beforeLoad, loader, createServerOnlyFn, isomorphic execution, Zod validation, Better Auth, Clerk, Netlify/Cloudflare/Vercel adapters
