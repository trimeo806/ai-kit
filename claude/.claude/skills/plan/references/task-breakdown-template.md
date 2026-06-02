# Task Breakdown Template for Plans

Use this template when decomposing requirements into specific, estimatable tasks. Each task should be completable in 1-4 hours.

## Quick Reference

**Task components:**
1. **Description** — What gets built?
2. **Acceptance Criteria** — How do you know it's done?
3. **Effort** — Time estimate (1h, 2h, half-day, etc.)
4. **Dependencies** — What must be done first?
5. **Deliverable** — Specific file(s) created/modified
6. **Success Metric** — Testable proof (tests pass, coverage ≥80%, etc.)

## Template

```markdown
## Tasks

| # | Task | Deliverable | Effort | Dependency | Success Metric |
|---|------|-------------|--------|------------|-----------------|
| 1 | Implement task filter dropdown | `src/components/TaskFilter.tsx` | 2h | None | Dropdown renders with 3 options |
| 2 | Add filter logic to list | `src/hooks/useTaskFilter.ts` | 2h | Task 1 | List updates when filter changes |
| 3 | Persist filter to localStorage | `src/hooks/useTaskFilter.ts` (update) | 1h | Task 2 | Filter state survives page reload |
| 4 | Add filter tests | `src/components/TaskFilter.test.tsx` | 1.5h | Task 1, 2 | 100% coverage of filter logic |
| 5 | Add E2E test | `e2e/filter.spec.ts` | 1h | Task 4 | User can filter + reload + verify |

## Detailed Breakdown

### Task 1 — Implement Task Filter Dropdown

**Description**: Create a reusable `TaskFilter` component that renders a dropdown menu with priority options (All, Low, Medium, High).

**Acceptance Criteria**:
- Component renders without error
- Dropdown has 4 options (All, Low, Medium, High)
- Clicking an option triggers an `onChange` callback with the selected value
- Component is keyboard-navigable (arrow keys, Enter to select)
- Selected option is visually highlighted

**Effort**: 2h

**Dependencies**: None (can start immediately)

**Files to Create/Modify**:
- Create: `src/components/TaskFilter.tsx`
- Create: `src/components/TaskFilter.test.tsx` (or skip until Task 4)

**Success Metric**:
- Component renders in browser without errors
- Dropdown options are clickable
- `onChange` callback is called with correct value
- Manual test: Select "Medium" → verify callback receives "medium"

**Notes**:
- Use existing Button + Menu components from design system
- Don't implement filter logic yet (Task 2)
- Don't integrate with task list yet (Task 2)

---

### Task 2 — Add Filter Logic to List

**Description**: Connect `TaskFilter` to the task list. Implement filtering logic that shows/hides tasks based on selected priority.

**Acceptance Criteria**:
- Task list respects selected filter immediately
- Filtering works for all 4 options
- Empty list shows "No tasks match filter" message
- Filter logic has unit tests

**Effort**: 2h

**Dependencies**: Task 1 must be complete

**Files to Create/Modify**:
- Create: `src/hooks/useTaskFilter.ts` (contains filtering logic)
- Modify: `src/components/TaskList.tsx` (integrate TaskFilter component + hook)
- Modify: `src/utils/filterTasks.ts` (if it exists) or create new `src/utils/taskFilters.ts`

**Success Metric**:
- Task list updates when filter changes (verify with manual test)
- Filtering logic has ≥90% unit test coverage
- 1M-task list filters in <200ms (performance benchmark)

**Notes**:
- Debounce filter input to prevent flicker
- Use React Context if filter state is needed by multiple components
- Log performance metrics (optional)

---

### Task 3 — Persist Filter to localStorage

**Description**: Save filter selection to browser localStorage and restore it when the page reloads.

**Acceptance Criteria**:
- Filter selection is saved to localStorage when user selects a priority
- On page reload, the previously selected filter is restored
- If localStorage is empty (first visit), default to "All"
- If localStorage is corrupted, silently default to "All"

**Effort**: 1h

**Dependencies**: Task 2 must be complete

**Files to Create/Modify**:
- Modify: `src/hooks/useTaskFilter.ts` (add localStorage persist/restore)

**Success Metric**:
- Manual test: Select "High" → reload page → "High" is still selected
- Automated test: Mock localStorage → verify restore logic
- Edge case test: Corrupted localStorage → defaults to "All"

**Notes**:
- Use `useEffect` to persist on change
- Use try/catch for safe localStorage access
- Consider migration if schema changes in future

---

### Task 4 — Add Filter Tests

**Description**: Write comprehensive unit + integration tests for filter component and logic.

**Acceptance Criteria**:
- Unit tests cover TaskFilter component (render, click, callback)
- Unit tests cover useTaskFilter hook (filter logic, edge cases)
- Integration tests verify TaskList + TaskFilter work together
- Overall coverage ≥80% for filter-related code

**Effort**: 1.5h

**Dependencies**: Task 1, 2 must be complete

**Files to Create/Modify**:
- Create/Modify: `src/components/TaskFilter.test.tsx`
- Create/Modify: `src/hooks/useTaskFilter.test.ts`
- Create/Modify: `src/utils/taskFilters.test.ts` (if separate file)

**Success Metric**:
- All tests pass (100%)
- Coverage report shows ≥80% for filter code
- No snapshot tests or overly brittle tests

**Notes**:
- Test golden path (happy case first)
- Test edge cases (empty list, invalid input)
- Test error handling (corrupted localStorage)
- Use React Testing Library for component tests
- Use Jest for utility tests

---

### Task 5 — Add E2E Test

**Description**: Write end-to-end test that verifies the entire user flow: click filter → see results → reload → filter persists.

**Acceptance Criteria**:
- E2E test loads task list
- Test clicks filter dropdown and selects "Medium"
- Test verifies task list updates to show only medium-priority tasks
- Test reloads page
- Test verifies filter is still "Medium" and list matches

**Effort**: 1h

**Dependencies**: Task 4 must be complete

**Files to Create/Modify**:
- Create: `e2e/filter.spec.ts` (or `filter.e2e.ts` depending on convention)

**Success Metric**:
- E2E test runs and passes (100%)
- Test executes in <10 seconds
- Test passes consistently (no flakiness)

**Notes**:
- Use Playwright or Cypress (whichever is in use)
- Focus on user perspective (click, see, verify)
- Don't test internals (localStorage keys, etc.)
- Test across 2 browsers if possible

---

## Estimation Checklist

Before finalizing effort estimates, verify:

| Question | If Yes | If No |
|----------|--------|-------|
| Can this task be completed in 1-4 hours? | Good size ✓ | Split into smaller tasks |
| Does this task have a clear deliverable? | Good scope ✓ | Define what gets built |
| Can you write an acceptance test for this? | Testable ✓ | Clarify success criteria |
| Does someone on the team know how to do this? | Confidence ✓ | Research/spike needed (Task 0) |
| Are all dependencies listed? | Ready to start ✓ | Identify blockers |

## Dependency Graph

Example for filter feature:

```
Task 1 (Filter Component)
    ↓
Task 2 (Filter Logic)
    ├─→ Task 3 (Persistence)
    └─→ Task 4 (Tests)
        └─→ Task 5 (E2E)
```

**Critical path** (longest sequence): 1 → 2 → 4 → 5 = 6.5 hours
**Parallel opportunity**: Task 3 can start after Task 2 completes (doesn't block anything)

## Tips

1. **One thing per task** — filter component, not "component + tests + persistence"
2. **Estimate conservatively** — add 20% buffer for unknowns
3. **Break into ≤4h chunks** — easier to estimate, review, and verify
4. **List blockers explicitly** — "Need design approval before starting"
5. **Include test work** — testing is not "extra," it's part of the task
6. **Consider handoffs** — if Task X requires review, pad the estimate
