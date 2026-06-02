---
name: plan-feature
description: "Full feature planning: business requirements, UI/UX exploration, solutions, architecture, phased implementation with design patterns"
user-invocable: false
disable-model-invocation: true
metadata:
  argument-hint: "[feature description]"
  connections:
    extends: [plan]
    conflicts: [plan-fast, plan-deep, plan-parallel]
---

# Plan Feature Variant

Comprehensive feature planning with 4 analysis phases + phased implementation. Produces reviewable deliverables at each gate.

## When to Use

- New feature with business/user value
- Request explicitly uses `--feature` flag
- Complexity score 3-5 (router auto-routes)
- Feature spans frontend and/or backend with non-trivial design decisions

## Gate-Based Flow

```
Gate 0: Clarify → Gate 1: Business Req → Gate 2: UI/UX → Gate 3: Solutions → Gate 4: Architecture → Implementation Phases
         (auto)      (user review)       (user review)    (user review)      (user review)          (user review per phase)
```

Each gate produces a deliverable. User reviews before proceeding.

## Execution Steps

### 1. Parse & Setup

Extract from $ARGUMENTS: original_request, detected_platform, codebase_context.

Create plan directory:
```
plan_slug = sanitized original_request (lowercase, hyphens, 40 chars max)
plan_path = plans/YYMMDD-HHMM-{plan_slug}/
  ├── analysis/
  │   ├── business-requirements.md
  │   ├── ui-ux-exploration.md      (frontend only)
  │   ├── solutions-approaches.md
  │   └── architecture-design.md
  ├── research/                       (if deep research needed)
  ├── phase-01-{slug}.md
  ├── phase-02-{slug}.md
  └── plan.md
```

### 2. Platform Detection + Agent Assignment

Detect platform per `skill-discovery` protocol.

Assign analysis agents:

| Analysis Phase | Agent | Output |
|---------------|-------|--------|
| Business Requirements | `planner` | `analysis/business-requirements.md` |
| UI/UX Exploration | `frontend-architect` or `design-specialist` | `analysis/ui-ux-exploration.md` |
| Solutions & Approaches | `planner` + `researcher` | `analysis/solutions-approaches.md` |
| Architecture Design | `backend-architect` and/or `frontend-architect` | `analysis/architecture-design.md` |
| Implementation Phases | `planner` | `phase-{N}-*.md` files |

Implementation phase agent assignment per domain signal table (same as deep-mode.md).

### 3. Gate 1 — Business Requirements

**Output**: `analysis/business-requirements.md`

```markdown
# Business Requirements: {Feature Name}

## Problem Statement
{What problem does this solve? Who is affected?}

## User Stories
| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|-----------|----------|
| US-1 | {role} | {action} | {benefit} | Must/Should/Could |

## Acceptance Criteria
- [ ] {AC-1}: Given {context}, When {action}, Then {result}
- [ ] {AC-2}: ...

## Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| {metric} | {target} | {how to measure} |

## Constraints
| Type | Constraint | Impact |
|------|-----------|--------|
| Business | {constraint} | {impact on design} |
| Technical | {constraint} | {impact on implementation} |
| Timeline | {constraint} | {impact on phasing} |

## Edge Cases & Failure Scenarios
| Scenario | Expected Behavior |
|----------|------------------|
| {edge case} | {behavior} |

## Scope Boundaries
**In Scope**: ...
**Out of Scope**: ...
**Future Considerations**: ...
```

### 4. Gate 2 — UI/UX Exploration (Frontend Only)

**Skip this gate if**: feature is backend-only (no user-facing UI).

**Agent**: `frontend-architect` or `design-specialist`

**Output**: `analysis/ui-ux-exploration.md`

```markdown
# UI/UX Exploration: {Feature Name}

## User Flow Diagram
{ASCII or Mermaid diagram showing primary user journey}

```
[Entry Point] → [Screen A] → [Action] → [Screen B] → [Outcome]
                     ↓
                [Error State]
