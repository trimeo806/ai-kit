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

## 🚀 Install

Published on npm as [**`devagent-kit`**](https://www.npmjs.com/package/devagent-kit). Requires Node ≥ 18. Works on macOS, Linux, and Windows.

### 1. npx (recommended — nothing to install)

Run from inside the project you want the kit in:

```bash
# everything, never overwrite your own files
npx devagent-kit install all --skip-existing

# claude only (default target)
npx devagent-kit install --skip-existing

# pick targets
npx devagent-kit install codex opencode --skip-existing

# preview without writing
npx devagent-kit install all --dry-run
```

Maintenance, same directory:

```bash
npx devagent-kit update       # re-fetch and reapply installed targets
npx devagent-kit list         # installed targets, pinned SHA, drift
npx devagent-kit uninstall    # remove kit-owned files
```

### 2. Global install

```bash
npm install -g devagent-kit

# then from any project directory:
devagent-kit install all --skip-existing
agentkit install all --skip-existing   # short alias, same binary
```

### Targets

| Target | Installs into |
|---|---|
| `claude` (default) | `.claude/`, `AGENTS.md`, `WORKFLOW.md` |
| `codex` | `.codex/`, `.agents/`, `AGENTS.md`, `WORKFLOW.md`, `.kit-data/improvements/` |
| `opencode` | `.opencode/`, `opencode.json` |
| `antigravity` | `.agents/` |
| `all` | every target above |

### Flags worth knowing

| Flag | Effect |
|---|---|
| `--skip-existing` | Add new files only, never overwrite — preserves your own `CLAUDE.md` / `.claude/` |
| `-y`, `--yes` | Overwrite all conflicts, no prompt, no backup |
| `--dry-run` | Print the plan, write nothing |
| `--ref <git-ref>` | Install kit content from a specific branch, tag, or commit (default: `master`) |

Every `install` appends an ai-kit-managed block to the target repo's `.gitignore`, keeping installed kit files local and out of your commits. `.ai-kit.lock` records installed targets, the resolved commit SHA, and the kit-owned file list.

### How versioning works

Two things ship on different tracks:

| What | Source | Updated by |
|---|---|---|
| Kit content — agents, skills, hooks, `AGENTS.md`, `WORKFLOW.md` | GitHub `master`, fetched fresh on every run | a push to this repo (no npm release needed) |
| CLI logic — install / update / merge / conflict handling | the npm tarball's `dist/` | a new `devagent-kit` npm release |

So `npx devagent-kit install` always pulls the latest agents and skills, even from an older CLI version. To pin content to an older state, pass `--ref <sha-or-tag>`.

### Contributor / local-checkout install

For working on the kit itself — runs the CLI from your clone, no npm involved:

```bash
git clone https://github.com/trimeo806/ai-kit.git
cd ai-kit/cli && npm install && npm run build

# run against any project directory
npx /path/to/ai-kit/cli install all --skip-existing

# or install your build globally
npm install -g .
```

Rebuild after pulling new CLI changes. For an always-latest shortcut:

```bash
alias aikit='git -C /path/to/ai-kit pull -q && npm --prefix /path/to/ai-kit/cli run -s build >/dev/null && node /path/to/ai-kit/cli/dist/index.js'
aikit install all --skip-existing
```

> Kit content comes from **pushed** `master` — commit and push kit changes to make them installable. Local-only commits are not installed.

> Windows users who prefer the existing scripts can keep using the PowerShell installers below.

## 🤝 Contributing

`master` is protected — **no direct pushes**. Open a pull request:

```bash
git switch -c feat/my-change
# edit only claude/.claude/agents/ and claude/.claude/skills/, then run the sync scripts
git commit -am "feat(skills): ..."
git push -u origin feat/my-change
gh pr create --fill
```

CI (`ci-cli.yml`) runs the CLI build and tests on Node 18/20, Ubuntu + Windows, for any change under `cli/`. Merging to `master` is what publishes new kit content to every `devagent-kit` user, so review accordingly.

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
