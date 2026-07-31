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

### ⚡ Quick start (run from inside the target repo)

```bash
# everything, never overwrite your own files
npx devagent-kit install all --skip-existing

# claude only (default target)
npx devagent-kit install --skip-existing

# pick targets
npx devagent-kit install codex opencode --skip-existing

# preview without writing
npx devagent-kit install all --dry-run

# maintenance
npx devagent-kit update
npx devagent-kit list
npx devagent-kit uninstall
```

Kit content is fetched fresh from GitHub `master` on every run, so `npx devagent-kit` always installs the latest agents/skills without a new npm release.

### Alternative — from a local checkout (no publish)

No npm publish, no global install. Runs the CLI from a local checkout; kit content is fetched fresh from GitHub `master` every run. Replace `/path/to/your/ai-kit/cli` with your own checkout path.

```bash
# install everything, never overwrite your own files
npx /path/to/your/ai-kit/cli install all --skip-existing

# claude only
npx /path/to/your/ai-kit/cli install --skip-existing

# pick targets
npx /path/to/your/ai-kit/cli install codex opencode --skip-existing

# preview without writing
npx /path/to/your/ai-kit/cli install all --dry-run

# maintenance
npx /path/to/your/ai-kit/cli update
npx /path/to/your/ai-kit/cli list
npx /path/to/your/ai-kit/cli uninstall
```

> First run needs the CLI built once: `cd /path/to/your/ai-kit/cli && npm install && npm run build`. After pulling new CLI changes, rebuild. For an auto pull+build+run shortcut, see **Option D** below.

---

Drop the kit into any project with a single command. Default target is `claude`; pass additional targets positionally.

```bash
# claude only (default)
npx devagent-kit install

# multi-target
npx devagent-kit install codex opencode

# everything
npx devagent-kit install all
```

Useful flags: `--skip-existing` (add new files only, never overwrite existing — preserves your project's own `CLAUDE.md`/`.claude/`), `-y`/`--yes` (overwrite all, no backup), `--dry-run` (preview).

Every `install` also appends an ai-kit-managed block to the target repo's `.gitignore`, keeping installed kit files local and out of commits.

Other commands: `update`, `uninstall`, `list`. Source for the CLI lives in [`cli/`](./cli/README.md).

### Install the CLI globally

**A. From local checkout** — install once, reuse anywhere:
```bash
git clone https://github.com/trimeo806/ai-kit.git
cd ai-kit/cli
npm install
npm run build
npm install -g .

# now usable in any directory:
devagent-kit install
```

**B. From a tarball** — share with teammates without publishing:
```bash
# producer
cd ai-kit/cli
npm install && npm run build
npm pack
# → devagent-kit-0.2.0.tgz

# consumer (any machine with Node ≥18)
npm install -g ./devagent-kit-0.2.0.tgz
devagent-kit install
```

**C. From npm registry** — published as [`devagent-kit`](https://www.npmjs.com/package/devagent-kit):
```bash
npm install -g devagent-kit
# or zero-install:
npx devagent-kit install
```

**D. Local, no publish, always latest** — run the CLI straight from a local checkout, no npm publish, no global install. Kit *content* is always fetched fresh from GitHub `master` on every run; only the CLI *logic* is as fresh as your last `pull + build`.

```bash
# one-time: build the CLI once
cd /path/to/ai-kit/cli && npm install && npm run build

# run via npx against the local path (rebuild after pulling new CLI changes)
npx /path/to/ai-kit/cli install all --skip-existing
```

For a true *always-latest* shortcut, add an alias that pulls + rebuilds + runs (replace the path with your checkout):
```bash
alias aikit='git -C /path/to/ai-kit pull -q && npm --prefix /path/to/ai-kit/cli run -s build >/dev/null && node /path/to/ai-kit/cli/dist/index.js'

# then, from any repo:
aikit install all --skip-existing
```

> Note: content comes from **pushed** GitHub `master` — commit and push kit changes to make them installable. Local-only/unpushed commits are not installed.

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
