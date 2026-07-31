---
name: plan
description: Use when user says "plan", "design this", "architect", "spec out", "how should we build", or "create a roadmap" — produces a phased implementation plan grounded in ADR standard, spec-driven development, and test-driven development
user-invocable: true
metadata:
  argument-hint: "[feature or task description]"
  agent-affinity:
    - planner
    - project-manager
  keywords:
    - plan
    - planning
    - requirements
    - tasks
    - estimation
    - roadmap
    - design
    - spec
    - architecture
    - blueprint
    - adr
    - tdd
    - sdd
  platforms:
    - all
  connections:
    enhances: []
  triggers:
    - /plan
    - create plan
    - implementation plan
---

# Plan — Spec-Driven, Test-First Implementation Planning

## Core Methodology

Every plan produced by this skill follows three interlocking standards:

| Standard | What It Means | Enforcement |
|----------|--------------|-------------|
| **ADR** (Architecture Decision Records) | Significant decisions are documented with context, rationale, and consequences before code is written | Mandatory ADR file for every architectural decision |
| **Spec-Driven Development (SDD)** | A testable specification is the single source of truth — architecture and implementation derive from the spec | Spec written before any phase file; every task maps to a spec requirement |
| **Test-Driven Development (TDD)** | Tests are written before implementation; Red→Green→Refactor cycle is explicit per task | Test file listed before implementation file in every task table |

---

## Methodology Auto-Detection (REQUIRED — run before planning)

Analyze the task/prompt to determine which methodology applies. Apply all that match — they compose.

### When to Apply SDD (Spec-Driven Development)

Apply SDD when the task involves **new behavior that can be described as requirements**:

| Signal | Examples |
|--------|---------|
| New feature or capability | "add user login", "implement search", "build payment flow" |
| API contract needed | "create endpoint", "design service interface", "define schema" |
| User-facing behavior | any change a user or caller can observe |
| Multiple stakeholders or teams | contract must be agreed before coding begins |
| Ambiguous requirements | "make it work better" → clarify into REQ-F-* before proceeding |

**Skip SDD when**: pure refactoring with no behavior change, configuration change only, fixing a typo.

### When to Apply ADR (Architecture Decision Records)

Create an ADR when a decision is **hard to reverse or system-wide**:

| Signal | Examples |
|--------|---------|
| Choosing a persistence layer | SQL vs NoSQL, which ORM |
| Selecting an auth strategy | JWT vs session, OAuth provider |
| Introducing a new pattern | first use of CQRS, event sourcing, Repository pattern |
| Picking a framework or library | adding a new major dependency |
| API design style | REST vs GraphQL, versioning strategy |
| Deviating from the spec | deferring a requirement, changing scope |
| Cross-cutting concerns | error handling strategy, logging standard, caching policy |

**Skip ADR when**: decision is local to one file, easily reversible, follows an established pattern already documented.

### When to Apply TDD (Test-Driven Development)

Apply TDD when the task produces **verifiable behavior**:

| Signal | Examples |
|--------|---------|
| New functions, methods, components | anything with inputs and outputs |
| Bug fixes | write a failing test that reproduces the bug first |
| Refactoring | existing tests must stay green; add missing tests first |
| API endpoints | contract tests before implementation |
| Business logic | calculations, validations, state transitions |

**Skip TDD when**: infrastructure setup (Dockerfile, CI config), pure documentation, one-off migration scripts with no reuse.

### Auto-Selection Decision Table

Read the task, check signals, select the combination:

| Task Type | SDD | ADR | TDD |
|-----------|-----|-----|-----|
| New feature (user-facing) | ✅ | maybe¹ | ✅ |
| New API / service | ✅ | ✅ | ✅ |
| Bug fix | — | — | ✅ |
| Refactor (no behavior change) | — | maybe² | ✅ |
| Architecture design | ✅ | ✅ | — |
| Configuration / infra | — | maybe³ | — |
| Pure documentation | — | — | — |
| Performance optimization | — | maybe⁴ | ✅ |
| Security hardening | ✅ | ✅ | ✅ |

