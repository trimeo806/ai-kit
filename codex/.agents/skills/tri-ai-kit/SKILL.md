---
name: tri-ai-kit
description: Kit conventions, agent catalog, skill architecture, and routing rules for tri_ai_kit. Load when answering kit-level questions, authoring agents/skills, or routing ambiguous requests.
user-invocable: false

metadata:
  agent-affinity: [project-manager, planner, developer]
  keywords: [kit, agent, skill, routing, conventions, catalog, tri-ai-kit, architecture]
  platforms: [all]
  triggers: ["which agent", "list agents", "kit conventions", "agent catalog", "skill catalog", "how does the kit work"]
---

# tri_ai_kit Conventions

## What tri_ai_kit Is

A multi-agent development toolkit for Codex. The main conversation is always the orchestrator — it dispatches specialized agents via custom agent dispatch and merges their results.

## Agent Catalog

| Agent | Role | Key Skills |
|-------|------|-----------|
| `planner` | Creates implementation plans | plan, research, knowledge-retrieval |
| `developer` | Generic fullstack implementation | cook, core, skill-discovery |
| `frontend-developer` | Web/UI implementation | react-expert, typescript-pro, nextjs-developer |
| `backend-developer` | API/server implementation | api-designer, postgres-pro |
| `frontend-architect` | Frontend architecture decisions | architecture-designer |
| `backend-architect` | Backend/API architecture | api-designer, microservices-architect |
| `debugger` | Root cause analysis, bug fixes | debug, error-recovery, problem-solving |
| `tester` | Test writing and validation | test |
| `code-reviewer` | Code quality and security audits | code-review, knowledge-retrieval |
| `security-auditor` | OWASP security audits | code-review, audit |
| `docs-manager` | Documentation authoring and updates | docs, doc-coauthoring |
| `devops-engineer` | CI/CD, containers, cloud infra | infra-docker, infra-cloud, terraform-engineer |
| `git-manager` | Git workflows, commits, PRs | core |
| `researcher` | Technology research and comparison | research, docs-seeker, knowledge-retrieval |
| `project-manager` | Progress tracking, routing, coordination | tri-ai-kit, skill-discovery |
| `brainstormer` | Ideation and structured analysis | brainstorm, sequential-thinking |
| `business-analyst` | Requirements, feature, and business logic analysis | prompt-refinement, brainstorm, doc-coauthoring |
| `journal-writer` | Development journals and decision logs | doc-coauthoring |
| `mcp-manager` | MCP server integration management | knowledge-retrieval |

## Routing Rules (Summary)

See `AGENTS.md` for the full routing table. Quick reference:

- **Build**: `developer` (generic), `frontend-developer` (UI), `backend-developer` (API)
- **Fix**: `debugger`
- **Plan**: `planner`
- **Review**: `code-reviewer`
- **Security**: `security-auditor`
- **Test**: `tester`
- **Docs**: `docs-manager`
- **Git**: `git-manager`
- **Research**: `researcher`
- **Infra**: `devops-engineer`
- **Brainstorm**: `brainstormer`
- **Business Analysis**: `business-analyst`
- **Journal**: `journal-writer`
- **MCP**: `mcp-manager`
- **Coordinate/Route**: `project-manager`

## Skill Architecture

Skills live in `.agents/skills/`. Each skill is a directory with a `SKILL.md` file.

**Skill types:**
- `tier: core` — always loaded (core, skill-discovery)
- `user-invocable: true` — callable as slash commands (/plan, /cook, /review, etc.)
- `wrapper: true` — thin shells that inject flags into parent skills (plan-fast, cook-auto)
- All others — discovered lazily by `skill-discovery` based on task signals

**Discovery flow:** skill-discovery reads `skill-index.json` → filters by platform/task signals → loads up to 3 matching skills per task.

## Conventions

### Agent Files
Location: `.codex/agents/{name}.toml`
TOML keys: `name`, `description`, `developer_instructions`, optional model/config fields, and `[[skills.config]]`

### Skill Files
Location: `.agents/skills/{name}/SKILL.md`
Frontmatter: `name`, `description`, `user-invocable`, `context`, `agent`, `metadata` (agent-affinity, keywords, platforms, triggers, connections)

### Output Files
- Plans: `plans/{YYMMDD-HHMM-slug}/plan.md`
- Reports: `reports/{YYMMDD-HHMM}-{slug}-{type}/`
- Agent data: `.kit-data/{category}/`

### Orchestration Constraint
Subagents (spawned via custom agent dispatch) cannot spawn further subagents. All multi-agent orchestration must originate from the main conversation.

## Related Files
- `AGENTS.md` — Full routing table and orchestration rules
- `.agents/skills/core/SKILL.md` — Operational boundaries
- `.agents/skills/skill-discovery/SKILL.md` — Lazy skill loading protocol
- `.agents/skills/skill-index.json` — Machine-readable skill catalog
- `WORKFLOW.md` — 15-phase solution architect workflow
