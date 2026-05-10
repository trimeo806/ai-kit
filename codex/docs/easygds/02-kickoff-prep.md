# easyGDS Kickoff Preparation

## Purpose

This document prepares the kickoff meeting for the easyGDS CMS admin portal. The goal is to leave kickoff with enough clarity to approve architecture discovery, not to solve every implementation detail in the meeting.

## Audience

| Audience | Why they should attend |
|---|---|
| Product owner | Defines v1 scope, business priorities, and success metrics |
| Engineering lead | Owns architecture, delivery model, and technical risk |
| Frontend lead | Owns Next.js, React migration, builder UI, and design system implementation |
| Backend/API lead | Owns tenancy, CMS APIs, travel integrations, auth, and publish workflow |
| Design lead | Owns UX model, brand system, tokens, and component quality |
| QA lead | Owns test strategy, regression risk, and release criteria |
| Customer/support representative | Brings real customer onboarding and support constraints |

## Scope

| In scope | Out of scope |
|---|---|
| Kickoff goals and agenda | Final architecture |
| Questions to ask stakeholders | Sprint planning |
| Pre-reads and required inputs | Vendor contract negotiation |
| Decision outputs | Detailed UX flows |

## Table of Contents

1. [Meeting Objectives](#meeting-objectives)
2. [Attendee Matrix](#attendee-matrix)
3. [Pre-Reads](#pre-reads)
4. [Prep Checklist](#prep-checklist)
5. [Suggested Agenda](#suggested-agenda)
6. [Must-Ask Questions](#must-ask-questions)
7. [Expected Outputs](#expected-outputs)
8. [Decision Log Template](#decision-log-template)
9. [Related Documents](#related-documents)
10. [Revision History](#revision-history)

## Meeting Objectives

| Objective | Output |
|---|---|
| Align on product boundary | CMS vs builder vs full storefront platform |
| Define v1 customer and use case | Pilot customer profile and required demo path |
| Confirm first travel vertical | Flights, hotels, tours, or mixed |
| Clarify tenant and site model | One tenant/site vs multi-site/multi-brand |
| Identify hard technical constraints | Next.js version, deployment target, existing backend/API constraints |
| Confirm decision owners | Who signs off product, architecture, design, security, launch |
| Agree next phase | Architecture discovery and prototype scope |

## Attendee Matrix

| Role | Input needed | Must decide |
|---|---|---|
| Product owner | Business goals, customer segment, v1 scope | Product boundary and success metrics |
| Engineering lead | Team capacity, constraints, architecture preferences | Architecture process and risk order |
| Frontend lead | Next.js expectations, Vue inventory, builder feasibility | Frontend architecture candidates |
| Backend/API lead | Existing APIs, provider constraints, auth/data model | Integration and tenant constraints |
| Design lead | Brand direction, component quality bar, builder UX vision | Design-system starting point |
| QA lead | Testing standards, browser/device matrix, launch gates | Quality gates |
| Support/customer rep | Customer onboarding pain, support risk, common requests | Operational requirements |

## Pre-Reads

| Pre-read | Owner | Purpose |
|---|---|---|
| Existing Vue component inventory | Frontend lead | Estimate migration and redesign work |
| Current business workflow notes | Product owner | Define customer jobs-to-be-done |
| Candidate travel provider list | Backend/API lead | Identify first integration constraints |
| Existing brand/design assets | Design lead | Seed token and visual direction |
| Existing backend/API docs | Backend/API lead | Decide whether Next.js is frontend only or BFF |
| Target deployment constraints | Engineering lead | Avoid invalid cache/runtime assumptions |

## Prep Checklist

| Item | Owner | Status |
|---|---|---|
| Choose pilot customer or representative scenario | Product owner | Open |
| List v1 required pages and booking flows | Product owner | Open |
| List existing Vue components and usage | Frontend lead | Open |
| Gather screenshots of current Vue UI | Frontend/design | Open |
| Gather current API/integration docs | Backend lead | Open |
| Confirm target cloud/deployment preference | Engineering lead | Open |
| Identify launch deadline and team capacity | Engineering lead | Open |
| Define architecture decision approver | Product/engineering | Open |

## Suggested Agenda

| Time | Topic | Owner | Expected outcome |
|---:|---|---|---|
| 0-10 min | Product framing | Product owner | v1 product shape stated |
| 10-25 min | Customer and user roles | Product/support | pilot user and role model clarified |
| 25-40 min | CMS and builder scope | Product/design/frontend | template/section/freeform direction selected |
| 40-55 min | Travel integration scope | Backend/product | first vertical/provider shortlist |
| 55-70 min | Technical constraints | Engineering | Next.js, backend, deploy, data constraints listed |
| 70-85 min | Migration and design system | Frontend/design | migration inventory and token direction agreed |
| 85-100 min | Risks and open decisions | All | blockers and owners assigned |
| 100-110 min | Next steps | Engineering lead | architecture discovery plan agreed |

## Must-Ask Questions

### Product and Business

| Question | Reason |
|---|---|
| What is the v1 promise in one sentence? | Prevents overbuilding |
| Which customer segment must v1 satisfy first? | Shapes templates and UX |
| What must be demoable after the first milestone? | Defines prototype |
| Is booking revenue part of v1 or later? | Changes commerce scope |
| What are the non-goals for v1? | Controls scope |

### CMS and Builder

| Question | Reason |
|---|---|
| Should the first builder be template-first, section-based, or freeform? | Biggest scope decision |
| Does v1 require autosave, undo/redo, and version history? | Changes editor state model |
| Is live preview required or can preview be generated on demand? | Affects runtime and caching |
| Can customers add custom CSS or custom blocks? | Security/support risk |
| Which page and section types are mandatory? | Defines schema and component library |

### Brand and UX

| Question | Reason |
|---|---|
| What brand controls are safe for all customers? | Defines token tiers |
| Should customer branding affect admin UI or only preview/public sites? | Prevents theme confusion |
| What is the desired style: luxury, modern SaaS, editorial travel, agency ops, or mixed? | Guides visual direction |
| What accessibility level is required? | Defines QA gates |
| Are animations required for brand feel, usability, or both? | Defines motion standards |

### Frontend and Next.js

| Question | Reason |
|---|---|
| Which Next.js version is targeted at kickoff? | Cache and API choices differ by version |
| Is the admin app separate from generated public sites? | Determines monorepo and deployment |
| Is Next.js the BFF layer or only the UI app? | Determines Server Actions and Route Handler usage |
| What routes are personalized and uncached? | Determines CDN value |
| Which data needs immediate read-your-own-writes? | Determines revalidation |

### Backend, Tenant, and Integration

| Question | Reason |
|---|---|
| Does one tenant own one site or many sites? | Core data model |
| Are supplier credentials easyGDS-owned or tenant-owned? | Secrets and onboarding |
| Which provider launches first? | Integration architecture |
| Is easyGDS merchant of record? | Payment/compliance |
| Are post-booking changes in v1? | Large domain scope |
| Do provider webhooks need to be supported in v1? | Event architecture |

### Operations and Delivery

| Question | Reason |
|---|---|
| What is the target pilot date? | Scope and staffing |
| Who approves architecture decisions? | Avoids delay |
| What is the required test browser/device matrix? | QA scope |
| What observability is required for pilot? | Operational readiness |
| What support workflows must exist for tenant onboarding? | Admin/support tooling |

## Expected Outputs

| Output | Format |
|---|---|
| V1 product boundary | One paragraph plus non-goals |
| Pilot scenario | Persona, tenant, site type, required flow |
| First integration target | Provider shortlist and vertical |
| Tenant model | One diagram or table |
| Builder scope | Template/section/freeform decision |
| Technical constraints | List of hard constraints |
| Decision owners | Named owners for product, architecture, design, security |
| Next phase | Architecture discovery and prototype plan |

## Decision Log Template

| Decision | Options considered | Owner | Status | Follow-up |
|---|---|---|---|---|
| Product boundary | CMS / builder / storefront | Product owner | Open | Define v1 demo |
| Builder model | Template / section / freeform | Product + design + frontend | Open | Prototype scope |
| First provider | Travelport / Duffel / Expedia / Amadeus / other | Product + backend | Open | Provider evaluation |
| Runtime split | Admin only / admin + public / separate apps | Engineering | Open | Architecture design |
| Package strategy | App-local / workspace packages / versioned packages | Engineering | Current input: standalone versioned packages | Define ownership, versioning, and release process |

## Related Documents

| Document | Relationship |
|---|---|
| [00-index.md](./00-index.md) | Doc map |
| [01-brainstorm-questions.md](./01-brainstorm-questions.md) | Full question inventory |
| [03-technical-decision-inputs.md](./03-technical-decision-inputs.md) | Decision criteria |
| [04-build-approach.md](./04-build-approach.md) | Post-kickoff build sequence |

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-05-03 | Codex | Created kickoff preparation doc |
