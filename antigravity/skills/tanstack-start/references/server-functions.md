# TanStack Start — Server Functions

## The Execution Model

All code in TanStack Start is **isomorphic by default** — it runs in both client and server bundles. To constrain code to one environment:

| API | Runs | Use for |
|-----|------|---------|
| Regular function | Both (isomorphic) | Shared logic, utilities |
| `createServerFn` | Server only (proxied as HTTP) | DB access, secrets, mutations |
| `createServerOnlyFn` | Server only (crashes on client) | Imports that can't run in browser |
| `createClientOnlyFn` | Client only (crashes on server) | `window`, browser APIs |
| `createIsomorphicFn(client, server)` | Respective environments | Different impl per env |

**Critical**: `loader` functions run on **both** server and client. Never put secrets or direct DB calls in a loader. Use `createServerFn` instead.

## createServerFn — Basic Pattern

```ts
// src/routes/posts/mutations.functions.ts
import { createServerFn } from '@tanstack/react-start'

// GET (default)
export const getPost = createServerFn(async (postId: string) => {
  return db.posts.findUnique({ where: { id: postId } })
})

// POST
export const deletePost = createServerFn(
  { method: 'POST' } as const,
  async (postId: string) => {
    await db.posts.delete({ where: { id: postId } })
    return { success: true }
  }
)
```

Calling a server function from a component compiles to an HTTP request automatically. The return value is fully typed.

## With Input Validation (Zod)

```ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const createPost = createServerFn(
  { method: 'POST' } as const,
  async (data) => {
    const post = await db.posts.create({ data })
    return post
  }
).inputValidator(() =>
  z.object({
    title: z.string().min(1, 'Title required'),
    content: z.string(),
    published: z.boolean().default(false),
  })
)
```

Validation runs on both client (early feedback) and server (security).

## Calling Server Functions from Components

```tsx
import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { createPost } from './mutations.functions'

function CreatePostForm() {
  const [title, setTitle] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const post = await createPost({ title, content: '' })
    // Invalidate all loaders so lists refresh
    router.invalidate()
    // Navigate to the new post
    navigate({ to: '/posts/$postId', params: { postId: post.id } })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={title} onChange={e => setTitle(e.target.value)} required />
      <button type="submit">Create</button>
    </form>
  )
}
```

## Server-Only Functions (no network proxy)

Use `createServerOnlyFn` when you have code that simply cannot run in a browser (e.g., Node.js APIs, heavy server deps):

```ts
import { createServerOnlyFn } from '@tanstack/react-start'

// This will throw an error if accidentally called on client
export const sendEmail = createServerOnlyFn(async (to: string, body: string) => {
  await nodemailer.sendMail({ to, text: body })
})
```

## Isomorphic Functions (different logic per env)

```ts
import { createIsomorphicFn } from '@tanstack/react-start'

export const log = createIsomorphicFn(
  // Client
  (msg: string) => console.log('[browser]', msg),
  // Server
  async (msg: string) => {
    await db.logs.create({ data: { message: msg, source: 'server' } })
  }
)
```

## File Naming Conventions

- `*.functions.ts` — Server functions (safe to import anywhere; the build handles splitting)
- `*.server.ts` — Server-only utilities that should never reach the client bundle

```
src/routes/posts/
├── index.tsx
├── $postId.tsx
├── mutations.functions.ts   ← server functions (importable everywhere)
└── helpers.server.ts        ← server-only code (direct DB, secrets)
```

## Error Handling in Server Functions

```ts
export const getPost = createServerFn(async (postId: string) => {
  const post = await db.posts.findUnique({ where: { id: postId } })
  if (!post) {
    // Throwing in a server function propagates to the caller
    throw new Error(`Post ${postId} not found`)
  }
  return post
})

// In the component:
try {
  const post = await getPost(postId)
} catch (error) {
  // Handle gracefully
  setError((error as Error).message)
}
```

## Static Server Functions (build-time caching)

For content that doesn't change between deploys:

```ts
import { staticFunctionMiddleware } from '@tanstack/react-start/server'

export const getSiteConfig = staticFunctionMiddleware(
  createServerFn(async () => {
    return db.config.findFirst()
  })
)
```

The result is cached at build time and served as a static asset.
