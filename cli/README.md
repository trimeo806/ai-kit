# devagent-kit

Installable CLI for the multi-agent **ai-kit** — bootstraps Claude Code, Codex, OpenCode, and Antigravity agent/skill packs into any project.

## Quick start

```bash
# default: install Claude pack into ./.claude + AGENTS.md + WORKFLOW.md
npx devagent-kit install

# multi-target
npx devagent-kit install codex opencode

# everything
npx devagent-kit install all
```

The shorter `agentkit` alias works too:

```bash
npx -p devagent-kit agentkit install codex
```

## Install globally without publishing

```bash
# from a local checkout
git clone https://github.com/trimeo806/ai-kit.git
cd ai-kit/cli
npm install && npm run build
npm install -g .

# or distribute a tarball
npm pack            # produces devagent-kit-<version>.tgz
npm install -g ./devagent-kit-0.2.0.tgz   # on consumer machine
```

After global install, `devagent-kit` and `agentkit` are on `PATH`.

## Commands

| Command | What it does |
|---|---|
| `devagent-kit install [targets...]` | Fetch latest kit from GitHub and install selected targets into the current directory. Default target: `claude`. |
| `devagent-kit update [targets...]` | Re-fetch and reapply installed targets, preserving user files. |
| `devagent-kit uninstall [targets...]` | Remove kit-owned files for the given targets. Strips sentinel-merged blocks from `AGENTS.md`. |
| `devagent-kit list` (alias `status`) | Show installed targets, pinned commit SHA, and drift from the source. |

### Targets

- `claude` — `./.claude/`, `AGENTS.md`, `WORKFLOW.md`
- `codex` — `./.codex/`, `./.agents/`, `AGENTS.md`, `WORKFLOW.md`, `./.kit-data/improvements/`
- `opencode` — `./.opencode/`, `opencode.json`
- `antigravity` — `./.agents/`
- `all` — every target above

### Common flags

- `--ref <git-ref>` — branch / tag / commit to fetch (default: `master`, falls back to `main`)
- `--repo <slug>` — GitHub repo slug to fetch from (default: `trimeo806/ai-kit`)
- `--dry-run` — print the plan without writing anything
- `-y, --yes` / `--force` — overwrite all conflicts without prompting

## Conflict handling

When a destination file already exists and is not part of a merge rule, the CLI prompts per-file:

```
[claude] .claude/agents/code-reviewer.md exists.
  (y) overwrite  (n) skip  (b) backup → .bak  (a) all overwrite  (s) skip all
```

In non-TTY environments (CI), use `--yes` to overwrite or the command aborts.

## Merge rules

Some files are merged rather than overwritten:

- `AGENTS.md` — sentinel block (`<!-- ai-kit:begin --> … <!-- ai-kit:end -->`) replaced in place
- `.codex/config.toml` — `[features].codex_hooks = true` enforced; everything else preserved
- `.codex/hooks.json` — array entries deduped by `matcher | command1;command2` signature
- `opencode.json` — deep object merge (existing scalars win; missing keys from each side added)
- `.claude/settings.json` — deep object merge

## Lockfile

`./.ai-kit.lock` records the installed targets, the resolved commit SHA, and the kit-owned file list. It is the source of truth for `update`, `uninstall`, and `list`.
