# ai-kit

Multi-agent development toolkit providing skills, agents, and workflows for Claude Code, Antigravity, Codex, and OpenCode.

The repository has been restructured to cleanly separate platform-specific workflows and components. Please navigate to the appropriate folder for your environment:

- 🟢 **[Claude Code](./claude/README.md)**: Native custom agents, hooks, and session configurations.
- 🟠 **[Antigravity](./antigravity/README.md)**: Auto-generated workflows, passive skills, and system prompt logic.
- 🔵 **[Codex / GitHub Copilot](./codex/codex-setup-instructions.md)**: Auto-generated agents and global instructions.
- 🟣 **[OpenCode](./opencode/README.md)**: Auto-generated subagents, commands, skills, and project configuration.

## Quick Links
- [Claude Project Workspace Setup](./claude/claude-setup-instructions.md)
- [Antigravity Setup & Architecture](./antigravity/ANTIGRAVITY.md)
- [Codex Setup Instructions](./codex/codex-setup-instructions.md)
- [OpenCode Setup Instructions](./opencode/opencode-setup-instructions.md)

---

## 🚀 Install via CLI (cross-platform)

Drop the kit into any project with a single command. Default target is `claude`; pass additional targets positionally.

```bash
# claude only (default)
npx agentkit-cli install

# multi-target
npx agentkit-cli install codex opencode

# everything
npx agentkit-cli install all
```

Other commands: `update`, `uninstall`, `list`. Source for the CLI lives in [`cli/`](./cli/README.md).

### Install the CLI globally (no npm publish required)

**A. From local checkout** — install once, reuse anywhere:
```bash
git clone https://github.com/trimeo806/ai-kit.git
cd ai-kit/cli
npm install
npm run build
npm install -g .

# now usable in any directory:
agentkit-cli install
```

**B. From a tarball** — share with teammates without publishing:
```bash
# producer
cd ai-kit/cli
npm install && npm run build
npm pack
# → agentkit-cli-0.1.0.tgz

# consumer (any machine with Node ≥18)
npm install -g ./agentkit-cli-0.1.0.tgz
agentkit-cli install
```

**C. From npm registry** — once published:
```bash
npm install -g agentkit-cli
# or zero-install:
npx agentkit-cli install
```

> Windows users who prefer the existing scripts can keep using the PowerShell installers below.

---

## ⚡ Kit Maintenance (How to Sync & Update)

> **Read this if you are a contributor updating agents, adding skills, or migrating to a new AI tool.**

This kit follows a **one-way sync model**:
```
claude/.claude/agents/   ←── SOURCE OF TRUTH ──→  claude/.claude/skills/
        │
        ├── .\scripts\sync-to-antigravity.ps1 -> antigravity/_agents/workflows/ + antigravity/skills/
        ├── .\scripts\sync-to-codex.ps1       -> codex/.codex/agents/ + codex/.agents/skills/
        └── .\scripts\sync-to-opencode.ps1    -> opencode/.opencode/agents/ + opencode/.agents/skills/
```

### Rules
- ✅ **Edit** only `claude/.claude/agents/` and `claude/.claude/skills/`
- ✅ **Run sync** after any change
- ❌ **Never edit** `antigravity/_agents/workflows/`, `codex/.codex/agents/`, `opencode/.opencode/agents/`, `antigravity/skills/`, `codex/.agents/skills/`, or `opencode/.agents/skills/` directly — they are auto-generated

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
# Sync to codex/ package outputs
.\scripts\sync-to-codex.ps1
```

**Sync to OpenCode:**
```powershell
# Sync to opencode/ package outputs
.\scripts\sync-to-opencode.ps1
```

📖 **Full maintenance details**: see the platform setup docs in `claude/`, `codex/`, and `opencode/`.
