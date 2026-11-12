# Step `design` — write `plan.md` (HOW + a test for every spec point)

**Runs when** `spec.md` is `clarified` and `plan.md` is missing, or on `plan design`. Before running, check that `spec.md` has `status: clarified` and no `[NEEDS CLARIFICATION]` marker. If it fails, stop and point to `clarify`.

**Ticket mode:** this step is Phases 2–6 of `${CLAUDE_PLUGIN_ROOT}/references/shared/ticket-planning-flow.md`. It writes the ticket's single `plan.md`, whose `## Acceptance criteria` come from `spec.md`. Follow that file's template, add `spec: ./spec.md` to its frontmatter, and add a test row per AC in `## Verification`. Fill its `## Boundaries` by the Boundaries rules below, with `OOS-*` taken from `spec.md`. The standard template below applies only to standard mode.

Research is the heavy part:
- Dispatch up to 3 `Explore` agents (reuse source, target surface, integration seam).
- For fullstack architecture, dispatch `ai-kit:backend-architect` → `ai-kit:frontend-architect`.
- Then read the critical files yourself.

Questions to the user stay in this session.

**Two or more viable approaches and the choice is not obvious** (cost, risk or ownership differ) →
offer `/ai-kit:brainstormer approach` before deciding here: it compares the options with the
user and logs the choice as `approach` DECs. When `decision-log.md` has an `## Agreed approach`,
design from it and cite its DECs in the Decision summary; don't re-decide it.

Order: research → decisions → **design diagram** → test plan → write `plan.md`. Drawing before the test plan shows missing components and flows while the design is still cheap to change.

```markdown
---
title: "Feature name"
spec: ./spec.md
status: draft | awaiting-review | approved | completed
risk: high | normal
created: YYYY-MM-DD
---
# Plan: [Feature]

## Decision summary
[≤ 10 lines: approach, key decisions, top risks, what is out of scope; cite the `DEC-*` from decision-log.md a line relies on]

## Review gate
- Risk: high | normal — [why: data migration, auth, public API, money, multi-team…]
- Reviewer: tech lead (high) | teammate (normal) — [name if known]
- Status: awaiting review | approved by <name> on <date>

## Technical context
Language/framework, storage, testing tools, target, constraints — from the code, cited `path:line`.
Unknown → `NEEDS RESEARCH` (resolve it under Decisions before tasks).

## Project rules check
Check the design against the loaded project rules: the `AGENTS.md` chain (Architecture & boundaries, Conventions, Testing, Do / Don't) for every repo the plan touches.
Pass or list the violations. Each violation is either fixed or justified under Complexity tracking.

## Boundaries
### Change surface (the only places tasks may edit)
| Module / path | Why (traces) |
|---------------|--------------|
| `libs/x/src/feature/` | US1, FR-001 |

### Do not touch
| What (path, public API, dependency, schema, other team's module) | Why (traces) |
|-------------------------------------------------------------------|--------------|
| `PublicApi.v1` signature | FR-U-001 |
| no new dependency | OOS-002 / D2 |

### Rules in force
[from Project rules check: e.g. folder structure, UI library first, no new dependency]

## Decisions
### D1 — [title] (traces: FR-001, RISK-1)
- **Decision**: …
- **Rationale**: …
- **Alternatives rejected**: … because …

## Reuse map
| Need | Existing | Path |

## Data model / contracts
Entities, fields, validation, state transitions (from spec Key entities); interface contracts in `contracts/`.
Stateful flows: draw the state diagram per `references/state-machine-guide.md`.

## Design diagram
![design](./diagrams/design.png) · editable: [design.excalidraw](./diagrams/design.excalidraw) · source: `diagrams/design.wb.json`
Legend: solid accent = new · solid = changed · dashed = reused, untouched · ①②③ = P1 flow order

## Test plan — spec coverage
| Spec point | Test (file › name) | Level | Fails today because |
|------------|--------------------|-------|---------------------|
| US1-AC1 | `src/x.test.ts` › "creates X when …" | unit | X not implemented |
| EC-001 | `src/x.test.ts` › "rejects …" | unit | no guard |
| FR-U-001 | existing `src/y.test.ts` › "…" | unit | — (must stay green) |
| SC-001 | `tests/perf/x.bench.ts` | perf | — |

## Risks
| ID | Risk | Mitigated by |
|----|------|--------------|
| RISK-1 | … | T003 |

## Complexity tracking
| Item that doesn't trace to the spec | Why needed | Simpler option rejected because |
(empty is the goal)

## Plan-gap log
| Date | Rework | Missing from spec/plan | Fix applied to spec/plan |
```

