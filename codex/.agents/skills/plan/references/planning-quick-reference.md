# Planning Quick Reference

Start here. This guide shows you which template to use and in what order.

## When Creating a Plan

### Step 1: Write the Specification (Mandatory)

**Use**: `spec-template.md`

**Output**: Specification section in your plan with:
- Feature/Goal (1 sentence)
- Functional requirements (list of behaviors)
- Non-functional requirements (performance, security, accessibility, etc.)
- Edge cases (scenarios that could fail)
- Success criteria (testable proof of completion)

**Time**: 30-60 minutes for most features

**Tip**: If you can't write a spec, the feature isn't ready to plan.

---

### Step 2: Break Down into Tasks (Mandatory)

**Use**: `task-breakdown-template.md`

**Output**: Task table in each phase with:
- Task number + description
- Deliverable (specific file(s))
- Effort estimate (1h, 2h, half-day, etc.)
- Dependencies (what must be done first)
- Success metric (testable proof each task is complete)

**Time**: 30-90 minutes depending on feature complexity

**Tip**: If you can't estimate a task in 1-4 hours, break it into smaller tasks.

---

### Step 3: Plan Verification (Per Phase)

**Use**: `verification-checklist.md`

**Output**: At end of each phase file, add verification checklist section with:
- Manual testing steps (golden path + edge cases)
- Code quality checks (linting, typing, naming)
- Test coverage requirements (unit, integration, E2E)
- Performance verification
- Security & regression testing

**Time**: Review/update checklist as phase progresses (10-20 minutes)

**Tip**: Write verification steps BEFORE coding, then verify AFTER coding.

---

## Decision Tree: Which Plan Mode?

```
Does your task require research (unknowns, external APIs)?
  │
  ├─ Yes, moderate complexity
  │  └─→ Use /plan --deep
  │      • 2 researchers investigate
  │      • ~15 minute execution
  │
  ├─ Yes, very complex (3+ phases, parallel work)
  │  └─→ Use /plan --parallel
  │      • Dependency matrix + file ownership
  │      • Multi-phase with parallel tasks
  │
  └─ No, clear scope + familiar tech
     └─→ Use /plan --fast (default)
         • Codebase analysis only
         • Quick lightweight plan
```

**Default**: If unsure, use `/plan --deep` (most real work needs research).

---

## Template Reading Order

**If you're new to planning**:
1. Read this file (2 min)
2. Read `spec-template.md` (10 min)
3. Read `task-breakdown-template.md` (10 min)
4. Read `verification-checklist.md` (10 min)
5. Look at examples in each template

**If you're planning a feature**:
1. Open `spec-template.md`
2. Fill in Specification section
3. Open `task-breakdown-template.md`
4. List tasks with effort + dependencies
5. Open `verification-checklist.md`
6. Add verification section to each phase

**If you're verifying a completed phase**:
1. Open `verification-checklist.md`
2. Run each check
3. Mark pass/fail
4. Document any issues
5. Sign off when all stages pass

---

## Quick Checklist: Plan Complete?

Before asking "Is this plan ready?" verify:

- [ ] Specification section exists and is complete
  - [ ] Feature/Goal is clear (one sentence)
  - [ ] Functional requirements are specific and testable
  - [ ] Non-functional requirements (perf, security, a11y) are listed
  - [ ] Edge cases are identified
  - [ ] Success criteria are measurable
