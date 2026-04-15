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
| Git | "commit", "push", "create a PR", "ship it" | `/git-manager` |

**Fuzzy matching** — classify by verb type when no exact signal word:
- Creation verbs (add, make, create, build, set up) → Build
- Problem verbs (broken, wrong, failing, slow, crash) → Fix/Debug
- Question verbs (how, why, what, should, compare) → Research or Plan
- Quality verbs (check, review, improve, clean up, refactor, simplify) → Review
- Still ambiguous → infer from git context (staged files → Review, active plan → Build, error in prompt → Fix)

**Less common intents**: MCP → `/mcp-manager`, UI component audit → `/muji`, security hardening → `/security-auditor`, brainstorm/ideate → `/brainstormer`, Python/FastAPI backend → `/backend-developer` + `fastapi-python` skill.

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
| SSE / real-time | `/backend-developer` | `golang-pro`, `typescript-pro` |
| E2E / unit / integration tests | `/tester` | `playwright-expert`, `web-testing`, `test` |
| Docker / CI/CD / infra | `/devops-engineer` | `infra-docker`, `terraform-engineer` |
| Security hardening | `/security-auditor` | `fullstack-guardian` |
| API schema design | `/backend-architect` | `api-designer`, `architecture-designer` |
| Routing / component hierarchy | `/frontend-architect` | `tanstack-start`, `architecture-designer` |
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

---

## Setup & Synchronization

To use this kit with Antigravity, you need to use the workflows and skills synced to the `_agents` and `skills` directories.

Copy the core files into your project root:

```bash
# From the tri-ai-kit directory, copy into your target project
cp -r _agents /path/to/your-project/
cp -r skills /path/to/your-project/
cp antigravity/WORKFLOW.md /path/to/your-project/WORKFLOW.md
```

Antigravity will automatically detect the workflows from the `_agents/workflows/` directory and skills from the `skills/` directory. You will be able to trigger the workflows natively within the Antigravity environment.

> 💡 **Important Setup Note:** To ensure Antigravity fully understands your routing logic, agent intents, and architecture boundaries (similar to `AGENTS.md` in Claude), you **must** load the instructions defined in this `ANTIGRAVITY.md` file into your Antigravity System Prompt (User Rules/Instructions).

**What gets installed:**
- `_agents/workflows/` — Antigravity-compatible workflow markdown files
- `skills/` — Skills logic and prompts
- `WORKFLOW.md` — 15-phase production delivery workflow reference
- `ANTIGRAVITY.md` — The routing rules and instructions for the Antigravity System Prompt

### Syncing Agents and Skills

Antigravity workflows and skills are directly auto-generated from the `.claude/` source of truth using a PowerShell script.

**Running the Sync**
```powershell
# Full sync (agents + skills + regenerate index)
.\scripts\sync-to-antigravity.ps1

# Preview before applying (dry-run)
.\scripts\sync-to-antigravity.ps1 -DryRun

# Sync agents only
.\scripts\sync-to-antigravity.ps1 -AgentsOnly

# Sync skills + regenerate index only
.\scripts\sync-to-antigravity.ps1 -SkillsOnly

# Verbose — view transform details
.\scripts\sync-to-antigravity.ps1 -Verbose
```

**Standard Kit Update Workflow**
```
1. Edit .claude/agents/{agent}.md  or  .claude/skills/{skill}/SKILL.md
2. Verify with dry-run:
   .\scripts\sync-to-antigravity.ps1 -DryRun -Verbose
3. Apply:
   .\scripts\sync-to-antigravity.ps1
4. Commit both source and generated files:
   git add .claude/ _agents/ skills/ && git commit -m "feat(kit): update {agent/skill} ..."
```

### What the Script Does

**Agents (`.claude/agents/` → `_agents/workflows/`)**
| Transform | Detail |
|-----------|---------|
| **Frontmatter filter** | Keeps only `description` + `skills`. Drops: `name`, `color`, `model`, `memory`, `permissionMode`, `handoffs`, `tools` |
| **Path rewrite** | `.claude/skills/` → `skills/` · `.claude/agents/` → `_agents/workflows/` |
| **Remove lines** | Deletes any lines containing `node .claude/scripts/` and specific CLI script calls |
| **Tool rewrite** | `AskUserQuestion tool` → `ask the user` |
| **Agent ref rewrite** | `via Agent tool` → `via the workflow` |
| **Footer rewrite** | `is an tri_ai_kit agent` → `is a tri-ai-kit workflow` |

**Skills (`.claude/skills/` → `skills/`)**
| Transform | Detail |
|-----------|---------|
| **Copy structure** | Entire directory + subdirectories |
| **Path replace** | `.claude/skills/` → `skills/` in all `.md`, `.json` files |
| **Binary files** | Copied as-is (fonts, images, binaries) |
| **skill-index.json** | **Generated from scratch** based on each skill's SKILL.md frontmatter |

### Customizing Transform Rules

All transform rules for Antigravity are defined in `scripts/sync-config.json`.
To add a new rewrite rule:
```json
{
  "agents": {
    "bodyTransforms": [
      {
        "_comment": "Description of the transform",
        "from": "old pattern",
        "to": "new pattern"
      }
    ]
  }
}
```
To delete lines containing a specific pattern:
```json
{
  "removeLineContaining": ["pattern-1", "pattern-2"]
}
```

### Automating with GitHub Actions (Optional)

Create `.github/workflows/sync-kit.yml` to automatically sync on every push:
```yaml
name: Sync Kit
on:
  push:
    paths:
      - '.claude/agents/**'
      - '.claude/skills/**'

jobs:
  sync:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run sync
        shell: pwsh
        run: .\scripts\sync-to-antigravity.ps1
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore(sync): auto-sync from claude agents/skills"
```

### Troubleshooting

- **Script reports "path not found" error:** Make sure you run from the repo root: `cd C:\private\tri-ai-kit && .\scripts\sync-to-antigravity.ps1`
- **Agent output has remaining Claude-specific content:** Run with `-Verbose` to inspect the transform log, then add the missing pattern to `sync-config.json → agents.bodyTransforms`
- **skill-index.json is missing some skills:** Verify that the `SKILL.md` in `.claude/skills/{skill}/` has YAML frontmatter including `name` and `description`
- **I want to revert to the state before the sync:** Simply discard the generated changes: `git checkout -- _agents/ skills/` — the `.claude/` source remains unaffected