¹ ADR if a significant technical choice is made during the feature  
² ADR if the refactor introduces a new structural pattern  
³ ADR if choosing between deployment strategies  
⁴ ADR if adopting a new caching or batching strategy

**Output**: State the selected combination at the top of `plan.md` before writing any other section:
```markdown
## Methodology
- SDD: yes | no — [reason]
- ADR: yes | no — [reason]
- TDD: yes | no — [reason]
```

---

## Delegation — REQUIRED

This skill MUST run via the `planner` agent, not inline.

**When `/plan` or planning intent is detected:**
1. Use the **Agent tool** to spawn `planner`
2. Pass the full user request + active context (branch, plan dir, CWD)
3. Do NOT execute planning steps inline in the main conversation

---

## Before You Begin — Purpose Clarification

Before creating the plan, clarify the following if not already stated in the request:

- **Purpose** — What problem or goal does this address?
- **Goals** — What does success look like?
- **Target** — Who will execute this plan? What platform or team does it serve?

Skip if the request already makes these clear.

---

## Step 0 — Flag Override

If `$ARGUMENTS` starts with `--fast`: skip auto-detection, load `references/fast-mode.md` and execute.
If `$ARGUMENTS` starts with `--deep`: skip auto-detection, load `references/deep-mode.md` and execute.
If `$ARGUMENTS` starts with `--parallel`: skip auto-detection, load `references/parallel-mode.md` and execute.
If `$ARGUMENTS` starts with `--validate`: skip auto-detection, load `references/validate-mode.md` and execute.
If `$ARGUMENTS` starts with `--feature`: skip auto-detection, load `references/feature-analysis-mode.md` and execute.
Otherwise: continue to Complexity Auto-Detection.

## Aspect Files

| File | Purpose |
|------|---------|
| `references/fast-mode.md` | Quick plan from codebase analysis only, no research |
| `references/deep-mode.md` | Deep plan with sequential research and comprehensive analysis |
| `references/parallel-mode.md` | Dependency-aware plan with file ownership matrix for parallel execution |
| `references/validate-mode.md` | Validate plan with critical questions interview |
| `references/feature-analysis-mode.md` | Gate-based feature planning: business reqs → UI/UX → solutions → architecture → implementation with design patterns |
| `references/state-machine-guide.md` | State machine notation, patterns, and validation checklist |
| `references/planning-flow.dot` | Planning flow diagram |
| `references/spec-template.md` | Specification template with examples |
| `references/task-breakdown-template.md` | Task decomposition with effort estimation, dependencies, acceptance criteria |
| `references/verification-checklist.md` | Comprehensive verification checklist |

---

## Planning Sequence (Mandatory Order)

```
1. SPEC → 2. ADRs → 3. Architecture → 4. Test Plan → 5. Implementation Phases
```

**Never write implementation phases before the spec and ADRs are complete.**

---

## 1. Spec-Driven Development (SDD)

The specification is the contract. Everything — ADRs, architecture, tasks, tests — derives from it.

### Spec Format (Mandatory in `plan.md`)

```markdown
## Specification

### Feature / Goal
[One sentence: what does the user get?]

### Requirements

#### Functional (REQ-F-NNN)
- **REQ-F-001**: [Behavior the system must exhibit — user action + system response]
- **REQ-F-002**: ...

#### Non-Functional (REQ-NF-NNN)
- **REQ-NF-001**: [Constraint — performance, security, scalability, accessibility]

#### Edge Cases (REQ-EC-NNN)
- **REQ-EC-001**: [Scenario that could fail or behave unexpectedly]

### Success Criteria
- [ ] REQ-F-001 implemented and verified by test `test_name`
- [ ] REQ-F-002 implemented and verified by test `test_name`
- [ ] REQ-NF-001 measured and within target
- [ ] Coverage ≥ 80% for all new code
- [ ] No regressions in existing tests
```

### SDD Rules
- Every task MUST reference at least one `REQ-*` ID
- Every `REQ-F-*` MUST have a corresponding test
- Spec is frozen before architecture begins; changes require an ADR
- API contracts (OpenAPI/interface definitions) are written in the spec phase, not during implementation

