# tri-ai-kit

Multi-agent development toolkit for Claude Code. Distributes agents, skills, hooks, and templates as configuration files — there is no build step, no package.json, and no compiled output. Changes take effect immediately.

## GitHub Copilot Usage

In Copilot Chat, invoke agents with `@tri-ai-kit-{agent}`. Agents hand off to each other via handoff buttons — follow the suggested next step when prompted.

### Agent Routing

| User intent | Invoke |
|-------------|--------|
| Build / create / implement / add | `@developer` |
| Fix / debug / broken / crash | `@debugger` |
| Plan / design / architect | `@planner` |
| Research / investigate / compare | `@researcher` |
| Review / audit / check code | `@code-reviewer` |
| Test / validate / coverage | `@tester` |
| Accessibility / a11y / WCAG | `@a11y-specialist` |
| Docs / document / write spec | `@docs-manager` |
| Design / UI / wireframe / component | `@muji` |

**When unsure**: If a task matches an agent better, say: _"For this I'd recommend `@tri-ai-kit-{agent}` — it has deeper context for {reason}. Want me to draft the prompt?"_

### Starter Prompts

```
@researcher Explain this project and its structure.
@planner Plan a new [feature] for this project.
@developer Implement phase 1 of the plan at plans/[plan-dir].
@debugger Fix this error: [paste error]
@code-reviewer Review the staged changes before commit.
```

### UI Component Audit

Use `askQuestions` **before** delegating to `@muji`:

```
askQuestions([{
  question: "What is the maturity stage of this component?",
  type: "singleSelect",
  options: [
    { value: "poc",    label: "POC — Prototype (relaxed rules, phased roadmap)" },
    { value: "beta",   label: "Beta — In active development (moderate strictness)" },
    { value: "stable", label: "Stable — Production-ready (full strictness)" }
  ]
}])
```

Then delegate: `@muji Audit [ComponentName] --ui --[poc|beta|stable]`

> Skip `askQuestions` if the user already specified `--poc`, `--beta`, or `--stable`.

### Copilot-Specific Notes

- Instructions apply to Chat only, not inline autocomplete
- Embed knowledge directly in prompts — external links may not be fetched
- `.github/skills/plan/SKILL.md` and `.github/skills/planFast/SKILL.md` are Copilot-specific skill overrides (different from `.claude/skills/`)

## Architecture

### Three-Layer Structure

```
Orchestrator (main context)
    ↓ delegates to
Agents (12 specialized agents)  ← .claude/agents/*.md
    ↓ load
Skills (48+ passive knowledge modules)  ← .claude/skills/*/SKILL.md
```

**Key principle**: The main conversation is always the orchestrator. It routes to agents via the Agent tool. Agents cannot spawn other agents—multi-agent workflows are orchestrated from main context only.

### File Layout

```
tri-ai-kit/
├── .claude/
│   ├── agents/          # 12 agent definitions (*.md with YAML frontmatter)
│   ├── skills/          # 48+ skill modules (each a directory with SKILL.md)
│   ├── hooks/           # 10 session hooks (*.cjs Node.js scripts)
│   ├── scripts/         # Plan management utilities (*.cjs)
│   ├── output-styles/   # Verbosity level configs
│   └── .tri-ignore      # Scout-block ignore patterns (gitignore syntax)
├── .github/
│   ├── copilot-instructions.md
│   └── skills/          # GitHub Copilot-specific skill overrides
│       ├── plan/SKILL.md
│       └── planFast/SKILL.md
├── packages/            # Domain packages (agents + skills per domain)
│   ├── core/            # Core hooks, scout-block, notification providers
│   ├── a11y/            # Accessibility auditing
│   ├── design-system/   # Design system agents & skills
│   ├── domains/         # Domain-specific packages
│   ├── kit/             # Kit CLI
│   └── platform-{web,ios,android,backend}/
├── templates/           # Handlebars templates for CLAUDE.md generation
│   ├── repo-claude.md.hbs
│   ├── workspace-claude.md.hbs
│   └── skill-template/  # Starter template when creating a new skill
├── skills-lock.json     # Tracks external skill sources (like package-lock.json)
├── CLAUDE.md            # Agent routing rules + project conventions
└── WORKFLOW.md          # 15-phase production delivery workflow
```

### Routing Logic

Every prompt is classified before execution:

| Intent | Examples | Routes To |
|--------|----------|-----------|
| Build/Create | "add X", "implement Y" | `developer` |
| Fix/Debug | "broken", "crashes" | `debugger` |
| Plan/Design | "how should we", "let's plan" | `planner` |
| Research | "best practices", "compare X vs Y" | `researcher` |
| Review/Audit | "check my code", "review" | `code-reviewer` |
| Test | "add tests", "validate" | `tester` |
| Docs | "document this" | `docs-manager` |
| Git | "commit", "push", "PR" | `git-manager` |