```

## Screen Inventory
| Screen | Route | Data Needs | Auth | Primary Action |
|--------|-------|-----------|------|---------------|
| {name} | {route} | {data} | Yes/No | {action} |

## Component Hierarchy
```
FeatureContainer
├── Header
├── MainContent
│   ├── ItemList
│   │   └── ItemCard
│   └── EmptyState
├── DetailPanel
│   ├── Metadata
│   └── Actions
└── ErrorBoundary
```

## Interaction Patterns
| Element | Interaction | Response | Animation |
|---------|------------|----------|-----------|
| {element} | {tap/swipe/type} | {what happens} | {transition} |

## Responsive Behavior
| Breakpoint | Layout Change | Hidden/Shown |
|-----------|--------------|-------------|
| Mobile (<640px) | {description} | {elements} |
| Tablet (640-1024px) | {description} | {elements} |
| Desktop (>1024px) | {description} | {elements} |

## Accessibility (WCAG 2.1 AA)
| Requirement | Implementation |
|------------|---------------|
| Keyboard nav | {how} |
| Screen reader | {aria labels} |
| Color contrast | {ratio target} |
| Focus management | {strategy} |

## Design System Alignment
| Element | Existing Token | Reuse/Create |
|---------|---------------|-------------|
| {element} | {token name} | Reuse / Create new |

## Loading & Error States
| State | Trigger | UI Treatment |
|-------|---------|-------------|
| Loading | {when} | {skeleton/spinner/progress} |
| Empty | {when} | {empty state illustration} |
| Error | {when} | {error message + retry} |
| Offline | {when} | {offline banner} |
```

### 5. Gate 3 — Solutions & Approaches

**Research**: If research is needed, spawn researcher following `subagent-driven-development` patterns.

**Output**: `analysis/solutions-approaches.md`

```markdown
# Solutions & Approaches: {Feature Name}

## Approach Comparison

### Approach A: {Name}
- **Description**: {1-2 sentences}
- **Pros**: {list}
- **Cons**: {list}
- **Effort**: {low/medium/high}
- **Risk**: {low/medium/high}

### Approach B: {Name}
- **Description**: {1-2 sentences}
- **Pros**: {list}
- **Cons**: {list}
- **Effort**: {low/medium/high}
- **Risk**: {low/medium/high}

### Approach C: {Name} (if applicable)
- **Description**: {1-2 sentences}
- **Pros**: {list}
- **Cons**: {list}
- **Effort**: {low/medium/high}
- **Risk**: {low/medium/high}

## Trade-Off Matrix
| Criterion | Approach A | Approach B | Approach C |
|-----------|-----------|-----------|-----------|
| Time to implement | ... | ... | ... |
| Maintainability | ... | ... | ... |
| Performance | ... | ... | ... |
| Scalability | ... | ... | ... |
| Developer experience | ... | ... | ... |

## Recommended Approach
**Selected**: {Approach X}

**Justification**:
{2-3 sentences explaining why this approach is best given business requirements, constraints, and team capabilities.}

## Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|-----------|
| {risk} | H/M/L | H/M/L | {strategy} |

## Dependency Analysis
| Dependency | Type | Status | Impact if Blocked |
|-----------|------|--------|------------------|
| {dep} | External/Internal | Available/Pending | {impact} |

## Research References
- [Research Report 1](../research/researcher-01-report.md) (if research was done)
```

### 6. Gate 4 — Architecture Design

**Agent assignment based on feature side**:

| Feature Side | Agent(s) | Focus |
|-------------|----------|-------|
| Frontend only | `frontend-architect` | Routing, components, state, API consumption |
| Backend only | `backend-architect` | API contract, data model, auth, caching, DB schema |
| Fullstack | `backend-architect` first, then `frontend-architect` | Both, with API contract as shared boundary |

**Output**: `analysis/architecture-design.md`

```markdown
# Architecture Design: {Feature Name}

## Architecture Decision Records

### ADR-1: {Decision Title}
- **Status**: Proposed
- **Context**: {why this decision is needed}
- **Decision**: {what was decided}
- **Consequences**: {positive and negative outcomes}

{Repeat for each significant architectural decision.}

## Frontend Architecture (if applicable)

### Routing
| Route | Component | Data Source | Auth Guard |
|-------|-----------|-----------|-----------|
| {path} | {component} | {source} | Yes/No |

### Component Architecture
```
pages/
  {FeaturePage}.tsx          — route-level, data fetching
