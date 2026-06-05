---
name: prompt-refinement
description: Use when a user wants to refine, improve, clarify, rewrite, or make a prompt/spec/task request more effective before an agent works on it. Also use when requirements are vague, business logic is underspecified, acceptance criteria are missing, or an implementation/research/design prompt needs clearer scope, constraints, context, output format, or validation steps.
user-invocable: true
metadata:
  argument-hint: "[rough prompt, feature idea, or requirements draft]"
  agent-affinity:
    - business-analyst
    - planner
    - project-manager
    - developer
    - researcher
    - docs-manager
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
---

# Prompt Refinement

## Purpose

Convert rough requests into clear, bounded, execution-ready prompts without changing the user's intent. The refined prompt should make the next agent's job obvious: what to inspect, what to produce, what constraints matter, and how success will be judged.

## When Active

Use this skill when the input is:

- A vague feature request
- A rough implementation prompt
- A PRD/spec/user story draft
- A business logic description with missing rules or edge cases
- A research/design/review prompt that needs clearer scope
- A request to "make this prompt better" or "refine this before I run it"

## Workflow

### 1. Explore Before Asking

**Codebase-first rule:** If a question can be answered by exploring the code, explore the code instead of asking the user.

Before drafting questions:

- Search for existing documentation (CONTEXT.md, docs/, README.md, ADRs in docs/adr/)
- Check if the user's claims match the actual code
- Look for existing terminology/glossary in CONTEXT.md or similar
- Identify contradictions between the request and the codebase

Surface contradictions immediately:
> *"Your request assumes X, but the code actually does Y — which is correct?"*

### 2. Preserve Intent

Identify the user's actual goal before rewriting:

| Check | Question |
|-------|----------|
| Objective | What outcome does the user want? |
| Audience | Who or what will consume the prompt? |
| Scope | What is included and excluded? |
| Constraints | What rules, tools, files, deadlines, or standards apply? |
| Validation | How will the result be checked? |

Do not add features, architecture, tools, or business rules that the user did not imply. Mark uncertain items as assumptions or open questions.

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

### 4. Sharpen Fuzzy Language

Actively call out vague or overloaded terms. Propose precise canonical alternatives:

> *"You're saying 'account' — do you mean the Customer or the User? Those are different things."*
>
> *"You mention 'fix the performance' — is this about response time, throughput, or memory usage?"*

Do not let ambiguous terms pass into the refined prompt. Every term should be unambiguous.

### 5. Stress-Test with Concrete Scenarios

When domain relationships or business rules are involved, invent edge-case scenarios to force precision:

- What happens at the boundary? (empty input, max size, concurrent access)
- What's the failure mode? (network timeout, invalid state, partial completion)
- Who else is affected? (downstream systems, other users, background jobs)

Surface these as open questions or assumptions in the refined prompt.

### 6. Resolve Ambiguity

Ask questions one at a time, waiting for feedback on each before continuing. For each question, provide your recommended answer.

If the user hasn't answered after 3 focused questions, proceed with clearly stated assumptions:
> *"Assume X unless corrected"*
> *"Open question: Y"*
> *"Out of scope: Z"*

Prefer:
- "Assume X unless corrected"
- "Open question: Y"
- "Out of scope: Z"

Avoid:
- Large interview lists
- Scope expansion
- Generic prompt-engineering advice
- Hidden implementation decisions

### 7. Produce The Refined Prompt

Use this template by default:

```markdown
## Refined Prompt

Role: [best-fit agent/role]
Objective:
[specific outcome]

Context:
- [known context from codebase exploration]
- [files/systems/users involved]

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

## Output Options

If useful, include:

- **Quick version** — compact prompt for immediate use
- **Full version** — detailed prompt with context, criteria, and validation
- **Questions only** — when rewriting would require decisions the user has not made

## Related Documents

- `.claude/skills/plan/SKILL.md` — implementation planning
- `.claude/skills/core/SKILL.md` — operational boundaries
- `.claude/skills/doc-coauthoring/SKILL.md` — collaborative PRD/spec drafting
