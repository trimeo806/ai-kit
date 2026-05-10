# easyGDS CMS Admin Portal Documents

## Purpose

This document is the entry point for the easyGDS CMS admin portal discovery and architecture notes. It organizes the requirement questions, kickoff preparation, technical decision inputs, and high-level build approach for a new Next.js-based CMS platform for travel businesses.

## Audience

| Audience | Use |
|---|---|
| Product owner | Clarify scope, v1 goals, and business constraints |
| Engineering lead | Prepare architecture decisions and delivery sequence |
| Frontend team | Understand Next.js, React migration, package, and design-system direction |
| Backend/API team | Understand tenant, CMS, integration, publish, and booking boundaries |
| Design team | Understand builder UX, brand customization, and token system needs |

## Scope

| In scope | Out of scope for this doc set |
|---|---|
| CMS admin portal discovery | Final PRD |
| Technical decision criteria | Final architecture approval |
| Kickoff meeting questions | Detailed sprint tickets |
| High-level build sequence | Implementation code |
| Next.js and integration implications | Vendor contract negotiation |

## Table of Contents

1. [Document Map](#document-map)
2. [Project Snapshot](#project-snapshot)
3. [Recommended Starting Position](#recommended-starting-position)
4. [Decision Flow](#decision-flow)
5. [Agents and Skills](#agents-and-skills)
6. [Open Decision Gates](#open-decision-gates)
7. [Related Documents](#related-documents)
8. [Revision History](#revision-history)

## Document Map

| Document | Use when | Output |
|---|---|---|
| [01-brainstorm-questions.md](./01-brainstorm-questions.md) | Before requirements are stable | Question inventory, answer tracker, risks, assumptions, definitions, examples, decision gates |
| [02-kickoff-prep.md](./02-kickoff-prep.md) | Before kickoff meeting | Meeting agenda, attendee matrix, prep checklist |
| [03-technical-decision-inputs.md](./03-technical-decision-inputs.md) | Before selecting stack and patterns | Decision matrix, pros/cons, recommendation rationale |
| [04-build-approach.md](./04-build-approach.md) | After initial discovery | High-level phases, agents/skills, exit criteria |

## Project Snapshot

| Area | Current framing |
|---|---|
| Product | White-label booking storefront platform with CMS capabilities for travel businesses |
| Customers | Flight, hotel, tour, and travel booking businesses |
| Core value | Let customers create branded booking websites with less custom engineering |
| Key features | CMS, storefront rendering, drag/drop or section builder, brand customization, third-party travel API integrations, template marketplace, staging/preview/production publish flow |
| Migration | Existing Vue components will move to React with better UI quality, animation, and maintainability |
| Required ecosystem | Next.js, React, TypeScript |
| Main unknown | Tenant model and v1 implementation cut for the storefront platform |

## Recommended Starting Position

| Decision area | Recommended starting point | Why |
|---|---|---|
| Product shape | White-label booking storefront platform with CMS capabilities | Matches current input: product boundary A and C, and v1 leaning storefront platform |
| Frontend | Next.js App Router, Server Components by default, client islands for builder | Keeps most admin pages lean while preserving interactivity where needed |
| State | Server Components for route data, Server Actions for mutations, scoped Zustand for builder, TanStack Query only inside long-lived client islands | Avoids app-wide state complexity |
| Packages | Standalone versioned internal packages | Matches current input: package model C |
| Design system | Strict token layers: primitive, semantic, component | Controls tenant theming and migration consistency |
| Backend boundary | Modular monolith plus REST/BFF contracts | Easier to evolve than microservices during discovery |
| Integrations | Provider adapters behind normalized easyGDS resources | Keeps provider secrets and schema drift out of browser code |
| Cache/PPR | Optimize public site and reference data first; do not make builder correctness depend on PPR | Preview/publish correctness matters before advanced optimization |

## Decision Flow

| Step | Read | Decide |
|---|---|---|
| 1 | [01-brainstorm-questions.md](./01-brainstorm-questions.md) | Product boundary, user roles, v1 supplier scope |
| 2 | [02-kickoff-prep.md](./02-kickoff-prep.md) | Meeting outputs, decision owners, hard constraints |
| 3 | [03-technical-decision-inputs.md](./03-technical-decision-inputs.md) | Tech stack, package strategy, data/cache patterns |
| 4 | [04-build-approach.md](./04-build-approach.md) | Phase order, gates, handoffs, exit criteria |

## Agents and Skills

| Workstream | Agent | Skills activated |
|---|---|---|
| Discovery and roadmap | `planner` | `plan`, `knowledge-retrieval`, `subagent-driven-development` |
| Brainstorming | `brainstormer` | `brainstorm`, `sequential-thinking`, `problem-solving` |
| Frontend architecture | `frontend-architect` | `architecture-designer`, `api-designer`, `nextjs-developer`, `react-expert`, `typescript-pro` |
| Backend/API architecture | `backend-architect` | `architecture-designer`, `api-designer`, `graphql-architect`, `microservices-architect`, `postgres-pro`, `typescript-pro` |
| UI/UX and design system | `design-specialist` | `ui-ux-pro-max`, `design-system`, `brand`, `design` |
| Documentation | `docs-manager` | `docs`, `knowledge-capture`, `knowledge-retrieval` |

## Open Decision Gates

| Gate | Must answer before |
|---|---|
| Is v1 a CMS, builder, or full storefront platform? | Architecture approval |
| Is the public booking site in the same runtime as admin or separate? | Repo and deployment design |
| Which vertical launches first: flights, hotels, tours, or mixed? | Integration model |
| Does tenant mean one site, many sites, or many brands/domains? | Data model and routing |
| How much customization is allowed? | Token system and builder scope |
| Is preview/publish instant, scheduled, approval-based, or all three? | CMS workflow and cache invalidation |
| What package ownership/versioning/release model should option C use? | Architecture and source structure |

## Related Documents

| Document | Relationship |
|---|---|
| [01-brainstorm-questions.md](./01-brainstorm-questions.md) | Requirement discovery |
| [02-kickoff-prep.md](./02-kickoff-prep.md) | Meeting preparation |
| [03-technical-decision-inputs.md](./03-technical-decision-inputs.md) | Architecture choices |
| [04-build-approach.md](./04-build-approach.md) | Delivery plan |
| [- Start new Project easyGDS prompt.md](./-%20Start%20new%20Project%20easyGDS%20prompt.md) | Original prompt notes |

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-05-03 | Codex | Created initial discovery document set |
| 2026-05-03 | Codex | Added question explanation guide and current product inputs |
| 2026-05-03 | Codex | Updated current inputs from latest answers |
