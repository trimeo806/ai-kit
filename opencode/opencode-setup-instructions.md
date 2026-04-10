# OpenCode Kit Setup Instructions

## Purpose

Install the generated `tri-ai-kit/opencode/` package into another repository so OpenCode can use the kit as that project's repo-scoped configuration.

## What This Package Is

- `tri-ai-kit/opencode/` is a generated distribution package.
- OpenCode does not run from `tri-ai-kit/opencode/` when you are inside another repository.
- To use the kit in another project, copy or sync the package contents into that target repository's root.

OpenCode behavior this setup follows:

- OpenCode reads project rules from root `AGENTS.md`.
- OpenCode reads project config from root `opencode.json`.
- OpenCode reads custom subagents from `.opencode/agents/`.
- OpenCode reads custom commands from `.opencode/commands/`.
- OpenCode reads skills from `.agents/skills/`.

References:

- https://opencode.ai/docs/rules
- https://opencode.ai/docs/config
- https://opencode.ai/docs/agents
- https://opencode.ai/docs/commands
- https://opencode.ai/docs/skills

## Before You Start

### 1. Generate the OpenCode package

Run the generator from the `tri-ai-kit` repository:

```powershell
cd C:\private\tri-ai-kit
.\scripts\sync-to-opencode.ps1
```

Expected output package:

```text
tri-ai-kit/opencode/
  AGENTS.md
  WORKFLOW.md
  opencode.json
  .agents/skills/
  .opencode/agents/
  .opencode/commands/
```

### 2. Decide your install mode

- `copy/sync`:
  Recommended for normal use. The target repo gets its own copy of the generated package.
- `symlink`:
  Useful while developing the kit itself. Changes in `tri-ai-kit/opencode/` are reflected immediately in the target repo.

### 2.1 Recommended installer

Use the installer script instead of manual copy when possible.

Clean or merge install (copy mode):

```powershell
cd C:\private\tri-ai-kit
.\scripts\install-opencode-kit.ps1 -TargetRepo "C:\path\to\your-project"
```

Preview only:

```powershell
cd C:\private\tri-ai-kit
.\scripts\install-opencode-kit.ps1 -TargetRepo "C:\path\to\your-project" -DryRun
```

Symlink install (clean target only):

```powershell
cd C:\private\tri-ai-kit
.\scripts\install-opencode-kit.ps1 -TargetRepo "C:\path\to\your-project" -Mode symlink
```

### 3. Windows note

OpenCode runs on native Windows, but the official docs still recommend WSL for the best overall terminal experience.

If you already use OpenCode successfully on native Windows, this package does not require a compatibility runtime for basic operation.

## Install Into a Clean Target Repository

Use this path when the target repo does not already have OpenCode files.

Target repo example:

```text
<target-repo>/
  AGENTS.md
  WORKFLOW.md
  opencode.json
  .agents/skills/
  .opencode/agents/
  .opencode/commands/
```

### Copy mode

From the `tri-ai-kit` repo:

```powershell
$Target = "C:\path\to\your-project"

Copy-Item C:\private\tri-ai-kit\opencode\AGENTS.md $Target -Force
Copy-Item C:\private\tri-ai-kit\opencode\WORKFLOW.md $Target -Force
Copy-Item C:\private\tri-ai-kit\opencode\opencode.json $Target -Force
Copy-Item C:\private\tri-ai-kit\opencode\.agents $Target -Recurse -Force
Copy-Item C:\private\tri-ai-kit\opencode\.opencode $Target -Recurse -Force
```

### Symlink mode

