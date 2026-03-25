# Web Component Audit Checklist

Platform: web (klara-theme / React / TypeScript / Tailwind)

> Full rule definitions: `ui-lib-dev/references/audit-standards.md`

## How to Use
1. Read component source + styles + tests + stories
2. Walk through each category below
3. For each rule: mark PASS, FAIL (with finding ID), or N/A
4. Any FAIL creates a finding in the audit report

## Structure Check
- [ ] STRUCT-001: Directory at `src/lib/components/{kebab-name}/`
- [ ] STRUCT-002: All 7 required files present
  - [ ] `{name}.tsx`
  - [ ] `{name}-styles.ts`
  - [ ] `{name}.stories.tsx`
  - [ ] `{name}.test.tsx`
  - [ ] `{name}.figma.json`
  - [ ] `{name}.mapping.json`
  - [ ] `index.ts`
- [ ] STRUCT-003: Barrel exports complete
- [ ] STRUCT-004: `'use client'` first line
- [ ] STRUCT-005: `displayName` set
- [ ] STRUCT-006: Compound sub-components split

## Props & Naming Check
- [ ] PROPS-001: `I{Name}Props` interface name
- [ ] PROPS-002: Standard vocab (styling/mode/size/radius/className/id/disabled/inverse)
- [ ] PROPS-003: `SCREAMING_SNAKE as const` for variant consts
- [ ] PROPS-004: Derived type from const
- [ ] PROPS-005: Boolean flags as `?: true`
- [ ] PROPS-006: Internal props `_` prefixed
- [ ] PROPS-007: JSDoc on all props
- [ ] PROPS-008: `@deprecated` with migration

## Token & Style Check
- [ ] TOKEN-001: All Tailwind in `-styles.ts`
- [ ] TOKEN-002: `clsx()` for conditionals
- [ ] TOKEN-003: Semantic color tokens only
- [ ] TOKEN-004: Design scale size tokens
- [ ] TOKEN-005: `Map<string, string>` variant maps
- [ ] TOKEN-006: Theme-tier CSS vars only
- [ ] TOKEN-007: Shared STATE_LAYER utility

## Business Isolation Check
- [ ] BIZ-001: No domain types
- [ ] BIZ-002: No API calls
- [ ] BIZ-003: No global state management
- [ ] BIZ-004: Theming via wrappers only
- [ ] BIZ-005: No app-layer lifecycle artifacts

## Accessibility Check
- [ ] A11Y-001: `theme-ui-label` on root
- [ ] A11Y-002: `useId()` auto-ID + override
- [ ] A11Y-003: Radix for complex primitives
- [ ] A11Y-004: Standard focus ring
- [ ] A11Y-005: Semantic disabled token

## Testing & Documentation Check
- [ ] TEST-001: Test file exists
- [ ] TEST-002: Stories with autodocs
- [ ] TEST-003: Standard test coverage
- [ ] TEST-004: Figma artifacts present

## Scoring
- Total rules: 35
- PASS count: ___
- FAIL count: ___
- Score: PASS/35 (percentage)

### Verdict Thresholds
- **PASS**: 0 critical FAIL, 0 high FAIL
- **FIX-AND-REAUDIT**: any high FAIL, or 3+ medium FAIL
- **REDESIGN**: 2+ critical FAIL
