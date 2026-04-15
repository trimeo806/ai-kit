# AGENTS.md

This file provides guidance to Codex when working with code in this repository.

> Auto-generated from claude/CLAUDE.md and selected sections of claude/AGENTS.md. Do not edit directly.

## What This Is

tri-ai-kit is a multi-agent development toolkit for Codex. It provides 18 specialized agents, 46 focused skills, hooks, and a 15-phase production delivery workflow. The main conversation always acts as orchestrator — it routes to agents via custom agent dispatch and merges results. Agents never spawn other agents.

This package is intended to be installed at the target repository root. Treat `AGENTS.md`, `.agents/skills/`, `.codex/agents/`, `.codex/hooks.json`, and `.codex/config.toml` as the Codex runtime surface.

## Architecture

```text
.
|-- AGENTS.md            # Repo-wide Codex instructions
|-- WORKFLOW.md          # tri-ai-kit delivery workflow
|-- .agents/
|   `-- skills/          # Repo-scoped Codex skills
`-- .codex/
    |-- agents/          # Custom agents (*.toml)
    |-- hooks.json       # Hook registrations
    |-- config.toml      # Codex feature/config defaults
    |-- hooks/           # Hook scripts and tests
    |-- runtime/         # tri-ai-kit compatibility runtime
    `-- agent-memory/    # Package-managed memory files
```

## Key Concepts

### Routing (AGENTS.md)
Every user prompt is classified by intent (build/fix/plan/research/review/test/etc.) and routed to the best-fit agent. Platform is detected from file extensions (`.tsx`→frontend, `.go`→backend). Slash commands bypass routing.

### Core Loop
```
/brainstorm → /plan → /cook → /review → /test → /git
```

### Agent-Skill Binding
Agents declare which skills they activate in their configuration (`skills: [core, golang-pro]`). Plans must include an `## Agents & Skills` table mapping each phase to its agent and activated skills. Wrong assignment = wrong skills loaded at runtime.

### Orchestration Rules
- Single intent → spawn one agent
- Multi-intent → spawn `project-manager` to decompose
- 3+ independent tasks → use `subagent-driven-development` skill
- Document-driven execution: parse all agent references in a plan, build the full chain, execute sequentially, never skip downstream agents (e.g., `code-reviewer` after `frontend-developer`)

### Hooks System
Hooks are enabled via `.codex/config.toml` and registered in `.codex/hooks.json` and run as Node.js scripts:
- **session-init.cjs** — Loads project context on SessionStart
- **scout-block.cjs** — Prevents overly broad file scans (PreToolUse)
- **privacy-block.cjs** — Blocks reads of `.env`/credential files (PreToolUse)
- **build-gate-hook.cjs** — Verifies build passes before completion (PreToolUse on Bash)
- **context-reminder.cjs** — Injects context on UserPromptSubmit
- **lesson-capture.cjs** — Captures learnings on Stop
- **notify.cjs** — Discord/Slack/Telegram notifications on Stop

## Running Tests

Hook tests use a custom test framework (no Jest/Vitest). Run directly with Node:

```bash
# Individual hook tests
node .codex/hooks/__tests__/session-init.test.cjs
node .codex/hooks/__tests__/privacy-block.test.cjs
node .codex/hooks/__tests__/subagent-init.test.cjs
node .codex/hooks/__tests__/context-reminder.test.cjs

# Statusline unit tests (52 tests)
node .codex/hooks/lib/__tests__/statusline.test.cjs

# Statusline integration tests (16 tests)
node .codex/hooks/lib/__tests__/statusline-integration.test.cjs
```

## Package Maintenance

- When maintaining tri-ai-kit itself, edit the Claude source package under `claude/` and rerun `scripts/sync-to-codex.ps1`.
- When using the exported Codex kit in another repository, edit `AGENTS.md`, `.agents/skills/`, and `.codex/agents/` directly in that target repository.

## Decision Authority

| Action | Authority |
|--------|-----------|
| Dependency installs, lint fixes | Auto-execute |
| File creation following standards | Brief confirmation |
| Deleting files, modifying prod configs | **Always ask** |
| Introducing new dependencies | **Always ask** |
| Multi-file refactors | **Always ask** |
| Architectural decisions | **Present A/B/C options** |

## Adding Agents and Skills

