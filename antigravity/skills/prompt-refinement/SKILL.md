---
name: prompt-refinement
description: Pre-planning grill session that stress-tests a rough request against the codebase and domain model, sharpens terminology, and produces an execution-ready prompt for /plan. Use when requirements are vague, underspecified, or need validation before planning begins.
user-invocable: true
metadata:
  argument-hint: "[rough prompt, feature idea, or requirements draft]"
  agent-affinity:
    - business-analyst
    - planner
    - project-manager
    - developer
    - researcher
  keywords:
    - prompt
    - refinement
    - clarify
    - rewrite
    - requirements
    - acceptance-criteria
    - scope
    - constraints
    - business-logic
    - specification
    - grill
    - stress-test
  platforms:
    - all
  triggers:
    - /prompt-refinement
    - prompt refinement
    - refine prompt
    - improve prompt
    - rewrite prompt
    - clarify requirements
    - make this prompt better
    - grill me
    - grill this
    - stress-test this plan
---

# Prompt Refinement — Pre-Planning Grill

## Purpose

A structured interview that stress-tests a rough request against the existing codebase and domain model, sharpens terminology, and produces a clear, bounded, execution-ready prompt for `/plan`. This is the gate between "I want X" and "here's exactly how we'll build X."

## When Active

Use this skill when the input is:

- A vague feature request
- A rough implementation prompt
- A PRD/spec/user story draft
- A business logic description with missing rules or edge cases
- A research/design/review prompt that needs clearer scope
- A request to "make this prompt better" or "refine this before I plan it"

## Core Principles

1. **Codebase-first.** If a question can be answered by exploring the code, explore the code instead of asking the user.
2. **One question at a time.** The questioning mechanics are defined once, in [grilling.md](./references/grilling.md) — the interview loop this skill runs on. Read it before Step 7.
3. **Relentless precision.** Don't let fuzzy terms, vague boundaries, or unvalidated assumptions pass into the refined prompt.
4. **Update docs inline.** When a term is resolved, update `CONTEXT.md` immediately. When a decision crystallizes, offer an ADR.

### Division of Labour

| Concern | Owner |
|---------|-------|
| **How** to ask — one at a time, always recommend, facts vs decisions, dependency order, when to stop | [grilling.md](./references/grilling.md) |
| **What** to ask about — glossary conflicts, fuzzy terms, edge cases, business logic | This file, Steps 1–6 + Business Logic Checklist |
| **What comes out** — the refined prompt template and quality gate | This file, Step 9 |

`grilling.md` is skill-agnostic and reused by `/audit --architecture`. Don't fork or paraphrase it here — edit it in place if the loop needs changing.

## Workflow

### 1. Explore the Codebase

Before asking anything, ground yourself in the project:

- Search for `CONTEXT.md` or `CONTEXT-MAP.md` — load the domain glossary if it exists
- Search for `docs/adr/` — load recent Architecture Decision Records
- Read relevant source files the user's request touches
- Check existing documentation (README, docs/, specs/)
- Identify contradictions between the user's request and the actual code

If `CONTEXT.md` doesn't exist, note that you'll create one lazily when the first term is resolved.

### 2. Preserve Intent

Identify the user's actual goal before rewriting:

| Check | Question |
|-------|----------|
| Objective | What outcome does the user want? |
| Audience | Who or what will consume the output? |
| Scope | What is included and excluded? |
| Constraints | What rules, tools, files, deadlines, or standards apply? |
| Validation | How will the result be checked? |

Do not add features, architecture, tools, or business rules that the user did not imply.

### 3. Classify The Prompt

Choose the closest prompt type:

| Type | Add Emphasis |
|------|--------------|
| Implementation | files, behavior, constraints, tests, acceptance criteria |
| Business analysis | stakeholders, workflows, domain rules, edge cases, success metrics |
| Planning | goals, phases, dependencies, risks, agent/skill handoff |
| Research | decision to inform, source quality, recency, comparison criteria |
| Review/audit | review scope, severity scale, standards, expected report format |
| Documentation | audience, document type, tone, template, source material |
| Design | audience, brand, interaction goals, constraints, deliverables |

### 4. Challenge Against the Glossary

If the user uses a term that conflicts with `CONTEXT.md`, call it out immediately:

