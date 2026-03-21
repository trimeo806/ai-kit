# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.


## Project: tri_ai_kit


## Installed Profile: ``

**Packages**: core

**Installed by**: tri-ai-kit v2.0.0 on 2026-03-11

---

## Claude Code Agent System

### Configuration
- **Agents**: `.claude/agents/` — 21 agents
- **Commands**: `.claude/commands/` — Slash commands
- **Skills**: `.claude/skills/` — Passive knowledge



---


## What This Is

tri_ai_kit is a multi-agent development toolkit for Claude Code. Specialized agents load platform-specific skills on demand and follow shared orchestration rules. The main conversation is always the orchestrator — it dispatches agents via Agent tool and merges results.

---

## Routing

On every user prompt, sense context before acting:
1. Check git state (branch, staged/unstaged files)
2. Detect platform from file extensions (`.tsx`→web, `.swift`→ios, `.kt`→android, `.java`→backend)
3. Check for active plans in `./plans/`
4. Route to best-fit agent based on intent + context

### Prompt Classification

- **Dev task** (action/problem/question about code) → route via intent table below
- **Kit question** ("which agent", "list skills", "our conventions") → `project-manager`
- **External tech question** ("how does React...", "what is gRPC") → `researcher`
- **Conversational** (greetings, opinions, clarifications) → respond directly

### Intent Map

| Intent | Natural prompts (examples) | Routes To |
|--------|---------------------------|-----------|
| Build / Create (frontend) | "add a button", "build a form", "implement this UI", "React component" | `frontend-developer` via Agent tool |
| Build / Create (backend) | "add an endpoint", "implement this API", "write a migration", "server function" | `backend-developer` via Agent tool |
| Build / Create (generic/fullstack) | "continue the plan", "implement X" (unclear layer) | `developer` via Agent tool |
| Fix / Debug | "something is broken", "this crashes", "why does X happen", "it's not working" | `debugger` via Agent tool |
| Plan / Design | "how should we build X", "let's plan", "what's the approach for" | `planner` via Agent tool |
| Architecture (backend) | "design the API", "data model", "schema design", "auth strategy" | `backend-architect` via Agent tool |
| Architecture (frontend) | "routing structure", "component hierarchy", "state management strategy" | `frontend-architect` via Agent tool |
| Research | "how does X work", "best practices for", "compare A vs B" | `researcher` via Agent tool |
| Review / Audit | "check my code", "is this good", "review before merge", "audit this" | `code-reviewer` via Agent tool |
| Security | "security audit", "harden this", "OWASP", "check for vulnerabilities" | `security-auditor` via Agent tool |
| Infra / CI/CD / Observability | "set up CI/CD", "deploy this", "add monitoring", "Terraform", "Docker" | `devops-engineer` via Agent tool |
| Test | "add tests", "is this covered", "validate this works" | `tester` via Agent tool |
| Docs | "document this", "update the docs", "write a spec" | `docs-manager` via Agent tool |
| Git | "commit", "push", "create a PR", "ship it", "done" | `git-manager` via Agent tool |
| Onboard | "what is this project", "I'm new", "get started" | `/get-started` skill |

**Fuzzy matching** — classify by verb type when no exact signal word:
- Creation verbs (add, make, create, build, set up) → Build
- Problem verbs (broken, wrong, failing, slow, crash) → Fix/Debug
- Question verbs (how, why, what, should, compare) → Research or Plan
- Quality verbs (check, review, improve, clean up, refactor, simplify) → Review
- Still ambiguous → infer from git context (staged files → Review, active plan → Build, error in prompt → Fix)

**Less common intents**: scaffold → `/bootstrap`, convert → `/convert`, journal → `journal-writer`, MCP → `mcp-manager`, UI/UX design → `design-specialist`, brand/logo/CIP → `design-specialist`, banner/social assets → `design-specialist`, slides/pitch deck → `design-specialist`, UI component audit → `muji`, security hardening → `security-auditor`, CI/CD + infra → `devops-engineer`, brainstorm/ideate → `brainstormer`, Python/FastAPI backend → `backend-developer` + `fastapi-python` skill

### Routing Rules

1. Explicit slash command → execute directly, skip routing
2. TypeScript/build errors in context → route to Fix first
3. Staged files → boost Review or Git intent
4. Active plan exists → boost Build ("continue" → cook); cook reads the plan's `## Agents & Skills` table and **before dispatching the implementation agent**, runs the architecture gate: dispatch `backend-architect` (backend phases) or `frontend-architect` (frontend phases) to produce an architecture plan, present it to the user, and **wait for explicit approval** before executing; user may request more detail before approving; test phases skip the gate
5. Merge conflicts → suggest fix/resolve
6. Ambiguous after context boost → ask user (max 1 question)
7. All delegations follow `core/references/orchestration.md`

