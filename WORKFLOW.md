# Solution Architect Workflow

> Production-grade delivery process for fullstack engineers using tri-ai-kit agents.

---

## Overview

```
Problem → Brainstorm → Architecture → Spike → Tech Selection
    → Testing Strategy → CI/CD Design → Implementation
    → Performance Testing → Security Hardening → Observability
    → Infrastructure → Release Management → Go-Live → Post-Launch
```

Feedback loops exist at every gate. Failures at any phase trigger replanning, not just retrying.

---

## Phase 1 — Problem Definition + Risk Assessment

**Skill:** `/brainstorm` | **Agent:** `brainstormer`

- Define the problem, constraints, and success criteria
- Identify stakeholders and non-functional requirements (scale, latency, compliance)
- Map out unknowns that need research
- Define success metrics (how will we measure success?)
- Budget and timeline constraints
- Team capacity and skill inventory

**Risk Assessment (required):**
- Top 5 failure modes and mitigations
- Security threats (data breach, DDOS, injection)
- Compliance requirements (GDPR, HIPAA, SOC2)
- Vendor lock-in risks
- Operational risks (on-call burden, incident load)

**Exit criteria:** Problem statement written, risk register created, success metrics defined.

---

## Phase 2 — Technical Brainstorm

**Skill:** `/brainstorm` | **Agent:** `researcher`

- Evaluate multiple technical approaches
- Compare tradeoffs: build vs buy, monolith vs microservices, REST vs GraphQL
- Research best practices, prior art, known failure modes
- Prototype viability check (can this actually be built in time?)
- Dependency audit (third-party risk, maintenance status)

**Output:** Shortlist of 2-3 viable approaches with pros/cons and a recommended direction.

**Exit criteria:** Recommended approach documented with trade-off rationale.

---

## Phase 3 — Architecture & Planning

**Skill:** `/plan --arch` | **Agent:** `planner` (orchestrates `backend-architect` → `frontend-architect`)

Split into two parallel tracks, synchronized by a shared API contract. Use `planner` with `/plan --arch` to automatically dispatch both architecture agents before generating the implementation plan.

