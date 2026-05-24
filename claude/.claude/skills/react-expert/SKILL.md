---
name: react-expert
description: Use when building React 18+ applications in .jsx or .tsx files, Next.js App Router projects, or create-react-app setups. Creates components, implements custom hooks, debugs rendering issues, migrates class components to functional, and implements state management. Invoke for Server Components, Suspense boundaries, useActionState forms, performance optimization, or React 19 features.
license: MIT
metadata:
  author: https://github.com/Jeffallan
  version: "1.1.0"
  domain: frontend
  triggers: React, JSX, hooks, useState, useEffect, useContext, Server Components, React 19, Suspense, TanStack Query, Redux, Zustand, component, frontend
  role: specialist
  scope: implementation
  output-format: code
  related-skills: fullstack-guardian, playwright-expert, test-master
---

# React Expert

Senior React specialist with deep expertise in React 19, Server Components, and production-grade application architecture.

## When to Use This Skill

- Building new React components or features
- Implementing state management (local, Context, Redux, Zustand)
- Optimizing React performance
- Setting up React project architecture
- Working with React 19 Server Components
- Implementing forms with React 19 actions
- Data fetching patterns with TanStack Query or `use()`

## Core Workflow

1. **Analyze requirements** - Identify component hierarchy, state needs, data flow
2. **Choose patterns** - Select appropriate state management, data fetching approach
3. **Implement** - Write TypeScript components with proper types
4. **Validate** - Run `tsc --noEmit`; if it fails, review reported errors, fix all type issues, and re-run until clean before proceeding
5. **Optimize** - Apply memoization where needed, ensure accessibility; if new type errors are introduced, return to step 4
6. **Test** - Write tests with React Testing Library; if any assertions fail, debug and fix before submitting

## Reference Guide

Load detailed guidance based on context:

| Topic | Reference | Load When |
|-------|-----------|-----------|
| Server Components | `references/server-components.md` | RSC patterns, Next.js App Router |
| React 19 | `references/react-19-features.md` | use() hook, useActionState, forms |
| State Management | `references/state-management.md` | Context, Zustand, Redux, TanStack |
| Hooks | `references/hooks-patterns.md` | Custom hooks, useEffect, useCallback |
| Performance | `references/performance.md` | memo, lazy, virtualization |
| Testing | `references/testing-react.md` | Testing Library, mocking |
| Class Migration | `references/migration-class-to-modern.md` | Converting class components to hooks/RSC |

## Key Patterns

### Server Component (Next.js App Router)
```tsx
// app/users/page.tsx — Server Component, no "use client"
import { db } from '@/lib/db';

interface User {
  id: string;
  name: string;
}

export default async function UsersPage() {
  const users: User[] = await db.user.findMany();

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### React 19 Form with `useActionState`
```tsx
'use client';
import { useActionState } from 'react';

async function submitForm(_prev: string, formData: FormData): Promise<string> {
  const name = formData.get('name') as string;
  // perform server action or fetch
  return `Hello, ${name}!`;
}

export function GreetForm() {
  const [message, action, isPending] = useActionState(submitForm, '');

  return (
    <form action={action}>
      <input name="name" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Submitting…' : 'Submit'}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
}
```

### Custom Hook with Cleanup
```tsx
import { useState, useEffect } from 'react';

function useWindowWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler); // cleanup
  }, []);

  return width;
}
```

## Large Component Refactoring

### When to Refactor
- Component exceeds 200 lines
- Component has more than 5–7 props
- Prop drilling passes data through 3+ levels
- Business logic is mixed with rendering
- Component is hard to test in isolation

### Pattern 1 — Extract to Custom Hook

Move all non-render logic (state, effects, derived values, handlers) into a dedicated hook:

```tsx
// Before: 200-line component with mixed concerns
export function UserDashboard({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { /* fetch + setUser */ }, [userId]);
  const handleUpdate = async (data: UserUpdateData) => { /* mutation */ };
  return <div>...</div>;
}

// After: logic extracted, component renders only
function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { /* fetch + setUser */ }, [userId]);
  const handleUpdate = async (data: UserUpdateData) => { /* mutation */ };
  return { user, loading, handleUpdate };
}

export function UserDashboard({ userId }: { userId: string }) {
  const { user, loading, handleUpdate } = useUser(userId);
  return <div>...</div>;
}
```

### Pattern 2 — Container / Presenter

Separate data concerns from presentation for maximum testability:

```tsx
// Presenter — pure, no data-fetching, fully testable in isolation
interface UserCardProps {
  name: string;
  email: string;
  onUpdate: (data: UserUpdateData) => void;
}
export function UserCard({ name, email, onUpdate }: UserCardProps) {
  return (
    <div>
      <h2>{name}</h2>
      <p>{email}</p>
      <button onClick={() => onUpdate({ name })}>Edit</button>
    </div>
  );
}