> *"Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"*

If no glossary exists yet, propose one as terms are resolved during the session.

### 5. Sharpen Fuzzy Language

When the user uses vague or overloaded terms, propose a precise canonical alternative:

> *"You're saying 'account' — do you mean the Customer or the User? Those are different things."*
>
> *"You mention 'fix the performance' — is this about response time, throughput, or memory usage?"*

Do not let ambiguous terms pass into the refined prompt.

### 6. Stress-Test with Concrete Scenarios

When domain relationships or business rules are involved, invent edge-case scenarios to force precision:

- What happens at the boundary? (empty input, max size, concurrent access)
- What's the failure mode? (network timeout, invalid state, partial completion)
- Who else is affected? (downstream systems, other users, background jobs)
- Cross-reference with code: does the user's claim match what the code actually does?

Surface contradictions:
> *"Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"*

### 7. Resolve Ambiguity — Run the Grilling Loop

Run the loop in [grilling.md](./references/grilling.md) as-is. Feed it the open items surfaced by Steps 4–6 (glossary conflicts, fuzzy terms, failed edge cases) and the unfilled rows of the Business Logic Checklist.

Escape hatch: if the user hasn't answered after 3 focused questions, stop looping and proceed with clearly stated assumptions:
> *"Assume X unless corrected"*
> *"Open question: Y"*
> *"Out of scope: Z"*

### 8. Update Documentation Inline

As terms and decisions crystallize during the session:

- **Update `CONTEXT.md`** immediately when a term is resolved. Use the format in [context-format.md](./references/context-format.md). `CONTEXT.md` is a glossary only — no implementation details.
- **Offer an ADR** only when all three criteria are met: hard to reverse, surprising without context, result of a real trade-off. Use the format in [adr-format.md](./references/adr-format.md). If any criterion is missing, skip the ADR.

### 9. Produce The Refined Prompt

Output the final prompt using this template:

```markdown
## Refined Prompt

Role: [best-fit agent/role]
Objective:
[specific outcome]

Context:
- [known context from codebase exploration]
- [files/systems/users involved]
- [glossary terms from CONTEXT.md if applicable]

Scope:
- In scope:
- Out of scope:

Requirements:
- [specific requirement]
- [business rule or constraint]

Acceptance Criteria:
- [testable criterion]
- [observable outcome]

Output Format:
- [artifact/report/code/doc format]
- [level of detail]

Validation:
- [tests, review checks, source checks, or stakeholder sign-off]

Assumptions:
- [assumption]

Open Questions:
- [question]
```

## Business Logic Checklist

When refining requirements or feature prompts, check for:

| Area | What To Clarify |
|------|-----------------|
| Actors | roles, permissions, ownership |
| Trigger | when the rule/workflow starts |
| Conditions | eligibility, limits, thresholds, flags |
| Result | system behavior, data changes, notifications |
| Exceptions | invalid states, failure handling, manual override |
| Lifecycle | states, transitions, reversibility |
| Metrics | success, conversion, risk, operational signals |
| Compliance | privacy, audit, retention, policy constraints |

## Quality Gate

Before finalizing, verify the refined prompt is:

- Specific enough to execute
- Bounded enough to avoid unrelated work
- Testable or reviewable
- Honest about assumptions
- Clear about output format
- Free of invented facts
- Aligned with the original intent
- Validated against the actual codebase (not just user claims)
- Consistent with existing glossary (CONTEXT.md) and decisions (ADRs)

## Output Options

If useful, include:

- **Quick version** — compact prompt for immediate use
- **Full version** — detailed prompt with context, criteria, and validation
- **Questions only** — when rewriting would require decisions the user has not made

## Handoff

After refinement, the user can pipe the result directly into `/plan`:

```
/prompt-refinement [rough idea]
# → refined prompt output
/plan [refined prompt]
```

## Related Documents

- [grilling.md](./references/grilling.md) — the interview loop (Step 7); reused by other skills
- [context-format.md](./references/context-format.md) — CONTEXT.md glossary format
- [adr-format.md](./references/adr-format.md) — Architecture Decision Record format
- `.claude/skills/plan/SKILL.md` — implementation planning (next step)
- `.claude/skills/core/SKILL.md` — operational boundaries