**Shared First:**
- OpenAPI / GraphQL schema contract (agreed before either track starts)
- C4 architecture diagram (Context → Container → Component)
- Data flow diagram (where data enters, transforms, and exits)
- Error handling matrix (per endpoint: what fails, how it's handled)
- Auth/authz strategy (OAuth2, session, JWT — decided upfront)
- Caching strategy (HTTP cache, Redis, CDN layers)
- Async job strategy (queues, webhooks, scheduled jobs)
- Database migration strategy (expand/contract pattern, zero-downtime)

**Backend Plan:**
- API contract implementation plan
- Data model and schema design (ER diagram + constraints)
- Background jobs and integration points
- Rate limiting and throttling design
- Secrets and configuration management

**Frontend Plan:**
- Page/screen structure and routing
- State management strategy
- Component hierarchy and design system alignment
- Error boundary coverage
- Loading/empty/error state handling
- UI/UX design brief → hand off to `design-specialist` before implementation if visual design is needed

**Exit criteria:** C4 diagram done, OpenAPI spec drafted, both backend and frontend plans written with file ownership map.

---

## Phase 4 — Spike / Prototype

**Skill:** `/cook-auto-fast` | **Agent:** `developer`

Validate the riskiest architectural assumption before committing to full implementation.

- Build the smallest possible version of the hardest part
- Validate external integrations (third-party APIs, auth flows, DB performance)
- Confirm tech stack compatibility under the planned load profile
- Document findings: what worked, what changed, what was invalidated

**Spike failure → return to Phase 2 or 3.**

**Exit criteria:** Risk assumptions validated or replanning triggered.

---

## Phase 5 — Tech Stack Selection

**Skill:** `/research` | **Agent:** `researcher`

Decision matrix — informed by spike results:

| Layer | Option A | Option B | Selected | Trade-offs |
|-------|----------|----------|----------|-----------|
| **Language** | TypeScript | Go / Python | — | Type safety vs. deployment simplicity |
| **Web Framework** | Next.js | Express / FastAPI | — | SSR/SSG vs. minimal surface |
| **Database** | PostgreSQL | MongoDB | — | ACID vs. schema flexibility |
| **Cache** | Redis | Memcached | — | Rich data types vs. simplicity |
| **Message Queue** | RabbitMQ | AWS SQS | — | Self-hosted vs. managed |
| **Container** | Docker | None | — | Portability vs. ops overhead |
| **CI/CD** | GitHub Actions | GitLab CI | — | Cost, integrations, lock-in |
| **Monitoring** | Datadog | New Relic | — | Cost, features |
| **Logging** | ELK | Loki + Grafana | — | Ops burden vs. cost |

**Exit criteria:** Decision matrix filled, selections justified, team confirmed.

---

## Phase 6 — Testing Strategy

**Skill:** `/plan` | **Agent:** `planner`

Defined before implementation starts so tests are written alongside code.

| Layer | Target | Tooling |
|-------|--------|---------|
| **Unit** | 80% coverage on critical business logic | Jest / Vitest |
| **Integration** | API contract conformance, DB interactions | Supertest, Testcontainers |
| **E2E** | 3-5 critical user journeys | Playwright |
| **Load** | p95 latency < 200ms at 10× expected peak | k6, Locust |
| **Security** | OWASP Top 10 checklist | OWASP ZAP, Snyk |
| **Visual regression** | No unintended UI changes | Playwright screenshots |

**Exit criteria:** Test targets defined, tooling selected, initial test scaffolding created.

---

## Phase 7 — CI/CD Pipeline Design

**Skill:** `/infra-docker` or `/infra-cloud` | **Agent:** `researcher`

- Pipeline stages: `build → lint → unit test → integration test → staging deploy → e2e → production gate`
- Deployment gates (all tests passing, no critical CVEs, no bundle size regression)
- Artifact management (Docker registry, versioned images, retention policy)
- Environment parity (dev ≈ staging ≈ production — use containerization)
- Secrets management (no hardcoded secrets; rotation schedule defined)
- Branch strategy (trunk-based development recommended; feature branches short-lived)

**Minimum pipeline gates before merge:**
- [ ] All unit + integration tests pass
- [ ] No new critical/high CVEs (Snyk or Dependabot)
- [ ] Bundle size change < +5%
- [ ] TypeScript strict mode — no new errors
- [ ] SAST scan clean

**Exit criteria:** Pipeline config committed, environment variables documented in `.env.example`.

---

## Phase 8 — Implementation

**Skill:** `/cook` or `/cook-auto-parallel` | **Agent:** `developer` (frontend + backend + design)

- Build from plan, phase by phase
- Backend: API endpoints, business logic, data layer (`backend-developer` — Go, Node.js, or Python/FastAPI)
- Frontend: components, pages, client state (`frontend-developer`)
- Design: tokens, brand assets, UI specs, banners, slides (`design-specialist`) — run before frontend when visual design is needed
- Parallel execution when phases have non-overlapping file ownership
- Contract testing between frontend and backend (mocked API during parallel development)

**Definition of Done per task:**
- [ ] Feature works end-to-end in local environment
- [ ] Unit tests written and passing
- [ ] No TypeScript errors (strict mode)
- [ ] No lint violations
- [ ] Code reviewed and approved
- [ ] API contract updated if endpoints changed

**Local dev parity:** `docker-compose up` or devcontainer brings up the full stack locally.

---

## Phase 9 — Review Gates

**Skill:** `/review` | **Agent:** `code-reviewer`

**Frontend Review:**

| Dimension | What to Check |
|-----------|---------------|
| **Accessibility (a11y)** | WCAG 2.1 AA — ARIA roles, keyboard nav, color contrast, screen reader flow |
| **Security** | XSS, CSRF, input sanitization, sensitive data in client state |
| **Unit Testing** | Coverage for business logic, edge cases, component behavior |
| **Business Logic** | Feature completeness, error/empty/loading states |
| **Architecture** | Component boundaries, separation of concerns, reusability |
| **Performance** | Bundle size, code splitting, render bottlenecks, Core Web Vitals |
| **TypeScript** | Strict mode, no `any`, proper type narrowing |
| **Visual Regression** | No unintended UI changes vs. baseline |
| **SEO** | Meta tags, structured data, crawlability |
| **Mobile** | Responsive layout, touch targets, viewport behavior |

**Backend Review:**

| Dimension | What to Check |
|-----------|---------------|
| **Security** | Auth/authz, injection (SQL, NoSQL, command), secrets management, rate limiting |
| **Performance** | Query optimization, N+1, missing indexes, connection pooling, caching |
| **SQL/Query** | EXPLAIN plans, slow queries, transaction boundaries, deadlock risks |
| **Concurrency** | Race conditions, idempotency, optimistic locking |
| **Code Quality** | Error handling, logging, input validation at boundaries |
| **API Design** | Consistent contracts, versioning, backward compatibility |
| **API Contract** | Does implementation match the OpenAPI spec? |
| **Resource Cleanup** | Connection pools, file handles, memory leaks |

**Review failure → return to Phase 8.**

---

## Phase 10 — Performance & Load Testing

**Skill:** `/test` | **Agent:** `tester`

- Run load tests against staging environment (k6 or Locust)
- Validate p95 latency meets SLO targets
- Identify bottlenecks: slow queries, missing indexes, N+1s under load
- Stress test: what breaks first at 10× expected traffic?
- Document results — pass/fail against targets defined in Phase 6

**Load test failure → return to Phase 8 or Phase 3 if architectural.**

**Exit criteria:** Load test report written, SLO targets met or exceptions documented.

---

## Phase 11 — Security Hardening

**Skill:** `/audit --code` | **Agent:** `code-reviewer`

- OWASP Top 10 compliance audit
- Penetration testing (manual or automated: OWASP ZAP, Burp Suite)
- Secrets scanning — no API keys, tokens, or passwords in codebase
- Access control audit — principle of least privilege enforced
- Encryption inventory — data at rest + in transit
- Dependency audit — no known critical CVEs in production deps
- Security headers (CSP, HSTS, X-Frame-Options)

**Exit criteria:** Security checklist signed off. Critical findings resolved before deployment.

---

## Phase 12 — Observability Setup

**Skill:** `/infra-cloud` | **Agent:** `researcher`

Defined before go-live, not retrofitted after.

- **Logging:** Centralized log aggregation (ELK, Loki, Cloudwatch). Log levels defined. Sampling for high-volume paths.
- **Metrics:** RED method — Request rate, Error rate, Duration. USE for infrastructure — Utilization, Saturation, Errors.
- **Dashboards:** Ops-at-a-glance — request latency, error rate, active connections, resource usage.
- **Alerting:** Define what pages the on-call engineer. Thresholds per alert. Low-noise policy.
- **Distributed tracing:** Follow a single request end-to-end (Jaeger, Datadog APM, OpenTelemetry).
- **SLOs/SLIs:** Uptime commitment, latency targets, error rate budget — written down.

**Exit criteria:** Dashboards live in staging, alerts configured, SLOs documented.

---

## Phase 13 — Hosting & Infrastructure

**Skill:** `/cloud-architect` | **Agent:** `researcher`

**Decision matrix — cost vs reliability:**

| Option | Best For | Cost Profile |
|--------|----------|-------------|
| **Vercel / Netlify** | Frontend-heavy, JAMstack | Free tier generous; scales with usage |
| **Railway / Render** | Full-stack apps, small teams | Predictable low cost, easy deploys |
| **Fly.io** | Low-latency global edge, containers | Pay-per-use, very cost-efficient |
| **Cloud Run (GCP)** | Containerized APIs, scale-to-zero | Pay only when serving traffic |
| **AWS Lambda + API GW** | Infrequent/bursty workloads | Near-zero idle cost |
| **ECS / GKE / AKS** | High-traffic, complex microservices | Higher ops cost, full control |
| **Supabase / PlanetScale** | Managed Postgres/MySQL | Generous free tier, scales well |

**Infrastructure checklist:**
- [ ] CDN for static assets (Cloudflare, CloudFront)
- [ ] Auto-scaling policy configured and tested
- [ ] DB read replicas if read-heavy
- [ ] Health checks + graceful shutdowns + rolling deploys
- [ ] Backup/restore procedure validated (test restores)
- [ ] Disaster recovery plan (RTO and RPO defined)
- [ ] Cost alerts configured

**Exit criteria:** Infrastructure provisioned in staging, validated via load test, backup restore tested.

---

## Phase 14 — Release Management & Go-Live

**Skill:** `/git` | **Agent:** `git-manager`

- **Feature flags:** Ship code without activating features (LaunchDarkly, Unleash, or env vars)
- **Canary deployment:** 1% → 10% → 50% → 100% traffic
- **Rollback plan:** Defined before deployment. Target: rollback in < 5 minutes
- **Runbook:** Step-by-step deployment checklist. What to watch during rollout.
- **Communication plan:** Status page updates, user notifications if downtime expected
- **Monitoring during rollout:** Watch error rates and latency for 30 min post-deploy

**Deployment strategies:**

| Strategy | Use When |
|----------|----------|
| **Blue-Green** | Zero-downtime required, easy rollback |
| **Canary** | High-risk changes, gradual confidence building |
| **Rolling** | Stateless services, resource-constrained environments |
| **Feature Flags** | Ship code before feature is ready for users |

**Exit criteria:** Deployment complete, error rate nominal, monitoring confirms stability.

---

## Phase 15 — Post-Launch

**Skill:** `/research` | **Agent:** `researcher` + `project-manager`

Ongoing, not a one-time phase.

- **Monitoring tuning:** Reduce alert noise. Tune thresholds based on real traffic patterns.
- **Performance optimization:** Identify bottlenecks using real production data (not synthetic).
- **User feedback loop:** Beta → GA progression. Monitor support channels and error tracking.
- **Incident response:** Postmortem for every P1. Action items tracked to completion.
- **SLO review:** Weekly check — are we meeting the commitments made in Phase 12?
- **Dependency maintenance:** Monthly dependency updates. Automated security patches.
- **Capacity planning:** Quarterly — are we growing into infrastructure limits?

**Incident Response:**
- On-call rotation defined (who gets paged at 3am?)
- Escalation matrix (database down → who do we call?)
- Postmortem template (blameless, action-oriented)

---

## Feedback Loop Map

```
Phase 4 (Spike) fails        → return to Phase 2 or 3
Phase 8 (Implementation) blocked → surface to Phase 3 for replanning
Phase 9 (Review) fails       → return to Phase 8
Phase 10 (Load Test) fails   → return to Phase 8 (perf) or Phase 3 (architecture)
Phase 11 (Security) fails    → return to Phase 8 (fix) or Phase 3 (redesign)
Phase 14 (Deploy) fails      → rollback + postmortem + return to Phase 8
Phase 15 SLO breach          → incident response → root cause → Phase 8
```

---

## Quick Agent Reference

| Task | Command | Agent |
|------|---------|-------|
| Brainstorm approaches | `/brainstorm` | `brainstormer` |
| Research tech options | `/research` | `researcher` |
| Create plan | `/plan` | `planner` |
| Implement features (generic) | `/cook` | `developer` |
| Implement frontend (Phase 8) | `/cook` | `frontend-developer` |
| Implement backend (Phase 8) | `/cook` | `backend-developer` |
| Design UI/UX, brand, assets | `/design` | `design-specialist` |
| Review code | `/review` | `code-reviewer` |
| Audit (UI/a11y/code) | `/audit` | specialist agents |
| Security hardening (Phase 11) | `/audit --security` | `security-auditor` |
| CI/CD + Infra + Observability | `/infra-cloud` or `/infra-docker` | `devops-engineer` |
| Write/run tests | `/test` | `tester` |
| Write docs | `/docs` | `docs-manager` |
| Commit & ship | `/git` | `git-manager` |
| Debug issues | `/debug` | `debugger` |

## Phase → Agent Map

| WORKFLOW Phase | Agent(s) |
|---------------|---------|
| Phase 1 — Problem + Risk | `brainstormer` |
| Phase 2 — Technical Brainstorm | `researcher` |
| Phase 3 — Architecture & Planning | `planner` → `backend-architect` + `frontend-architect` |
| Phase 4 — Spike / Prototype | `developer` |
| Phase 5 — Tech Stack Selection | `researcher` |
| Phase 6 — Testing Strategy | `planner` + `tester` |
| Phase 7 — CI/CD Pipeline Design | `devops-engineer` |
| Phase 8 — Implementation (frontend) | `frontend-developer` |
| Phase 8 — Implementation (backend) | `backend-developer` |
| Phase 8 — Implementation (design) | `design-specialist` |
| Phase 9 — Review Gates | `code-reviewer` |
| Phase 10 — Performance & Load Testing | `tester` |
| Phase 11 — Security Hardening | `security-auditor` |
| Phase 12 — Observability Setup | `devops-engineer` |
| Phase 13 — Hosting & Infrastructure | `devops-engineer` |
| Phase 14 — Release Management | `git-manager` |
| Phase 15 — Post-Launch | `researcher` + `project-manager` |

---

> **Core loop:** Problem → `/brainstorm` → `/plan` → spike → `/cook` → `/review` → `/test` → `/git`
>
> **When in doubt:** Every phase has an exit criteria. If you can't check it off, the phase isn't done.

---

## Related Documents
- `AGENTS.md` — Agent routing rules, intent map, and orchestration protocol
