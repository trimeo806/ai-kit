# Web Organism/Application Checklist

For use when `componentClass` is `organism` or `application`. Parallel to `ui-checklist-web-atoms.md` — covers organism-specific concerns only: public API surface, state boundaries, and mock data isolation.

**Maturity tier applies:** Severity is modulated per Step 0.6 of `ui-workflow.md`. POC components use phased roadmap verdict, not binary PASS/FAIL.

**Atom/molecule rules NOT applied here:** STRUCT-002, STRUCT-005, TOKEN-001, BIZ-001, BIZ-002, BIZ-003 — see suppression note in `ui.md` Step 3.

---

## ORGANISM — Public API Surface

- [ ] **ORGANISM-001** `high` — Props interface exported and documented (`I{Name}Props` with JSDoc for every prop)
- [ ] **ORGANISM-002** `medium` — All callbacks follow `on{Event}` naming, typed with domain-agnostic signatures (no internal domain types in callback params)
- [ ] **ORGANISM-003** `critical` — No environment coupling: no `process.env` reads, no `window.location` reads, no hardcoded URLs in component body
- [ ] **ORGANISM-004** `high` — Compound entry point: single `index.ts` barrel exports the organism + its public types only
- [ ] **ORGANISM-005** `medium` — Internal views not individually exported: internal subcomponents accessible only through parent organism, not via barrel

---

## STATE — State Boundary

- [ ] **STATE-001** `critical` — External state received via props only: no direct store reads (`useSelector`, `useAppSelector`), no context reads for domain data
- [ ] **STATE-002** `medium` — Stable callback references: callbacks wrapped in `useCallback` or received as props; no inline arrow functions passed to deeply nested children without memoization
- [ ] **STATE-003** `low` — Internal state machine documented: states, transitions, and terminal states listed in JSDoc or co-located `state-machine.md`
- [ ] **STATE-004** `high` — No side effects on mount: `useEffect` with empty deps array must not call external APIs or mutate external state
- [ ] **STATE-005** `medium` — Mock data isolated in dedicated files: `mock-*.ts` or `__mocks__/` directory; no inline mock objects in component files

---

## MOCK — Mock Data Isolation

Applies when `maturityTier = poc` or `beta`. MOCK-* rules are N/A for `stable`.

- [ ] **MOCK-001** `medium` — All mock constants use `MOCK_` prefix (SCREAMING_SNAKE_CASE)
- [ ] **MOCK-002** `high` — Every mock maps to a documented future API contract: JSDoc comment referencing expected endpoint/shape
- [ ] **MOCK-003** `high` — External entity data (e.g. contact lists, event payloads, service configs) injected via props: not imported from mock files at render time
- [ ] **MOCK-004** `medium` — Mock data files export typed constants matching the expected API response shape (no `any`, no untyped objects)
- [ ] **MOCK-005** `critical` — No mock data in production exports: `index.ts` barrel does not re-export mock files or `__mocks__/` contents

---

## Scoring

| Rule | Severity |
|------|----------|
| ORGANISM-001 | high |
| ORGANISM-002 | medium |
| ORGANISM-003 | critical |
| ORGANISM-004 | high |
| ORGANISM-005 | medium |
| STATE-001 | critical |
| STATE-002 | medium |
| STATE-003 | low |
| STATE-004 | high |
| STATE-005 | medium |
| MOCK-001 | medium |
| MOCK-002 | high |
| MOCK-003 | high |
| MOCK-004 | medium |
| MOCK-005 | critical |

**Total scored rules: 15**

```
PASS count: ___
FAIL count: ___
Score: PASS/15 (percentage)
```

### Verdict Thresholds (stable/beta)

- **PASS**: 0 critical FAIL, 0 high FAIL
- **FIX-AND-REAUDIT**: any high FAIL, or 3+ medium FAIL
- **REDESIGN**: 2+ critical FAIL

### POC Verdict (when maturityTier = poc)

Use phased roadmap format instead of binary verdict (see `report-template.md` Phased Roadmap section).
