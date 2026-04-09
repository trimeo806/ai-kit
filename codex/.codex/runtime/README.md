# tri-ai-kit Codex Runtime

This directory contains the compatibility runtime required to preserve tri-ai-kit behavior that Codex does not expose natively.

## Native Codex coverage
- `.codex/hooks.json` contains native hook registrations for `SessionStart`, `UserPromptSubmit`, `Stop`, and the Bash-supported subset of `PreToolUse`.
- `.codex/config.toml` enables hooks support via `codex_hooks = true`.

## Compatibility runtime coverage
- `SubagentStart` and `SubagentStop` parity is tracked here because Codex does not currently expose those lifecycle events natively.
- Non-Bash `PreToolUse` and `PostToolUse` parity is tracked here because the current Codex runtime only emits `Bash` for those events.
- `statusline-command.sh` is preserved here for tri-ai-kit runtime parity work; Codex does not currently expose Claude's status-line hook surface.

## Windows
- Native Codex hook support on Windows is currently unavailable.
- Use WSL2 or another supported POSIX layer when validating full hook parity.

## Files
- `parity-manifest.json` records the native-vs-runtime mapping for every Claude hook entry.
- `assets/` contains shared tri-ai-kit runtime assets used by improvement and runtime workflows.
