# tri-ai-kit for OpenCode

Multi-agent development toolkit providing subagents, commands, skills, and project rules for OpenCode.

## Setup Instructions

> Read [`opencode-setup-instructions.md`](./opencode-setup-instructions.md) to install the generated package into another repository.

See [`WORKFLOW.md`](./WORKFLOW.md) for the full 15-phase delivery workflow.

---

## What It Is

This package installs a repo-scoped OpenCode setup:

- root `AGENTS.md` for orchestration and routing rules
- `opencode.json` for project-level OpenCode config
- `.opencode/agents/` for custom subagents
- `.opencode/commands/` for custom slash commands
- `.agents/skills/` for reusable skills

The main conversation stays the orchestrator. It routes work to specialist subagents, loads skills on demand, and uses custom commands for the standard tri-ai-kit flow.

**Core loop:**

```text
/brainstorm -> /plan -> /cook -> /review -> /test -> /git
```

---

## Package Layout

```text
opencode/
|-- AGENTS.md
|-- WORKFLOW.md
|-- opencode.json
|-- .agents/
|   `-- skills/
`-- .opencode/
    |-- agents/
    `-- commands/
```

---

## Notes

- This is a generated distribution package, not the source of truth.
- Edit `claude/` sources, then rerun `scripts/sync-to-opencode.ps1`.
- OpenCode can fall back to Claude-compatible files, but this package uses first-class OpenCode layout instead of relying on compatibility paths.

## Related Docs

- [OpenCode setup instructions](./opencode-setup-instructions.md)
- [Workflow](./WORKFLOW.md)
- [Claude source package](../claude/README.md)