---

## 2. ADR Standard

Create an ADR for every decision that is:
- Hard to reverse (database choice, auth strategy, API design pattern)
- System-wide in impact (new framework, data model, event system)
- Contentious (multiple valid approaches with real trade-offs)
- A deviation from existing patterns in the codebase

### ADR File Location
```
plans/{slug}/adrs/ADR-{NNN}-{descriptive-slug}.md
```

### ADR Format (Mandatory)

```markdown
# ADR-{NNN}: {Title}

**Status**: Proposed | Accepted | Deprecated | Superseded by ADR-{NNN}
**Date**: YYYY-MM-DD
**Deciders**: [agent or role names]

## Context
[What is the situation that forces this decision? What constraints exist?]

## Decision
[The decision made, stated clearly in one paragraph.]

## Consequences

### Positive
- ...

### Negative
- ...

### Risks
- ...

## Alternatives Considered

| Option | Pros | Cons | Why Rejected |
|--------|------|------|--------------|
| Option A | ... | ... | ... |
| Option B | ... | ... | ... |

## Related
- Implements: REQ-F-NNN, REQ-NF-NNN
- Supersedes: ADR-NNN (if applicable)
```

### When to Create ADRs
| Trigger | Example ADR |
|---------|------------|
| Choosing a data store | ADR-001: Use PostgreSQL for task storage |
| Selecting auth strategy | ADR-002: JWT with refresh tokens |
| Defining API pattern | ADR-003: REST over GraphQL for this service |
| New architectural pattern | ADR-004: Repository pattern for data access |
| Deviating from spec | ADR-005: Defer REQ-F-003 to phase 2 |

Link every ADR from `plan.md`:
```markdown
## Architecture Decisions
- [ADR-001: Use PostgreSQL](./adrs/ADR-001-postgresql.md) — Accepted
- [ADR-002: JWT Auth](./adrs/ADR-002-jwt-auth.md) — Accepted
```

---

## 3. Test-Driven Development (TDD)

Tests are written BEFORE implementation. Each task follows Red→Green→Refactor.

### TDD Task Structure (Mandatory per task)

Every implementation task MUST follow this order in the task table:

```markdown
| Step | Action | Deliverable | Requirement |
|------|--------|-------------|-------------|
| 1 | Write failing tests | `src/x.test.ts` | REQ-F-001 |
| 2 | Implement minimum to pass | `src/x.ts` | REQ-F-001 |
| 3 | Refactor | `src/x.ts` | — |
| 4 | Verify coverage ≥ 80% | coverage report | REQ-NF-001 |
```

### Test Plan Section (Required in each phase file)

```markdown
## Test Plan

### Unit Tests
| Test File | Tests | Coverage Target | Requirement |
|-----------|-------|-----------------|-------------|
| `src/x.test.ts` | `describe("X")`: should do A, should handle B, should reject C | ≥ 80% | REQ-F-001 |

### Integration Tests
| Test File | Scenario | Requirement |
|-----------|----------|-------------|
| `tests/x.integration.test.ts` | Full flow: input → transform → output | REQ-F-001 |

### E2E Tests (if applicable)
| Test File | User Flow | Requirement |
|-----------|-----------|-------------|
| `e2e/x.spec.ts` | User triggers X → sees Y | REQ-F-001 |

### Test Exclusions
[List scenarios explicitly NOT tested in this phase and why]
```

### TDD Rules
- Test file appears BEFORE implementation file in every task table
- Tests reference `REQ-*` IDs they cover
- Coverage target stated upfront (default ≥ 80%)
- Mocks must be justified (integration tests prefer real dependencies)
- Flaky or timing-dependent tests are forbidden

### Test Pyramid
```
         E2E (few, slow)
        Integration (moderate)
      Unit (many, fast)   ← Start here
```
Plan test effort proportionally: ~60% unit, ~30% integration, ~10% E2E.

---

## Plan Output Contract

Every plan is a **directory**:

