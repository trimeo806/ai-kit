# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

tri-ai-kit is a multi-agent development toolkit for Claude Code. It provides 22 specialized agents, 60+ skills, hooks, and a 15-phase production delivery workflow. The main conversation always acts as orchestrator — it routes to agents via the Agent tool and merges results. Agents never spawn other agents.

This is the `claude/` subdirectory of the tri-ai-kit monorepo. The `.claude/` folder here is the **source of truth** for all agents and skills. Never edit `antigravity/` or `codex/` directly — they are auto-generated via sync scripts.

## Architecture

```
claude/
├── .claude/
│   ├── agents/          # 22 agent definitions (markdown + YAML frontmatter)
│   ├── skills/          # 60+ passive skill modules (each has SKILL.md)
│   │   └── skill-index.json  # Auto-generated skill catalog
│   ├── hooks/           # Session hooks (Node.js .cjs files)
│   │   ├── lib/         # Shared hook utilities (colors, transcript parser, config counter)
│   │   └── __tests__/   # Hook tests (custom test framework, no external deps)
│   ├── output-styles/   # Response verbosity levels (0=ELI5 to 5=God)
│   └── settings.json    # Hook registration, permissions, env vars, statusline
├── AGENTS.md            # Routing rules, intent map, orchestration protocol
├── WORKFLOW.md          # 15-phase delivery workflow (Problem → Go-Live → Post-Launch)
└── claude-setup-instructions.md
```

## Key Concepts

### Routing (AGENTS.md)
Every user prompt is classified by intent (build/fix/plan/research/review/test/etc.) and routed to the best-fit agent. Platform is detected from file extensions (`.tsx`→frontend, `.go`→backend). Slash commands bypass routing.

### Core Loop
```
/brainstorm → /plan → /cook → /review → /test → /git
```

### Agent-Skill Binding
Agents declare which skills they activate in their frontmatter (`skills: [core, golang-pro]`). Plans must include an `## Agents & Skills` table mapping each phase to its agent and activated skills. Wrong assignment = wrong skills loaded at runtime.

### Orchestration Rules
- Single intent → spawn one agent
- Multi-intent → spawn `project-manager` to decompose
- 3+ independent tasks → use `subagent-driven-development` skill
- Document-driven execution: parse all agent references in a plan, build the full chain, execute sequentially, never skip downstream agents (e.g., `code-reviewer` after `frontend-developer`)

### Hooks System
Hooks are registered in `.claude/settings.json` and run as Node.js scripts:
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
node .claude/hooks/__tests__/session-init.test.cjs
node .claude/hooks/__tests__/privacy-block.test.cjs
node .claude/hooks/__tests__/subagent-init.test.cjs
node .claude/hooks/__tests__/context-reminder.test.cjs

# Statusline unit tests (52 tests)
node .claude/hooks/lib/__tests__/statusline.test.cjs

# Statusline integration tests (16 tests)
node .claude/hooks/lib/__tests__/statusline-integration.test.cjs
```

## Sync Commands

After editing agents or skills, sync to other platforms (run from repo root in PowerShell):

```powershell
# Sync to Antigravity
.\scripts\sync-to-antigravity.ps1        # full sync
.\scripts\sync-to-antigravity.ps1 -DryRun  # preview

# Sync to Codex/Copilot
.\scripts\sync-to-codex.ps1
```

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

**New agent**: Create `.claude/agents/{name}.md` with YAML frontmatter (`name`, `description`, `model`, `skills`). Run sync.

**New skill**: Create `.claude/skills/{name}/SKILL.md` with YAML frontmatter (`name`, `description`, `user-invocable`, `tier`). Run sync — skill-index.json is regenerated automatically.

## Documentation Standards

- Tables over paragraphs, bullets over sentences
- Keywords over full explanations, numbers over words
- Under 3KB per component doc, under 500 lines per rule file
- All docs need: Purpose, Table of Contents, Related Documents
