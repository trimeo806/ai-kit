# ANTIGRAVITY.md

This file provides guidance to **Antigravity** when working with code in this repository.

## Project: tri_ai_kit

---

## Antigravity System Architecture

### Configuration
- **Workflows (Agents)**: `_agents/workflows/` — Native slash commands and specialized agents.
- **Skills**: `skills/` — Passive knowledge, templates, and reference materials.

---

## What This Is

tri_ai_kit is a multi-agent development toolkit adapted for Antigravity. Specialized agent workflows load platform-specific skills on demand and follow shared orchestration rules. The main conversation is always the orchestrator — Antigravity dispatches tasks using its native workflow system and merges results.

---

## Routing

On every user prompt, sense context before acting:
1. Check git state (branch, staged/unstaged files)
2. Detect platform from file extensions (`.tsx`→web, `.swift`→ios, `.kt`→android, `.java`→backend)
3. Check for active plans in `./plans/`
4. Route to the best-fit workflow based on intent + context

### Prompt Classification

- **Dev task** (action/problem/question about code) → route via intent table below
- **Kit question** ("which agent", "list skills", "our conventions") → `/project-manager`
- **External tech question** ("how does React...", "what is gRPC") → `/researcher`
- **Conversational** (greetings, opinions, clarifications) → respond directly

### Intent Map

| Intent | Natural prompts (examples) | Routes To (Workflow) |
|--------|---------------------------|-----------|
| Build / Create (frontend) | "add a button", "build a form", "implement this UI", "React component" | `/frontend-developer` |
| Build / Create (backend) | "add an endpoint", "implement this API", "write a migration", "server function" | `/backend-developer` |
| Build / Create (generic) | "continue the plan", "implement X" (unclear layer) | `/developer` |
| Fix / Debug | "something is broken", "this crashes", "why does X happen", "it's not working" | `/debugger` |
| Plan / Design | "how should we build X", "let's plan", "what's the approach for" | `/planner` |
| Architecture (backend) | "design the API", "data model", "schema design", "auth strategy" | `/backend-architect` |
| Architecture (frontend) | "routing structure", "component hierarchy", "state management strategy" | `/frontend-architect` |
| Research | "how does X work", "best practices for", "compare A vs B" | `/researcher` |
| Review / Audit | "check my code", "is this good", "review before merge", "audit this" | `/code-reviewer` |
| Security | "security audit", "harden this", "OWASP", "check for vulnerabilities" | `/security-auditor` |
| Infra / CI/CD | "set up CI/CD", "deploy this", "add monitoring", "Terraform", "Docker" | `/devops-engineer` |
| Test | "add tests", "is this covered", "validate this works" | `/tester` |
| Docs | "document this", "update the docs", "write a spec" | `/docs-manager` |
| Git | "commit", "push", "create a PR", "ship it" | `/git-manager` |

**Fuzzy matching** — classify by verb type when no exact signal word:
- Creation verbs (add, make, create, build, set up) → Build
- Problem verbs (broken, wrong, failing, slow, crash) → Fix/Debug
- Question verbs (how, why, what, should, compare) → Research or Plan
- Quality verbs (check, review, improve, clean up, refactor, simplify) → Review
- Still ambiguous → infer from git context (staged files → Review, active plan → Build, error in prompt → Fix)

**Less common intents**: journal → `/journal-writer`, MCP → `/mcp-manager`, UI/UX design → `/design-specialist`, brand/logo/CIP → `/design-specialist`, banner/social assets → `/design-specialist`, slides/pitch deck → `/design-specialist`, UI component audit → `/muji`, security hardening → `/security-auditor`, brainstorm/ideate → `/brainstormer`, Python/FastAPI backend → `/backend-developer` + `fastapi-python` skill.

### Routing Rules

1. Explicit slash command → execute directly, skip routing.
2. TypeScript/build errors in context → route to Fix first (`/debugger`).
3. Staged files → boost Review or Git intent (`/code-reviewer` or `/git-manager`).
4. Active plan exists → boost Build ("continue" → cook); Antigravity reads the plan's `## Agents & Skills` table and **before dispatching the implementation agent**, runs the architecture gate: dispatch `/backend-architect` (backend phases) or `/frontend-architect` (frontend phases) to produce an architecture plan, present it to the user, and **wait for explicit approval** before executing; test phases skip the gate.
5. Merge conflicts → suggest fix/resolve.
6. Ambiguous after context boost → ask user (max 1 question).
7. All delegations follow `skills/core/references/orchestration.md`.

---

## Planning — Workflow & Skill Analysis (REQUIRED)

