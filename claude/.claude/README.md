# .claude/ — Agent System Directory

This directory contains all configuration for the tri_ai_kit multi-agent system.

## Structure

```
.claude/
├── agents/          — Agent definitions (18 agents)
├── agent-memory/    — Per-agent persistent memory (created on first write)
├── assets/          — Shared assets (improvements-schema.json, GEMINI.md)
├── hooks/           — Hook scripts wired in settings.json
│   ├── __tests__/   — Hook unit tests (Jest)
│   ├── lib/         — Shared hook utilities
│   └── *.cjs        — Individual hook scripts
├── output-styles/   — Response verbosity levels (coding-level-0 through 5)
├── scripts/         — Utility scripts (not hooks)
├── settings.json    — Hook wiring, permissions, environment variables
└── skills/          — Passive knowledge modules (48 skills)
    └── skill-index.json  — Machine-readable skill catalog for lazy loading
```

## Agents

18 specialized agents in `.claude/agents/`. Each agent file is a Markdown file with YAML frontmatter declaring its skills, model, color, memory mode, and handoffs.

| Category | Agents |
|----------|--------|
| **Development** | developer, frontend-developer, backend-developer |
| **Architecture** | frontend-architect, backend-architect |
| **Quality** | code-reviewer, security-auditor, tester |
| **UI/A11Y** | muji, a11y-specialist |
| **Planning** | planner, project-manager |
| **Knowledge** | researcher |
| **Operations** | devops-engineer, git-manager |
| **Creative** | brainstormer |
| **Integration** | mcp-manager |
| **Debug** | debugger |

## Skills

48 skill directories in `.claude/skills/`. Skills are **passive knowledge** — they don't execute; agents read them.

**Loading mechanism**: `skill-discovery/SKILL.md` runs at the start of every task, reads `skill-index.json`, and selects up to 3 matching skills based on platform/task signals.

**Skill types**:
- `tier: core` — Always loaded (e.g., `core`, `skill-discovery`)
- `user-invocable: true` — Callable as `/skillname` slash commands
- `wrapper: true` — Thin shells that inject flags into parent skills
- Default — Discovered lazily on demand

## Hooks

Hooks in `.claude/hooks/` execute in response to Claude Code lifecycle events:

| Hook | Event | Purpose |
|------|-------|---------|
| `session-init.cjs` | SessionStart | Write session marker for metrics |
| `context-reminder.cjs` | UserPromptSubmit | Inject session context into every prompt |
| `subagent-init.cjs` | SubagentStart | Initialize subagent with naming patterns |
| `scout-block.cjs` | PreToolUse | Block overly broad file scans |
| `privacy-block.cjs` | PreToolUse | Block reads of sensitive files |
| `build-gate-hook.cjs` | PreToolUse | Validate bash commands |
| `session-metrics.cjs` | Stop | Collect session metrics, append to JSONL |
| `lesson-capture.cjs` | Stop | Evaluate significance, prompt knowledge capture |
| `subagent-stop-reminder.cjs` | SubagentStop | Post-subagent cleanup reminders |
| `post-index-reminder.cjs` | Stop | Remind to update reports/index.json |

## Output Styles

`.claude/output-styles/` contains 6 response verbosity levels (`coding-level-0-eli5` through `coding-level-5-god`). The active style is controlled by the `TRI_AGENT_STYLE` environment variable in `settings.json`. The hook `hooks/lib/project-detector.cjs` reads the matching `.md` file and injects its guidelines into the agent context via the context-reminder hook.

## Key Files

- `settings.json` — Hook wiring, permissions, environment variables, status line config
- `skills/skill-index.json` — Auto-generated skill catalog (run `scripts/generate-skill-index.cjs` to update)
- `skills/core/SKILL.md` — Operational boundaries that all agents follow
- `skills/tri-ai-kit/SKILL.md` — Agent catalog and kit conventions reference

## Related

- `CLAUDE.md` — Routing rules and orchestration protocol
- `WORKFLOW.md` — 15-phase solution architect workflow
