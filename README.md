# ai-kit

Plugin marketplace for Claude Code and Codex. One plugin, one folder:

```
.claude-plugin/marketplace.json   # Claude Code marketplace "ai-kit"
.agents/plugins/marketplace.json  # Codex marketplace "ai-kit"
plugins/ai-kit/                   # the plugin — Claude is the source of truth
  .claude-plugin/plugin.json
  .codex-plugin/plugin.json       # Codex satellite manifest: same skills/ and hooks/
```

Plugin docs: [plugins/ai-kit/README.md](plugins/ai-kit/README.md).

## Install — Claude Code

```bash
claude plugin marketplace add /path/to/ai-kit
```

```bash
claude plugin install ai-kit@ai-kit
```

From GitHub instead of a local path: `claude plugin marketplace add trimeo806/ai-kit`. Update later with `claude plugin marketplace update ai-kit`.

## Install — Codex

```bash
codex plugin marketplace add /path/to/ai-kit
```

Then enable it in `~/.codex/config.toml`:

```toml
[plugins."ai-kit@ai-kit"]
enabled = true
```

Codex treats plugin hooks as untrusted until you review them; approve them to turn on the rules gate.

## First use and rules

ai-kit asks about rules **once**, in your first session after installing it. Pick a scope and it interviews you and writes the rules, or pick "not now". Either way the answer is saved in `~/.ai-kit/onboarding.json` and ai-kit never asks again.

Later, create rules whenever you want them with `/ai-kit:create-rules` (Codex: ask for the `create-rules` skill):

| Command | Rules for | Written to |
|---|---|---|
| `/ai-kit:create-rules plugin` | you, in every project (plugin rules) | `~/.ai-kit/AGENTS.md` |
| `/ai-kit:create-rules workspace [path]` | a workspace / project and all its repos | `<root>/AGENTS.md`, `<root>/.ai-kit/workspace.json` |
| `/ai-kit:create-rules repo [path]` | one repository | `<repo>/AGENTS.md` |
| `/ai-kit:create-rules folder <path>` | one subfolder or module | `<dir>/AGENTS.md` |
| `/ai-kit:create-rules list` | show which rules apply here | — |

The more specific rule wins: folder → repo → workspace → plugin → ai-kit defaults. Details: [plugins/ai-kit/README.md](plugins/ai-kit/README.md#rules-asked-once-then-on-demand).

## Authoring

Edit only `plugins/ai-kit/`. Skills, hooks and references are shared by both tools; `agents/` is Claude-only. Hooks must accept both Claude (`Edit`/`Write`, `tool_input.file_path`) and Codex (`apply_patch`, patch text in `tool_input.command`) inputs. Bump `version` in both plugin manifests and in `.claude-plugin/marketplace.json` together.