Every time a plan is created or a phase is authored, **Antigravity must analyze the available workflows and skills** and record which ones apply. This is not optional.

### Protocol

**Step 1 — Scan workflows**
Read files in `_agents/workflows/`. For each workflow, understand its purpose. If the directory is unreadable, **stop and ask the user** before proceeding.

**Step 2 — Scan skills**
Read `skills/skill-index.json`. Match each phase's domain (Go, React, auth, SSE, testing, infra…) to the relevant skill names. If the index is missing or unreadable, **stop and ask the user** to confirm the skill catalog location.

**Step 3 — Assign to plan.md**
Add an `## Agents & Skills` section to every `plan.md`:
```markdown
## Agents & Skills

| Phase | Workflow | Skills Activated |
|-------|-------|-----------------|
| P1 — {name} | `/backend-developer` | `golang-pro`, `postgres-pro` |
| P2 — {name} | `/frontend-developer` | `tanstack-start`, `react-expert` |
...
```

**Step 4 — Assign to each phase file**
Add an `## Agent & Skills` block to every `phase-{N}-*.md` (after the Overview section):
```markdown
## Agent & Skills
- **Agent**: `/backend-developer`
- **Skills**: `golang-pro`, `postgres-pro`, `api-designer`
- **Handoffs**:
  - After completion → `/code-reviewer`
  - On security concern → `/security-auditor`
```

### When you cannot determine the right workflow or skill

Ask the user **one focused question** before generating the plan:
> "I couldn't determine which workflow should handle [phase name]. Is this a backend (Go/API), frontend (React/TanStack), or infrastructure task?"
Do not guess. A wrong workflow assignment causes the wrong skills to activate during implementation.

### Domain → Workflow mapping (quick reference)

| Domain signal | Workflow | Core skills |
|---------------|-------|-------------|
| Go / REST API / DB migrations | `/backend-developer` | `golang-pro`, `postgres-pro`, `api-designer` |
| React / TanStack Start / UI | `/frontend-developer` | `tanstack-start`, `react-expert`, `typescript-pro` |
| Auth / OAuth / JWT | `/backend-developer` | `golang-pro`, `typescript-pro` |
| SSE / WebSocket / real-time | `/backend-developer` | `golang-pro`, `websocket-engineer` |
| E2E / unit / integration tests | `/tester` | `playwright-expert`, `web-testing`, `test` |
| Docker / CI/CD / infra | `/devops-engineer` | `infra-docker`, `terraform-engineer` |
| Security hardening | `/security-auditor` | `fullstack-guardian` |
| API schema design | `/backend-architect` | `api-designer`, `architecture-designer` |
| Routing / component hierarchy | `/frontend-architect` | `tanstack-start`, `architecture-designer` |
| UI/UX design, color, typography | `/design-specialist` | `ui-ux-pro-max`, `ui-styling`, `design-system` |
| Brand identity, logo, CIP | `/design-specialist` | `design`, `brand`, `ui-ux-pro-max` |
| Banners, social media assets | `/design-specialist` | `banner-design`, `design`, `ui-styling` |
| Presentations, pitch decks | `/design-specialist` | `slides`, `design-system` |
| Python / FastAPI backend | `/backend-developer` | `fastapi-python`, `postgres-pro`, `api-designer` |

---

## Orchestration

**Single intent** → Execute the matched workflow natively.

**Multi-intent** ("plan and build X", "research then implement") → Execute `/project-manager`, which decomposes and delegates sequentially.

**Parallel work** (3+ independent tasks, cross-platform) → Use `subagent-driven-development` skill from main context to spin up Antigravity subagents.

**Hybrid audits** (klara-theme code): Orchestrated from main context via `audit` skill. Dispatch `/muji` (Template A+) first, then `/code-reviewer` with muji's report. Never free-form prompt `/muji` — use structured delegation templates from `skills/audit/references/delegation-templates.md`.

**Escalation**: 3 consecutive failures → surface findings to user. Ambiguous request → ask 1 question max.

See `skills/core/references/orchestration.md` for full protocol.

---

## Guidelines

### Decision Authority
**Auto-execute**: dependency installs, lint fixes, documentation formatting
**Ask first**: deleting files, modifying production configs, introducing new dependencies, multi-file refactors, changing API contracts

### Code Changes
- Verify environment state before operations
- Use relative paths from project root
- Prefer existing patterns over introducing new conventions
- Conservative defaults: safety over speed, clarity over cleverness

### Core Rules
See `skills/core/SKILL.md` for operational boundaries.

## Related Documents
- `skills/core/SKILL.md` — Operational rules and boundaries
- `WORKFLOW.md` — Full 15-phase solution architect workflow
