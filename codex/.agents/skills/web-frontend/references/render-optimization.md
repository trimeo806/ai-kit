# Render Optimization

Rules absorbed from Vercel react-best-practices, adapted for React 18 + TypeScript projects.

## React.memo for Expensive Components

Extract expensive child components into `React.memo()`:

```typescript
// Dashboard — table rows re-render on every parent state change
const DataRow = React.memo(({ item }: { item: ItemData }) => {
  return (
    <tr>
      <td>{item.name}</td>
      <td>{item.status}</td>
      <td>{formatDate(item.createdAt)}</td>
    </tr>
  );
});
DataRow.displayName = 'DataRow';
```

Use when: List items in large lists, table rows, sidebar menu items.

## Derived State — Subscribe to Booleans, Not Objects

```typescript
// GOOD — only re-renders when the boolean changes
const isActiveItem = useAppSelector(
  state => state.selectedItemReducer.selectedItem.status === 'Active'
);

// BAD — re-renders on ANY field change in selectedItem
const item = useAppSelector(state => state.selectedItemReducer.selectedItem);
const isActiveItem = item.status === 'Active';
```

## No Derived State in useEffect

Derive state during render, not in effects:

```typescript
// GOOD — computed during render
const filteredItems = useMemo(
  () => items.filter(i => i.category === selectedCategory),
  [items, selectedCategory]
);

// BAD — useEffect to derive state creates extra render cycle
const [filteredItems, setFilteredItems] = useState([]);
useEffect(() => {
  setFilteredItems(items.filter(i => i.category === selectedCategory));
}, [items, selectedCategory]);
```

## Functional setState

Use `setState(prev => ...)` for stable dispatch callbacks:

```typescript
// GOOD — functional update, no stale closure
const handleToggle = useCallback(() => {
  setExpanded(prev => !prev);
}, []);

// BAD — stale closure risk if expanded changes between renders
const handleToggle = () => setExpanded(!expanded);
```

## Lazy State Initialization

Pass a function to `useState` for expensive initial values:

```typescript
// GOOD — factory function called once
const [config] = useState(() => parseComplexConfig(rawConfig));

// BAD — parseComplexConfig runs on every render (result discarded after first)
const [config] = useState(parseComplexConfig(rawConfig));
```

## startTransition for Non-Urgent Updates

Use `startTransition` for updates that can be interrupted:

```typescript
import { startTransition } from 'react';

const handleSearch = (query: string) => {
  // Urgent — update input immediately
  setSearchQuery(query);

  // Non-urgent — filter large list can wait
  startTransition(() => {
    setFilteredItems(items.filter(i => matchesQuery(i, query)));
  });
};
```

Use for: Filtering large lists, search results, table filtering.

## useMemo and useCallback Guidelines

| Use | When |
|-----|------|
| `useMemo` | Expensive computation (filtering/sorting large arrays, complex transformations) |
| `useCallback` | Callback passed to memoized child or used in dependency arrays |
| Neither | Simple computations, callbacks in non-memoized components |

Do NOT blindly wrap everything — only memoize when there's a measurable benefit.