```
plans/{YYMMDD-HHMM-slug}/
  plan.md                    — spec, ADR index, phases table, success criteria
  adrs/
    ADR-001-{slug}.md        — one file per architectural decision
  phase-{N}-{slug}.md        — test plan + tasks + implementation + verification
```

**plan.md frontmatter** (required fields):
```yaml
---
title: "Short description"
status: draft | active | completed | archived
created: YYYY-MM-DD
updated: YYYY-MM-DD
effort: Xh
phases: N
platforms: [all | ios | android | web | backend]
breaking: true | false
---
```

**phase file frontmatter** (required fields):
```yaml
---
phase: N
title: "Phase title"
effort: Xh
depends: []   # phase numbers this phase depends on
---
```

**Phases table in plan.md must link to phase files:**
```markdown
| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | Name | 2h | pending | [phase-1](./phase-1-slug.md) |
```

---

## Phase File Structure (Required Sections in Order)

```markdown
---
phase: N
title: "..."
effort: Xh
depends: []
---

## Requirements Addressed
- REQ-F-001, REQ-F-002, REQ-NF-001

## Test Plan
[See TDD section above — REQUIRED before tasks]

## Tasks

| Step | Action | Deliverable | Requirement | Effort |
|------|--------|-------------|-------------|--------|
| 1 | Write failing tests for X | `x.test.ts` | REQ-F-001 | 1h |
| 2 | Implement X | `x.ts` | REQ-F-001 | 2h |
| 3 | Refactor X | `x.ts` | — | 30m |

## Task Breakdown (verbose)

### Task 1: Write failing tests for X
- **Description**: Create test file covering golden path + edge cases for REQ-F-001
- **Acceptance**: Tests exist, fail for the right reason (not import errors)
- **Effort**: 1h
- **Blockers**: None

### Task 2: Implement X
- **Description**: Minimum implementation to make tests pass
- **Acceptance**: All tests from Task 1 pass; no unrelated tests broken
- **Effort**: 2h
- **Blockers**: Task 1 complete

## Implementation Details
[File-by-file, line-level instructions]

## Agent & Skills
- **Agent**: `developer`
- **Skills**: `golang-pro`, `postgres-pro`
- **Handoffs**:
  - After completion → `code-reviewer`

## Verification Checklist
[See Verification section below]
```

---

## Plan Lifecycle

```
draft → active → completed → archived
```

| Action | Command |
|--------|---------|
| Activate | `node .claude/scripts/set-active-plan.cjs plans/{slug}` |
| Complete | `node .claude/scripts/complete-plan.cjs plans/{slug}` |
| Archive | `node .claude/scripts/archive-plan.cjs plans/{slug}` |
| Board | `plans/README.md` — updated by scripts automatically |

**MANDATORY final step** — after writing all plan files, run:
```bash
node .claude/scripts/set-active-plan.cjs plans/{slug}
```

---

## Complexity Auto-Detection

Use signal scoring, not sentence length. Scan the request for escalation signals before choosing a mode.

### Signal Table

| Signal | Keywords / Patterns | Mode |
|--------|---------------------|------|
| New user-facing feature | "new feature", "user story", "add feature", "end-to-end", "onboarding", "checkout", "auth flow", "payment", "design system component" | `:feature` |
| Cross-module / cross-platform | "multiple platforms", "web and mobile", "frontend and backend", "service boundary", "microservice", "API + UI" | `:parallel` |
| Explicit dependency structure | "dependencies", "phases", "parallel", "ownership matrix", "5+ files" implied | `:parallel` |
| Research or investigation needed | "research", "investigate", "compare", "best approach", "what's the right way", "library selection", "migration", "security concern", "ADR" | `:deep` |
| Simple bounded scope | single bug fix, single function, rename, config change, clear 1-2 file scope, no cross-module signals | `:fast` |

### Scoring Rules

