# Specification Template for Plans

Use this template when creating a plan. A complete spec includes feature goal, requirements, edge cases, and success criteria.

## Template

```markdown
## Specification

### Feature / Goal
[One sentence: what does the user/system get after completion?]

**Example**: "Users can filter tasks by priority, enabling faster task triage."

### Functional Requirements
List every behavior the feature MUST have:
- [ ] Users can click a "Priority" dropdown and select Low/Medium/High
- [ ] Selected priority filters the task list in real-time
- [ ] Filter state persists across page refresh
- [ ] Users can clear filters via an "X" button
- [ ] Invalid selections (e.g., corrupted state) degrade gracefully

### Non-Functional Requirements
Constraints on HOW the feature must work:
- **Performance**: Filter list of 10k tasks in < 200ms
- **Accessibility**: WCAG 2.1 AA (keyboard nav, screen reader support)
- **Compatibility**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Security**: No XSS via priority value, sanitize all user input
- **Scalability**: Support 100M+ tasks without UI lag

### Edge Cases & Failures
Scenarios where behavior might surprise users:
- Empty task list (show "No tasks" message)
- Network outage while filtering (show retry prompt)
- Task priority changes mid-filter (refresh list or soft-update?)
- User selects same priority twice (no-op or toggle?)
- Very long priority list (use virtual scrolling?)

### Success Criteria
Testable outcomes that prove feature is done:
- [ ] Feature code ships behind a flag (if needed)
- [ ] All functional requirements implemented
- [ ] Unit tests cover happy path + all edge cases
- [ ] Integration tests verify filter + persistence
- [ ] E2E tests verify user flows (click filter, see results, refresh, still filtered)
- [ ] Performance benchmark shows < 200ms latency
- [ ] Accessibility audit passes WCAG 2.1 AA
- [ ] No regressions in existing task features
- [ ] Documentation/code comments explain non-obvious logic (e.g., why debounce the filter)
```

## Refinement Checklist

After drafting the spec, verify it with these questions:

| Question | If No → | If Unclear → |
|----------|---------|--------------|
| Can you write 3 user stories from this spec? | Expand requirements | Simplify or split feature |
| Does every requirement have a success metric? | Add testable criteria | Rephrase as observable outcome |
| Can a developer estimate each functional requirement? | Break down further | Clarify acceptance criteria |
| Are edge cases prioritized (must-have vs nice-to-have)? | Separate scope clearly | List all cases, mark priority |
| Does the spec contradict itself? | Resolve ambiguity | Ask stakeholder |

## Common Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| "Make the feature faster" | Unmeasurable | "Reduce filter latency from 500ms to <200ms" |
| "Handle all errors gracefully" | Too vague | "Show user-friendly message for 5 specific errors" |
| "Support all browsers" | Expensive | "Support Chrome, Firefox, Safari (latest 2 versions)" |
| "Make it accessible" | Unmeasurable | "Meet WCAG 2.1 AA standards" |
| 20+ requirements | Scope too large | Split into MVP + Phase 2 |

## Linking Spec to Tasks

For each requirement, create a task:

```markdown
## Tasks

| Requirement | Task | Deliverable | Success Metric |
|-------------|------|-------------|-----------------|
| Users can filter by priority | Implement filter dropdown | `src/components/TaskFilter.tsx` | Dropdown renders; options match priority enum |
| Filter state persists | Add localStorage + restore on mount | `src/hooks/useTaskFilter.ts` | Page reload preserves filter state |
| Real-time filtering | Debounce filter input | `src/utils/filterTasks.ts` | Filter updates list in <200ms |
| Clear filters button | Add X button to filter bar | `src/components/FilterBar.tsx` + tests | Clicking X resets to default state |
| No XSS via priority | Sanitize priority input | Input validation in `useTaskFilter.ts` | XSS attempt sanitized; test passes |
```

Each task flows naturally from the spec. If a requirement has no task, it won't get done.

## Example: Complete Spec

```markdown
## Specification

### Feature / Goal
Support filtering tasks by priority (Low/Medium/High) so users can focus on urgent work.

### Functional Requirements
- [ ] Filter dropdown appears in task list header
- [ ] Selecting a priority filters visible tasks in real-time
- [ ] "All" option shows all tasks (no filter)
- [ ] Selected priority persists across page reload
- [ ] "Clear" button resets filter to "All"
- [ ] Task count updates to match filtered list

### Non-Functional Requirements
- Performance: List of 1M tasks filters in <200ms
- Accessibility: WCAG 2.1 AA (keyboard nav + screen reader)
- Browser support: Chrome 120+, Firefox 121+, Safari 16+
- Security: Sanitize priority input (prevent XSS)

### Edge Cases
- Empty task list → show "No tasks match filter"
- Task priority changes while filtered → soft-update the list
- Network fails mid-filter → show retry prompt
- User quickly changes filters → debounce to prevent flicker

### Success Criteria
- [ ] Functional requirements 100% complete
- [ ] Unit tests: happy path + 4 edge cases
- [ ] Integration tests: filter + persistence
- [ ] E2E test: click filter → verify results → reload → still filtered
- [ ] Performance benchmark: <200ms on 1M tasks
- [ ] Accessibility audit: WCAG 2.1 AA passes
- [ ] No regressions in existing task list features
```

## Tips

1. **Be specific**: "Handle errors" → "Show toast message with error text + retry button"
2. **Prioritize scope**: List must-haves (MVP) vs nice-to-haves (Phase 2)
3. **One feature = one spec**: If spec spans 5 pages, split into 2-3 features
4. **Test spec with examples**: "If user does X, system should do Y" — can you write 5 examples?
5. **Involve stakeholders**: Spec answers "What does done look like?" — they should agree
