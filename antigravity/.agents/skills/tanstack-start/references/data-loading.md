# TanStack Start — Data Loading

## loader vs beforeLoad

| Hook | Runs | Purpose |
|------|------|---------|
| `beforeLoad` | Before data fetch | Auth checks, redirects, context injection |
| `loader` | After `beforeLoad` passes | Fetch data for the page |

Both run server-side during SSR and client-side during navigation. The execution is sequential: `beforeLoad` → `loader` → `component`.

## Basic Loader

```tsx
export const Route = createFileRoute('/posts')({
  loader: async () => {
    const posts = await fetch('/api/posts').then(r => r.json())
    return { posts }
  },
  component: PostsPage,
})

function PostsPage() {
  const { posts } = Route.useLoaderData()
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
```

Loader return type is **automatically inferred** — `useLoaderData()` is fully typed.

## beforeLoad — Auth Guard + Context

```tsx
import { redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ context }) => {
    // context.user comes from root beforeLoad
    if (!context.user) {
      throw redirect({ to: '/login', search: { returnTo: '/dashboard' } })
    }
    // Anything returned is merged into context for this route's subtree
    return { permissions: await fetchPermissions(context.user.id) }
  },
  loader: async ({ context }) => {
    // context.permissions is now available here
    return { stats: await fetchDashboardStats(context.user.id) }
  },
  component: Dashboard,
})
```

## Root Context (shared auth across all routes)

```tsx
// src/routes/__root.tsx
export const Route = createRootRoute({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    return { user }
  },
  component: RootLayout,
})

// src/router.tsx
declare module '@tanstack/react-router' {
  interface Register {
    context: {
      user: User | null
    }
  }
}
```

Every child route can access `context.user` in both `beforeLoad` and `loader`.

## Loading State

```tsx
export const Route = createFileRoute('/posts')({
  loader: async () => fetchPosts(),
  // Shown during initial load
  pendingComponent: () => <div>Loading posts...</div>,
  // Minimum time to show pending (prevents flash)
  pendingMinMs: 300,
  component: PostsPage,
})
```

## Error Boundary

```tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    const post = await getPost(params.postId)
    if (!post) throw new Error('Post not found')
    return { post }
  },
  errorComponent: ({ error, reset }) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  ),
  component: PostDetail,
})
```

## Deferred / Streaming Data

For slow data that shouldn't block the initial render:

```tsx
export const Route = createFileRoute('/dashboard')({
  loader: async ({ context }) => {
    // Fast data — awaited immediately
    const user = await fetchUser(context.user.id)

    // Slow data — not awaited, streamed after HTML is sent
    const analyticsPromise = fetchHeavyAnalytics(context.user.id)

    return { user, analyticsPromise }
  },
  component: Dashboard,
})

function Dashboard() {
  const { user, analyticsPromise } = Route.useLoaderData()

  return (
    <div>
      <UserHeader user={user} />
      {/* Suspense boundary for the deferred data */}
      <Suspense fallback={<AnalyticsSkeleton />}>
        <Await promise={analyticsPromise}>
          {(analytics) => <AnalyticsPanel data={analytics} />}
        </Await>
      </Suspense>
    </div>
  )
}
```

## Loader with Server Function (for secure data)

When the loader needs to access secrets or DB directly, delegate to a server function:

```ts
// queries.functions.ts
export const getSecureData = createServerFn(async (userId: string) => {
  return db.sensitiveData.findMany({ where: { userId } })
})
```

```tsx
// route file
export const Route = createFileRoute('/profile')({
  loader: async ({ context }) => {
    // Safe: delegates to server function, never exposes DB to client
    const data = await getSecureData(context.user.id)
    return { data }
  },
  component: Profile,
})
```

## Invalidating Loaders After Mutations

After a mutation (create/update/delete), call `router.invalidate()` to re-run all active loaders:

```tsx
function DeleteButton({ postId }: { postId: string }) {
  const router = useRouter()

  const handleDelete = async () => {
    await deletePost(postId)
    router.invalidate() // Refreshes all active loaders
  }

  return <button onClick={handleDelete}>Delete</button>
}
```

## Selective SSR

Fine-grained control over what runs server-side:

```tsx
export const Route = createFileRoute('/interactive-widget')({
  ssr: 'data-only', // Only beforeLoad/loader run on server; component renders client-only
  component: InteractiveWidget,
})
```

Options: `true` (default, full SSR), `false` (no SSR), `'data-only'` (data but no component render).