1. **`:feature` check first** — any user-facing feature with business value → always `:feature`, skip other checks
2. **`:parallel` check** — cross-module or multi-platform signals → `:parallel`
3. **`:deep` check** — research or investigation needed → `:deep`
4. **`:fast` default** — only when scope is clearly bounded AND no escalation signals present
5. **Ambiguous → ask** — if signals conflict (e.g. "single sentence but mentions auth flow and mobile"), ask user: "This looks like a feature — should I use `--feature` mode for gate-based planning?"

**Sentence length is NOT a signal.** A one-sentence request can be complex. Check the content, not the length.

## Planning Heuristics

- Request is new user-facing feature → `:feature`
- Request mentions research, investigation, or library comparison → `:deep`
- Request mentions multiple platforms, modules, or explicit parallelism → `:parallel`
- Request mentions "dependencies" or "phases" → `:parallel`
- Clear single-file or single-function scope, no escalation signals → `:fast`
- If unsure → ask rather than defaulting silently

---

## Feature Analysis Framework (for `--feature` mode)

Full reference: `references/feature-analysis-mode.md`

Gate-based flow — each gate produces a deliverable for user review before proceeding:

```
Gate 1: Business Requirements → Gate 2: UI/UX Exploration → Gate 3: Solutions & Approaches → Gate 4: Architecture + ADRs → Implementation Phases (TDD)
```

### Gate 1 — Business Requirements (`analysis/business-requirements.md`)
- Problem statement and user pain point
- User stories with acceptance criteria (Given/When/Then)
- **Requirement IDs assigned here** (REQ-F-*, REQ-NF-*, REQ-EC-*)
- Success metrics (measurable targets)
- Constraints (business, technical, timeline)
- Edge cases and failure scenarios
- Scope boundaries (in-scope / out-of-scope / future)

### Gate 2 — UI/UX Exploration (`analysis/ui-ux-exploration.md`) — frontend only
- User flow diagrams (ASCII or Mermaid)
- Screen inventory with data needs per screen
- Component hierarchy (tree structure)
- Interaction patterns (taps, gestures, animations)
- Responsive behavior (mobile/tablet/desktop)
- Accessibility considerations (WCAG 2.1 AA)

### Gate 3 — Solutions & Approaches (`analysis/solutions-approaches.md`)
- 2-3 implementation approaches with detailed pros/cons
- Trade-off matrix (time, maintainability, performance, scalability, DX)
- Recommended approach with justification tied to spec requirements
- Technical risks per approach with mitigation

### Gate 4 — Architecture + ADRs (`analysis/architecture-design.md`)
- **Create ADR files** for every significant decision made here
- API contract (OpenAPI spec or interface definitions) — written here, not during implementation
- Frontend: routing table, component tree, state management strategy
- Backend: ER diagram, service boundaries, auth strategy, caching, DB schema
- Fullstack: explicit API contract as shared boundary

| Feature Side | Agent(s) | Focus |
|-------------|----------|-------|
| Frontend only | `frontend-architect` | Routing, components, state, API consumption |
| Backend only | `backend-architect` | API contract, data model, auth, caching, DB schema |
| Fullstack | `backend-architect` → `frontend-architect` | Both, with API contract as boundary |

### Implementation Phases — after gates approved, follow TDD
Each phase: test plan first, then implementation tasks.
Max per phase: 3-4 files, 200 LOC.

---

## Verification Checklist — Per Phase

```markdown
## Verification

### Tests
- [ ] All planned tests exist and run
- [ ] All tests pass (100%)
- [ ] Coverage ≥ target (stated in test plan)
- [ ] No flaky or timing-dependent tests
- [ ] Test names clearly describe behavior

### Manual Testing
- [ ] Feature works per spec (golden path tested)
- [ ] Edge cases (REQ-EC-*) behave as designed
- [ ] Error messages are clear

### Code Quality
- [ ] Linter passes (no warnings or errors)
- [ ] Type checker passes (`tsc --noEmit` or equivalent)
- [ ] No dead code
- [ ] Naming is clear and consistent

### ADR Compliance
- [ ] All architectural decisions have ADRs
- [ ] ADRs are linked from plan.md
- [ ] No undocumented deviations from spec

### Spec Compliance
- [ ] Every REQ-F-* in this phase is implemented
- [ ] Every REQ-NF-* is measured and within target
- [ ] Every REQ-EC-* is handled and tested

### Security (if applicable)
- [ ] No secrets in code
- [ ] Input validation in place
- [ ] Auth/authz enforced correctly

### Regression
- [ ] Existing tests still pass
- [ ] No unintended side effects
```

