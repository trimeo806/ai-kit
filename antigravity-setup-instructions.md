# Antigravity Setup Instructions

To use this kit with Antigravity, you need to use the workflows and skills synced to the `_agents` and `skills` directories.

Copy the core files into your project root:

```bash
# From the tri-ai-kit directory, copy into your target project
cp -r _agents /path/to/your-project/
cp -r skills /path/to/your-project/
cp WORKFLOW.md /path/to/your-project/
```

Antigravity will automatically detect the workflows from the `_agents/workflows/` directory and skills from the `skills/` directory. You will be able to trigger the workflows natively within the Antigravity environment.

**What gets installed:**
- `_agents/workflows/` — Antigravity-compatible workflow markdown files
- `skills/` — Skills logic and prompts
- `WORKFLOW.md` — 15-phase production delivery workflow reference

---

## Syncing Agents and Skills

Antigravity workflows and skills are directly auto-generated from the `.claude/` source of truth using a PowerShell script.

### Running the Sync
```powershell
# Full sync (agents + skills + regenerate index)
.\scripts\sync-to-antigravity.ps1

# Preview before applying (dry-run)
.\scripts\sync-to-antigravity.ps1 -DryRun

# Sync agents only
.\scripts\sync-to-antigravity.ps1 -AgentsOnly

# Sync skills + regenerate index only
.\scripts\sync-to-antigravity.ps1 -SkillsOnly

# Verbose — view transform details
.\scripts\sync-to-antigravity.ps1 -Verbose
```

### Standard Kit Update Workflow
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

## Customizing Transform Rules

All transform rules for Antigravity are defined in `scripts/sync-config.json`.
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

## Troubleshooting

- **Script reports "path not found" error:** Make sure you run from the repo root: `cd C:\private\tri-ai-kit && .\scripts\sync-to-antigravity.ps1`
- **Agent output has remaining Claude-specific content:** Run with `-Verbose` to inspect the transform log, then add the missing pattern to `sync-config.json → agents.bodyTransforms`
- **skill-index.json is missing some skills:** Verify that the `SKILL.md` in `.claude/skills/{skill}/` has YAML frontmatter including `name` and `description`
- **I want to revert to the state before the sync:** Simply discard the generated changes: `git checkout -- _agents/ skills/` — the `.claude/` source remains unaffected