- [ ] Tasks are broken down
  - [ ] Each task is 1-4 hours of effort
  - [ ] Each task has a clear deliverable (file name)
  - [ ] Dependencies are listed (what blocks this task?)
  - [ ] Success metric is testable (how do you know it's done?)
- [ ] Verification checklist is in each phase
  - [ ] Manual testing steps (golden path + edge cases)
  - [ ] Code quality criteria
  - [ ] Test coverage target (usually ≥80%)
  - [ ] Performance/security/regression checks
- [ ] Agents & Skills assigned to each phase
  - [ ] Right person is assigned (developer, frontend-architect, etc.)
  - [ ] Required skills are activated
  - [ ] Handoffs are clear

---

## Common Mistakes to Avoid

| Mistake | Problem | Fix |
|---------|---------|-----|
| Spec is vague ("make it fast") | Can't verify completion | Use spec-template.md — write measurable criteria |
| Tasks are too big (8+ hours) | Can't review or estimate | Break into 1-4 hour chunks |
| No success metric per task | How do you know it's done? | Add acceptance criteria (e.g., "tests pass, coverage ≥80%") |
| Verification only at end | Can't catch problems early | Verify after each task (see checklist) |
| No dependencies listed | Tasks block each other unexpectedly | Use task-breakdown-template.md — list all blockers |
| Spec and tasks don't align | Build the wrong thing | For each requirement, create a task |

---

## Examples

### Example 1: Simple Feature (Use --fast)

**Task**: "Add a dark mode toggle"

**Spec** (5 min):
- Functional: Clicking toggle switches theme; state persists across reload
- Non-functional: <50ms latency, WCAG 2.1 AA compliant
- Edge case: First visit with no saved preference → use system preference
- Success: Toggle works, persists, no regressions

**Tasks** (10 min):
1. Implement toggle component (1h) → `src/components/ThemeToggle.tsx`
2. Add theme context (1h) → `src/context/ThemeContext.tsx`
3. Persist to localStorage (1h) → update context
4. Add tests (1h) → component + context tests
5. Manual verification (30 min) → test on light + dark OS

**Total**: ~25 min plan + 4.5h implementation

---

### Example 2: Complex Feature (Use --deep)

**Task**: "Implement task filtering, search, and sorting"

**Spec** (1 hour):
- Functional: Users can filter by priority/status, search by text, sort by date/priority
- Non-functional: Filter 1M tasks in <200ms, WCAG 2.1 AA, mobile responsive
- Edge cases: Empty results, concurrent filter+search, invalid input
- Success: All requirements met, 80%+ coverage, E2E tests pass

**Tasks** (1.5 hours):
1. Filter component (2h) → `TaskFilter.tsx`
2. Search hook (2h) → `useSearch.ts`
3. Sort logic (1.5h) → `sortTasks.ts`
4. Integrate into list (2h) → `TaskList.tsx`
5. Tests (3h) → unit + integration + E2E
6. Verification (1h per phase)

**Research phases** (if unknowns exist):
- R1: Filter best practices + React state management patterns
- R2: Codebase existing filter/search + performance constraints

**Total**: ~1.5h plan + 2h research + ~11h implementation + 1h verification

---

### Example 3: Verification After Phase

**Phase**: "Implement filter component"

**Verification checklist** (after code complete):

```markdown
## Manual Testing
- [ ] Load page → filter dropdown appears
- [ ] Click dropdown → options appear (All, Low, Medium, High)
- [ ] Select "Medium" → list filters to medium tasks
- [ ] Empty list → "No tasks" message appears
- [ ] Reload page → filter persists (manual verification)

## Code Quality
- [ ] npm run lint → 0 errors
- [ ] tsc --noEmit → 0 errors
- [ ] Naming is clear (no single-letter vars)
- [ ] No dead code

## Tests
- [ ] Unit tests pass: 8/8 (100%)
- [ ] Coverage: 87% (target: ≥80%) ✓
- [ ] No flaky tests

## Performance
- [ ] 1M tasks filter in 167ms (target: <200ms) ✓

## Sign-Off
✓ Ready for merge
```

**Result**: Phase is verified and ready for code review.

---

## When to Stop Planning

Plans can become over-detailed. Stop when:

- [ ] Someone reading the plan could implement it independently
- [ ] Each task fits on one screen (not 10+ pages)
- [ ] Effort estimates are within ±20% (good enough)
- [ ] Verification checklist covers happy path + edge cases
- [ ] You've answered "what gets built" and "how do we know it's done"

If the plan is >20 pages, you've probably over-planned. Ship a simpler plan + use verification to catch issues.

---

## Next Steps

1. **Read a template**: Start with `spec-template.md` or `task-breakdown-template.md`
2. **Apply to your feature**: Use it to plan your next task
3. **Verify after completing**: Use `verification-checklist.md` to sign off
4. **Iterate**: Each plan teaches you what works for your team
