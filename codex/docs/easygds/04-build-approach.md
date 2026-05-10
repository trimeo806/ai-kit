# easyGDS High-Level Build Approach

## Purpose

This document outlines how to build the easyGDS CMS admin portal from scratch at a high level, including discovery gates, architecture sequencing, implementation phases, handoffs, and quality gates.

## Audience

| Audience | Use |
|---|---|
| Product owner | Understand delivery phases and decision gates |
| Engineering lead | Sequence architecture, implementation, and release hardening |
| Frontend/backend teams | Understand ownership boundaries |
| Design team | Know when design system and builder UX work must land |
| QA/security/docs | Understand release gates |

## Scope

| Included | Not included |
|---|---|
| High-level phase sequence | Sprint-level tickets |
| Agents and skills per phase | Detailed estimates |
| Deliverables and exit criteria | Final architecture docs |
| Discovery and release gates | Final production runbook |

## Table of Contents

1. [Build Principles](#build-principles)
2. [Recommended Mode](#recommended-mode)
3. [Phase Plan](#phase-plan)
4. [Architecture Workstreams](#architecture-workstreams)
5. [Source Structure Direction](#source-structure-direction)
6. [Vue to React Migration Approach](#vue-to-react-migration-approach)
7. [Cache and Performance Approach](#cache-and-performance-approach)
8. [Quality Gates](#quality-gates)
9. [Immediate Next Steps](#immediate-next-steps)
10. [Related Documents](#related-documents)
11. [Revision History](#revision-history)

## Build Principles

| Principle | Meaning |
|---|---|
| Correctness before optimization | Preview, publish, tenant isolation, auth, and booking correctness come before advanced cache/PPR tuning |
| Constraints before freedom | Ship a controlled section composer before full freeform drag/drop |
| Tokens before styling | Brand customization must pass through strict design tokens |
| Contracts before UI scale-out | Backend/API contracts must be stable enough before parallel frontend implementation expands |
| Client islands only where needed | Keep admin routes server-first and isolate builder interactivity |
| Provider adapters stay server-side | Frontend consumes easyGDS contracts, never supplier APIs |
| Migrate intent, not Vue templates | Vue migration should preserve behavior where useful and redesign inconsistent UI |

## Recommended Mode

Use architecture sign-off before implementation. This project introduces multi-tenant CMS data, auth/RBAC, drag/drop editing, preview/publish, third-party travel APIs, public site rendering, and Vue-to-React migration. Those dimensions interact, so starting implementation without architecture gates creates avoidable rework.

## Phase Plan

| Phase | Lead agents | Skills | Key deliverables | Exit criteria | Discovery gate |
|---|---|---|---|---|---|
| P0 Discovery and MVP framing | `planner`, `researcher`, `design-specialist` | `plan`, `research`, `knowledge-retrieval`, `ui-ux-pro-max`, `design-system` | MVP scope, tenant/persona matrix, travel API shortlist, Vue inventory, non-goals | Scope and v1 boundaries signed off | Are tenant roles, first page types, and first supplier integrations fixed for v1? |
| P1 Architecture and contracts | `backend-architect`, then `frontend-architect` | `architecture-designer`, `api-designer`, `nextjs-developer`, `react-expert`, `typescript-pro` | ADRs, REST/BFF contract, modular monolith boundaries, auth/tenant strategy, route tree, client-island rules, standalone package boundary map | No open API/auth/schema decisions blocking parallel work | Is normalized content plus booking domain stable enough to lock contracts? |
| P2 Platform foundation | `frontend-developer`, `backend-developer`, `devops-engineer` | `nextjs-developer`, `react-expert`, `typescript-pro`, `infra-docker`, `fullstack-guardian` | Next.js scaffold, standalone packages for UI/tokens/types, CI, auth shell, preview env, observability baseline | App boots, CI green, versioned packages are consumed end-to-end | Any repo/workspace/runtime decision likely to cause rework? |
| P3 CMS builder core | `frontend-developer`, `backend-developer` | `nextjs-developer`, `react-expert`, `web-frontend`, `api-designer`, `fullstack-guardian` | Section schema, page/template CRUD, draft/live versioning, editor shell, preview APIs | Editors can assemble, save, reorder, and preview limited v1 sections | Does section model cover most v1 site needs without tenant-specific code? |
| P4 Brand system and public site runtime | `frontend-developer`, `design-specialist` | `design-system`, `ui-styling`, `nextjs-developer`, `web-frontend`, `typescript-pro` | Token pipeline, tenant theme config, section renderers, public site shell, branded preview/publish | Two brands render distinct sites from same primitives | Are brand requirements config/tokens rather than forks? |
| P5 Travel integrations and booking orchestration | `backend-developer`, `researcher` | `api-designer`, `typescript-pro`, `research`, `fullstack-guardian` | Connector abstraction, credentials, normalized search/quote/booking APIs, retries/webhooks/error model | One priority supplier works end-to-end in sandbox via BFF | Can canonical booking model absorb supplier variance? |
| P6 React migration and admin completion | `frontend-developer`, `code-reviewer` | `react-expert`, `typescript-pro`, `web-frontend`, `code-review` | Vue-to-React migration, remaining admin flows, parity/deprecation checklist | No critical MVP flow depends on Vue | Which Vue components migrate directly vs get redesigned? |
| P7 Hardening and pilot launch | `tester`, `security-auditor`, `docs-manager` | `web-testing`, `playwright-expert`, `test`, `fullstack-guardian`, `docs` | E2E suite, security review, perf budget, monitoring, runbooks, pilot checklist | Pilot tenant can author, preview, publish, and complete booking with rollback | Are remaining issues product gaps or platform defects? |

## Architecture Workstreams

| Workstream | Owner | Output |
|---|---|---|
| Product and tenant model | Product + backend architect | Tenant/site/brand/domain model |
| CMS schema | Frontend architect + backend architect | Page, section, block, draft, published snapshot contract |
| Auth and RBAC | Backend architect | Session, permissions, route guards, audit requirements |
| Frontend architecture | Frontend architect | Route tree, RSC/client boundaries, standalone package plan |
| Design system | Design specialist + frontend | Token tiers, UI primitives, builder components |
| Integration architecture | Backend architect | Provider adapter contracts, normalized offers/bookings, webhook model |
| Preview/publish | Backend + frontend | Preview sessions, publish jobs, rollback, cache invalidation |
| Migration | Frontend + design | Vue inventory, redesign/migrate/retire buckets |

## Source Structure Direction

> Pending full revision: this section has been aligned to the current package input, but package ownership, versioning, and release workflow still need a dedicated architecture pass.

Start with standalone internal packages for foundations that must be shared across admin and storefront surfaces. Keep feature-specific product code in apps unless it has a real second consumer.

```text
apps/
  admin/
    app/
    src/
      features/
        builder/
        brand-studio/
        content/
        integrations/
        publishing/
      lib/
      server/
  public-site/
    app/
    src/
      features/
packages/
  tokens/
  ui/
  types/
  config/
```

| Package/module | Create when | Notes |
|---|---|---|
| `packages/tokens` | P2 | CSS variables, token JSON, motion tokens; versioned and shared |
| `packages/ui` | P2 | Accessible primitives and shared admin/storefront components |
| `packages/types` | P2 | Generated or shared API DTOs and branded IDs |
| `packages/config` | P2 | Shared TypeScript, lint, and build config |
| `apps/admin/src/features/*` | P2-P6 | Admin-specific product code |
| `apps/public-site` | P4 | Dynamic public storefront runtime |
| `packages/editor` | Later | Extract only when builder has another consumer |

## Vue to React Migration Approach

| Step | Action | Output |
|---|---|---|
| 1 | Inventory Vue components | Component list, owners, usage frequency |
| 2 | Classify components | Keep concept/redesign, keep behavior/rebuild, retire |
| 3 | Extract visual rules | Spacing, typography, color, motion, states |
| 4 | Build primitives first | React UI foundation with tokens |
| 5 | Migrate feature composites | React components mapped to new APIs and states |
| 6 | Validate parity | Behavior, permissions, publish outcomes, accessibility |
| 7 | Improve visuals | Animation, polish, empty/error/loading states |

## Cache and Performance Approach

| Phase | Approach |
|---|---|
| P1 | Define cacheability by data type: draft, published snapshot, reference data, live offers, sessions |
| P2 | Add baseline performance budgets and monitoring |
| P3 | Keep builder dynamic and correctness-focused |
| P4 | Optimize public site shell, static assets, image/font loading, published snapshots |
| P5 | Apply supplier-aware TTLs to search and offers |
| P7 | Evaluate Cache Components/PPR where measured performance justifies it |

## Quality Gates

| Gate | Required checks |
|---|---|
| Architecture | ADRs approved, API contract reviewed, tenant model accepted |
| Design system | Tokens defined, accessibility states included, component boundaries agreed |
| Builder MVP | Keyboard fallback, undo/autosave decision implemented or deferred explicitly |
| Integration | Sandbox provider flow works, errors/retries/webhooks handled |
| Security | Auth, RBAC, tenant isolation, secrets, audit logs reviewed |
| Performance | Core routes meet p95 and Core Web Vitals targets |
| Release | E2E tests, rollback path, monitoring, support docs, pilot checklist |

## Immediate Next Steps

| Step | Owner | Output |
|---|---|---|
| 1 | Product owner | Answer the P0 questions in [01-brainstorm-questions.md](./01-brainstorm-questions.md) |
| 2 | Engineering lead | Confirm deployment target and backend ownership |
| 3 | Frontend lead | Inventory Vue components and identify builder-critical pieces |
| 4 | Design lead | Collect existing brand/UI assets and define target visual direction |
| 5 | Backend lead | Shortlist first travel provider and confirm tenant/site model |
| 6 | Team | Run architecture phase and create ADRs before implementation |

## Related Documents

| Document | Relationship |
|---|---|
| [00-index.md](./00-index.md) | Doc map |
| [01-brainstorm-questions.md](./01-brainstorm-questions.md) | Discovery inputs |
| [02-kickoff-prep.md](./02-kickoff-prep.md) | Kickoff agenda |
| [03-technical-decision-inputs.md](./03-technical-decision-inputs.md) | Decision rationale |

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-05-03 | Codex | Created high-level build approach |