## Design diagram (Excalidraw, whiteboard mode)

Draw the design with skill `ai-kit:less-words-more-arrows` in **whiteboard mode** (preset `whiteboard`, `.wb.json`). Follow that skill's steps: write the spec, render, `Read` the PNG, fix overlaps, and re-render until it reads cleanly.

**Files.** Keep them in the plan dir, because they are part of the plan:
- `diagrams/design.wb.json` (source);
- `diagrams/design.excalidraw` and `diagrams/design.png` (render output).

Ticket mode uses `<docsDir>/<TICKET-KEY>/diagrams/`. Link the PNG from `## Design diagram` (ticket mode: under `## Architecture`).

**What it shows.** It is the design at the level of components and flows, not a class diagram:
- every component this plan **adds or changes**, with the `shape` that matches its role (`service`, `database`, `queue`, `window`, `person`, …), and the existing components it calls or reuses;
- containers for app or service boundaries (`parent`), so ownership is visible;
- arrows for the P1 story's flow, numbered ①②③ in order, with lower-priority stories added only where they add a component or a path.

**Visual conventions:**
- new: solid with an accent `color`;
- changed: solid;
- reused and untouched: `dashed`;
- outside the system (3rd-party, other team): `cloud` or a `dashed` box.

**Trace rule applies to the picture.**
- Each new or changed component and each numbered arrow carries the spec ID it serves in its label, e.g. `② save draft (US1-AC2)`.
- A box or arrow that serves no spec point, risk or decision is over-engineering: remove it from the design, not only from the picture.
- Nothing appears in the diagram that is not in the plan (Decisions, Reuse map, Data model), and the reverse: every component in the Reuse map and the Data model appears in the diagram.

**Skip** only for a single-component change with no interaction (one file, no new caller or store). Then write `No diagram — single-component change` under the heading.

**Render fails** (no Chromium, no network for esm.sh): put the same design as a fenced `mermaid` `flowchart` block under the heading. Say so in the step summary.

Show the PNG to the user in the step summary (`SendUserFile`, `display: "render"`) along with the Decision summary. In review, the diagram is often what gets read first.

## Boundaries rules

- **Change surface comes from the design.** It holds every component the diagram marks new or changed, at module/folder level, with exact files where known. Reused, untouched components are not in it.
- **Do not touch** lists, each with a trace (`OOS-*`, `FR-U-*`, `RISK-*` or a decision):
  - what the change could plausibly drift into but must not, such as adjacent refactors, public APIs and schemas outside scope, new dependencies, and other teams' modules;
  - every `FR-U-*` surface.
- **A decision or diagram element that needs a path outside the change surface** means one of three things: widen the surface (with a trace), drop the element, or record an `OOS-*`. Never leave it implicit.
- **The boundaries bind every later step.** Tasks stay inside them, `analyze` checks them, and review/converge grade crossings.

Rules:
- **Every** `US*-AC*`, `FR-*`, `EC-*` and `SC-*` has at least one row in the test plan. Unchanged behavior (`FR-U-*`) is proven by existing or new tests that stay green.
- Each test must fail today for the right reason, never because of an import error.
- Mocks need a reason; integration tests prefer real dependencies. No flaky or timing-dependent tests.
- Decisions that are hard to reverse (data store, auth, API style, new dependency or pattern) carry full Decision/Rationale/Alternatives. Trivial ones are one line.

Set `plan.md` frontmatter `status: draft` when written.