components/
  {feature}/
    Container.tsx            — orchestrates children, manages local state
    {ComponentA}.tsx         — presentational
    {ComponentB}.tsx         — presentational
    hooks/
      use{Feature}Data.ts    — data fetching hook
      use{Feature}Actions.ts — mutation hook
    types.ts                 — shared types
```

### State Management
| State | Scope | Storage | Sync Strategy |
|-------|-------|---------|--------------|
| {state} | Component/Global | Local/Store/URL | {when/how} |

### API Consumption Pattern
{How frontend calls backend — React Query, SWR, server functions, etc.}

## Backend Architecture (if applicable)

### API Contract
| Method | Endpoint | Request | Response | Auth |
|--------|----------|---------|----------|------|
| {GET/POST/PUT/DELETE} | {path} | {body/params} | {schema} | {level} |

### Data Model (ER Diagram)
```
[Entity A] 1──* [Entity B]
    │
    *
[Entity C]
```

| Entity | Fields | Indexes | Constraints |
|--------|--------|---------|-------------|
| {Table} | {columns} | {indices} | {rules} |

### Service Boundaries
| Service | Responsibility | Dependencies |
|---------|---------------|-------------|
| {service} | {what it does} | {deps} |

### Auth Strategy
{How auth works for this feature — JWT, session, API key, etc.}

### Caching Strategy
| Data | Cache Layer | TTL | Invalidation |
|------|-----------|-----|-------------|
| {data} | {Redis/CDN/Memory} | {time} | {trigger} |

### Database Schema Changes
{Migration files needed, new tables, altered columns.}

## Fullstack API Contract (if applicable)
{OpenAPI spec path or inline contract — shared boundary between frontend and backend.}
```

### 7. Implementation Phases

After all analysis gates are reviewed and approved, generate implementation phases.

**Key rules**:
- Each phase is small enough to review in one sitting (max 3-4 files, max 200 LOC changed)
- Each phase specifies the design pattern chosen and WHY
- Each phase has step-by-step implementation instructions
- File ownership never overlaps between parallel phases

**Phase file template**:

```markdown
---
phase: {N}
title: "{Phase Title}"
effort: {Xh}
depends: [{phase numbers}]
agent: {agent-name}
skills: [{skill-1}, {skill-2}]
---

# Phase {N}: {Title}

## Overview
{What this phase accomplishes in 2-3 sentences.}

## Design Pattern
**Pattern**: {Pattern name — e.g., Repository Pattern, Container/Presentational, Custom Hook, Strategy Pattern}

**Why this pattern**:
{2-3 sentences explaining why this pattern fits this specific phase's requirements. Reference business requirements or architecture decisions that drove the choice.}

**Trade-offs**:
| Pro | Con |
|-----|-----|
| {benefit} | {cost} |

## Prerequisites
- [ ] {Phase X completed}
- [ ] {Dependency available}
- [ ] {Environment ready}

## Implementation Steps

### Step 1: {Name}
- **File**: `{path/to/file}`
- **Action**: Create / Modify
- **What**: {specific changes — describe the code to write}
- **Pattern application**: {how the design pattern manifests in this step}

### Step 2: {Name}
- **File**: `{path/to/file}`
- **Action**: Create / Modify
- **What**: {specific changes}
- **Pattern application**: {how the design pattern manifests in this step}

### Step 3: {Name}
{Continue for each step.}

## Files Changed
| File | Action | LOC (est.) |
|------|--------|-----------|
| {path} | Create/Modify/Delete | {N} |

## Agent & Skills
- **Agent**: `{agent-name}`
- **Skills**: `{skill-1}`, `{skill-2}`
- **Handoffs**:
  - After completion → `code-reviewer` (quality gate)
  - On security concern → `security-auditor`
  - On test needed → `tester`

## Validation Criteria
- [ ] {Specific, testable criterion}
- [ ] {Each step has a verification method}

## Risk Notes
| Risk | Mitigation |
|------|-----------|
| {risk} | {how to handle} |

## Next Phase
→ [Phase {N+1}](./phase-{N+1}-{slug}.md)
```

### 8. Generate plan.md

