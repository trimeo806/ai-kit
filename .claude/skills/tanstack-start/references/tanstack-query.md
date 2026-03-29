# TanStack Start — TanStack Query Integration

TanStack Query (`@tanstack/react-query`) pairs with TanStack Start for client-side caching, background refetching, and optimistic updates — complementing route loaders which handle SSR data.

## Install

```bash
npm install @tanstack/react-query
```

## QueryClient Setup in `__root.tsx`

```tsx
import { createRootRouteWithContext } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Outlet } from '@tanstack/react-router'
import { HeadContent, Scripts } from '@tanstack/react-start'

// Create once, pass via router context so loaders can prefetch
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000 },
  },
})

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
})

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <html>
        <head><HeadContent /></head>
        <body>
          <Outlet />
          <Scripts />
        </body>
      </html>
    </QueryClientProvider>
  )
}
```

Register the context type in `router.tsx`:

```ts
import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'

const queryClient = new QueryClient()

export const router = createRouter({
  routeTree,
  context: { queryClient },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
    context: { queryClient: QueryClient }
  }
}
```

## queryOptions Helper (canonical pattern)

Define query options once and share between loaders and components:

```ts
// src/queries/posts.ts
import { queryOptions } from '@tanstack/react-query'
import { getPosts, getPost } from '~/routes/posts/posts.functions'

export const postsQueryOptions = () =>
  queryOptions({
    queryKey: ['posts'],
    queryFn: () => getPosts(),
  })

export const postQueryOptions = (postId: string) =>
  queryOptions({
    queryKey: ['posts', postId],
    queryFn: () => getPost({ data: postId }),
  })
```

## Prefetch in Loader → Read in Component (SSR + Client cache sync)

Prefetching in the loader ensures SSR and client share the same cache entry — no waterfall, no double-fetch:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { postsQueryOptions } from '~/queries/posts'

export const Route = createFileRoute('/posts')({
  loader: async ({ context }) => {
    // Prefetch: populates the QueryClient cache during SSR
    await context.queryClient.ensureQueryData(postsQueryOptions())
  },
  component: PostsPage,
})

function PostsPage() {
  // Reads from cache immediately (no loading state on first render)
  // Revalidates in background based on staleTime
  const { data: posts, isLoading } = useQuery(postsQueryOptions())

  if (isLoading) return <div>Loading...</div>
  return <ul>{posts?.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
```

Use `prefetchQuery` instead of `ensureQueryData` when you don't need to block the loader on the result (fire-and-forget prefetch).

## useMutation with Server Functions

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPost } from '~/routes/posts/posts.functions'

function CreatePostForm() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: { title: string; content: string }) =>
      createPost({ data }),
    onSuccess: () => {
      // Invalidate cache so list re-fetches
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        mutation.mutate({
          title: fd.get('title') as string,
          content: fd.get('content') as string,
        })
      }}
    >
      <input name="title" />
      <textarea name="content" />
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Create'}
      </button>
      {mutation.isError && <p>Error: {mutation.error.message}</p>}
    </form>
  )
}
```

## Optimistic Updates

```tsx
const mutation = useMutation({
  mutationFn: (update: { id: string; title: string }) =>
    updatePost({ data: update }),
  onMutate: async (update) => {
    await queryClient.cancelQueries({ queryKey: ['posts', update.id] })
    const previous = queryClient.getQueryData(postQueryOptions(update.id).queryKey)
    // Optimistically update cache
    queryClient.setQueryData(postQueryOptions(update.id).queryKey, (old) => ({
      ...old,
      ...update,
    }))
    return { previous }
  },
  onError: (_err, update, context) => {
    // Roll back on error
    queryClient.setQueryData(
      postQueryOptions(update.id).queryKey,
      context?.previous,
    )
  },
  onSettled: (_data, _err, update) => {
    queryClient.invalidateQueries({ queryKey: ['posts', update.id] })
  },
})
```

## loader vs useQuery — When to Use Which

| Scenario | Use |
|----------|-----|
| Data required for initial SSR render | `loader` (blocks navigation until ready) |
| Data needed for SEO / social meta tags | `loader` |
| Background refetch / polling | `useQuery` |
| User-triggered dynamic queries (search, filters) | `useQuery` |
| Mutations and optimistic UI | `useMutation` |
| Data shared across components without prop drilling | `useQuery` with shared `queryOptions` |
| Auth-gated redirects | `beforeLoad` (not Query) |

**Best of both**: prefetch in `loader` → read with `useQuery` in component. This gives SSR on first load and automatic background sync afterwards.

## Query Invalidation vs router.invalidate()

| Method | Effect |
|--------|--------|
| `queryClient.invalidateQueries(...)` | Marks specific Query cache entries stale, triggers background refetch for active subscribers |
| `router.invalidate()` | Re-runs all active TanStack Router loaders (good when you DON'T use Query in the component) |

When using Query for data, prefer `queryClient.invalidateQueries` over `router.invalidate()` — it's more targeted and won't unnecessarily re-run loaders.

## TypeScript — Inferring Types from Server Functions

Server function return types flow through automatically:

```ts
// posts.functions.ts
export const getPosts = createServerFn(async () => {
  return db.posts.findMany() // Prisma infers the return type
})

// queries/posts.ts
import { queryOptions } from '@tanstack/react-query'
import { getPosts } from '~/routes/posts/posts.functions'

export const postsQueryOptions = () =>
  queryOptions({
    queryKey: ['posts'],
    queryFn: getPosts,
    // Return type is automatically: Awaited<ReturnType<typeof getPosts>>
  })
```

In components, `data` is fully typed — no manual type annotation needed.
