# Step `analyze` — read-only consistency pass, then the review gate

**Runs when** `plan.md` has `status: draft` and its last artifact exists (`tasks.md` in standard mode, `plan.md` in ticket mode), or on `plan analyze`.

Analyze does not rewrite artifacts. A failure points to the step that owns the fix (`spec`/`clarify`, `design` or `tasks`). Run that step, then analyze again. When CRITICAL issues are zero, set `plan.md` to `status: awaiting-review`.

Cross-check `spec.md`, `plan.md` and `tasks.md` (ticket mode: `spec.md` and `plan.md`):

| Check | Fail when |
|-------|-----------|
| Coverage | a spec point has no test row, or no task |
| Traceability | a task or decision traces to nothing |
| Ambiguity | a `[NEEDS CLARIFICATION]`/`NEEDS RESEARCH` remains, or a requirement is vague or unmeasurable |
| Consistency | terms, entities or IDs differ between spec, plan and tasks; a task contradicts a decision |
| Diagram | a component/arrow in `diagrams/design.wb.json` traces to nothing, or a Reuse map / Data model item is missing from it, or the PNG is stale (older than `plan.md` decisions) |
| Boundary | a task file is outside the Change surface or inside Do not touch; a task, decision or diagram element implements an `OOS-*`; a behavior is both in a story/FR and in `OOS-*`; a Do-not-touch row has no trace |
| Duplication | two requirements say the same thing |
| Project rules | a violation is neither fixed nor justified |

Report it briefly: coverage % (spec points with test + task), counts per check, and the remaining issues. Do not leave CRITICAL issues for the reviewer: missing coverage of a P1 story, an unjustified rule violation, or a task crossing Do not touch or implementing an `OOS-*`.

## Review gate

- For `risk: high`, recommend `/ai-kit:review checklist` (requirements quality per domain) first.
- Tell the user who should review, per Risk: a tech lead if high, a teammate otherwise. The skill does not send it anywhere.
- No implementation starts until `plan.md` says `status: approved`. When the user reports approval, set it, with the reviewer's name and the date in `## Review gate`.
- Then hand off:
  - **standard:** `tasks.md` → `/ai-kit:tdd-dev-workflow`;
  - **ticket:** first the tracker/wiki gates (Phases 7–8 of the ticket flow), then `/ai-kit:tdd-dev-workflow <TICKET>`.