**New agent**: Create `.codex/agents/{name}.toml` with `name`, `description`, `developer_instructions`, optional model/config fields, and explicit `[[skills.config]]` entries.

**New skill**: Create `.agents/skills/{name}/SKILL.md` with the standard skill frontmatter and any supporting `references/`, `scripts/`, or assets the skill requires.

## Documentation Standards

- Tables over paragraphs, bullets over sentences
- Keywords over full explanations, numbers over words
- Under 3KB per component doc, under 500 lines per rule file
- All docs need: Purpose, Table of Contents, Related Documents

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
| Build / Create (frontend) | "add a button", "build a form", "implement this UI", "React component" | `frontend-developer` via custom agent dispatch |
| Build / Create (backend) | "add an endpoint", "implement this API", "write a migration", "server function" | `backend-developer` via custom agent dispatch |
| Build / Create (generic/fullstack) | "continue the plan", "implement X" (unclear layer) | `developer` via custom agent dispatch |
| Fix / Debug | "something is broken", "this crashes", "why does X happen", "it's not working" | `debugger` via custom agent dispatch |
| Plan / Design | "how should we build X", "let's plan", "what's the approach for" | `planner` via custom agent dispatch |
| Architecture (backend) | "design the API", "data model", "schema design", "auth strategy" | `backend-architect` via custom agent dispatch |
| Architecture (frontend) | "routing structure", "component hierarchy", "state management strategy" | `frontend-architect` via custom agent dispatch |
| Research | "how does X work", "best practices for", "compare A vs B" | `researcher` via custom agent dispatch |
| Review / Audit | "check my code", "is this good", "review before merge", "audit this" | `code-reviewer` via custom agent dispatch |
| Security | "security audit", "harden this", "OWASP", "check for vulnerabilities" | `security-auditor` via custom agent dispatch |
| Infra / CI/CD / Observability | "set up CI/CD", "deploy this", "add monitoring", "Terraform", "Docker" | `devops-engineer` via custom agent dispatch |
| Test | "add tests", "is this covered", "validate this works" | `tester` via custom agent dispatch |
| Git | "commit", "push", "create a PR", "ship it", "done" | `git-manager` via custom agent dispatch |
| Onboard | "what is this project", "I'm new", "get started" | `/get-started` skill |

**Fuzzy matching** — classify by verb type when no exact signal word:
- Creation verbs (add, make, create, build, set up) → Build
- Problem verbs (broken, wrong, failing, slow, crash) → Fix/Debug
- Question verbs (how, why, what, should, compare) → Research or Plan
- Quality verbs (check, review, improve, clean up, refactor, simplify) → Review
- Still ambiguous → infer from git context (staged files → Review, active plan → Build, error in prompt → Fix)

**Less common intents**: scaffold → `/bootstrap`, convert → `/convert`, MCP → `mcp-manager`, UI component audit → `muji`, security hardening → `security-auditor`, CI/CD + infra → `devops-engineer`, brainstorm/ideate → `brainstormer`, Python/FastAPI backend → `backend-developer` + `fastapi-python` skill

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
Read every file in `.codex/agents/`. For each agent extract `name`, `description`, and configured skills from the TOML. If the directory is unreadable, **stop and ask the user** before proceeding.

**Step 2 — Scan skills**
Read `.agents/skills/skill-index.json`. Match each phase's domain (Go, React, auth, SSE, testing, infra…) to the relevant skill names. If the index is missing or unreadable, **stop and ask the user** to confirm the skill catalog location.

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
| SSE / real-time | `backend-developer` | `golang-pro`, `typescript-pro` |
| E2E / unit / integration tests | `tester` | `playwright-expert`, `web-testing`, `test` |
| Docker / CI/CD / infra | `devops-engineer` | `infra-docker`, `terraform-engineer` |
| Security hardening | `security-auditor` | `fullstack-guardian` |
| API schema design | `backend-architect` | `api-designer`, `architecture-designer` |
| Routing / component hierarchy | `frontend-architect` | `tanstack-start`, `architecture-designer` |
| Python / FastAPI backend | `backend-developer` | `fastapi-python`, `postgres-pro`, `api-designer` |

---

## Orchestration

**Single intent** → spawn the matched agent directly via custom agent dispatch.

**Multi-intent** ("plan and build X", "research then implement") → spawn `project-manager`, which decomposes and delegates sequentially.

