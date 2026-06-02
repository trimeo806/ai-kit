# Verification Checklist Template for Plans

Use this checklist after each phase to verify that implementation matches the plan's spec and success criteria.

## Overview

Verification happens in 5 stages:
1. **Manual Testing** — Does the feature work per spec?
2. **Code Quality** — Is the code clean and maintainable?
3. **Testing Coverage** — Are edge cases tested?
4. **Performance** — Does it meet non-functional requirements?
5. **Security & Regression** — No vulnerabilities or broken existing features?

Skip sections not applicable to the task.

---

## Stage 1: Manual Testing

Test the feature manually by **using it like a user** (not just inspecting code).

### Golden Path (Happy Case)

```markdown
### Test: User Filters Tasks by Priority

- [ ] Load task list
- [ ] Click filter dropdown
- [ ] Select "Medium" priority
- [ ] Verify: List shows only medium-priority tasks
- [ ] Verify: Task count updates
- [ ] Select "All"
- [ ] Verify: All tasks reappear
```

**Result**: Pass / Fail / Incomplete

---

### Edge Cases

For each edge case in the spec, write a manual test:

```markdown
### Test: Empty Filtered List

- [ ] Create task list with only High/Low priority tasks
- [ ] Filter by "Medium"
- [ ] Verify: Message "No tasks match filter" appears
- [ ] Verify: No task items are visible
- [ ] Verify: UX is clear (not blank/broken)

**Result**: Pass / Fail / Incomplete

---

### Test: Filter Persists Across Reload

- [ ] Load task list
- [ ] Select "High" priority
- [ ] Wait 1 second (for localStorage to flush)
- [ ] Hard-refresh page (Cmd+Shift+R / Ctrl+Shift+R)
- [ ] Verify: Filter is still "High"
- [ ] Verify: Task list still shows only High priority tasks

**Result**: Pass / Fail / Incomplete

---

### Test: Network Failure During Filter

- [ ] Open DevTools → Network tab → Throttle to "Offline"
- [ ] Click filter dropdown
- [ ] Select a priority
- [ ] Verify: Graceful error message appears (or silent fallback)
- [ ] Verify: No console errors or warnings
- [ ] Re-enable network
- [ ] Verify: Filter works correctly

**Result**: Pass / Fail / Incomplete
```

---

### Performance Spot-Check

```markdown
### Test: Filter Latency

- [ ] Load task list with 1M tasks (or simulate)
- [ ] Open DevTools → Performance tab
- [ ] Click filter dropdown
- [ ] Select a priority
- [ ] Record performance trace
- [ ] Verify: List update completes in <200ms (or spec requirement)

**Result**: Pass / Fail / Incomplete

**Trace note**: [attach or describe findings]
```

---

## Stage 2: Code Quality

Verify the code is clean, follows conventions, and is maintainable.

```markdown
## Code Quality Verification

### Linting & Type Safety
- [ ] `npm run lint` passes (0 errors, 0 warnings)
- [ ] `npm run type-check` (or `tsc --noEmit`) passes
- [ ] No `// @ts-ignore` or `eslint-disable` suppressed without justification

### Naming & Readability
- [ ] Variable/function names are clear and descriptive
- [ ] No single-letter vars except loop counters (i, j)
- [ ] No cryptic abbreviations (use `taskPriority` not `tskPr`)
- [ ] Naming matches team conventions (camelCase, PascalCase, etc.)

### Code Organization
- [ ] Single responsibility — each file/function has one job
- [ ] No dead code (unused imports, unreachable branches)
- [ ] Related code is co-located (utils together, components together)
- [ ] No circular dependencies

### Comments & Documentation
- [ ] Comments explain WHY, not WHAT (code already shows what)
- [ ] Complex logic has explanatory comments
- [ ] No outdated comments (e.g., "TODO: refactor this" from 6 months ago)
- [ ] README updated with examples (if public API)

**Result**: Pass / Fail / Issues Found (list them)

---

### Example Issues Found
- [ ] `useTaskFilter.ts` line 34: Comment says "TODO: optimize" but no issue created
- [ ] `TaskFilter.tsx` imports unused `Icon` component
- [ ] `filterTasks` function variable names could be clearer (`t`, `p` → `task`, `priority`)

---

**Remediation plan** (if issues found):
[ Commit fix with message: "chore: clean up code quality issues (comments, unused imports, naming)" ]
```

---

## Stage 3: Testing Coverage

Verify that tests exist and cover the spec requirements.

```markdown
## Test Coverage Verification

### Unit Tests
- [ ] TaskFilter component renders without errors
- [ ] TaskFilter calls onChange callback with correct value on selection
- [ ] useTaskFilter hook filters tasks correctly for each priority
- [ ] Edge case: Empty task list returns empty array
- [ ] Edge case: Invalid priority value is rejected or defaults safely
- [ ] localStorage persistence works (save + restore)
- [ ] localStorage corruption handled gracefully

**Unit test summary**: 
- Total tests: 12
- Passing: 12
- Failing: 0
- Skipped: 0
- Coverage: 87% statements, 85% branches, 90% functions, 88% lines

```markdown
### Integration Tests
- [ ] TaskList + TaskFilter work together
- [ ] Selecting filter updates the displayed task list in real-time
- [ ] Clearing filter resets to all tasks
- [ ] Filter selection persists across component remount

**Integration test summary**:
- Total tests: 4
- Passing: 4
- Failing: 0
```

