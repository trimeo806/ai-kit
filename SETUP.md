# tri-ai-kit — Kit Maintenance & Sync Guide

> **TL;DR**: Only edit `.claude/agents/` and `.claude/skills/`. Run the sync script to update Antigravity target directores. Never edit `_agents/workflows/` or `skills/` directly.

---

## Source of Truth

```
.claude/agents/     ← Edit agents here
.claude/skills/     ← Edit skills here
```

Everything in `_agents/workflows/` and `skills/` is **auto-generated** from the two directories above.

---

## Running the Sync

### First time / Full sync

```powershell
.\scripts\sync-to-antigravity.ps1
```

### Preview before applying (dry-run)

```powershell
.\scripts\sync-to-antigravity.ps1 -DryRun
```

### Sync agents only

```powershell
.\scripts\sync-to-antigravity.ps1 -AgentsOnly
```

### Sync skills + regenerate index only

```powershell
.\scripts\sync-to-antigravity.ps1 -SkillsOnly
```

### Verbose — view transform details

```powershell
.\scripts\sync-to-antigravity.ps1 -Verbose
```

---

## Standard Kit Update Workflow

```
1. Edit .claude/agents/{agent}.md  or  .claude/skills/{skill}/SKILL.md
2. Verify with dry-run:
   .\scripts\sync-to-antigravity.ps1 -DryRun -Verbose
3. Apply:
   .\scripts\sync-to-antigravity.ps1
4. Commit both source and generated files:
   git add .claude/ _agents/ skills/ && git commit -m "feat(kit): update {agent/skill} ..."
```

---

## What the Script Does

### Agents (`.claude/agents/` → `_agents/workflows/`)

| Transform | Detail |
|-----------|---------|
| **Frontmatter filter** | Keeps only `description` + `skills`. Drops: `name`, `color`, `model`, `memory`, `permissionMode`, `handoffs`, `tools` |
| **Path rewrite** | `.claude/skills/` → `skills/` · `.claude/agents/` → `_agents/workflows/` |
| **Remove lines** | Deletes any lines containing `node .claude/scripts/` and specific CLI script calls |
| **Tool rewrite** | `AskUserQuestion tool` → `ask the user` |
| **Agent ref rewrite** | `via Agent tool` → `via the workflow` |
| **Footer rewrite** | `is an tri_ai_kit agent` → `is a tri-ai-kit workflow` |

### Skills (`.claude/skills/` → `skills/`)

| Transform | Detail |
|-----------|---------|
| **Copy structure** | Entire directory + subdirectories |
| **Path replace** | `.claude/skills/` → `skills/` in all `.md`, `.json` files |
| **Binary files** | Copied as-is (fonts, images, binaries) |
| **skill-index.json** | **Generated from scratch** based on each skill's SKILL.md frontmatter |

---

## Adding a New Agent

1. Create `.claude/agents/{agent-name}.md` with full YAML frontmatter
2. Run the sync script
3. Custom file `_agents/workflows/{agent-name}.md` is created automatically

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
2. Run the sync script — the skill will automatically appear in `skills/{skill-name}/` and be indexed in `skill-index.json`

**Minimum SKILL.md frontmatter:**
```yaml
---
name: my-skill
description: "Description of when to trigger this skill"
user-invocable: false
tier: discoverable
---
```

---

## Customizing Transform Rules

All transform rules are defined in `scripts/sync-config.json`.

To add a new rewrite rule:

```json
{
  "agents": {
    "bodyTransforms": [
      {
        "_comment": "Description of the transform",
        "from": "old pattern",
        "to": "new pattern"
      }
    ]
  }
}
```

To delete lines containing a specific pattern:
```json
{
  "removeLineContaining": ["pattern-1", "pattern-2"]
}
```

---

## Migrating or Syncing to Another AI Tool (e.g. Codex)

This project has a built-in sync script for GitHub Copilot / Codex:

1. Run the sync:
   ```powershell
   .\scripts\sync-to-codex.ps1
   ```
2. The current default target directory is configured as `.github/agents/` and `.github/skills/`.
3. The `CLAUDE.md` file itself is also automatically parsed and exported to `.github/copilot-instructions.md`.

The `.claude/` source remains unchanged. When the official Codex target directory format is known, simply update the environment configuration variables at the top of the `scripts\sync-to-codex.ps1` file.

---

## Automating with GitHub Actions (Optional)

Create `.github/workflows/sync-kit.yml` to automatically sync on every push:

```yaml
name: Sync Kit
on:
  push:
    paths:
      - '.claude/agents/**'
      - '.claude/skills/**'

jobs:
  sync:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run sync
        shell: pwsh
        run: .\scripts\sync-to-antigravity.ps1
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore(sync): auto-sync from claude agents/skills"
```

---

## Directory Structure

```
tri-ai-kit/
├── .claude/                    ← SOURCE OF TRUTH
│   ├── agents/                 ← 21+ agents (edit here)
│   └── skills/                 ← 60+ skills (edit here)
├── _agents/
│   └── workflows/              ← AUTO-GENERATED (Antigravity)
├── skills/                     ← AUTO-GENERATED (Antigravity)
│   └── skill-index.json        ← AUTO-GENERATED on every sync
├── scripts/
│   ├── sync-to-antigravity.ps1 ← Main sync script
│   ├── sync-to-codex.ps1       ← Codex (Copilot) sync script
│   └── sync-config.json        ← Transform configuration
└── SETUP.md                    ← This file
```

---

## Troubleshooting

**Script reports "path not found" error**
→ Make sure you run from the repo root: `cd C:\private\tri-ai-kit && .\scripts\sync-to-antigravity.ps1`

**Agent output has remaining Claude-specific content**
→ Run with `-Verbose` to inspect the transform log, then add the missing pattern to `sync-config.json → agents.bodyTransforms`

**skill-index.json is missing some skills**
→ Verify that the `SKILL.md` in `.claude/skills/{skill}/` has YAML frontmatter including `name` and `description`

**I want to revert to the state before the sync**
→ Simply discard the generated changes: `git checkout -- _agents/ skills/` — the `.claude/` source remains unaffected
