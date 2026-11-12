# Decision log — format and rules

`<work dir>/decision-log.md` is the **single full record** of how a work item's acceptance criteria
(mode `ac`) and solution approach (mode `approach`) were decided. Other places point at it instead of repeating it:

| Place | Holds | Points at |
|---|---|---|
| `spec.md` ACs / EC / FR / OOS | the decided behavior | `— DEC-nnn, A-nnn` at line end |
| `spec.md` `## Clarifications` | one line per answer | `Qn → DEC-nnn` |
| `plan.md` `## Decision summary` | ≤10 lines of design decisions | the DEC IDs it relies on |
| Ticket description (plan Phase 7, on your yes) | `### Key decisions` table | — (IDs stripped from ACs) |
| PR body Reviewer notes | ≤2 key decisions | `DEC-nnn` |

Written by the `ai-kit:brainstormer` skill (DEC entries, main session) and agent (seed, synthesis). Appended to by `ai-kit:plan clarify` when it settles
a new question on a story that has a log.

## Rules

- **Write after every round**, before computing the next one. A crash loses at most the round in flight.
- **IDs are permanent.** `DEC-`, `A-`, `OQ-` count up from 001 per log. A changed decision is a new DEC
  with `supersedes: DEC-x`; the old one gets `Status: superseded by DEC-y`. A dropped one gets
  `Status: withdrawn — <why>`. Never edit the Decision line of a recorded DEC.
- **Decided by** is a person or role, never "agent". A recommendation the user accepted with "yes" is
  decided by the user. A default the user explicitly delegated ("your call") is
  `Decided by: <user> (delegated default)`.
- **Type** routes ownership: `scope` and `business` → the business owner from project rules or the profile; `ux` → UX/PO;
  `technical-constraint` and `approach` → tech lead. `approach` DECs come from mode `approach` only;
  lower-level implementation choices still belong to `plan design`.
- **Affects** is filled at synthesis: every AC / EC / FR / OOS the decision produced or shaped (an
  `approach` DEC: `Agreed approach` or the plan step it constrains). A DEC
  that affects nothing is either withdrawn or a missing AC — the exit check flags it.

## Template

```markdown
---
subject: <TICKET-KEY or intention-name> — <title>
profile: <profile name> (<path>)
mode: ac | approach         # the mode of the last session; both may run on one log
status: in-progress | confirmed
created: YYYY-MM-DD
confirmed_by: <name>        # set at the gate
confirmed_on: YYYY-MM-DD
---
# Decision log — <title>

## Seed
- Ticket: <key + link, or "none">
- Material read: <sibling tickets, epic, docs, code areas — one line each>
- Convention sources read: <files from the profile>

## Stated assumptions
Settled from material, not asked. An AC resting only on one of these is marked `[assumed — confirm]`.

| ID | Assumption | Basis |
|---|---|---|
| A-001 | <statement> | <source: ticket section, sibling PROJ-100 AC-3, file:line> |

## Decisions

### DEC-001 — <short title>
- Round / question: R1 · Q3
- Axis: <axis from question-axes.md or the profile>
- Type: scope | business | ux | technical-constraint | approach
- Question: <as asked>
- Options: A) <…> · B) <…> · C) <…>
- Recommended: A — <why>
- Decision: <the answer, in words a tester understands>
- Decided by: <name / role> · YYYY-MM-DD
- Rationale: <user's reason, if given>
- Depends on: DEC-000 | —
- Supersedes: — | DEC-x
- Affects: US1-AC2, EC-001, OOS-002
- Status: accepted | superseded by DEC-y | withdrawn — <why>

## Open questions

| ID | Question | Tier | Owner | Blocks |
|---|---|---|---|---|
| OQ-001 | <question> | gap \| ambiguity | <role/name> | US2-AC1 \| — |

## Axis coverage

| Axis | Result |
|---|---|
| Actors & permissions | DEC-002, DEC-004 |
| Concurrency | n/a — single-user setting screen |

## Frontier
Questions ready for the next round (prerequisites decided):
- <title> — depends on DEC-00x

## Agreed approach
Mode `approach` only: chosen option + DECs behind it, rejected options + why, risks, what `plan design` must respect.

## Critique
Grounding x/5 · Completeness x/5 · Traceability x/5 · Testability x/5 — weakest part: <~60 words>
```