Context detection (git state, staged files, active plans, file extensions) boosts intent confidence before routing.

### Agents

| Agent | Responsibility |
|-------|---------------|
| `brainstormer` | Problem definition, tradeoff analysis |
| `researcher` | Tech research, best practices |
| `planner` | Architecture design, phased plans |
| `developer` | Feature implementation (platform-aware) |
| `code-reviewer` | Quality, security, performance audits |
| `tester` | Test strategy, coverage |
| `debugger` | Root cause analysis, fixes |
| `docs-manager` | Documentation writing/maintenance |
| `git-manager` | Commits, PRs, branch management |
| `journal-writer` | Development journals |
| `mcp-manager` | MCP server integration |
| `project-manager` | Multi-intent decomposition, progress tracking |

**Location**: `.claude/agents/`

#### Agent Frontmatter Schema

Every agent file (`.claude/agents/<name>.md`) uses this YAML frontmatter:

```yaml
---
name: tri-<name>
description: <one-line description for routing>
model: sonnet | opus | haiku
color: green | blue | red | ...
skills: [core, skill-discovery, <other-skills>]
memory: project
permissionMode: acceptEdits | default
handoffs:
  - label: <Button label>
    agent: tri-<other-agent>
    prompt: <Prompt passed to the handoff agent>
---
```

- `skills` lists skill names to auto-load (must match directory names in `.claude/skills/`)
- `memory: project` gives the agent access to project-level memory files
- `handoffs` define one-click transitions to other agents after task completion

### Skills

Skills load platform-specific expertise automatically (not slash commands):

| Category | Skills |
|----------|--------|
| Languages | `typescript-pro`, `javascript-pro`, `golang-pro` |
| Frameworks | `react-expert`, `nextjs-developer` |
| Architecture | `microservices-architect`, `graphql-architect`, `fullstack-guardian`, `api-designer`, `architecture-designer` |
| Infrastructure | `terraform-engineer`, `kubernetes-specialist`, `postgres-pro`, `websocket-engineer`, `infra-docker`, `infra-cloud`, `cloud-architect` |
| Testing/Quality | `playwright-expert`, `code-reviewer`, `audit`, `test`, `debug`, `fix`, `review` |
| Planning | `plan`, `plan-fast`, `plan-hard`, `plan-parallel`, `brainstorm`, `research`, `sequential-thinking` |
| Docs/Knowledge | `docs`, `code-documenter`, `knowledge-retrieval`, `ask` |
| System/Orchestration | `core`, `skill-discovery`, `cook`, `cook-auto`, `cook-auto-parallel`, `subagent-driven-development` |

**Location**: `.claude/skills/` (system-wide) and `packages/*/skills/` (domain-specific)

#### Skill Directory Structure

```
skill-name/
├── SKILL.md          # Required — frontmatter + instructions
└── references/       # Optional — loaded into context on demand
    └── *.md
```

#### Skill Frontmatter Schema

```yaml
---
name: <skill-name>
description: <triggers + what it does — used for auto-discovery>
metadata:
  author: <github url>
  version: "1.0.0"
  domain: language | framework | architecture | infrastructure | testing | planning | docs
  triggers: <comma-separated keywords>
  role: specialist | generalist
  scope: implementation | review | planning
  output-format: code | document | plan | analysis
  related-skills: <comma-separated skill names>
---
```

- `description` is the primary matching signal — make it specific and include trigger contexts
- Skills with `user-invocable: false` (like `core`) are system-only
- External skills are tracked in `skills-lock.json` with source + hash

#### GitHub Copilot Skill Overrides

`.github/skills/` contains Copilot-specific overrides for skills that behave differently in GitHub Copilot vs Claude Code:
- `.github/skills/plan/SKILL.md` — Planning skill for Copilot context
- `.github/skills/planFast/SKILL.md` — Fast planning for Copilot context

**Execution modes** (check skill frontmatter):
- `context: fork` + `agent: {name}` → **MUST** spawn agent via Agent tool
- `context: inline` or no field → Execute inline in main context

### Hooks

Hooks run automatically during sessions:

| Hook file | Purpose |
|-----------|---------|
| `session-init.cjs` | Load project context, detect platform, check active plans |
| `scout-block.cjs` | Block reads of paths listed in `.claude/.tri-ignore` |
| `privacy-block.cjs` | Block reads of `.env` and credential files |
| `build-gate-hook.cjs` | Verify build passes before task completion |
| `subagent-init.cjs` | Initialize subagent sessions with project context |
| `subagent-stop-reminder.cjs` | Reminder when subagent work completes |
| `context-reminder.cjs` | Session context reminders |
| `lesson-capture.cjs` | Capture lessons learned during sessions |
| `post-index-reminder.cjs` | Post-indexing reminders |
| `session-metrics.cjs` | Track session performance metrics |