### E2E Tests
- [ ] User can open page, select filter, and see results
- [ ] Filter persists after page reload
- [ ] Empty state messaging appears when appropriate
- [ ] Mobile responsive (if applicable)

**E2E test summary**:
- Total tests: 4
- Passing: 4
- Failing: 0
- Average duration: 8 seconds

### Coverage Target Met?
- [ ] Target: ≥80% coverage
- [ ] Actual: 87%
- [ ] Status: ✓ Exceeds target

**Result**: Pass / Fail / Below Target

**If below target**: Identify missing test areas and add tests.
```

---

## Stage 4: Performance

Verify non-functional requirements are met.

```markdown
## Performance Verification

### Latency

**Requirement**: Filter list of 1M tasks in <200ms

**Test method**: 
- Generated 1M mock tasks in-memory
- Ran filter operation 10 times
- Recorded times in DevTools Performance tab

**Results**:
- Min: 145ms
- Max: 189ms
- Avg: 167ms
- Stddev: 14ms

**Status**: ✓ Meets requirement (<200ms)

---

### Memory

**Requirement**: No memory leaks; reasonable footprint for 1M tasks

**Test method**:
- Opened DevTools Heap Snapshots
- Filtered tasks 5 times
- Compared snapshots for leaks

**Results**:
- Initial heap: 45 MB
- After 5 filters: 46 MB (stable)
- No detached DOM nodes
- No circular references in React tree

**Status**: ✓ No leaks detected

---

### Bundle Impact

**Requirement**: Filter feature adds <5KB gzipped to bundle

**Test method**: 
- Ran `npm run build` before + after changes
- Compared bundle sizes

**Results**:
- Before: 250 KB gzipped
- After: 252 KB gzipped
- Delta: +2 KB ✓

**Status**: ✓ Within budget

---

**Overall Performance**: Pass / Fail / Investigate Further
```

---

## Stage 5: Security & Regression

Verify no vulnerabilities were introduced and existing features still work.

```markdown
## Security & Regression Verification

### Security Checks
- [ ] No secrets or API keys in code
- [ ] User input (priority value) is sanitized
- [ ] No `dangerouslySetInnerHTML` or unescaped content
- [ ] localStorage doesn't expose sensitive data
- [ ] Filter logic doesn't bypass auth/permissions (users only see their own tasks)
- [ ] No new dependencies introduced (or none with known vulns)

**Dependency security check**:
```bash
npm audit
```
- [ ] Results: 0 vulnerabilities
- [ ] Last checked: [date]

**Result**: Pass / Fail / Requires Review

---

### Regression Testing

**Existing features to verify** (spot-check):
- [ ] Task list still renders without filter applied
- [ ] Creating a new task works
- [ ] Deleting a task works
- [ ] Task editing still works
- [ ] Sorting tasks still works
- [ ] Other filters (if any) still work
- [ ] Mobile layout not broken

**Test method**: Run existing e2e test suite
```bash
npm run test:e2e
```
- Total tests: 45
- Passing: 45
- Failing: 0
- Status: ✓ All pass

**Result**: Pass / Fail / Investigate

---

### Known Issues
- [ ] None — feature is clean to ship

(Or list any issues found and their severity/plan to fix)
```

---

## Sign-Off Checklist

Once all stages pass, use this to sign off:

```markdown
## Sign-Off

| Stage | Status | Signed Off |
|-------|--------|-----------|
| Manual Testing | ✓ Pass | [Name] - [Date] |
| Code Quality | ✓ Pass | [Name] - [Date] |
| Testing Coverage | ✓ Pass | [Name] - [Date] |
| Performance | ✓ Pass | [Name] - [Date] |
| Security & Regression | ✓ Pass | [Name] - [Date] |

**Ready for merge**: Yes ✓

**Merge checklist** (before hitting merge button):
- [ ] All checks above are passing
- [ ] PR has been reviewed and approved
- [ ] Tests on CI are passing
- [ ] No conflicts with main branch
- [ ] Commit messages are clear
```

---

## Common Failures & Remediation

| Failure | Common Cause | Fix |
|---------|------------|-----|
| Type errors after merge | TS config not updated | Run `tsc --noEmit` and fix |
| Tests fail on CI but pass locally | Env vars not set on CI | Add to `.github/workflows/test.yml` |
| Performance regression | Unexpected re-renders | Profile with React DevTools, add `useMemo` if needed |
| Filter doesn't persist on reload | localStorage not flushed | Add `await new Promise(r => setTimeout(r, 100))` in test |
| E2E tests flaky | Race condition waiting for render | Add explicit waits for element visibility |
| Linter fails on CI | Different Node/npm version | Lock versions in `.nvmrc` and `package-lock.json` |

---

## Tips

1. **Test as a user, not an engineer** — Click buttons, see what happens
2. **Check the opposite** — If "filter shows medium tasks," also verify "filter hides low tasks"
3. **Don't trust one test** — Run tests 3x to catch flakiness
4. **Performance is often surprising** — Profile before assuming it's fast
5. **Regression is easy to miss** — Test features that existed before this change
6. **Document failures** — If something fails, note it in this checklist for future reference
