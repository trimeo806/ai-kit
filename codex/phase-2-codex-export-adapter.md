# P2 - Codex package generator

## Purpose
Implement the one-way generator from `claude/` into the `codex/` package contract.

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
- **Agent**: `developer`
- **Skills**: `core`, `code-documenter`, `tri-ai-kit`, `skill-discovery`
- **Handoffs**:
  - After completion -> `code-reviewer`
  - After review fixes -> `tester`

## Inputs
- `scripts/sync-to-codex.ps1`
- `scripts/sync-config.json`
- `claude/CLAUDE.md`
- `claude/AGENTS.md`
- `claude/WORKFLOW.md`
- `claude/.claude/agents/`
- `claude/.claude/skills/`

## Deliverables
- `codex/AGENTS.md`
- `codex/WORKFLOW.md`
- `codex/.codex/agents/*.toml`
- `codex/.agents/skills/<skill>/SKILL.md`
- `codex/.agents/skills/<skill>/references/**`
- `codex/.agents/skills/<skill>/**` auxiliary files used by the skill
- `codex/.agents/skills/skill-index.json`
- updated generator rules in `scripts/sync-to-codex.ps1` and `scripts/sync-config.json`

## Tasks
- Change the generator source paths from repo-root `.claude/` assumptions to `claude/.claude/` and `claude/*.md`.
- Generate `codex/AGENTS.md` from the defined merge rule instead of emitting `codex/.github/copilot-instructions.md` as the main instruction file.
- Generate `codex/WORKFLOW.md` from `claude/WORKFLOW.md` with Codex-appropriate path updates.
- Transform Claude agent markdown into Codex custom-agent definitions under `codex/.codex/agents/`.
- Implement the explicit Claude-agent-to-Codex-agent mapping:
  - `name` -> `name`
  - `description` -> `description`
  - markdown body -> `developer_instructions`
  - `skills` -> explicit `skills.config` entries that point at packaged skill paths
  - `model` -> checked-in model translation table
  - `permissionMode` -> checked-in sandbox/approval translation table
  - `handoffs` -> serialized handoff appendix inside `developer_instructions`
  - `memory` -> adapter note plus package memory path references
  - `tools` -> preserved as instruction text where no native Codex field exists
- Export full skill directories into `codex/.agents/skills/`, including:
  - `SKILL.md`
  - `references/**`
  - auxiliary files inside each skill directory
- Copy or regenerate `skill-index.json` into `codex/.agents/skills/skill-index.json`, but label it as tri-ai-kit internal metadata only.
- Make the generator idempotent:
  - clear only generated Codex package paths
  - never mutate `claude/`
  - avoid manual post-sync patching
- Update transform rules so path rewrites target:
  - `codex/.codex/agents/...`
  - `codex/.agents/skills/...`
  - `codex/AGENTS.md`
- Remove or demote any legacy Copilot-specific output paths from the primary Codex package flow.

## Validation
- Agent count in `codex/.codex/agents/` matches the source agent count in `claude/.claude/agents/`.
- Every generated agent file contains the required Codex fields:
  - `name`
  - `description`
  - `developer_instructions`
- Every source `skills:` list becomes explicit `skills.config` bindings in the generated custom agent.
- Any source model or permission value without a configured mapping fails generation.
- Skill directory count in `codex/.agents/skills/` matches the source skill count in `claude/.claude/skills/`.
- For every migrated skill with `references/`, the target skill directory also contains `references/`.
- `skill-index.json` is present only as tri-ai-kit support metadata and is not described as a Codex requirement.
- `codex/AGENTS.md` contains no stale install guidance that points at repo-root `.github/` as the primary Codex output.
- No transformed file contains stale source paths unless they are explicitly documented as source references.

## Exit Criteria
- The generator can rebuild the whole Codex package from `claude/` without manual edits.
- Full skill packaging is handled, not just `SKILL.md`.
- Generated custom agents are explicit enough to run without guessing model, skill, or permission semantics.
- `codex/AGENTS.md` and `codex/WORKFLOW.md` are part of the generated output contract.

## Related Documents
- [Sync script](../scripts/sync-to-codex.ps1)
- [Sync config](../scripts/sync-config.json)
- [Claude CLAUDE](../claude/CLAUDE.md)
- [Claude AGENTS](../claude/AGENTS.md)
- [Codex setup instructions](codex-setup-instructions.md)
- [Codex AGENTS docs](https://developers.openai.com/codex/guides/agents-md)
- [Codex skills docs](https://developers.openai.com/codex/skills)
- [Codex subagents docs](https://developers.openai.com/codex/subagents)
