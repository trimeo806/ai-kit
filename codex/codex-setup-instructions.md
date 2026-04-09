# Codex Kit Setup Instructions

## Purpose
Install the generated `tri-ai-kit/codex/` package into another repository so Codex can use the kit as that project's repo-scoped configuration.

## What This Package Is
- `tri-ai-kit/codex/` is a generated distribution package.
- Codex does not run from `tri-ai-kit/codex/` when you are inside some other repository.
- To use the kit in another project, copy or sync the package contents into that target repository's root.

Official Codex behavior this setup follows:
- Codex reads repo instructions from root `AGENTS.md`.
- Codex reads repo skills from `.agents/skills/`.
- Codex reads project custom agents from `.codex/agents/`.
- Codex reads project hooks from `.codex/hooks.json`.
- Codex reads project config overrides from `.codex/config.toml`.

References:
- https://developers.openai.com/codex/guides/agents-md
- https://developers.openai.com/codex/skills
- https://developers.openai.com/codex/subagents
- https://developers.openai.com/codex/hooks

## Before You Start

### 1. Generate the Codex package
Run the generator from the `tri-ai-kit` repository:

```powershell
cd C:\private\tri-ai-kit
.\scripts\sync-to-codex.ps1
```

Expected output package:

```text
tri-ai-kit/codex/
  AGENTS.md
  WORKFLOW.md
  .agents/skills/
  .codex/agents/
  .codex/hooks.json
  .codex/config.toml
  .codex/hooks/
  .codex/runtime/
  .codex/agent-memory/
  .codex/output-styles/
  .kit-data/improvements/
```

### 2. Decide your install mode
- `copy/sync`:
  Recommended for normal use. The target repo gets its own copy of the generated package.
- `symlink`:
  Useful while developing the kit itself. Changes in `tri-ai-kit/codex/` are reflected immediately in the target repo.

### 2.1 Recommended installer
Use the installer script instead of manual copy when possible.

Clean or merge install (copy mode):

```powershell
cd C:\private\tri-ai-kit
.\scripts\install-codex-kit.ps1 -TargetRepo "C:\path\to\your-project"
```

Preview only:

```powershell
cd C:\private\tri-ai-kit
.\scripts\install-codex-kit.ps1 -TargetRepo "C:\path\to\your-project" -DryRun
```

Symlink install (clean target only):

```powershell
cd C:\private\tri-ai-kit
.\scripts\install-codex-kit.ps1 -TargetRepo "C:\path\to\your-project" -Mode symlink
```

### 3. Know the Windows limitation
As of April 9, 2026, the official Codex hooks docs say hooks are experimental and temporarily disabled on native Windows.

For full tri-ai-kit hook parity:
- use Linux or macOS, or
- use Windows through WSL2 or another supported POSIX execution layer

If you install on native Windows without WSL2:
- instructions, skills, and custom agents can still be present
- full hook parity is not achieved

### 4. Trust the target project
Codex only applies project `.codex/config.toml` files when the project is trusted.

After installing the kit into a target repository:
- open that repository in Codex
- trust the project if Codex prompts you
- restart Codex if project config or skills do not appear immediately

## Install Into a Clean Target Repository
Use this path when the target repo does not already have Codex files.

Target repo example:

```text
<target-repo>/
  AGENTS.md
  WORKFLOW.md
  .agents/skills/
  .codex/agents/
  .codex/hooks.json
  .codex/config.toml
  .codex/hooks/
  .codex/runtime/
  .codex/agent-memory/
  .codex/output-styles/
  .kit-data/improvements/
```

### Copy mode
From the `tri-ai-kit` repo:

```powershell
$Target = "C:\path\to\your-project"

Copy-Item C:\private\tri-ai-kit\codex\AGENTS.md $Target -Force
Copy-Item C:\private\tri-ai-kit\codex\WORKFLOW.md $Target -Force
Copy-Item C:\private\tri-ai-kit\codex\.agents $Target -Recurse -Force
Copy-Item C:\private\tri-ai-kit\codex\.codex $Target -Recurse -Force
Copy-Item C:\private\tri-ai-kit\codex\.kit-data $Target -Recurse -Force
```

### Symlink mode

