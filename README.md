# tri-ai-kit

Multi-agent development toolkit providing skills, agents, and workflows for Claude Code, Antigravity, and Codex. 

The repository has been restructured to cleanly separate platform-specific workflows and components. Please navigate to the appropriate folder for your environment:

- 🟢 **[Claude Code](./claude/README.md)**: Native custom agents, hooks, and session configurations.
- 🟠 **[Antigravity](./antigravity/README.md)**: Auto-generated workflows, passive skills, and system prompt logic.
- 🔵 **[Codex / GitHub Copilot](./codex/codex-setup-instructions.md)**: Auto-generated agents and global instructions.

## Quick Links
- [Claude Project Workspace Setup](./claude/claude-setup-instructions.md)
- [Antigravity Setup & Architecture](./antigravity/ANTIGRAVITY.md)
- [Codex Setup Instructions](./codex/codex-setup-instructions.md)

---

## ⚡ Kit Maintenance (How to Sync & Update)

> **Read this if you are a contributor updating agents, adding skills, or migrating to a new AI tool.**

This kit follows a **one-way sync model**:
```
claude/.claude/agents/   ←── SOURCE OF TRUTH ──→  claude/.claude/skills/
        │                                         │
        ▼  .\scripts\sync-to-antigravity.ps1      ▼
antigravity/_agents/workflows/                 antigravity/skills/
```

### Rules
- ✅ **Edit** only `claude/.claude/agents/` and `claude/.claude/skills/`
- ✅ **Run sync** after any change
- ❌ **Never edit** `antigravity/_agents/workflows/`, `codex/.github/agents/`, or `antigravity/skills/` directly — they are auto-generated

### Sync Commands (Windows PowerShell)

**Sync to Antigravity:**
```powershell
# Full sync (agents + skills + regenerate skill-index.json)
.\scripts\sync-to-antigravity.ps1

# Preview without writing
.\scripts\sync-to-antigravity.ps1 -DryRun
```

**Sync to Codex (Copilot):**
```powershell
# Sync to codex/.github/agents/ and codex/.github/copilot-instructions.md
.\scripts\sync-to-codex.ps1
```

📖 **Full maintenance details**: [SETUP.md](./SETUP.md)