```markdown
---
title: "{Feature Name}"
status: draft
created: YYYY-MM-DD
updated: YYYY-MM-DD
effort: {total hours}
phases: {N}
platforms: [{platforms}]
breaking: {true/false}
---

# {Feature Name}

## Summary
{2-3 sentences from business requirements.}

## Analysis Deliverables
| Gate | Deliverable | Status | File |
|------|-----------|--------|------|
| 1 — Business Requirements | Requirements doc | {status} | [business-requirements.md](./analysis/business-requirements.md) |
| 2 — UI/UX Exploration | UX exploration | {status} | [ui-ux-exploration.md](./analysis/ui-ux-exploration.md) |
| 3 — Solutions & Approaches | Approach comparison | {status} | [solutions-approaches.md](./analysis/solutions-approaches.md) |
| 4 — Architecture Design | Architecture doc | {status} | [architecture-design.md](./analysis/architecture-design.md) |

## Recommended Approach
{From solutions analysis — 1-2 sentences.}

## Key Architecture Decisions
- {ADR-1 summary}
- {ADR-2 summary}

## Implementation Phases
| # | Phase | Design Pattern | Effort | Status | File |
|---|-------|---------------|--------|--------|------|
| 1 | {Name} | {Pattern} | {Xh} | pending | [phase-01](./phase-01-{slug}.md) |

## Critical Constraints
{From business requirements + architecture.}

## Success Criteria
- [ ] {From business requirements acceptance criteria}
- [ ] {From architecture validation}

## Dependencies
{External packages, internal modules, other teams.}
```

### 9. Set Active Plan
```bash
```

### 10. Report Completion

```
Feature Plan Created: {plan_path}

Analysis Gates:
  Gate 1 — Business Requirements  → analysis/business-requirements.md
  Gate 2 — UI/UX Exploration      → analysis/ui-ux-exploration.md (frontend)
  Gate 3 — Solutions & Approaches → analysis/solutions-approaches.md
  Gate 4 — Architecture Design    → analysis/architecture-design.md

Implementation:
  Phases: {N}
  Total effort: {Xh}
  Design patterns: {list unique patterns used}

Review each gate before proceeding:
  1. Review business requirements: cat {plan_path}/analysis/business-requirements.md
  2. Review UI/UX: cat {plan_path}/analysis/ui-ux-exploration.md
  3. Review solutions: cat {plan_path}/analysis/solutions-approaches.md
  4. Review architecture: cat {plan_path}/analysis/architecture-design.md
  5. When ready: /cook {plan_path}

Active plan set. Review analysis gates before implementation.
```

## Constraints

- Execution: < 20 minutes (including research if needed)
- 2 researchers max (sequential, same as deep-mode.md)
- Max 5 tool calls per researcher
- Analysis files ≤ 150 lines each
- Plan.md ≤ 80 lines
- Phase files ≤ 200 lines
- Each phase: max 3-4 files changed, max 200 LOC

## Design Pattern Catalog (Reference)

Common patterns to choose from per layer:

| Layer | Patterns | When to Use |
|-------|----------|-------------|
| Frontend | Container/Presentational | Complex UI with logic + display separation |
| Frontend | Custom Hook | Reusable stateful logic |
| Frontend | Compound Component | Flexible component APIs with shared state |
| Frontend | Render Props / Provider | Shared behavior across components |
| Frontend | Optimistic Update | Fast perceived performance on mutations |
| Backend | Repository | Data access abstraction |
| Backend | Service Layer | Business logic encapsulation |
| Backend | CQRS | Read-heavy features with different read/write models |
| Backend | Strategy | Multiple algorithms for same operation |
| Backend | Middleware Chain | Request pipeline processing |
| Backend | Unit of Work | Transactional multi-entity operations |
| Fullstack | BFF (Backend for Frontend) | Different UIs need different API shapes |
| Fullstack | Event-Driven | Decoupled async communication |

## Quality Standards

- Every phase MUST have a Design Pattern section with justification
- Every phase MUST have step-by-step implementation with specific files
- Analysis gates MUST be reviewable independently
- File ownership between parallel phases MUST NOT overlap
- Each step MUST have a validation criterion
