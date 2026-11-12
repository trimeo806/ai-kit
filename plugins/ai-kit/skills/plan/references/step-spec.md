# Step `spec` — write `spec.md` with the user

Writes the source of truth: WHAT and WHY. It is an interactive session in the main conversation, because the user owns the spec.

**Runs when** the plan dir has no `spec.md`, or on `plan spec`. Running it again on an existing spec revises it in place, keeping the IDs.

## Session

0. **Grill first when the ACs aren't there.** If the plan dir has `decision-log.md` with
   `status: in-progress`, resume `ai-kit:brainstormer` instead of drafting here. Otherwise, when the
   ticket has no Given/When/Then ACs, the request is vague, or the story touches several actions or
   roles, offer (one `AskUserQuestion`): *Grill the ACs with `/ai-kit:brainstormer`* (recommended:
   multi-round, every decision logged) or *Draft here in one round*. Clear tickets skip this question.
1. **Seed.** Gather the raw intent:
   - **Ticket:** Phase 1 of `${CLAUDE_PLUGIN_ROOT}/references/shared/ticket-planning-flow.md` (ticket graph: description, PO decisions, out of scope, shipped sibling and its ACs).
   - **Feature:** the request text. If the request is one line, ask the user (one `AskUserQuestion`) for the who, the problem and the outcome.
   - Peek at the code only to name existing behavior that must stay unchanged (`FR-U-*`), never to design.
2. **Draft.** Fill the template below. Mark real unknowns `[NEEDS CLARIFICATION]` (at most 3) and turn everything else into an Assumption.
3. **Review with the user.** Show the stories, their priorities and the Out of scope list. Ask one `AskUserQuestion` round, with a recommended answer for each question:
   - "Is the P1 story the right MVP?"
   - "Anything in Out of scope (`OOS-*`) that must be in, or anything in the stories that should move out?"
   - plus any decision you could not default.
   Apply the answers.
4. **Write** `spec.md` (`status: draft`). For a ticket, keep any Gherkin ACs the ticket already has, with their numbering as `US*-AC*` and the source noted.

## Template
Technology-agnostic: no frameworks, files or APIs. A product owner should be able to read it.

```markdown
---
title: "Feature name"
status: draft | clarified
created: YYYY-MM-DD
---
# Spec: [Feature]

## User stories
### US1 — [title] (P1)
[Plain-language journey]
**Independent test**: [how this story alone is demonstrated working]
**Acceptance scenarios**:
- **US1-AC1**: Given [state], When [action], Then [outcome]
- **US1-AC2**: Given …, When …, Then …

### US2 — [title] (P2)
…

## Edge cases
- **EC-001**: [boundary / error condition] → [expected behavior]

## Requirements
- **FR-001**: System MUST [capability]
- **FR-002**: System MUST [capability] [NEEDS CLARIFICATION: …]
- **FR-U-001** (unchanged): [existing behavior that must stay as-is]

## Success criteria
- **SC-001**: [measurable outcome, e.g. "search returns in < 1s for 10k rows"]

## Key entities (if data is involved)
- **[Entity]**: [what it represents, key attributes, relationships]

## Assumptions
- [default chosen where the request was silent]

## Out of scope
- **OOS-001**: [behavior/capability not built here] — why: [reason] — goes to: [PROJ-123 | later | never]

## Clarifications
- [YYYY-MM-DD] Q: … → A: …
```

Rules:
- Stories are prioritized (P1 = MVP), and each one is independently testable.
- Every requirement is testable and unambiguous. "Fast" is not; "< 1s p95" is.
- **Out of scope is explicit and numbered.** Each `OOS-*` names what is excluded, why, and where it goes. A behavior is never both in a story/FR and in `OOS-*`. Anything the user rejected during review becomes an `OOS-*`, so it can't drift back in.
- Use at most 3 `[NEEDS CLARIFICATION]` markers, kept for choices that change scope, security or UX. Everything else becomes an Assumption.