```powershell
$Target = "C:\path\to\your-project"

New-Item -ItemType SymbolicLink -Path (Join-Path $Target "AGENTS.md") -Target "C:\private\tri-ai-kit\codex\AGENTS.md"
New-Item -ItemType SymbolicLink -Path (Join-Path $Target "WORKFLOW.md") -Target "C:\private\tri-ai-kit\codex\WORKFLOW.md"
New-Item -ItemType SymbolicLink -Path (Join-Path $Target ".agents") -Target "C:\private\tri-ai-kit\codex\.agents"
New-Item -ItemType SymbolicLink -Path (Join-Path $Target ".codex") -Target "C:\private\tri-ai-kit\codex\.codex"
New-Item -ItemType SymbolicLink -Path (Join-Path $Target ".kit-data") -Target "C:\private\tri-ai-kit\codex\.kit-data"
```

## Install Into a Repository That Already Uses Codex
Use this path when the target repo already has any of:
- `AGENTS.md`
- `.codex/config.toml`
- `.codex/hooks.json`
- `.agents/skills/`
- `.codex/agents/`

Do not blindly overwrite those files. Merge them.

### Root `AGENTS.md`
Codex reads at most one project instruction file per directory. That means the target repo can only have one root `AGENTS.md`.

Merge rule:
- keep the target repo's project-specific rules
- add the tri-ai-kit base orchestration rules into the same file
- if both files define the same policy, the merged file must choose one final rule explicitly

Recommended structure:

```markdown
# AGENTS.md

## Project-specific rules
- Local repo rules here

## tri-ai-kit base
- Installed from tri-ai-kit/codex/AGENTS.md
```

### `.codex/config.toml`
Merge, do not replace.

Keep:
- target repo's model/provider settings
- target repo's MCP settings
- target repo's project-specific sandbox or approval settings

Add:
- tri-ai-kit required feature flags such as hooks enablement
- tri-ai-kit agent/runtime defaults needed by the package

### `.codex/hooks.json`
Merge, do not replace.

Keep:
- target repo's existing hook registrations

Add:
- tri-ai-kit hook registrations

If both files register hooks for the same event:
- keep both unless they conflict
- if they conflict, define a single final command chain explicitly

### `.agents/skills/`
Copy tri-ai-kit skills into `.agents/skills/` without removing the repo's existing skills.

Rules:
- preserve project-local skills
- avoid renaming tri-ai-kit skills unless there is a real name collision
- if two skills share the same skill `name`, resolve the collision before relying on implicit invocation

### `.codex/agents/`
Copy tri-ai-kit custom agents into `.codex/agents/` without removing project-local agents.

Rules:
- preserve project-local agents
- avoid filename and `name` collisions
- if a project already has an agent with the same purpose, either merge or rename one of them explicitly

## Verify the Installation

### 1. Verify instructions load
From the target repo:

```powershell
codex --ask-for-approval never "List the instruction sources you loaded."
```

Expected result:
- Codex reports the target repo's root `AGENTS.md`
- if you installed nested overrides, Codex reports those too

### 2. Verify skills are discoverable
In Codex CLI or IDE:

```text
/skills
```

Expected result:
- tri-ai-kit skills appear in the skill list

### 3. Verify custom agents are available
Check that target repo contains:

```text
.codex/agents/*.toml
```

Expected result:
- tri-ai-kit custom agents exist as TOML files

### 4. Verify hook configuration
Check that target repo contains:

```text
.codex/hooks.json
.codex/config.toml
```

Expected result:
- `hooks.json` contains project hook registrations
- `config.toml` enables required hook features

### 5. Verify runtime prerequisites
For full parity:
- Linux/macOS: run Codex normally
- Windows: run Codex through WSL2 or the approved POSIX runtime path

## Refresh the Kit in a Target Project
When the source of truth changes:

1. Edit only `tri-ai-kit/claude/`
2. Regenerate `tri-ai-kit/codex/`
3. Re-copy or re-sync the package into the target repo
4. Re-merge any target-specific `AGENTS.md`, `.codex/config.toml`, and `.codex/hooks.json` customizations if they are not generator-owned

## Notes About `skill-index.json`
- `codex/.agents/skills/skill-index.json` is kept for tri-ai-kit internal discovery logic.
- It is not part of the Codex-native contract.
- Do not treat it as the source of truth for Codex skill discovery.

## Installer Behavior
`scripts/install-codex-kit.ps1` now handles:
- clean install into a repo with no Codex files
- merge install into a repo with existing Codex files
- root `AGENTS.md` merge using tri-ai-kit managed markers
- `.codex/config.toml` merge while ensuring `codex_hooks = true`
- `.codex/hooks.json` merge while preserving existing hook entries
- preservation of project-local `.agents/skills/` and `.codex/agents/`

Optional POSIX installer (`scripts/install-codex-kit.sh`) is still not implemented.
