# TanStack Start — Authentication

## Overview

TanStack Start has no built-in auth — but the router context system makes auth integration clean. The pattern: load the session once in root `beforeLoad`, inject it into context, then every route can read `context.user` in its own `beforeLoad`.

Supported integrations: Better Auth, Clerk, Auth.js, Supabase, WorkOS.

## Core Pattern: Context-Based Auth

### Step 1 — Declare context shape

```ts
// src/router.tsx
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import type { User } from '~/server/auth'

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
    context: {
      user: User | null
    }
  }
}
```

### Step 2 — Load session in root beforeLoad

```tsx
// src/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { HeadContent, Scripts } from '@tanstack/react-start'
import { getSession } from '~/server/auth.functions'

export const Route = createRootRoute({
  beforeLoad: async () => {
    const user = await getSession()
    return { user }
  },
  component: RootLayout,
})
```

### Step 3 — Guard protected routes

```tsx
// src/routes/dashboard.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
  },
  loader: async ({ context }) => {
    return { data: await fetchDashboardData(context.user!.id) }
  },
  component: Dashboard,
})
```

## Session Server Function

The session fetch must be a server function since it accesses cookies/secrets:

```ts
// src/server/auth.functions.ts
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

export const getSession = createServerFn(async () => {
  const headers = getRequestHeaders()
  const sessionId = parseCookie(headers.cookie, 'session')
  if (!sessionId) return null
  return db.sessions.findUnique({ where: { id: sessionId } })
})
```

## Login / Logout Actions

```ts
// src/server/auth.functions.ts
import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'

export const login = createServerFn(
  { method: 'POST' } as const,
  async (creds: { email: string; password: string }) => {
    const user = await db.users.findUnique({ where: { email: creds.email } })
    if (!user || !await verifyPassword(creds.password, user.passwordHash)) {
      throw new Error('Invalid credentials')
    }
    const session = await db.sessions.create({ data: { userId: user.id } })
    setResponseHeader('Set-Cookie', `session=${session.id}; HttpOnly; Secure; SameSite=Strict; Path=/`)
    return { userId: user.id }
  }
)

export const logout = createServerFn({ method: 'POST' } as const, async () => {
  setResponseHeader('Set-Cookie', 'session=; HttpOnly; Max-Age=0; Path=/')
  return { success: true }
})
```

## Login Page

```tsx
// src/routes/login.tsx
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { login } from '~/server/auth.functions'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    // Redirect already-logged-in users
    if (context.user) throw redirect({ to: '/dashboard' })
  },
  component: LoginPage,
})

function LoginPage() {
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    try {
      await login({
        email: form.get('email') as string,
        password: form.get('password') as string,
      })
      router.invalidate()  // Re-run root beforeLoad to pick up new session
      // Navigate after invalidation
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit">Log in</button>
    </form>
  )
}
```

## Role-Based Access

```tsx
export const Route = createFileRoute('/admin/$section')({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: '/login' })
    if (!context.user.roles.includes('admin')) throw redirect({ to: '/forbidden' })
  },
})
```

## Better Auth Integration

Better Auth is the recommended third-party library for TanStack Start:

```ts
// src/server/auth.ts
import { betterAuth } from 'better-auth'

export const auth = betterAuth({
  database: { dialect: 'sqlite', db: sqliteDb },
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: { clientId: process.env.GITHUB_ID!, clientSecret: process.env.GITHUB_SECRET! },
  },
})

// src/server/auth.functions.ts
export const getSession = createServerFn(async () => {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
  })
  return session?.user ?? null
})
```

## Clerk Integration

```ts
// src/server/auth.functions.ts
import { getAuth } from '@clerk/tanstack-react-start/server'
import { getWebRequest } from '@tanstack/react-start/server'

export const getSession = createServerFn(async () => {
  const request = getWebRequest()
  const { userId } = await getAuth(request)
  if (!userId) return null
  return { userId }
})
```
