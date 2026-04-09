# P4 - Validation, docs, and release contract

## Purpose
Verify the generated Codex package end to end and publish the operating rules for maintaining it.

## Table of Contents
- [Purpose](#purpose)
- [Agent & Skills](#agent--skills)
- [Inputs](#inputs)
- [Deliverables](#deliverables)
- [Tasks](#tasks)
- [Validation](#validation)
- [Exit Criteria](#exit-criteria)
- [Related Documents](#related-documents)

## Agent & Skills
- **Agent**: `tester`
- **Skills**: `test`, `core`, `skill-discovery`, `docs`
- **Handoffs**:
  - After completion -> `docs-manager`
  - If verification fails -> `debugger`

## Inputs
- `scripts/sync-to-codex.ps1`
- `scripts/sync-config.json`
- generated contents under `codex/`
- `codex/codex-setup-instructions.md`

## Deliverables
- `codex/codex-setup-instructions.md`
- `scripts/install-codex-kit.ps1`
- optional `scripts/install-codex-kit.sh`
- validation notes for:
  - clean target repo install
  - merge install into an existing Codex repo

## Tasks
- Run generator verification in two modes:
  - dry-run
  - full package generation into `codex/`
- Validate package parity:
  - agent count
  - skill count
  - `references/` presence
  - hook file presence
  - hook registration presence in `codex/.codex/hooks.json`
  - hook feature/config presence in `codex/.codex/config.toml`
  - compatibility runtime presence in `codex/.codex/runtime/`
  - memory path presence
- Validate agent outputs:
  - required custom-agent fields exist
  - explicit `skills.config` bindings exist for every migrated source skill reference
  - unmapped source model or permission values fail generation
- Validate document outputs:
  - `codex/AGENTS.md`
  - `codex/WORKFLOW.md`
  - `codex/codex-setup-instructions.md`
- Check for stale references to:
  - repo-root `.claude/`
  - repo-root `.github/`
  - Copilot-only install paths
  - obsolete source assumptions
- Validate hook parity on supported runtime paths:
  - Linux/macOS native Codex hooks
  - Windows standardized parity path through WSL2 or equivalent supported POSIX runtime
  - lifecycle coverage for startup, prompt submission, subagent lifecycle, tool gating, stop hooks, metrics, lessons, and notifications
- Update `codex/codex-setup-instructions.md` so installation and refresh steps are expressed in terms of the `codex/` package and its runtime prerequisites.
- Implement `scripts/install-codex-kit.ps1` to:
  - install into a clean target repo
  - merge into an existing Codex repo
  - preserve project-local `.agents/skills/`
  - preserve project-local `.codex/agents/`
  - merge root `AGENTS.md`
  - merge `.codex/config.toml`
  - merge `.codex/hooks.json`
- Optionally implement `scripts/install-codex-kit.sh` with the same contract for POSIX environments.
- Write the target-project installation procedure for two cases:
  - clean repo with no Codex files
  - existing Codex repo that already has `AGENTS.md`, `.codex/config.toml`, `.codex/hooks.json`, `.agents/skills/`, or `.codex/agents/`
- Define merge rules for target repos:
  - root `AGENTS.md` merge strategy
  - `.codex/config.toml` merge strategy
  - `.codex/hooks.json` merge strategy
  - preservation rules for project-local skills and custom agents
- Validate the install procedure against a sample target repository layout so the package can be applied without guesswork.
- Validate the installer script against:
  - one clean sample target repo
  - one existing Codex repo with pre-existing `AGENTS.md`, `.codex/config.toml`, `.codex/hooks.json`, and repo-local skills or agents
- Write maintenance rules:
  - edit only `claude/`
  - rerun sync to refresh `codex/`
  - do not manually edit generated Codex runtime files unless the generator contract allows it
- Publish a short support matrix listing:
  - native Codex-covered behaviors
  - compatibility-runtime-covered behaviors
  - platform prerequisites for full parity

## Validation
- The Codex package can be rebuilt from `tri-ai-kit/claude/` without manual patching.
- `codex/AGENTS.md` is present and is the documented Codex instruction entrypoint.
- `codex/codex-setup-instructions.md` no longer tells users to install from repo-root `.github/` as the main Codex path.
- `codex/codex-setup-instructions.md` is executable for both clean and merge installs into another project.
- `scripts/install-codex-kit.ps1` can perform both clean and merge installs without deleting project-local Codex assets.
- `skill-index.json` is documented only as tri-ai-kit internal support metadata.
- Generated package verification catches count mismatches, stale references, missing required agent fields, and missing skill bindings.
- Full hook parity is demonstrated through native Codex hooks plus the compatibility runtime where required.

## Exit Criteria
- The package is reproducible and internally consistent.
- Install and refresh documentation matches the new Codex package contract.
- The package has an explicit target-project installation procedure.
- Installer automation exists for safe target-project rollout.
- The runtime parity story is explicit enough to execute the migration without hidden work.
- No remaining gap is hand-waved as permanently unsupported.

## Related Documents
- [Codex setup instructions](codex-setup-instructions.md)
- [Sync script](../scripts/sync-to-codex.ps1)
- [Plan](plan.md)
- [Codex hooks docs](https://developers.openai.com/codex/hooks)
- [Codex AGENTS docs](https://developers.openai.com/codex/guides/agents-md)
- [Codex skills docs](https://developers.openai.com/codex/skills)
- [Codex subagents docs](https://developers.openai.com/codex/subagents)