---

## Planning — Agent & Skill Analysis (REQUIRED)

Every time a plan is created or a phase is authored, **you must analyze the available agents and skills** and record which ones apply. This is not optional.

### Protocol

**Step 1 — Scan agents**
Read every file in `.claude/agents/`. For each agent extract `name`, `description`, and `skills` from the frontmatter. If the directory is unreadable, **stop and ask the user** before proceeding.

**Step 2 — Scan skills**
Read `.claude/skills/skill-index.json`. Match each phase's domain (Go, React, auth, SSE, testing, infra…) to the relevant skill names. If the index is missing or unreadable, **stop and ask the user** to confirm the skill catalog location.

**Step 3 — Assign to plan.md**
Add an `## Agents & Skills` section to every `plan.md`:
```markdown
## Agents & Skills

| Phase | Agent | Skills Activated |
|-------|-------|-----------------|
| P1 — {name} | `backend-developer` | `golang-pro`, `postgres-pro` |
| P2 — {name} | `frontend-developer` | `tanstack-start`, `react-expert` |
...
```

**Step 4 — Assign to each phase file**
Add an `## Agent & Skills` block to every `phase-{N}-*.md` (after the Overview section):
```markdown
## Agent & Skills
- **Agent**: `backend-developer`
- **Skills**: `golang-pro`, `postgres-pro`, `api-designer`
- **Handoffs**:
  - After completion → `code-reviewer`
  - On security concern → `security-auditor`
```

### When you cannot determine the right agent or skill

Ask the user **one focused question** before generating the plan:

> "I couldn't determine which agent should handle [phase name]. Is this a backend (Go/API), frontend (React/TanStack), or infrastructure task?"

Do not guess. A wrong agent assignment causes the wrong skills to activate during implementation.

### Domain → Agent mapping (quick reference)

| Domain signal | Agent | Core skills |
|---------------|-------|-------------|
| Go / REST API / DB migrations | `backend-developer` | `golang-pro`, `postgres-pro`, `api-designer` |
| React / TanStack Start / UI | `frontend-developer` | `tanstack-start`, `react-expert`, `typescript-pro` |
| Auth / OAuth / JWT | `backend-developer` | `golang-pro`, `typescript-pro` |
| SSE / WebSocket / real-time | `backend-developer` | `golang-pro`, `websocket-engineer` |
| E2E / unit / integration tests | `tester` | `playwright-expert`, `web-testing`, `test` |
| Docker / CI/CD / infra | `devops-engineer` | `infra-docker`, `terraform-engineer` |
| Security hardening | `security-auditor` | `fullstack-guardian` |
| API schema design | `backend-architect` | `api-designer`, `architecture-designer` |
| Routing / component hierarchy | `frontend-architect` | `tanstack-start`, `architecture-designer` |
| UI/UX design, color, typography | `design-specialist` | `ui-ux-pro-max`, `ui-styling`, `design-system` |
| Brand identity, logo, CIP | `design-specialist` | `design`, `brand`, `ui-ux-pro-max` |
| Banners, social media assets | `design-specialist` | `banner-design`, `design`, `ui-styling` |
| Presentations, pitch decks | `design-specialist` | `slides`, `design-system` |
| Python / FastAPI backend | `backend-developer` | `fastapi-python`, `postgres-pro`, `api-designer` |

---

## Orchestration

**Single intent** → spawn the matched agent directly via Agent tool.

**Multi-intent** ("plan and build X", "research then implement") → spawn `project-manager`, which decomposes and delegates sequentially.

**Parallel work** (3+ independent tasks, cross-platform) → use `subagent-driven-development` skill from main context.

**Subagent constraint**: Subagents cannot spawn further subagents. Multi-agent workflows must be orchestrated from the main conversation. Skills that need multi-agent dispatch must NOT use `context: fork`.

**Hybrid audits** (klara-theme code): Orchestrated from main context via `/audit` skill. Dispatch muji (Template A+) first, then code-reviewer with muji's report. Never free-form prompt muji — use structured delegation templates from `audit/references/delegation-templates.md`.

**Escalation**: 3 consecutive failures → surface findings to user. Ambiguous request → ask 1 question max.

See `core/references/orchestration.md` for full protocol.

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
See `.claude/skills/core/SKILL.md` for operational boundaries.

## Related Documents
- `.claude/skills/core/SKILL.md` — Operational rules and boundaries
- `WORKFLOW.md` — Full 15-phase solution architect workflow (Problem → Go-Live → Post-Launch)

