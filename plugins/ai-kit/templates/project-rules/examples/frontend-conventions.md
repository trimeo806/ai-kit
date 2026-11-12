# Example: frontend Conventions section

An example of the **Conventions** section of a frontend repo's `AGENTS.md` (see
`references/project-rules-contract.md`). Copy what fits, replace the placeholders (`<ui-library>`,
`<feature-root>`, token names), delete the rest. ai-kit skills read it from your `AGENTS.md`; this
file itself is never applied.

---

## Conventions

### Folder structure

**Code lives next to the component that owns it.** Code that one component (and its children) uses
sits in that component's folder; code several components share sits at the nearest folder they have
in common, and at the feature root when that is the only one.

1. **Four support kinds, underscore-prefixed:** constants and enums → `_constants/`, hooks (state,
   effects, handlers, derived values) → `_hooks/`, types and interfaces → `_types/`, pure helpers →
   `_utils/`. Component folders are never underscore-prefixed, so `_hooks/` and a child component
   folder such as `toolbar/` can't be confused.
2. **Colocate component-bound code** in that component's folder: `_components/<path>/_hooks/`,
   `_types/`, `_constants/`, `_utils/`.
3. **Owner = lowest common folder** under `_components/` containing every importer. When that is
   `_components/` itself, or an importer lives outside it (a page, route, store, the feature
   barrel), the file is feature-shared and lives in the feature-root `_*` folders.
4. **Promote, don't reach.** Import support code from your own folder or an ancestor's `_*`
   folders, never a sibling's or another feature's. When a second component needs it, move it up
   in the same change.
5. **File shape in a `_*` folder:** one file → `index.ts`; several → kebab-case files
   (`use-<name>.ts`, `<name>.ts`, `<name>.types.ts`) with an optional `index.ts` barrel.
6. **Large components move their logic out.** Over ~200 lines, or more than 3 hooks or handlers in
   one body → state, effects, handlers and derived values go to the component's `_hooks/`.
7. **`_components/<name>/index.tsx` is view only:** JSX plus wiring to its hook, utils, types and
   constants. No data fetching, effects, business rules or constant tables.
8. **Folders and files are kebab-case.**
9. **Tests** live in `<tests-location>` (e.g. a top-level `tests/` mirroring the source path).
10. **Legacy layouts are compliant until migrated.** New and edited code follows the rules; don't
    migrate untouched files in a feature change.

```text
<feature-root>/
  _components/order-summary/
    index.tsx                  view only
    _hooks/index.ts            useOrderSummary(): state, effects, handlers
    _utils/index.ts            helpers only this component uses
    _types/index.ts            props and view models
    _constants/index.ts        enums, UPPER_SNAKE constants
    toolbar/
      index.tsx                child; may import ../_types, ../_hooks
      _hooks/use-toolbar.ts
  _hooks/use-autosave/index.ts feature-shared
  _types/order.ts              feature-shared contract
```

### UI composition

**Lean markup — no wrapper without a job.**

1. Fragment first when elements only need a single root; `<Fragment key>` inside lists.
2. A `div` only when it carries layout or token classes, a `ref`, a handler, ARIA / `id` /
   `data-*`, or a parent needs a single DOM child — and it groups two or more children.
3. No `div` directly inside a `div` with nothing between them; merge the class lists.
4. No surface inside a surface: no card in a card, no card directly inside a dialog, popover or
   side panel. Separate sections with spacing, a heading or a divider.
5. Prefer semantic elements (`section`, `header`, `nav`, `ul`/`li`, `form`, `fieldset`).

**UI library first.**

1. Lookup order: `<ui-library>` → the feature's domain lib → shared app components. No second UI
   library.
2. Check the library's source, docs or stories before building; never invent component names,
   props or variants.
3. Import from the library's public entry point, never a subpath.
4. Missing feature → compose or wrap it inside the feature; don't patch the library to unblock a
   story. No equivalent at all → say so in the plan or PR and build the smallest component from
   tokens.

**Design tokens only.**

- Spacing, type, radius and colour come from the design-system tokens (e.g. `p-100`,
  `text-body-3`, `bg-surface-*`); the token source is `<path to tokens or preset>`.
- No arbitrary values (`p-[13px]`, `bg-[#EB0000]`) and no raw hex in TS/TSX; fallback
  `[var(--color-*)]`.
- If the preset replaces the default scale, stock classes (`p-4`, `text-sm`) compile to nothing —
  treat them as blocking.
- No static inline `style` for colour, spacing or typography; runtime values are fine.
- No `!important`.

### Review severity overrides (optional)

| Rule | Severity |
|---|---|
| Stock scale class where the preset removes it | `blocking` |
| File misplaced per the folder structure | `should-fix` |
| Import from another feature's `_*` folder | `should-fix` |
| Wrapper `div` with one child | `nit` |
