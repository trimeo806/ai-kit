---
title: Claude to Codex Migration
status: draft
created: 2026-04-09
updated: 2026-04-09
effort: large
phases: 4
platforms: [all]
breaking: false
---

# Claude to Codex Migration

## Purpose
Create a Codex-ready package under `tri-ai-kit/codex/` from the reusable Claude package in `tri-ai-kit/claude/`.

## Table of Contents
- [Source Contract](#source-contract)
- [Target Contract](#target-contract)
- [Project Installation Pattern](#project-installation-pattern)
- [Instruction Merge Rule](#instruction-merge-rule)
- [Agent Transform Rule](#agent-transform-rule)
- [Hook Parity Contract](#hook-parity-contract)
- [Migration Matrix](#migration-matrix)
- [Agents & Skills](#agents--skills)
- [Phases](#phases)
- [Success Criteria](#success-criteria)
- [Risks](#risks)
- [Out of Scope](#out-of-scope)
- [Related Documents](#related-documents)

## Source Contract
- Canonical reusable package source: `tri-ai-kit/claude/`
- Canonical instruction sources:
  - `claude/CLAUDE.md` - package overview, architecture, workflow, operating rules
  - `claude/AGENTS.md` - routing, intent map, orchestration, planning protocol
- Canonical runtime content:
  - `claude/.claude/agents/`
  - `claude/.claude/skills/`
  - `claude/.claude/hooks/`
  - `claude/.claude/agent-memory/`
  - `claude/.claude/output-styles/`
  - `claude/.claude/settings.json`
  - `claude/.claude/.tri-ai-kit.json`
  - `claude/.claude/.tri-ignore`
- Canonical workflow docs:
  - `claude/WORKFLOW.md`
  - `claude/claude-setup-instructions.md`
- Explicitly out of scope as packaging source:
  - repo-root `.claude/`
  - repo-root `.kit-data/`
  - repo-root `AGENTS.md`

## Target Contract
- Primary Codex instruction entrypoint: `codex/AGENTS.md`
- Primary Codex workflow doc: `codex/WORKFLOW.md`
- Primary Codex setup doc: `codex/codex-setup-instructions.md`
- Generated Codex support layer:
  - `codex/.codex/agents/`
  - `codex/.agents/skills/`
  - `codex/.codex/hooks/`
  - `codex/.codex/hooks.json`
  - `codex/.codex/config.toml`
  - `codex/.codex/runtime/`
  - `codex/.codex/agent-memory/`
  - `codex/.codex/output-styles/`
  - `codex/.codex/.tri-ai-kit.json`
  - `codex/.codex/.tri-ignore`
- Generated Codex runtime data contract:
  - `codex/.kit-data/improvements/current-session.json`
  - `codex/.kit-data/improvements/sessions.jsonl`
- Generated tri-ai-kit internal metadata:
  - `codex/.agents/skills/skill-index.json`
- Legacy `.github/copilot-instructions.md` output is not part of the primary Codex package contract.

## Project Installation Pattern
- `tri-ai-kit/codex/` is a generated distribution package, not the live install location used by Codex in another repository.
- To use the package in another project, install its contents into the target repository root with the same relative layout:
  - `codex/AGENTS.md` -> `<target>/AGENTS.md`
  - `codex/WORKFLOW.md` -> `<target>/WORKFLOW.md`
  - `codex/.agents/skills/**` -> `<target>/.agents/skills/**`
  - `codex/.codex/agents/**` -> `<target>/.codex/agents/**`
  - `codex/.codex/hooks.json` -> `<target>/.codex/hooks.json`
  - `codex/.codex/config.toml` -> `<target>/.codex/config.toml`
  - `codex/.codex/hooks/**` -> `<target>/.codex/hooks/**`
  - `codex/.codex/runtime/**` -> `<target>/.codex/runtime/**`
  - `codex/.codex/agent-memory/**` -> `<target>/.codex/agent-memory/**`
  - `codex/.codex/output-styles/**` -> `<target>/.codex/output-styles/**`
  - `codex/.kit-data/improvements/**` -> `<target>/.kit-data/improvements/**`
- Installation modes:
  - copy/sync mode for normal reuse across repositories
  - symlink mode for kit development and validation
- Safe rollout automation:
  - Phase 4 must produce an installer script for target repositories
  - required Windows-first deliverable: `scripts/install-codex-kit.ps1`
  - optional parity deliverable: `scripts/install-codex-kit.sh`
- Merge rules for existing target repos:
  - existing root `AGENTS.md` must be merged into a single root instruction file because Codex loads at most one root project instruction file per directory
  - existing `.codex/config.toml` must be merged, not blindly overwritten
  - existing `.codex/hooks.json` must be merged, not blindly overwritten
  - existing `.agents/skills/` and `.codex/agents/` content must be preserved alongside the installed tri-ai-kit content
- `codex/codex-setup-instructions.md` is the canonical install and refresh procedure for target repos.

## Instruction Merge Rule
- Base document for Codex instructions: `claude/CLAUDE.md`
- Supplemental sections from `claude/AGENTS.md`:
  - routing
  - intent map
  - routing rules
  - planning protocol
  - orchestration details not already covered in `CLAUDE.md`
- Generated output: `codex/AGENTS.md`
- Required transforms:
  - Claude-specific phrasing -> Codex-appropriate phrasing
  - source paths under `claude/.claude/` -> generated paths under `codex/.codex/` and `codex/.agents/`
  - references to Claude-only tools/events -> Codex-native equivalent or tri-ai-kit compatibility runtime wording
  - remove packaging claims that point at repo-root `.github/` as the main install target
- Size guard:
  - keep the generated `codex/AGENTS.md` within Codex project-doc limits
  - if the merged document grows beyond the configured limit, split supplemental operational details into referenced docs and keep `AGENTS.md` as the stable entrypoint

## Agent Transform Rule
- Claude agent frontmatter -> Codex custom agent TOML:
  - `name` -> `name`
  - `description` -> `description`
  - markdown body -> `developer_instructions`
- Claude `skills:` must be preserved explicitly:
  - generate `skills.config` entries for every source skill
  - point each entry at the packaged skill path under `codex/.agents/skills/`
  - do not rely on implicit skill discovery for migrated custom agents
- Claude `model:` must use a checked-in translation table in `scripts/sync-config.json`:
  - `inherit` -> omit `model` from the generated agent file
  - every other source value must map to a Codex model id or the generator must fail fast
- Claude `permissionMode:` must use a checked-in translation table in `scripts/sync-config.json`:
  - writable/edit-capable modes -> mapped Codex sandbox and approval preset
  - `default` -> inherit package/session defaults unless an explicit override is configured
  - unmapped permission values fail the generator
- Claude `memory:` does not become a native Codex agent field:
  - preserve memory behavior through the tri-ai-kit memory adapter under `codex/.codex/agent-memory/`
  - inject any required usage guidance into `developer_instructions`
- Claude `tools:` does not become a native custom-agent contract unless Codex adds a matching field:
  - preserve tool expectations as text in `developer_instructions`
- Claude `handoffs:` do not become native agent chaining metadata:
  - serialize the handoff intent into a structured appendix inside `developer_instructions`
  - keep actual orchestration rules in root `codex/AGENTS.md`
- Claude `color` is dropped.

## Hook Parity Contract
- Full hook parity is a hard requirement for this migration.
- No Claude hook behavior may be left as permanently unsupported at migration completion.
- Hook implementation layers:
  - native Codex hook registration in `codex/.codex/hooks.json`
  - Codex feature and environment settings in `codex/.codex/config.toml`
  - tri-ai-kit compatibility runtime in `codex/.codex/runtime/` for behaviors Codex does not expose directly
- Native Codex hooks are used where available.
- tri-ai-kit compatibility runtime is required for:
  - `SubagentStart` / `SubagentStop`
  - non-Bash `PreToolUse` and `PostToolUse` behaviors
  - status-line and notification parity where native Codex events/config are insufficient
  - any hook-triggered persistence workflow that native Codex cannot emit directly
- Platform gate:
  - as of 2026-04-09, official Codex hooks documentation states Windows hook support is temporarily disabled
  - migration completion therefore requires a standardized supported runtime path:
    - Linux/macOS native Codex runtime
    - Windows via WSL2 or an equivalent supported POSIX execution layer until native Windows hook support returns
- Phase 3 and phase 4 cannot close until every Claude hook is mapped to either:
  - a native Codex hook
  - a tri-ai-kit compatibility runtime trigger

## Migration Matrix

| Area | Source | Target | Notes |
|------|--------|--------|-------|
| Instructions | `claude/CLAUDE.md` + selected sections from `claude/AGENTS.md` | `codex/AGENTS.md` | Codex instruction entrypoint |
| Workflow | `claude/WORKFLOW.md` | `codex/WORKFLOW.md` | Copy with path and platform wording updates |
| Agents | `claude/.claude/agents/*.md` | `codex/.codex/agents/*.toml` | Generate `name`, `description`, `developer_instructions`, explicit `skills.config`, and mapped model/permission fields |
| Skills | `claude/.claude/skills/<skill>/` | `codex/.agents/skills/<skill>/` | Include `SKILL.md`, `references/**`, and any auxiliary files Codex skills can use |
| Skill index | `claude/.claude/skills/skill-index.json` | `codex/.agents/skills/skill-index.json` | tri-ai-kit internal discovery artifact only; Codex must not depend on it |
| Native hook config | `claude/.claude/settings.json` hook declarations | `codex/.codex/hooks.json` | Translate Claude hook registration into Codex hook config |
| Hook scripts | `claude/.claude/hooks/**` | `codex/.codex/hooks/**` | Port or wrap each hook explicitly |
| Hook parity runtime | Claude-only lifecycle semantics | `codex/.codex/runtime/**` | Compatibility layer for missing Codex hook surfaces and Windows execution path |
| Agent memory | `claude/.claude/agent-memory/**` | `codex/.codex/agent-memory/**` | Preserve file layout and indexing rules |
| Improvement store | runtime contract from Claude hooks | `codex/.kit-data/improvements/**` | Covers metrics and lesson-capture flow |
| Runtime config | `claude/.claude/settings.json`, `.tri-ai-kit.json`, `.tri-ignore`, `output-styles/**` | `codex/.codex/config.toml` plus package-local support files | `config.toml` carries feature/config defaults only, not hook definitions |
| Setup docs | `claude/claude-setup-instructions.md` + Codex package rules | `codex/codex-setup-instructions.md` | Must describe `codex/` package install and Windows WSL/runtime requirements |

## Agents & Skills

| Phase | Agent | Skills Activated |
|-------|-------|-----------------|
| P1 - Source and target contract lock | `project-manager` | `tri-ai-kit`, `skill-discovery`, `research`, `doc-coauthoring`, `sequential-thinking` |
| P2 - Codex package generator | `developer` | `core`, `code-documenter`, `tri-ai-kit`, `skill-discovery` |
| P3 - Hooks, memory, and runtime parity | `developer` | `core`, `knowledge-capture`, `knowledge-retrieval`, `skill-discovery` |
| P4 - Validation, docs, and release contract | `tester` | `test`, `core`, `skill-discovery`, `docs` |

## Phases
- P1 - Source and target contract lock
- P2 - Codex package generator
- P3 - Hooks, memory, and runtime parity
- P4 - Validation, docs, and release contract

## Success Criteria
- `codex/` is generated only from `tri-ai-kit/claude/`.
- `codex/AGENTS.md` is the Codex instruction file and follows the defined merge rule.
- Every generated custom agent file contains the required Codex fields and explicit skill bindings.
- Agent and skill exports include full skill directories, not just `SKILL.md`.
- `skill-index.json` is retained only as tri-ai-kit internal metadata and is not treated as a Codex-native dependency.
- Hook registration is emitted to `codex/.codex/hooks.json`, while `codex/.codex/config.toml` contains only feature/config settings.
- Hook and memory coverage includes `agent-memory`, `.kit-data/improvements`, and the compatibility runtime needed for full parity.
- Windows execution requirements are explicit and validated through the standardized runtime path.
- `codex/codex-setup-instructions.md` installs from `codex/`, not repo-root `.github/`.
- `codex/codex-setup-instructions.md` covers both:
  - clean install into a repo with no Codex files
  - merge install into a repo that already has `AGENTS.md`, `.codex/config.toml`, `.codex/hooks.json`, or repo skills
- Installer automation exists for target-project rollout:
  - clean install
  - merge install
  - preservation of project-local agents and skills
- A dry-run and a generated-package verification pass confirm count parity, path parity, stale-reference cleanup, and hook parity coverage.

## Risks
- Full parity depends on a tri-ai-kit compatibility runtime because native Codex hooks do not cover every Claude lifecycle event.
- As of 2026-04-09, Windows users need a supported POSIX execution layer for Codex hook parity until native Windows hooks return.
- Claude model labels and permission modes do not map 1:1 to Codex and require maintained translation tables.
- Generated files can drift unless the sync script is treated as the only write path.
- `CLAUDE.md` and `AGENTS.md` can diverge semantically unless the merge rule is explicit and tested.

## Out of Scope
- Migrating repo-root workspace config from `.claude/` into the reusable Codex package
- Copying live repo-root session history into the package by default
- Maintaining `.github/copilot-instructions.md` as the main Codex instruction path

## Related Documents
- [Claude AGENTS](../claude/AGENTS.md)
- [Claude CLAUDE](../claude/CLAUDE.md)
- [Claude package README](../claude/README.md)
- [Claude hooks README](../claude/.claude/hooks/README.md)
- [Codex setup instructions](codex-setup-instructions.md)
- [Codex sync script](../scripts/sync-to-codex.ps1)
- [Codex hooks docs](https://developers.openai.com/codex/hooks)
- [Codex AGENTS docs](https://developers.openai.com/codex/guides/agents-md)
- [Codex skills docs](https://developers.openai.com/codex/skills)
- [Codex subagents docs](https://developers.openai.com/codex/subagents)
