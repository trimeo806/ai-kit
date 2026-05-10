# easyGDS Brainstorming and Requirement Questions

## Purpose

This document captures the questions and pressure tests needed before choosing the final tech stack, architecture, design system, integration pattern, package strategy, and migration path for the easyGDS CMS admin portal.

## Audience

| Audience | Use |
|---|---|
| Product owner | Decide what v1 must solve |
| Engineering lead | Identify decisions blocked by missing requirements |
| Design lead | Clarify brand, builder, and usability expectations |
| Backend/API lead | Clarify tenant, booking, integration, and publish models |
| Frontend lead | Clarify Next.js, React migration, package, and state decisions |

## Scope

| Included | Not included |
|---|---|
| Product questions | Final answers |
| Technical decision blockers | Implementation tasks |
| Kickoff question bank | Final meeting minutes |
| Assumptions and risks | Final architecture sign-off |

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Working Assumptions](#working-assumptions)
3. [Current Inputs](#current-inputs)
4. [How to Understand the Questions](#how-to-understand-the-questions)
5. [Core Terms](#core-terms)
6. [Important Choice Explanations](#important-choice-explanations)
7. [Critical Product Forks](#critical-product-forks)
8. [Risk Summary](#risk-summary)
9. [Answer Status Tracker](#answer-status-tracker)
10. [Question Inventory](#question-inventory)
11. [All Question Explanations](#all-question-explanations)
12. [Decision Gates](#decision-gates)
13. [Recommended Direction](#recommended-direction)
14. [Related Documents](#related-documents)
15. [Revision History](#revision-history)

## Problem Statement

easyGDS wants to build a new CMS admin portal that lets travel businesses create branded booking websites. Customers should be able to customize brand logo, colors, styling, page content, and travel-specific booking features while integrating with third-party flight, hotel, and tour APIs. Existing Vue components should migrate to React with better visual quality, animation, accessibility, and maintainability.

## Working Assumptions

| Assumption | Confidence | Validation needed |
|---|---:|---|
| The first release should be a multi-tenant CMS admin portal | Medium | Confirm v1 product boundary |
| Customers want controlled customization more than full freeform design freedom | Medium | Customer interviews |
| Third-party travel APIs should be hidden behind easyGDS-owned contracts | High | Backend architecture approval |
| Existing Vue components are not cleanly portable 1:1 | High | Component inventory |
| Full drag/drop is not required for every v1 layout decision | Medium | Product demo expectations |
| Public booking sites may need different cache/deployment rules than admin | High | Runtime strategy decision |

## Current Inputs

These are the current working answers from the product discovery conversation. Treat them as current direction, not final architecture approval.

| Area | Current input | Notes |
|---|---|---|
| Product boundary | CMS, with full booking storefront platform under consideration | CMS means easyGDS primarily helps customers manage content and site structure. Full booking storefront platform means easyGDS also owns the customer-facing search, checkout, booking, payment, confirmation, and servicing flow. |
| V1 product surface | White-label booking storefront platform | Current direction is not CMS-only. The product includes CMS capabilities plus public booking storefront behavior. |
| Builder freedom | B and C | B is section composer. C is full freeform drag/drop. Recommended interpretation: ship B first, design toward C only after v1 proves demand. |
| Tenant model | Needs clarification | "Tenant model" was provided, but no option was selected yet. Choose one tenant-one site, one tenant-many sites, or agency-managed tenant brands. |
| Travel scope | C, all verticals | Product ambition covers flights, hotels, and tours. Implementation should still pick one pilot vertical/provider first to reduce risk. |
| Publish model | B and C | B is draft/publish. C adds approval and/or scheduled publishing. Recommended interpretation: B baseline, C for teams/enterprise. |
| Package model | C, standalone versioned packages | Current input changed from app-local to standalone internal packages. The architecture plan must be revised later to define package ownership, versioning, and release flow. |
| Revenue model | Booking transaction fees and setup fees | This makes booking and onboarding operationally important. |
| Merchant of record | Yes | easyGDS owns payment collection, refund responsibility, dispute handling, and financial liability unless specific supplier rules say otherwise. |
| Supplier payment model | Traveler pays easyGDS; easyGDS pays the agent/supplier booking price | Traveler pays booking price plus booking fee to easyGDS. easyGDS keeps the booking fee and pays the agent/supplier the booking price. |
| Customer types | All | The product must support small agencies, large brands, hotels, and tour operators, but v1 still needs a primary pilot segment. |
| Target time-to-launch | Not answered; ask boss | This remains blocked until boss/stakeholder input. |
| Public site rendering | Rendered dynamically | Public customer sites are not assumed to be purely static. |
| Template model | Marketplace and templates | easyGDS needs a template marketplace or browsable template catalog, not only private internal templates. |
| Environments | Staging, preview, and production required | Each tenant/site needs separated lifecycle environments. |

## How to Understand the Questions

Read the `Question Inventory` first for the actual requirement questions. Then use `All Question Explanations` below to understand terms, example choices, and technical impact before choosing answers.

## Core Terms

| Term | Definition | Example |
|---|---|---|
| CMS | Content Management System. A system for creating and managing pages, content, media, brand settings, and publishing. | A travel agency edits homepage copy, uploads destination images, updates FAQ, and publishes the site. |
| Site builder | A visual tool for composing website pages from templates, sections, and blocks. | A user drags a hero section, offer grid, testimonials, and footer into a page. |
| Full booking storefront platform | A complete customer-facing booking business layer: search, availability, pricing, booking, payment, confirmation, cancellation/change, emails, and support flows. | A traveler searches hotels, selects a room, pays easyGDS, receives confirmation, then later requests cancellation. |
| Tenant | A customer account or organization inside a multi-customer SaaS platform. | "ABC Travel Agency" is one tenant; "Luxury Tours Co." is another tenant. |
| Site | A website owned by a tenant. | ABC Travel Agency has `abctravel.com` and `deals.abctravel.com` as two sites. |
| Brand | Visual identity and market positioning for a tenant or site. | Logo, color palette, fonts, button style, image tone, radius, and layout density. |
| Supplier/provider | A third-party travel API or inventory source. | Travelport, Duffel, Expedia Rapid, Amadeus, hotel channel manager, tour API. |
| Merchant of record | The legal seller that charges the traveler and handles payment liability. | If easyGDS is merchant of record, the traveler sees easyGDS or its merchant account on the payment receipt. |
| Draft/publish | Changes are saved privately first, then explicitly published to the live site. | Editor saves homepage changes today and publishes after review tomorrow. |
| Approval workflow | Publishing needs review by another role before going live. | Content editor submits a page; tenant admin approves it. |
| Scheduled publishing | A publish is planned for a future date/time. | A Lunar New Year campaign goes live at 9:00 AM on January 20. |
| App-local | Code lives inside the application source tree instead of a reusable package. | `apps/admin/src/features/builder` instead of `packages/editor`. |
| Standalone versioned package | A reusable internal package with explicit API, version, release flow, and consumers. | `packages/editor@1.2.0`, `packages/ui@1.5.0`, `packages/tokens@1.1.0`. |

## Important Choice Explanations

### CMS vs Full Booking Storefront Platform

| Option | What easyGDS owns | Example | Complexity |
|---|---|---|---|
| CMS | Website pages, content, branding, templates, publish workflow | Customer builds a branded travel website and embeds/configures booking widgets | Medium |
| Site builder | CMS plus visual page composition and layout control | Customer arranges travel sections visually and previews responsive pages | Medium-high |
| Full booking storefront platform | CMS plus live search, checkout, payment, booking records, customer emails, cancellations, refunds, support workflows | Traveler completes hotel booking and pays easyGDS directly | High |

If easyGDS is merchant of record and earns booking transaction fees, the product is moving toward a full booking storefront platform. You can still define v1 as CMS, but the architecture should not block future booking ownership.

### Tenant Model Options

| Option | Meaning | Example | Choose when |
|---|---|---|---|
| One tenant, one site | Each customer account owns exactly one website | ABC Travel has one admin account and one public website | Customers are simple businesses with one brand/domain |
| One tenant, many sites | One customer account can manage multiple websites | ABC Travel manages `abctravel.com`, `luxury.abctravel.com`, and `deals.abctravel.com` | Customers have multiple brands, markets, or campaigns |
| Agency manages many tenant brands | A parent account manages many customer accounts/sites | A travel agency network manages 50 sub-agency websites | You sell to agencies, resellers, or enterprise groups |

Recommended default for easyGDS: one tenant can own many sites. It is flexible without immediately building a full agency/reseller hierarchy.

### Supplier Payment Model

This asks: after the traveler pays, who sends money to the travel supplier?

| Option | Flow | Example | Operational impact |
|---|---|---|---|
| easyGDS pays supplier | Traveler pays easyGDS. easyGDS later pays airline/hotel/tour supplier. | Traveler pays $500 to easyGDS for a tour. easyGDS pays $430 to tour supplier and keeps margin/fee. | easyGDS needs settlement, reconciliation, refunds, disputes, and accounting. |
| Tenant pays supplier | Traveler pays easyGDS or tenant. Tenant is responsible for supplier settlement. | easyGDS collects booking fee; ABC Travel pays hotel supplier from its own account. | Tenant needs operational responsibility; easyGDS needs reporting. |
| Traveler pays supplier directly | easyGDS only redirects or reserves; traveler pays hotel/airline directly. | User books on hotel payment page; easyGDS tracks referral/commission. | Less payment liability for easyGDS, but weaker checkout control. |

Because you answered that easyGDS is merchant of record, the most consistent model is usually "easyGDS pays supplier," unless a provider forces traveler-pay or hotel-pay behavior.

### Target Time-to-Launch

This means how long it should take a new customer to go from "signed up" to "live website."

| Target | Meaning | Example | Product implication |
|---|---|---|---|
| Same day | Customer can launch in hours | Choose template, upload logo, set colors, connect provider, publish | Strong templates, guided onboarding, very limited customization |
| 2-3 days | Customer can launch after light setup | easyGDS support helps configure provider credentials and content | Good for setup-fee onboarding |
| 1-2 weeks | Customer launches after custom content and brand work | Design team imports content, configures pages, reviews booking flow | More flexible CMS, more support workload |
| 1 month+ | Custom implementation | Enterprise travel brand needs special layouts/integrations | Not ideal for scalable SaaS unless setup fees are high |

For easyGDS, a practical target is 2-3 days for standard customers and 1-2 weeks for complex customers.

## Critical Product Forks

| Fork | Option A | Option B | Option C | Current input | Why it matters |
|---|---|---|---|---|---|
| Product boundary | CMS | Site builder | Full booking storefront platform | A and C; v1 leaning C | Determines scope, data model, and integration depth |
| Builder freedom | Template-first | Section composer | Full freeform drag/drop | B and C | Determines UX complexity and technical risk |
| Tenant model | One tenant, one site | One tenant, many sites | Agency manages many tenant brands | Needs choice | Determines routing, auth, permissions, and data isolation |
| Travel scope | Hotel-first | Flight-first | All verticals | C | Determines API provider and booking model |
| Publish model | Save equals live | Draft/publish | Approval/scheduled publish | B and C | Determines preview, audit, cache invalidation |
| Package model | App-local | Workspace packages | Standalone versioned packages | C | Determines speed vs reuse governance |

## Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Full drag/drop scope expands into a complex editor platform | High | High | Start with constrained section composer and clear v1 section taxonomy |
| Tenant customization creates broken or inconsistent output | High | High | Use strict design tokens and curated presets |
| Travel API abstraction hides supplier-specific rules incorrectly | High | High | Use thin provider adapters and expose provider capabilities in normalized contracts |
| Vue migration becomes a redesign plus architecture rewrite | Medium | High | Inventory components and migrate by behavior, not template structure |
| Cache invalidation breaks preview/publish correctness | Medium | High | Treat preview and published data as separate planes |
| Standalone packages add release and API governance overhead | Medium | Medium | Define package ownership, versioning, compatibility rules, and release process before implementation |
| Admin UX becomes settings-heavy instead of builder-first | Medium | High | Prototype Builder and Brand Studio early |

## Answer Status Tracker

| # | Status | Current answer |
|---:|---|---|
| 1 | Answered | Booking transaction fees and setup fees |
| 2 | Answered | Yes. easyGDS is merchant of record |
| 3 | Answered | Traveler pays easyGDS booking price plus booking fee. easyGDS pays the agent/supplier booking price |
| 4 | Answered | All customer types: small agencies, large travel brands, hotels, tour operators |
| 5 | Not answered | Need to ask boss |
| 6 | Not answered | - |
| 7 | Not answered | - |
| 8 | Not answered | - |
| 9 | Answered | White-label booking storefront platform, with CMS capabilities included |
| 10 | Not answered | - |
| 11 | Not answered | - |
| 12 | Answered | Public sites are rendered dynamically |
| 13 | Answered | Marketplace and templates |
| 14 | Answered | Yes. Staging, preview, and production environments are required |
| 15 | Not answered | - |
| 16 | Not answered | - |
| 17 | Not answered | - |
| 18 | Not answered | - |
| 19 | Not answered | - |
| 20 | Not answered | - |
| 21 | Answered | Yes, publish model includes approval/scheduled publishing option C |
| 22 | Not answered | - |
| 23 | Not answered | - |
| 24 | Answered | B and C: section composer and full freeform drag/drop |
| 25 | Not answered | - |
| 26 | Not answered | - |
| 27 | Not answered | - |
| 28 | Not answered | - |
| 29 | Not answered | - |
| 30 | Not answered | - |
| 31 | Not answered | - |
| 32 | Not answered | - |
| 33 | Not answered | - |
| 34 | Not answered | - |
| 35 | Not answered | - |
| 36 | Not answered | - |
| 37 | Not answered | - |
| 38 | Not answered | - |
| 39 | Not answered | - |
| 40 | Not answered | - |
| 41 | Not answered | - |
| 42 | Not answered | - |
| 43 | Not answered | - |
| 44 | Not answered | - |
| 45 | Not answered | - |
| 46 | Not answered | - |
| 47 | Not answered | - |
| 48 | Not answered | - |
| 49 | Not answered | - |
| 50 | Not answered | - |
| 51 | Not answered | - |
| 52 | Not answered | - |
| 53 | Not answered | - |
| 54 | Not answered | - |
| 55 | Not answered | - |
| 56 | Not answered | - |
| 57 | Not answered | - |
| 58 | Not answered | - |
| 59 | Not answered | - |
| 60 | Not answered | - |
| 61 | Not answered | - |
| 62 | Not answered | - |
| 63 | Not answered | - |
| 64 | Not answered | - |
| 65 | Not answered | - |
| 66 | Needs clarification | Product scope is all verticals, but first launch vertical is not selected |
| 67 | Not answered | - |
| 68 | Not answered | - |
| 69 | Not answered | - |
| 70 | Not answered | - |
| 71 | Not answered | - |
| 72 | Answered | Traveler pays easyGDS; easyGDS is merchant of record |
| 73 | Not answered | - |
| 74 | Not answered | - |
| 75 | Not answered | - |
| 76 | Answered | B and C: draft/publish plus approval/scheduled publishing |
| 77 | Not answered | - |
| 78 | Not answered | - |
| 79 | Not answered | - |
| 80 | Not answered | - |
| 81 | Not answered | - |
| 82 | Not answered | - |
| 83 | Not answered | - |
| 84 | Not answered | - |
| 85 | Not answered | - |
| 86 | Not answered | - |
| 87 | Not answered | - |
| 88 | Not answered | - |
| 89 | Not answered | - |
| 90 | Not answered | - |
| 91 | Not answered | - |
| 92 | Not answered | - |
| 93 | Not answered | - |
| 94 | Not answered | - |
| 95 | Not answered | - |
| 96 | Not answered | - |
| 97 | Not answered | - |
| 98 | Not answered | - |
| 99 | Not answered | - |
| 100 | Not answered | - |

## Question Inventory

### Business Model

| # | Question | Why it matters | Decision impact |
|---:|---|---|---|
| 1 | Is easyGDS selling SaaS subscriptions, booking transaction fees, setup fees, or a hybrid? | Revenue model changes product priorities | Billing, analytics, tenant model |
| 2 | Is easyGDS the merchant of record for bookings? | Payment, liability, refund, and compliance model changes | Booking API, checkout, support tooling |
| 3 | Are suppliers paid by easyGDS, the tenant, or the traveler directly? | Determines payment and settlement flows | Backend domain model |
| 4 | Are customers small agencies, large travel brands, hotels, tour operators, or all of them? | Different personas need different workflows | IA, onboarding, permissions |
| 5 | What is the target time-to-launch for a customer site? | Defines product promise | Template depth, onboarding flows |
| 6 | What are the first 3 customer segments for v1? | Avoids overgeneralizing the CMS | Templates, integrations, support |
| 7 | What is the expected pilot customer and their exact use case? | Grounds MVP decisions | Scope and acceptance criteria |
| 8 | What is explicitly out of scope for the first release? | Prevents platform creep | Roadmap boundaries |

### Product Scope

| # | Question | Why it matters | Decision impact |
|---:|---|---|---|
| 9 | Is v1 primarily a CMS, a site builder, or a white-label booking storefront platform? | This is the main architecture fork | Everything |
| 10 | Does v1 need public booking checkout, or only lead generation and API widgets? | Booking checkout is a large separate product | Integration and security scope |
| 11 | Does the admin manage only websites, or also inventory, rates, offers, and booking ops? | Admin IA changes significantly | Domain modules |
| 12 | Are public sites generated statically, rendered dynamically, or served by a separate runtime? | Determines cache and deploy strategy | Next.js architecture |
| 13 | Does easyGDS need a marketplace of templates or only internal templates? | Changes content model and governance | Template package model |
| 14 | Does each tenant need staging, preview, and production environments? | Changes publish flow | Data planes, cache invalidation |

### Users and Permissions

| # | Question | Why it matters | Decision impact |
|---:|---|---|---|
| 15 | Who uses the admin daily: owner, marketer, travel operator, agency, developer, support? | Shapes navigation and workflow density | IA and UX |
| 16 | What roles are required in v1? | Affects auth and UI guards | RBAC model |
| 17 | Are permissions role-based, capability-based, or custom per tenant? | Determines authorization model complexity | Backend/API contract |
| 18 | Can one user belong to multiple tenants? | Common for agencies and support teams | Identity model |
| 19 | Does internal easyGDS support need impersonation? | Useful but security sensitive | Audit and auth |
| 20 | Do tenants require SSO, OIDC, or SAML at launch? | Enterprise requirement | Auth provider strategy |
| 21 | Are approvals required before publishing? | Changes workflow and states | CMS model |
| 22 | Does the system need audit logs for every mutation? | Important for enterprise and travel ops | Audit service |

### CMS and Builder

| # | Question | Why it matters | Decision impact |
|---:|---|---|---|
| 23 | Should customers start from templates, blank pages, or guided setup? | Controls onboarding complexity | Builder UX |
| 24 | Is the builder full drag/drop or section-based composition? | Biggest frontend complexity fork | Editor architecture |
| 25 | Which page types are required in v1? | Defines schema and section library | CMS model |
| 26 | Which blocks are mandatory: hero, search widget, offers, destinations, tours, FAQ, testimonials, footer? | Defines component backlog | UI package and builder schema |
| 27 | Does v1 need nested layout editing? | Nested editing increases complexity | Canvas model |
| 28 | Does v1 need undo/redo? | Requires operation history | Builder state |
| 29 | Does v1 need autosave? | Requires conflict and draft strategy | API and state model |
| 30 | Does v1 need collaborative editing? | Huge jump in complexity | Real-time architecture |
| 31 | Does v1 need page version history and rollback? | Impacts snapshots and storage | Publish model |
| 32 | How should responsive behavior be controlled? | Prevents broken mobile sites | Section schema |
| 33 | Can custom code/CSS be added by tenants? | Security and support risk | Sandboxing policy |
| 34 | Are tenant users allowed to create custom blocks? | Changes package/plugin architecture | Extensibility model |

### Brand and Design

| # | Question | Why it matters | Decision impact |
|---:|---|---|---|
| 35 | What brand controls are safe for all tenants? | Prevents broken themes | Token tiers |
| 36 | Should tenants customize logo, palette, fonts, radius, density, imagery, and animations? | Defines token scope | Design system |
| 37 | Should admin chrome use customer branding or easyGDS branding? | Affects UX consistency | Theme boundaries |
| 38 | Are brand presets required? | Helps non-design users | Brand Studio scope |
| 39 | Does easyGDS need dark mode? | Doubles token validation | Theme system |
| 40 | What accessibility standard is required? | Defines design QA | WCAG target |
| 41 | Are animations decorative, functional, or part of brand expression? | Affects motion system | Motion tokens |
| 42 | Are customer-facing pages more luxury, budget, business, family, adventure, or mixed? | Guides visual direction | Template strategy |

### Vue to React Migration

| # | Question | Why it matters | Decision impact |
|---:|---|---|---|
| 43 | How many Vue components exist and which are actively used? | Determines migration size | Timeline |
| 44 | Are Vue components presentational or tied to business logic? | Determines rewrite risk | Migration approach |
| 45 | Which Vue components must be visually preserved? | Some may be redesigned | Acceptance criteria |
| 46 | Are there existing tests, stories, or screenshots for Vue components? | Helps regression control | QA strategy |
| 47 | Are component APIs stable or inconsistent? | Affects package design | UI library |
| 48 | Should migration happen before or after the new design system? | Order matters | Delivery sequence |
| 49 | Which components should be retired instead of migrated? | Avoids carrying bad patterns | Backlog cleanup |

### Frontend Architecture

| # | Question | Why it matters | Decision impact |
|---:|---|---|---|
| 50 | Is the admin portal the only Next.js app, or will public sites be another app? | Determines monorepo shape | Runtime split |
| 51 | Is Next.js also the BFF layer or only frontend? | Defines API ownership | Server Actions/Route Handlers |
| 52 | What deployment target is preferred: Vercel, self-hosted Node, AWS, GCP, Cloudflare? | Affects caching, runtime, PPR support | Infra design |
| 53 | Is App Router mandatory for all surfaces? | Should be yes for new Next.js | Routing design |
| 54 | Which routes are authenticated and personalized? | CDN cache limits | Rendering strategy |
| 55 | Which data can be cached safely? | Prevents stale tenant data | Cache model |
| 56 | What data needs read-your-own-writes? | Critical for editor UX | Revalidation |
| 57 | Does v1 need streaming dashboard widgets? | Nice but optional | Suspense boundaries |
| 58 | Should Cache Components be enabled from day one? | Newer Next.js model, not always necessary | Architecture risk |
| 59 | Is Partial Prerendering needed for admin, public sites, or neither in v1? | PPR is more useful for public pages | Performance strategy |

### State and Data Fetching

| # | Question | Why it matters | Decision impact |
|---:|---|---|---|
| 60 | Which screens need long-lived client interaction? | Determines client state scope | Zustand/TanStack Query usage |
| 61 | Does the builder need optimistic updates? | Affects autosave and conflict handling | Mutation strategy |
| 62 | Do forms need complex validation and conditional fields? | Affects React Hook Form/Zod decision | Form architecture |
| 63 | Is route state shareable via URL? | Important for tabs, filters, previews | Search params |
| 64 | Do integration status screens need real-time updates? | Polling vs SSE/WebSocket | Realtime decision |
| 65 | Should admin CRUD use Server Actions or REST calls from client islands? | Depends on interaction model | Data boundary |

### Travel Integrations

| # | Question | Why it matters | Decision impact |
|---:|---|---|---|
| 66 | Which vertical launches first: flights, hotels, tours, activities, cars? | Determines provider and schema | API design |
| 67 | Which provider is required first: Travelport, Duffel, Expedia Rapid, Amadeus, other? | Each has different workflows | Integration adapter |
| 68 | Are tenants bringing their own supplier credentials? | Changes secrets and onboarding | IntegrationAccount model |
| 69 | Are searches live, cached, or hybrid? | Affects user expectations | Search UX |
| 70 | How should expired offers be shown? | Travel offers expire quickly | Booking UI |
| 71 | Is repricing required before booking? | Common in travel | Booking flow |
| 72 | Are payments handled by easyGDS, tenant, provider, or redirect? | Critical architecture fork | Checkout |
| 73 | Are cancellations, changes, refunds, and ancillaries in v1? | Large scope | Post-booking ops |
| 74 | Are provider webhooks required? | Needed for booking changes | Webhook inbox |
| 75 | Should tenants configure CRM or mid-office webhooks? | Enterprise extension | Outbound events |

### Preview, Publish, and Cache

| # | Question | Why it matters | Decision impact |
|---:|---|---|---|
| 76 | Does save mean live, or is there a publish step? | Defines CMS workflow | Draft/published model |
| 77 | Does preview require exact customer-facing rendering? | Important for trust | Runtime design |
| 78 | Should preview bypass CDN? | Prevents stale draft preview | Data plane |
| 79 | Should published versions be immutable snapshots? | Enables rollback | Storage model |
| 80 | Is rollback required in v1? | Operational safety | Publish model |
| 81 | Does publish need validation gates? | Prevents broken public sites | Publish readiness |
| 82 | Should publish be async? | Likely yes if warming caches and validating integrations | Job system |

### Non-Functional Requirements

| # | Question | Why it matters | Decision impact |
|---:|---|---|---|
| 83 | Expected number of tenants in year one? | Affects tenancy and scaling | DB and caching |
| 84 | Expected number of public sites per tenant? | Affects routing and domains | Data model |
| 85 | Expected public traffic per site? | Affects CDN and rendering | Performance |
| 86 | Expected admin concurrent users? | Affects session and API scale | Infrastructure |
| 87 | Required uptime for admin vs public sites? | Different SLAs may apply | Deployment topology |
| 88 | Required p95 page load and API response times? | Defines performance budget | Monitoring |
| 89 | Required locales and currencies? | Travel often needs both | i18n model |
| 90 | Required compliance: GDPR, PCI, SOC 2, regional privacy? | Determines data handling | Security architecture |
| 91 | What PII is stored? | Security and privacy | Database and audit |
| 92 | What is acceptable RPO/RTO? | Disaster recovery | Infra design |

### Team and Delivery

| # | Question | Why it matters | Decision impact |
|---:|---|---|---|
| 93 | How many frontend, backend, design, and QA people are available? | Determines phase size | Roadmap |
| 94 | Who owns the design system after launch? | Prevents drift | Governance |
| 95 | Who approves architecture decisions? | Avoids deadlock | ADR process |
| 96 | How often can the team release? | Affects CI/CD | Deployment strategy |
| 97 | Is there a fixed launch date or pilot commitment? | Impacts scope cuts | Delivery plan |
| 98 | What existing Vue code, APIs, and designs can be reused? | Affects timeline | Migration plan |
| 99 | Is there an existing backend, database, or auth system? | Changes build-from-scratch assumption | Integration plan |
| 100 | What demos must be possible after the first milestone? | Defines prototype scope | P0/P1 outputs |

## All Question Explanations

### Business Model

| # | What the question means | Example choices |
|---:|---|---|
| 1 | Revenue model means how easyGDS earns money. You selected booking transaction fees and setup fees. | Setup fee: $2,000 to launch. Transaction fee: 2% per booking. |
| 2 | Merchant of record means who legally sells to the traveler and handles payment liability. You selected yes, easyGDS. | If traveler disputes a charge, easyGDS handles the dispute. |
| 3 | Supplier payment model means who pays the airline/hotel/tour provider after traveler payment. You selected traveler pays easyGDS, then easyGDS pays the agent/supplier booking price. | Traveler pays $500 booking price plus $20 fee to easyGDS. easyGDS pays $500 to agent/supplier and keeps $20. |
| 4 | Customer type determines workflows and templates. You selected all, but v1 still needs a primary focus. | Small agency needs speed; large brand needs approvals; hotel needs property content; tour operator needs itinerary pages. |
| 5 | Target time-to-launch is how quickly a new customer site should go live. | Same day, 2-3 days, 1-2 weeks, or custom month-long onboarding. |
| 6 | First 3 customer segments are the priority customer groups for v1. | Example: small travel agencies, tour operators, boutique hotel brands. |
| 7 | Pilot customer is the first real or realistic customer scenario used to validate the product. | "A 10-person tour agency needs a branded booking website in 3 days." |
| 8 | Out of scope means features intentionally not built in v1. | No custom code blocks, no multi-user collaboration, no refund automation in v1. |

### Product Scope

| # | What the question means | Example choices |
|---:|---|---|
| 9 | Product boundary defines what easyGDS owns in v1. You selected white-label booking storefront platform with CMS capabilities included. | CMS only, site builder, or full booking platform with checkout/payment. |
| 10 | Public booking checkout means travelers can complete booking and payment on the generated site. | Checkout in easyGDS vs lead form vs redirect to supplier. |
| 11 | Admin scope asks whether users manage only website content or also travel operations. | Pages only vs offers/rates/bookings/cancellations. |
| 12 | Public runtime asks how customer sites are served. You selected dynamic rendering. | Static pages, dynamic Next.js pages, or separate public app/runtime. |
| 13 | Template marketplace means reusable templates can be browsed, installed, and maybe sold. You selected marketplace/templates. | Internal template library vs public marketplace. |
| 14 | Environments mean separate spaces for editing/testing/live. You selected staging, preview, and production. | Draft preview, staging site, production site. |

### Users and Permissions

| # | What the question means | Example choices |
|---:|---|---|
| 15 | Daily user persona drives UX density and language. | Owner, marketer, content editor, travel ops, support staff. |
| 16 | Roles are named permission groups. | Platform admin, tenant owner, editor, travel ops, viewer. |
| 17 | Permission model defines how access is checked. | Role-based: admin/editor. Capability-based: can_publish, can_manage_integrations. Custom: tenant-defined permissions. |
| 18 | Multi-tenant membership means one user can access multiple customer accounts. | A support user can access all tenants; an agency user can access many clients. |
| 19 | Impersonation means internal support can view or act as a tenant user. | Support logs in as customer to debug publish issue. Needs audit log. |
| 20 | SSO/OIDC/SAML are enterprise login methods. | Customer signs in with Google Workspace, Azure AD, or Okta. |
| 21 | Approval before publishing means changes need review before live. You are considering this. | Editor submits, admin approves, system publishes. |
| 22 | Audit logs record who changed what and when. | "Minh changed homepage hero image at 10:32." |

### CMS and Builder

| # | What the question means | Example choices |
|---:|---|---|
| 23 | Starting model controls onboarding. | Template first, blank canvas, or guided setup wizard. |
| 24 | Builder model controls editing freedom. You selected B and C. | Section composer and full drag/drop. Recommended implementation order can still be decided later. |
| 25 | Page types are the kinds of pages customers can create. | Home, destination, offer, tour detail, hotel detail, FAQ, contact. |
| 26 | Blocks are reusable page sections. | Hero, booking widget, offer grid, destination grid, testimonial, FAQ. |
| 27 | Nested layout editing means sections can contain custom columns/rows/inner blocks. | A user creates a 3-column offer row inside a section. |
| 28 | Undo/redo lets users reverse edits. | User drags wrong block, presses undo. Requires history. |
| 29 | Autosave saves edits without manual save. | Every block edit is saved after 1 second. Needs conflict handling. |
| 30 | Collaborative editing means multiple users edit same page at once. | Google Docs style editing. Very complex. |
| 31 | Version history and rollback let users restore older content. | Restore homepage version from last Friday. |
| 32 | Responsive behavior controls mobile/tablet/desktop layouts. | Section image stacks above text on mobile. |
| 33 | Custom code/CSS means tenants can inject their own code. | Powerful, but risky for security, performance, and support. |
| 34 | Custom blocks let tenants create new block types. | Enterprise tenant creates custom "Cruise itinerary" block. |

### Brand and Design

| # | What the question means | Example choices |
|---:|---|---|
| 35 | Safe brand controls are options that cannot easily break UI. | Logo, colors, fonts, radius, density presets. |
| 36 | Customization depth defines what tenants can control. | Basic brand kit vs advanced layout and animation controls. |
| 37 | Admin theming asks whether admin UI changes to customer brand. | Admin stays easyGDS-branded; preview uses tenant brand. |
| 38 | Brand presets are curated visual styles. | Luxury Travel, Family Adventure, Business Travel. |
| 39 | Dark mode means a separate dark theme. | Admin dark mode or public site dark theme. |
| 40 | Accessibility standard defines usability for people using keyboard/screen readers. | WCAG 2.1 AA is a common target. |
| 41 | Animation purpose decides whether motion is functional or decorative. | Functional: drop insertion highlight. Decorative: page sparkle effect. |
| 42 | Customer-facing visual direction guides templates. | Luxury, budget, corporate, adventure, boutique hotel. |

### Vue to React Migration

| # | What the question means | Example choices |
|---:|---|---|
| 43 | Component count and usage estimate migration size. | 40 components total, 12 critical, 10 unused. |
| 44 | Presentational vs business logic affects rewrite risk. | Button is presentational; booking widget contains pricing logic. |
| 45 | Visual preservation asks what must look the same. | Keep booking form behavior but redesign visuals. |
| 46 | Existing tests/stories/screenshots help verify migration. | Storybook, Cypress tests, screenshots, Figma specs. |
| 47 | Component API stability affects package design. | Consistent props can migrate easily; inconsistent props need redesign. |
| 48 | Migration order decides whether to build tokens first. | Recommended: design system first, complex screens later. |
| 49 | Retire candidates are components not worth migrating. | Old table, unused modal, duplicate card component. |

### Frontend Architecture

| # | What the question means | Example choices |
|---:|---|---|
| 50 | App split asks whether admin and public sites are separate Next.js apps. | One app for both, or `apps/admin` and `apps/public-site`. |
| 51 | BFF asks whether Next.js handles backend-for-frontend APIs. | Next.js server actions/route handlers vs external backend API only. |
| 52 | Deployment target affects runtime and caching. | Vercel, self-hosted Node, AWS, GCP, Cloudflare. |
| 53 | App Router means using Next.js `app/` routing. | Recommended for new Next.js projects. |
| 54 | Personalized routes contain user/tenant-specific data. | `/sites/[siteId]/builder` cannot be globally CDN cached. |
| 55 | Cache-safe data can be reused without leaking tenant info. | Country list, template catalog, provider metadata. |
| 56 | Read-your-own-writes means user sees their change immediately after saving. | Edit logo, preview updates right away. |
| 57 | Streaming widgets load parts of a page progressively. | Dashboard loads shell first, analytics widget later. |
| 58 | Cache Components are newer Next.js caching primitives. | Useful after data boundaries are stable, not a day-one builder dependency. |
| 59 | PPR renders static shell and streams dynamic parts. | Better fit for public pages than authenticated builder. |

### State and Data Fetching

| # | What the question means | Example choices |
|---:|---|---|
| 60 | Long-lived client interaction means UI stays open and interactive for a long session. | Builder canvas, rich text editor, asset manager. |
| 61 | Optimistic updates show changes before server confirms. | Reorder section immediately, rollback if save fails. |
| 62 | Complex forms need structured validation and conditional fields. | Provider credential form changes fields by provider. |
| 63 | URL state makes filters/tabs shareable. | `/sites?status=draft&sort=updated`. |
| 64 | Real-time updates show status changes without refresh. | Publish job progress, sync health, webhook result. |
| 65 | Server Actions vs REST calls decides mutation style. | Simple form submit via Server Action; complex builder autosave via API/query mutation. |

### Travel Integrations

| # | What the question means | Example choices |
|---:|---|---|
| 66 | Launch vertical is the first travel product line. You selected all as product scope. | Hotel first, flight first, tours first, or all eventually. |
| 67 | First provider is the first API to integrate. | Expedia for hotel, Duffel for flights, Travelport for GDS, Amadeus for prototype. |
| 68 | Credential ownership asks whose supplier account is used. | easyGDS master credentials or tenant-owned credentials. |
| 69 | Search freshness controls whether results are live or cached. | Live every time, cached for 5 minutes, or hybrid. |
| 70 | Expired offers are travel options no longer bookable at old price. | Show "price expired, refresh required." |
| 71 | Repricing means confirming price before booking. | Flight fare changed from $300 to $325 before payment. |
| 72 | Payment ownership asks who charges traveler. You selected easyGDS as merchant of record. | Traveler pays easyGDS booking price plus booking fee; easyGDS pays the agent/supplier booking price. |
| 73 | Post-booking servicing means actions after booking. | Cancel, refund, change flight, add baggage, resend confirmation. |
| 74 | Provider webhooks are supplier event callbacks. | Hotel booking changed externally; provider sends webhook. |
| 75 | Tenant-owned outbound webhooks let tenants receive easyGDS events. | Send `booking.created` to tenant CRM. |

### Preview, Publish, and Cache

| # | What the question means | Example choices |
|---:|---|---|
| 76 | Save-live relationship defines whether edits go public immediately. You selected B and C. | Draft/publish plus optional approval/schedule. |
| 77 | Preview fidelity means how close preview is to final public site. | Exact responsive preview vs approximate preview panel. |
| 78 | Preview bypassing CDN prevents stale live content from showing during editing. | Draft preview reads draft data, not published cached page. |
| 79 | Immutable published versions are snapshots that never change. | Published version 12 stays stored even after version 13 goes live. |
| 80 | Rollback means returning to an earlier published version. | Repoint live site to version 11 after bad publish. |
| 81 | Publish validation gates check readiness before live. | Missing logo, broken provider config, invalid booking widget. |
| 82 | Async publish means publish runs as a job. | Validate, build snapshot, warm cache, then flip live pointer. |

### Non-Functional Requirements

| # | What the question means | Example choices |
|---:|---|---|
| 83 | Tenant count estimates platform scale. | 50, 500, 5,000 tenants in year one. |
| 84 | Sites per tenant affects data model and domains. | One website per tenant or many campaign/brand sites. |
| 85 | Public traffic affects CDN and rendering strategy. | 1,000 visits/month/site vs 1M visits/month/site. |
| 86 | Admin concurrent users affects sessions and backend load. | 10 admins vs 1,000 active editors. |
| 87 | Uptime target defines acceptable downtime. | Admin 99.5%, public sites 99.9% or higher. |
| 88 | Performance targets define acceptable latency. | API p95 under 300ms, page LCP under 2.5s. |
| 89 | Locales and currencies affect content and booking. | English/Vietnamese, USD/VND/EUR. |
| 90 | Compliance affects security and data handling. | GDPR, PCI, SOC 2, local privacy rules. |
| 91 | PII is personal data. | Traveler name, passport, email, phone, payment references. |
| 92 | RPO/RTO define disaster recovery. | RPO: lose max 15 minutes of data. RTO: restore in 1 hour. |

### Team and Delivery

| # | What the question means | Example choices |
|---:|---|---|
| 93 | Team capacity defines realistic roadmap. | 2 frontend, 2 backend, 1 designer, 1 QA. |
| 94 | Design system ownership prevents inconsistency. | Frontend lead owns implementation; designer owns tokens and review. |
| 95 | Architecture approver prevents stalled decisions. | CTO or engineering lead signs ADRs. |
| 96 | Release frequency changes CI/CD needs. | Daily deploys vs weekly releases. |
| 97 | Launch date controls scope cuts. | Pilot in 8 weeks means limit builder freedom. |
| 98 | Reusable existing assets reduce work. | Existing API, Vue logic, Figma, templates, provider accounts. |
| 99 | Existing backend/auth/database changes "from scratch" assumption. | Reuse existing auth vs build new. |
| 100 | First milestone demo defines early proof. | Create site, customize brand, add sections, preview, publish. |

## Decision Gates

| Gate | Required answers |
|---|---|
| MVP framing | Product boundary, first customer, first vertical, non-goals |
| Tenant model | Tenant/site/domain relationship, roles, isolation |
| Builder model | Template/section/freeform, autosave, undo, versioning |
| Integration model | First provider, credential ownership, booking/payment responsibility |
| Runtime model | Admin/public split, Next.js deployment target, cache policy |
| Design model | Token scope, brand control tiers, component ownership |
| Migration model | Vue inventory, parity level, redesign candidates |

## Recommended Direction

Current product direction is CMS capabilities plus a white-label booking storefront platform, all travel verticals, dynamic public rendering, template marketplace, staging/preview/production environments, and standalone versioned internal packages. The implementation plan should be revised later before build work starts because the package model changed from app-local to standalone versioned packages.

## Related Documents

| Document | Relationship |
|---|---|
| [00-index.md](./00-index.md) | Doc map |
| [02-kickoff-prep.md](./02-kickoff-prep.md) | Turns these questions into a meeting plan |
| [03-technical-decision-inputs.md](./03-technical-decision-inputs.md) | Uses answers to choose architecture |
| [04-build-approach.md](./04-build-approach.md) | Converts decisions into phases |

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-05-03 | Codex | Created initial question inventory |
| 2026-05-03 | Codex | Added current inputs and linked explanation guide |
| 2026-05-03 | Codex | Merged question explanation guide into this document |