**Location**: `.claude/hooks/` — all hooks are Node.js CJS scripts

`.claude/.tri-ignore` uses gitignore syntax to configure which directories `scout-block` prevents agents from scanning broadly (e.g. `node_modules`, `dist`).

### Plan Management Scripts

`.claude/scripts/` contains Node.js utilities for plan lifecycle:

| Script | Purpose |
|--------|---------|
| `get-active-plan.cjs` | Print path to current active plan |
| `set-active-plan.cjs` | Set a plan as active |
| `complete-plan.cjs` | Mark a plan as completed |
| `archive-plan.cjs` | Move completed plans to archive |
| `generate-skill-index.cjs` | Rebuild the skill discovery index |

**Plan lifecycle commands:**

```bash
node .claude/scripts/set-active-plan.cjs plans/{slug}   # activate (run after /plan creates it)
node .claude/scripts/complete-plan.cjs  plans/{slug}   # mark done
node .claude/scripts/archive-plan.cjs   plans/{slug}   # archive
```

**Plan directory structure** (`plans/{YYMMDD-HHMM-slug}/`):

```
plan.md               # overview, phases table with file links, success criteria
phase-{N}-{slug}.md   # tasks, files to change, validation per phase
```

`plan.md` required frontmatter: `title`, `status` (`draft|active|completed|archived`), `created`, `updated`, `effort`, `phases`, `platforms`, `breaking`.

**After modifying skills**, always rebuild the index:

```bash
node .claude/scripts/generate-skill-index.cjs
```

### Templates

`templates/` contains Handlebars (`.hbs`) templates used by the kit CLI to generate CLAUDE.md files:

- `repo-claude.md.hbs` — Repository-level `CLAUDE.md` with variables: `{{projectName}}`, `{{profile}}`, `{{packages}}`, `{{cliVersion}}`, `{{agentCount}}`, `{{techStack}}`
- `workspace-claude.md.hbs` — Workspace-level `CLAUDE.md` for team settings (branch naming, code review requirements, integrations)
- `skill-template/` — Starter scaffold when creating a new skill (copy this directory)

## Key Slash Commands

### Planning
- `/brainstorm` — Structured analysis with pros/cons/risks
- `/research` — Deep dive on technology or patterns
- `/plan` — Phased implementation plan (codebase analysis + research)
- `/plan-fast` — Quick plan (codebase only, no external research)
- `/plan-hard` — Deep plan with sequential research for complex features
- `/plan-parallel` — Dependency-aware plan for parallel execution

### Implementation
- `/cook` — Platform-aware feature implementation from active plan
- `/cook-auto` — Full pipeline: plan → implement → commit (no gates)
- `/cook-auto-fast` — Scout → plan → implement (skips research)
- `/cook-auto-parallel` — Parallel implementation across independent modules
- `/fix` — Identify and apply platform-appropriate fix

### Quality
- `/review` — Code quality, a11y, or general improvements
- `/audit` — Unified audit (auto-detects UI/a11y/code type)
- `/audit --ui <Component>` — UI/design system audit
- `/audit --a11y` — WCAG 2.1 AA violations
- `/audit --code` — Security, performance, code quality
- `/test` — Run tests, add tests, analyze coverage
- `/debug` — Root cause analysis with platform-specific tools

### Infrastructure
- `/cloud-architect` — Cloud decisions, cost optimization, DR
- `/infra-docker` — Dockerfiles, docker-compose, containerization
- `/infra-cloud` — GCP infrastructure (Terraform, Cloud Build, GKE)

### Documentation & Git
- `/docs` — Write, update, or reorganize docs
- `/git` — Commit, push, PR creation, branch management

## Core Workflow

**Standard loop**:
```
Problem → /brainstorm → /plan → spike → /cook → /review → /test → /git
```

**Multi-intent requests** ("plan and build X") → route to `project-manager` for decomposition

**Parallel work** (3+ independent tasks) → use `subagent-driven-development` skill from main context

**Exit criteria**: Every phase has defined completion criteria (see WORKFLOW.md)

## Decision Authority

### Auto-execute (no approval needed)
- Dependency installs
- Lint fixes
- Documentation formatting
- Memory file consolidation

### Always ask first
- Deleting files
- Modifying production configs
- Introducing new dependencies
- Multi-file refactors
- Changing API contracts
- Modifying auth/authz logic

