# Claude Code Setup Instructions

To use this kit with an existing project in Claude Code, copy the core files into your project root:

```bash
# From the tri-ai-kit directory, copy into your target project
cp -r .claude /path/to/your-project/
cp AGENTS.md /path/to/your-project/
cp WORKFLOW.md /path/to/your-project/
```

Then open your project in Claude Code — the agents, skills, and hooks will load automatically on session start.
You can use slash commands in Claude Code to activate agents.

**What gets installed:**
- `.claude/` — agents, skills, hooks, and slash commands
- `AGENTS.md` — routing rules and orchestration instructions Claude Code reads on startup
- `WORKFLOW.md` — 15-phase production delivery workflow reference

---

## Kit Maintenance: Source of Truth

The `.claude/` directory acts as the **source of truth** for all agents and skills in this kit. 

```
.claude/agents/     ← Edit agents here
.claude/skills/     ← Edit skills here
```

Everything generated for other platforms (like Antigravity or Codex) is auto-generated from these two directories. **Always edit agents and skills here.**

---

## Adding a New Agent

1. Create `.claude/agents/{agent-name}.md` with full YAML frontmatter
2. Run the sync script for your target platform (e.g. `sync-to-antigravity.ps1`)
3. Custom file `_agents/workflows/{agent-name}.md` will be created automatically

**Minimum frontmatter for Claude Code:**
```yaml
---
name: my-agent
description: "Short description — this is the most critical field for both Claude and Antigravity"
model: sonnet
skills: [core, skill-discovery]
---
```

---

## Adding a New Skill

1. Create `.claude/skills/{skill-name}/SKILL.md`
2. Run the sync script — the skill will automatically appear in your target `skills/` folder and be indexed.

**Minimum SKILL.md frontmatter:**
```yaml
---
name: my-skill
description: "Description of when to trigger this skill"
user-invocable: false
tier: discoverable
---
```