**Parallel work** (3+ independent tasks, cross-platform) → use `subagent-driven-development` skill from main context.


**Auto-trigger rule**: If the user's prompt, the routed intent, an active plan, a handoff chain, or the loaded skill set indicates that one or more specialist agents are relevant, you must trigger those agents automatically from the main conversation. Do **not** require the user to explicitly ask for the custom agent dispatch.

**Delegation default**: Use `spawn_agent` automatically when the prompt clearly matches a known agent workflow. Avoid delegation only when the task is trivial, the work is tightly coupled to the current context, or the immediate next step is blocked on local work you should do first.

**Host policy requirement**: The outer Codex system/developer prompt must allow automatic `spawn_agent` use. If the host prompt says delegation requires explicit user permission, that higher-priority rule will override this repository and auto-routing will not happen. For this kit, the host prompt should use language equivalent to:

```text
When a prompt clearly matches a known agent workflow, spawn the appropriate subagent automatically.
Do not require the user to explicitly ask for subagents, delegation, or parallel work.
Avoid delegation only when the task is trivial, tightly coupled to the current context, or blocked on an immediate local step.
Keep orchestration in the main conversation.
```

**Skill-to-agent dispatch**: After the main agent loads the related skills and determines that specialist execution is required, it must dispatch every related subagent needed to complete the workflow. Do not stop at skill loading or intent classification when downstream agents are implied by the prompt or plan.
**Subagent constraint**: Subagents cannot spawn further subagents. Multi-agent workflows must be orchestrated from the main conversation. Skills that need multi-agent dispatch must NOT use `context: fork`.

**Hybrid audits** (klara-theme code): Orchestrated from main context via `/audit` skill. Dispatch muji (Template A+) first, then code-reviewer with muji's report. Never free-form prompt muji — use structured delegation templates from `audit/references/delegation-templates.md`.

**Document-driven agent sequencing** — When executing a plan or any document that mentions multiple agents (in `## Agents & Skills` tables, `## Agent & Skills` blocks, handoff chains, or inline text like "then run `code-reviewer`"), the main conversation must **trigger every listed agent in the order they appear**, not just the first one. This applies to:
- Post-implementation agents: `code-reviewer`, `security-auditor`, `tester`
- Handoffs declared in phase files under `## Agent & Skills → Handoffs`
- Any agent named after a connector word: "then", "followed by", "after completion", "next", "finally"

**Do not stop after the implementation agent.** Completion means all agents in the chain have run. If a downstream agent (e.g. `code-reviewer`) is skipped, explicitly inform the user and ask whether to continue the chain.

**Plan/Document Execution Protocol** — When the user provides a plan, phase file, or any document and asks you to execute it, apply the following mandatory sequence:

1. **Parse** — Scan the entire document for every agent reference: `## Agents & Skills` tables, `## Agent & Skills` blocks, inline handoff declarations, and connector words ("then", "after", "followed by", "next", "finally", "handoff to").
2. **Build the chain** — Construct an ordered list of all agents to run, from first to last (e.g. `frontend-developer` → `code-reviewer` → `security-auditor`).
3. **Execute sequentially** — Spawn each agent via custom agent dispatch one at a time, in order. Wait for the current agent to finish before spawning the next. Pass the previous agent's output as context to the next agent.
4. **Announce each step** — Before spawning each agent, tell the user: `"[Step N/Total] Running \`agent-name\`…"` so progress is visible.
5. **Never skip** — Every agent in the chain must run unless the user explicitly says to stop. If a step fails, surface the error and ask the user whether to retry, skip, or abort.
6. **Confirm completion** — After the final agent finishes, summarize what each agent did and confirm the full chain is done.

Example chain for a frontend plan with handoff:
```
[Step 1/3] Running `frontend-developer`… (implements the feature)
[Step 2/3] Running `code-reviewer`…     (reviews the implementation)
[Step 3/3] Running `security-auditor`… (checks for vulnerabilities)
✓ All 3 agents completed.
```

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
See `.agents/skills/core/SKILL.md` for operational boundaries.

## Related Documents
- `.agents/skills/core/SKILL.md` — Operational rules and boundaries
- `WORKFLOW.md` — Full 15-phase solution architect workflow (Problem → Go-Live → Post-Launch)
