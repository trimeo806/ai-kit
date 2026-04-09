# P1 - Source and target contract lock

## Purpose
Freeze the exact `claude/` source set and the exact `codex/` output set before any generator work begins.

## Table of Contents
- [Purpose](#purpose)
- [Agent & Skills](#agent--skills)
- [Inputs](#inputs)
- [Decisions](#decisions)
- [Tasks](#tasks)
- [Validation](#validation)
- [Exit Criteria](#exit-criteria)
- [Related Documents](#related-documents)

## Agent & Skills
- **Agent**: `project-manager`
- **Skills**: `tri-ai-kit`, `skill-discovery`, `research`, `doc-coauthoring`, `sequential-thinking`
- **Handoffs**:
  - After completion -> `developer`
  - On ambiguity -> `researcher`

## Inputs
- `claude/CLAUDE.md`
- `claude/AGENTS.md`
- `claude/WORKFLOW.md`
- `claude/.claude/agents/`
- `claude/.claude/skills/`
- `claude/.claude/hooks/`
- `claude/.claude/agent-memory/`
- `claude/.claude/settings.json`
- `claude/.claude/.tri-ai-kit.json`
- `claude/.claude/.tri-ignore`

## Decisions
- Reusable package source is `tri-ai-kit/claude/`, not repo-root `.claude/`.
- Codex instruction entrypoint is `codex/AGENTS.md`.
- `codex/AGENTS.md` uses `claude/CLAUDE.md` as the base and merges in routing/orchestration content from `claude/AGENTS.md`.
- Generated Codex custom agents live under `codex/.codex/agents/`.
- Generated Codex skills live under `codex/.agents/skills/`.
- `codex/.agents/skills/skill-index.json` is preserved only for tri-ai-kit skill-discovery logic and is not part of the Codex-native contract.
- Generated native hook registration lives in `codex/.codex/hooks.json`.
- `codex/.codex/config.toml` carries Codex feature/config settings only, not hook definitions.
- Full hook parity is mandatory and is achieved through:
  - native Codex hooks where available
  - tri-ai-kit compatibility runtime under `codex/.codex/runtime/` where native Codex cannot express the lifecycle
- As of 2026-04-09, Windows Codex hooks are documented as disabled, so Windows parity validation must run through WSL2 or an equivalent supported POSIX runtime until official support changes.

## Tasks
- Record the canonical source tree under `claude/` and explicitly mark repo-root `.claude/` as package-local config only.
- Write the target tree for `codex/`, including:
  - `AGENTS.md`
  - `.agents/skills/`
  - `.codex/agents/`
  - `.codex/hooks.json`
  - `.codex/config.toml`
  - `.codex/hooks/`
  - `.codex/runtime/`
  - `.kit-data/improvements/`
- Define the merge rule for Codex instructions:
  - base sections from `claude/CLAUDE.md`
  - supplemental routing/orchestration sections from `claude/AGENTS.md`
  - Codex-specific wording and path transforms
- Define the field mapping contract for Claude agents:
  - `name`
  - `description`
  - `developer_instructions`
  - `skills.config`
  - `model` translation
  - permission translation
  - `handoffs` adapter rule
  - memory adapter rule
- Define component disposition for each source area:
  - direct copy
  - transformed copy
  - native Codex config
  - tri-ai-kit compatibility runtime
- Lock the Windows runtime requirement for hook parity and make it an explicit install/validation prerequisite.
- Decide whether any legacy `.github/*` artifacts remain as optional compatibility outputs or are removed from the Codex package contract.

## Validation
- Every source path under `claude/` has a single destination or a documented adapter layer.
- No plan step treats repo-root `.claude/` as a packaging source.
- No primary Codex deliverable depends on repo-root `.github/`.
- The merge rule for `codex/AGENTS.md` is explicit enough to implement without guesswork.
- Hook configuration is split correctly between:
  - `codex/.codex/hooks.json`
  - `codex/.codex/config.toml`
- No Claude behavior is left in a permanent "unsupported" state inside the migration contract.
- `skill-index.json` is clearly labeled as tri-ai-kit internal metadata only.

## Exit Criteria
- A written source-to-target matrix exists for instructions, agents, skills, hooks, memory, runtime config, and workflow docs.
- `codex/AGENTS.md` is defined as the instruction output.
- The package target tree is stable enough for generator work in phase 2.
- The platform/runtime prerequisite for hook parity is explicit.

## Related Documents
- [Claude AGENTS](../claude/AGENTS.md)
- [Claude CLAUDE](../claude/CLAUDE.md)
- [Claude package README](../claude/README.md)
- [Claude hooks README](../claude/.claude/hooks/README.md)
- [Sync config](../scripts/sync-config.json)
- [Codex hooks docs](https://developers.openai.com/codex/hooks)
- [Codex AGENTS docs](https://developers.openai.com/codex/guides/agents-md)
- [Codex skills docs](https://developers.openai.com/codex/skills)
- [Codex subagents docs](https://developers.openai.com/codex/subagents)