```powershell
$Target = "C:\path\to\your-project"

New-Item -ItemType SymbolicLink -Path (Join-Path $Target "AGENTS.md") -Target "C:\private\tri-ai-kit\opencode\AGENTS.md"
New-Item -ItemType SymbolicLink -Path (Join-Path $Target "WORKFLOW.md") -Target "C:\private\tri-ai-kit\opencode\WORKFLOW.md"
New-Item -ItemType SymbolicLink -Path (Join-Path $Target "opencode.json") -Target "C:\private\tri-ai-kit\opencode\opencode.json"
New-Item -ItemType SymbolicLink -Path (Join-Path $Target ".agents") -Target "C:\private\tri-ai-kit\opencode\.agents"
New-Item -ItemType SymbolicLink -Path (Join-Path $Target ".opencode") -Target "C:\private\tri-ai-kit\opencode\.opencode"
```

## Install Into a Repository That Already Uses OpenCode

Use this path when the target repo already has any of:

- `AGENTS.md`
- `opencode.json`
- `.opencode/agents/`
- `.opencode/commands/`
- `.agents/skills/`

Do not blindly overwrite those files. Merge them.

### Root `AGENTS.md`

OpenCode reads root `AGENTS.md` automatically, so the target repo can only have one root file.

Merge rule:

- keep the target repo's project-specific rules
- add the tri-ai-kit orchestration rules into the same file
- if both files define the same policy, choose one final rule explicitly

The installer manages the tri-ai-kit section with `<!-- tri-ai-kit:begin -->` markers.

### `opencode.json`

Merge, do not replace.

Keep:

- target repo's provider, model, and personal workflow settings
- target repo's extra instructions, commands, or plugins

Add:

- tri-ai-kit `instructions` entries such as `WORKFLOW.md`
- tri-ai-kit build/plan permission defaults that allow skills and subagents

The installer performs a recursive JSON merge. Existing target settings win on conflicts, while missing tri-ai-kit keys are added.

### `.opencode/agents/`

Copy tri-ai-kit custom agents into `.opencode/agents/` without removing project-local agents.

Rules:

- preserve project-local agents
- avoid filename collisions
- if a project already has an agent with the same filename or purpose, merge or rename explicitly

### `.opencode/commands/`

Copy tri-ai-kit custom commands into `.opencode/commands/` without removing project-local commands.

Rules:

- preserve project-local commands
- avoid filename collisions
- if a project already has a command with the same name, pick one final command definition explicitly

### `.agents/skills/`

Copy tri-ai-kit skills into `.agents/skills/` without removing the repo's existing skills.

Rules:

- preserve project-local skills
- avoid renaming tri-ai-kit skills unless there is a real collision
- if two skills share the same skill `name`, resolve the collision before relying on implicit skill loading

## Verify the Installation

### 1. Verify project config loads

From the target repo:

```powershell
opencode debug config
```

Expected result:

- `instructions` includes `WORKFLOW.md`
- project config resolves without errors

### 2. Verify custom agents are discoverable

From the target repo:

```powershell
opencode agent list
```

Expected result:

- tri-ai-kit subagents appear alongside built-in agents

### 3. Verify a generated agent resolves

From the target repo:

```powershell
opencode debug agent planner
```

Expected result:

- OpenCode shows the merged planner configuration from `.opencode/agents/planner.md`

### 4. Verify skills are discoverable

From the target repo:

```powershell
opencode debug skill
```

Expected result:

- tri-ai-kit skills appear from `.agents/skills/`

### 5. Verify commands are present

Check that the target repo contains:

```text
.opencode/commands/*.md
```

Expected result:

- tri-ai-kit commands such as `plan.md`, `cook.md`, and `review.md` exist
- when you open the OpenCode TUI, they appear in the `/` command menu

## Notes on Claude Compatibility

OpenCode can read `CLAUDE.md` and `.claude/skills/` as compatibility fallbacks.

This package does not rely on that fallback mode. It installs first-class OpenCode files instead:

- `AGENTS.md`
- `opencode.json`
- `.opencode/agents/`
- `.opencode/commands/`
- `.agents/skills/`

## Refresh Workflow

When the source package changes:

1. Update the Claude source under `claude/`
2. Regenerate the OpenCode package:

```powershell
.\scripts\sync-to-opencode.ps1
```

3. Reinstall or resync into target repositories
4. Re-run the validation commands above