### Present options (A/B/C format)
- Architectural decisions
- Breaking changes
- Framework/library choices
- Multiple valid approaches exist

## Code Conventions

### Documentation Style
- **Tables** not paragraphs
- **Bullets** not sentences
- **Keywords** not full explanations
- **Numbers** not words ("16px" not "sixteen pixels")
- Under 3KB per component doc
- Under 500 lines per rule file

### Required File Structure
All documentation files must include:
1. Purpose — Brief description at top
2. Table of Contents — Anchored links
3. Related Documents — Links to related files

### Safety Constraints
- Verify environment state before operations
- Use relative paths from project root
- Conservative defaults: safety over speed, clarity over cleverness
- Read files before modifying
- Prefer existing patterns over new conventions

### Commit Convention

| Type | When |
|------|------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code restructuring (no behavior change) |
| `test:` | Tests only |
| `chore:` | Build, config, tooling |

No "Generated with Claude Code" or AI attribution in commits/PRs.

## Orchestration Protocol

### Context Passing

Every subagent invocation must include:
```
Task: [specific task]
Work context: [project path]
Platform: [web/ios/android/backend/all]
Active plan: [path if exists, or "none"]
```

### Delegation Rules
1. Include full context (subagent gets fresh context)
2. One clear task per subagent
3. Wait for result before next step (unless parallel-safe)
4. Review output before presenting to user

### Parallel Execution
1. Extract file ownership from plan phases
2. Verify NO overlap between phases
3. If overlap → warn or fall back to sequential
4. Each subagent works in isolation

### Escalation

| Situation | Action |
|-----------|--------|
| Test failure | debugger → fix → re-test (max 3 loops) |
| Review rejection | fix → re-review (max 3 loops) |
| 3 consecutive failures | Escalate to user with summary |
| Ambiguous request | Ask user (max 1 question) |
| File ownership conflict | Ask user before parallel execution |

## Output Style Levels

Configure verbosity by level:

| Level | Style |
|-------|-------|
| 0 — ELI5 | Plain language, no jargon |
| 1 — Junior | Step-by-step with explanations |
| 2 — Mid | Balanced detail |
| 3 — Senior | Terse, pattern-focused |
| 4 — Lead | Architecture and trade-offs only |
| 5 — God | Maximum density, no hand-holding |

## Project Configuration

`.claude/.tri-ai-kit.json` controls runtime behavior:

| Key | Effect |
|-----|--------|
| `codingLevel` | Output verbosity: -1 = default, 0–5 = ELI5→God mode |
| `plan.namingFormat` | Plan directory naming (`{date}-{slug}`) |
| `plan.validation.mode` | `"prompt"` — ask questions before locking plan |
| `plan.validation.minQuestions` / `maxQuestions` | Validation interview bounds (default 3–8) |
| `paths.docs` / `plans` / `reports` | Where docs, plans, and reports are stored |
| `project.packageManager` | `"npm"` by default |
| `hooks.scout.ignoreFile` | Path to `.tri-ignore` file |
| `skills.research.engine` | `"websearch"` or `"gemini"` |

## Adding a New Skill

**Local skill:**
1. Copy `templates/skill-template/` into `.claude/skills/{skill-name}/`
2. Edit `SKILL.md` — fill in `name`, `description`, `metadata.triggers`
3. Add reference files under `references/` (loaded on demand)
4. Run: `node .claude/scripts/generate-skill-index.cjs`

**External skill (from GitHub):**
- External skills are tracked in `skills-lock.json` with `source`, `sourceType`, and `computedHash`
- After pulling an external skill, run `node .claude/scripts/generate-skill-index.cjs` to rebuild the index
- Do not manually edit `skills-lock.json` — it is managed by the kit CLI

## Adding a New Package

Each package lives in `packages/{name}/` and declares its contents in `package.yaml`:

```yaml
name: my-package
version: "1.0.0"
layer: 1           # 0 = core, 1+ = optional
platforms: [all]
dependencies: [core]
provides:
  agents: [tri-my-agent]
  skills: [my-skill]
files:
  agents/: agents/
  skills/: skills/
settings_strategy: merge        # "merge" | "replace" — how settings.json is applied
claude_snippet: CLAUDE.snippet.md      # appended to CLAUDE.md on install
copilot_snippet: COPILOT.snippet.md    # appended to copilot-instructions.md
```

## Related Documents

- **CLAUDE.md** — Agent routing rules, prompt classification
- **WORKFLOW.md** — Full 15-phase production workflow with exit criteria
- **.claude/skills/core/SKILL.md** — Operational boundaries
- **.claude/skills/core/references/orchestration.md** — Full orchestration protocol
- **.claude/skills/core/references/decision-boundaries.md** — Decision authority details
