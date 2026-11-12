# Step `tasks` — write `tasks.md` (standard mode)

**Runs when** `plan.md` exists and `tasks.md` is missing, or on `plan tasks`. Before running, check that every spec point has a row in the plan's test plan. If one is missing, stop and point to `design`.

**Ticket mode skips this step.** The ticket `plan.md`'s `## Steps` are the tasks, and `/ai-kit:tdd-dev-workflow` ticket mode runs them. Each step still cites its AC, risk or test.

Format: `- [ ] T### [P] [US#] Description in path/to/file  [Trace: …] [Done: …]`. `[Done]` is the observable finish line: which tests go green (`x.test.ts › "…"`), or for a verify/setup task, what is confirmed. `[P]` marks a task that can run in parallel (different files, no dependency on an open task).

```markdown
# Tasks: [Feature]

## Phase 1 — Setup / foundational (only what every story needs)
- [ ] T001 Verify dependency Y responds as assumed  [Trace: RISK-1] [Done: Y returns 200 for a sample call, noted in plan]

## Phase 2 — US1 (P1) 🎯 MVP
Independent test: [from spec]
- [ ] T002 [P] [US1] Write failing tests for US1-AC1, US1-AC2 in src/x.test.ts  [Trace: US1-AC1, US1-AC2] [Done: both tests fail for the missing behavior]
- [ ] T003 [US1] Implement X in src/x.ts  [Trace: FR-001] [Done: x.test.ts › "creates X when …" green]
Checkpoint: US1 tests green; US1 demonstrable on its own.

## Phase 3 — US2 (P2)
…

## Final — cross-cutting
- [ ] T0NN User runs full suite + build once (commands printed by tdd); FR-U-* tests green  [Trace: FR-U-001] [Done: user reports suite + build green]
```

Rules:
- Tasks are grouped by user story in priority order, so the plan stops at any checkpoint with a working increment.
- Inside a story, the order is tests (must fail) → models → services → endpoints/UI → integration.
- Each task names exact file paths. A fullstack plan keeps backend and frontend files in separate tasks so they can run in parallel.
- A task without a `[Trace]` gets deleted, or justified under Complexity tracking.
- Every task has a `[Done]`. A task you can't state a finish line for is too vague: split it or sharpen it.
- **Stay inside the plan's `## Boundaries`.** Every file a task names is in the Change surface, and none is in Do not touch. A task that needs to cross either goes back to `design` to widen the surface (with a trace) first. No task implements an `OOS-*`.
