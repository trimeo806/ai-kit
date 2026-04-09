# P3 - Hooks, memory, and runtime parity

## Purpose
Port the Claude runtime behavior model into a Codex-compatible package layer, including hooks, persistent memory, and improvement tracking.

## Table of Contents
- [Purpose](#purpose)
- [Agent & Skills](#agent--skills)
- [Inputs](#inputs)
- [Coverage](#coverage)
- [Tasks](#tasks)
- [Validation](#validation)
- [Exit Criteria](#exit-criteria)
- [Related Documents](#related-documents)

## Agent & Skills
- **Agent**: `developer`
- **Skills**: `core`, `knowledge-capture`, `knowledge-retrieval`, `skill-discovery`
- **Handoffs**:
  - After completion -> `code-reviewer`
  - If runtime behavior depends on environment wiring -> `devops-engineer`

## Inputs
- `claude/.claude/hooks/`
- `claude/.claude/settings.json`
- `claude/.claude/agent-memory/`
- `claude/.claude/output-styles/`
- `claude/.claude/.tri-ai-kit.json`
- `claude/.claude/.tri-ignore`

## Coverage
- Hook runtime:
  - `session-init`
  - `context-reminder`
  - `subagent-init`
  - `subagent-stop-reminder`
  - `scout-block`
  - `privacy-block`
  - `build-gate-hook`
  - `post-index-reminder`
  - `session-metrics`
  - `lesson-capture`
  - notifications
- Native Codex hook layer:
  - `codex/.codex/hooks.json`
  - `codex/.codex/config.toml`
- Compatibility runtime:
  - `codex/.codex/runtime/**`
  - launcher or wrapper logic needed to preserve Claude-only lifecycle semantics
- Persistent memory:
  - `agent-memory/**`
  - indexing files such as `MEMORY.md`
  - project memory notes
- Improvement store:
  - `.kit-data/improvements/current-session.json`
  - `.kit-data/improvements/sessions.jsonl`
  - rotation, cleanup, and retention behavior
- Runtime config:
  - `config.toml`
  - `.tri-ai-kit.json`
  - `.tri-ignore`
  - `output-styles/**`

## Tasks
- Build a hook mapping table with one row per Claude hook:
  - native Codex event and command, if available
  - compatibility runtime trigger, if native Codex cannot express it
  - persistence side effects and file writes
- Generate `codex/.codex/hooks.json` from Claude hook registration in `claude/.claude/settings.json`.
- Reserve `codex/.codex/config.toml` for Codex feature/config settings only:
  - enable hooks support
  - carry project-doc and runtime defaults
  - carry any package-level sandbox defaults needed by generated agents
- Port the hook code into `codex/.codex/hooks/` where parity is possible.
- Build the tri-ai-kit compatibility runtime in `codex/.codex/runtime/` for behaviors that require extra lifecycle control, including:
  - `SubagentStart` / `SubagentStop`
  - non-Bash `PreToolUse` and `PostToolUse`
  - notification routing beyond native Codex coverage
  - status-line or reminder behavior that cannot be represented natively
- Standardize the execution environment for parity validation:
  - Linux/macOS native Codex runtime
  - Windows via WSL2 or equivalent supported POSIX layer until official Windows hook support exists
- Port the agent-memory layout into `codex/.codex/agent-memory/`, including memory index files and project memory notes.
- Port the improvement-store contract into `codex/.kit-data/improvements/`.
- Decide whether historical memory and improvement data are copied, seeded with templates, or initialized empty on install.
- Reconcile runtime config and support files into `codex/.codex/`:
  - `config.toml`
  - `.tri-ai-kit.json`
  - `.tri-ignore`
  - `output-styles/**`
- Remove stale path assumptions that still point at repo-root `.claude/` or Copilot `.github/` targets.

## Validation
- Every Claude hook has an explicit parity path:
  - native Codex hook
  - compatibility runtime trigger
- No Claude hook is left as permanently unsupported.
- `.codex/hooks.json` contains the generated hook registrations.
- `.codex/config.toml` contains feature/config entries only and does not duplicate hook definitions.
- Both memory channels are covered:
  - `agent-memory`
  - `.kit-data/improvements`
- No generated runtime config points at dead Claude-only paths.
- Status-line, notification, and metrics behavior are either implemented natively or covered by the compatibility runtime.
- Windows parity validation is defined through the standardized runtime path instead of assuming native Windows hooks.

## Exit Criteria
- Codex package runtime support is defined without hidden dependencies on repo-root `.claude/`.
- Memory mechanism coverage includes both persistent notes and session-improvement storage.
- Full hook parity is specified as implementation work, not as deferred unsupported behavior.
- The package has an explicit Windows execution story for parity.

## Related Documents
- [Claude hooks](../claude/.claude/hooks/)
- [Claude agent memory](../claude/.claude/agent-memory/)
- [Claude settings](../claude/.claude/settings.json)
- [Claude package config](../claude/.claude/.tri-ai-kit.json)
- [Codex hooks docs](https://developers.openai.com/codex/hooks)