---

## State Machine Modeling

When feature involves stateful behavior (UI flows, protocols, async state, workflows), generate ASCII state diagram BEFORE coding:

1. List all states (including error, timeout, edge states)
2. Map every transition (trigger + guard conditions)
3. Identify terminal states and dead ends
4. Mark states where data is mutated

```
[INITIAL] ──(event)──▸ [STATE_A]
    │                      │
    │                  (condition)
    │                      ▼
    │               [STATE_B] ──(error)──▸ [ERROR]
    │                      │
    │                  (success)
    │                      ▼
    └──────────────▸ ◉ [DONE]
```

See `references/state-machine-guide.md` for notation and validation checklist.

---

## Agent & Skill Analysis — REQUIRED for Every Plan

Before generating any phase file, scan `.claude/agents/` and `.claude/skills/skill-index.json`.

### Agents Available
| Agent | Best For |
|-------|----------|
| `developer` | Go/Node APIs, PostgreSQL, auth, REST, migrations, React, TanStack Start, TypeScript |
| `tester` | unit/integration/E2E test suites, coverage |
| `devops-engineer` | Docker, CI/CD, infra, cloud deployments |
| `security-auditor` | OWASP audit, secrets scan, auth hardening |
| `code-reviewer` | post-implementation code quality review |
| `git-manager` | commit, push, PR creation |
| `planner` | planning, research coordination |
| `backend-architect` | API contracts, DB schema, ADRs |
| `frontend-architect` | routing hierarchy, component design |
| `researcher` | best practices, library research |
| `debugger` | root cause analysis, stack trace diagnosis |
| `docs-manager` | docs write/update/migrate |

### Domain → Skills Mapping
| Domain Signal | Skills to Activate |
|---------------|--------------------|
| Go backend | `golang-pro`, `postgres-pro` |
| Python / FastAPI backend | `fastapi-python`, `postgres-pro` |
| Auth/OAuth/JWT | `golang-pro`, `typescript-pro` |
| React / TanStack Start | `react-expert`, `typescript-pro`, `web-frontend` |
| Next.js App Router | `nextjs-developer`, `react-expert` |
| TypeScript frontend | `typescript-pro`, `javascript-pro` |
| E2E / browser testing | `playwright-expert`, `web-testing`, `test` |
| CI/CD / infra | `infra-docker` |
| Security | `security-reviewer`, `code-review` |

### Phase Agent & Skills Section (Required)
```markdown
## Agent & Skills

- **Agent**: `developer`
- **Skills**: `golang-pro`, `postgres-pro`
- **Handoffs**:
  - After completion → `code-reviewer` (quality gate)
  - On security concern → `security-auditor`
```

---

## Plan Review Integration

When a plan exists, agents performing code review MUST:

1. Read the active plan before reviewing code
2. Cross-reference each changed file against plan phases
3. Verify implementation matches spec requirements (REQ-* IDs)
4. Verify ADRs were followed (no undocumented deviations)
5. Flag deviations as review findings (severity: Medium)
6. Check test coverage meets the target stated in the test plan

---

## Mode Reference

| Flag | Reference | When |
|------|-----------|------|
| `--fast` | `references/fast-mode.md` | Quick lightweight plan |
| `--deep` | `references/deep-mode.md` | Thorough multi-phase with research |
| `--parallel` | `references/parallel-mode.md` | Parallelizable phases with ownership matrix |
| `--validate` | `references/validate-mode.md` | Validate existing plan |
| `--feature` | `references/feature-analysis-mode.md` | Gate-based: business reqs → UI/UX → solutions → architecture → TDD phases |

<request>$ARGUMENTS</request>
<platform>{{detected_platform or "none"}}</platform>