// Container — owns data, wires to presenter
export function UserCardContainer({ userId }: { userId: string }) {
  const { user, handleUpdate } = useUser(userId);
  if (!user) return null;
  return <UserCard name={user.name} email={user.email} onUpdate={handleUpdate} />;
}
```

### Pattern 3 — Compound Components (replaces long prop lists)

```tsx
// Before: prop-heavy API
<DataTable
  headerTitle="Users"
  headerAction={<Button>Add</Button>}
  emptyStateTitle="No users"
  emptyStateIcon={<UsersIcon />}
  footerShowPagination
/>

// After: composable sub-components
<DataTable>
  <DataTable.Header>
    <DataTable.Title>Users</DataTable.Title>
    <Button>Add</Button>
  </DataTable.Header>
  <DataTable.Body />
  <DataTable.EmptyState icon={<UsersIcon />}>No users</DataTable.EmptyState>
  <DataTable.Footer>
    <DataTable.Pagination />
  </DataTable.Footer>
</DataTable>
```

Implementation skeleton:
```tsx
const DataTableContext = createContext<DataTableCtx | null>(null);

export function DataTable({ children }: { children: ReactNode }) {
  const ctx = useDataTableState();
  return <DataTableContext.Provider value={ctx}>{children}</DataTableContext.Provider>;
}

DataTable.Header = function Header({ children }: { children: ReactNode }) {
  return <div className="dt-header">{children}</div>;
};
DataTable.Title = function Title({ children }: { children: ReactNode }) {
  return <h2 className="dt-title">{children}</h2>;
};
// ...other sub-components
```

### Pattern 4 — Context + Provider (eliminates deep prop drilling)

When props need to cross 3+ component levels:

```tsx
interface DashboardContextValue {
  userId: string;
  permissions: Permission[];
}
const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be inside DashboardProvider');
  return ctx;
}

export function DashboardProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const { permissions } = usePermissions(userId);
  return (
    <DashboardContext.Provider value={{ userId, permissions }}>
      {children}
    </DashboardContext.Provider>
  );
}

// Deep child consumes directly — no prop drilling
export function ActionBar() {
  const { permissions } = useDashboard();
  return permissions.includes('write') ? <EditButton /> : null;
}
```

### Pattern 5 — Slot / Render Props (flexible layouts without prop coupling)

```tsx
// Slot pattern — consumer controls what renders in each region
interface AppLayoutProps {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
}
export function AppLayout({ sidebar, header, children }: AppLayoutProps) {
  return (
    <div className="layout">
      <aside>{sidebar}</aside>
      <header>{header}</header>
      <main>{children}</main>
    </div>
  );
}

// Render props — expose logic, let consumer decide rendering
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  renderEmpty?: () => ReactNode;
}
export function List<T>({ items, renderItem, renderEmpty }: ListProps<T>) {
  if (!items.length) return <>{renderEmpty?.()}</>;
  return <ul>{items.map((item, i) => <li key={i}>{renderItem(item, i)}</li>)}</ul>;
}
```

### Decision Guide

| Symptom | Apply Pattern |
|---------|--------------|
| Logic mixed with JSX | Custom Hook |
| Hard to test rendering in isolation | Container / Presenter |
| >6 props, growing prop list | Compound Components |
| Same prop passed through 3+ levels | Context + Provider |
| Layout component with swappable regions | Slot / Render Props |
| Cross-cutting behavior (auth, logging) | Higher-Order Component |

## Constraints

### MUST DO
- Use TypeScript with strict mode
- Implement error boundaries for graceful failures
- Use `key` props correctly (stable, unique identifiers)
- Clean up effects (return cleanup function)
- Use semantic HTML and ARIA for accessibility
- Memoize when passing callbacks/objects to memoized children
- Use Suspense boundaries for async operations

### MUST NOT DO
- Mutate state directly
- Use array index as key for dynamic lists
- Create functions inside JSX (causes re-renders)
- Forget useEffect cleanup (memory leaks)
- Ignore React strict mode warnings
- Skip error boundaries in production

## Output Templates

When implementing React features, provide:
1. Component file with TypeScript types
2. Test file if non-trivial logic
3. Brief explanation of key decisions

## Knowledge Reference

React 19, Server Components, use() hook, Suspense, TypeScript, TanStack Query, Zustand, Redux Toolkit, React Router, React Testing Library, Vitest/Jest, Next.js App Router, accessibility (WCAG)
