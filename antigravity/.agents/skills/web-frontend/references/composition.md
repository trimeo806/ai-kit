# Composition Patterns

Rules absorbed from Vercel composition-patterns, adapted for React 18 + TypeScript projects.

## Compound Components

Uses the compound component pattern extensively:

```typescript
// Dialog compound pattern — Dialog.Root > Dialog.Trigger > Dialog.Content
<Dialog>
  <Dialog.Trigger><Button label="Open" /></Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header title="Confirm action" />
    <Dialog.Body>Are you sure?</Dialog.Body>
    <Dialog.Footer>
      <Button label="Cancel" styling="secondary" onClick={onClose} />
      <Button label="Confirm" styling="primary" onClick={onConfirm} />
    </Dialog.Footer>
  </Dialog.Content>
</Dialog>
```

Follow this pattern for new composite components. See your UI library's component source for examples.

## State Decoupling

Separate hook logic from UI rendering:

```typescript
// Hook returns data + actions
export const useMenuBuilder = () => {
  const buildMenuItems = async (authToken: string, ...): Promise<IMenuItem[]> => {
    const featureFlags = await getFeatureFlagStatuses(...);
    // ...build menu from config + feature flags
    return menuItems;
  };
  const getFirstMenuLink = (menuItems: IMenuItem[]): string | undefined => { ... };
  return { buildMenuItems, getFirstMenuLink };
};

// Component only renders — no business logic
function Sidebar({ menuItems }: { menuItems: IMenuItem[] }) {
  return <nav>{menuItems.map(item => <MenuItem key={item.id} {...item} />)}</nav>;
}
```

## Context Interface Pattern

Define context interface separately from provider:

```typescript
// Interface defined clearly
interface ServiceClientContextValue {
  client: ServiceClient;
  isReady: boolean;
  connectionState: ConnectionState;
}

// Provider wraps the value
const ServiceClientContext = createContext<ServiceClientContextValue | null>(null);
export const ServiceClientProvider = ServiceClientContext.Provider;

// Consumer hook with guard
export function useServiceClient(): ServiceClientContextValue {
  const ctx = useContext(ServiceClientContext);
  if (!ctx) throw new Error('useServiceClient must be used within ServiceClientProvider');
  return ctx;
}
```

## State Lifting

When multiple components need the same state, lift it to their nearest common ancestor:

```typescript
// Parent owns the state
function ListLayout() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  return (
    <>
      <CategoryList selected={selectedCategory} onSelect={setSelectedCategory} />
      <ItemList category={selectedCategory} />
    </>
  );
}
```

Use context lifting for shared client-side state that spans multiple components.

## Explicit Variants over Boolean Props

Enforced with `cva()` (class-variance-authority):

```typescript
// GOOD — explicit, self-documenting
<Button styling="primary" size="m" radius="rounded" />
<Badge styling="success" size="s" />

// BAD — ambiguous boolean soup
<Button primary large rounded />
```

## Children over Render Props

Prefer `children` composition for layout:

```typescript
// GOOD — children composition
<PageLayout>
  <PageHeader title="Settings" />
  <PageContent>{children}</PageContent>
</PageLayout>

// AVOID — render props (only when children need parent data)
<DataLoader render={(data) => <Component data={data} />} />
```

## React 18 Compatibility Notes

- Continue using `forwardRef` + `displayName` — React 19's ref-as-prop is NOT available
- Continue using `React.memo()` for optimization — still the correct approach
- Do NOT use `use()` hook — React 19 only
