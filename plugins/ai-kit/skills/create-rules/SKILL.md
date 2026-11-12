---
name: create-rules
description: Create the rules ai-kit follows and choose their scope — plugin-wide personal rules (every project), a workspace/project, one repository, or one subfolder/module. Runs once automatically on the first use of ai-kit on a machine (first-run mode, asked a single time), then only when the user asks. Use for "create rules", "set my rules", "add rules for this repo / folder / module", "rules for every project", "plugin rules", "personal rules", "where should this rule live", or when the session-start hook or rules gate says first run.
argument-hint: "[first-run|plugin|workspace|repo|folder|list] [path]"
---

# create-rules

Asks the user what rules they want and **where they apply**, then writes them at that scope. ai-kit asks about rules **once** — the first time the plugin is used on this machine. After that it never prompts again; the user runs `/ai-kit:create-rules` when they want rules for a project, repository or folder.

Helper: `node "${CLAUDE_PLUGIN_ROOT}/scripts/rules.cjs" <status|detect|link-claude|onboarding|onboarded|reset-onboarding> [arg]` (JSON output).
Templates: `${CLAUDE_PLUGIN_ROOT}/templates/project-rules/` (`plugin-AGENTS.md`, `workspace-AGENTS.md`, `repo-AGENTS.md`, `folder-AGENTS.md`, `workspace.json`, `examples/`).
Workspace/repository contract: `${CLAUDE_PLUGIN_ROOT}/references/project-rules-contract.md`.

Asking questions: AskUserQuestion when available (Claude); in Codex ask in plain chat, numbered options, recommended one first.

## Scopes

| Scope | File written | Applies to | Loaded by |
|---|---|---|---|
| `plugin` | `~/.ai-kit/AGENTS.md` | every project where ai-kit runs, this user only | ai-kit SessionStart and SubagentStart hooks |
| `workspace` | `<root>/AGENTS.md` + `CLAUDE.md` (`@AGENTS.md`) + `<root>/.ai-kit/workspace.json` | all repositories under the workspace root | Claude/Codex natively, rules gate |
| `repo` | `<repo>/AGENTS.md` + `CLAUDE.md` | one repository | Claude/Codex natively, rules gate |
| `folder` | `<dir>/AGENTS.md` + `CLAUDE.md` | one subfolder or module and everything below it | Claude when it reads files there, rules gate inside a workspace |

Precedence (most specific wins): the user's current instruction → folder → repo → workspace → plugin → ai-kit general rules. Tell the user this when they pick a scope, so they know what overrides what.

## Modes

| Argument | Mode |
|---|---|
| `first-run` (or invoked by the first-run hook / gate) | First-run question, below. |
| none | Ask the scope question (step 1 of the create flow), then run it. |
| `plugin` · `workspace [path]` · `repo [path]` · `folder <path>` | Skip the scope question; create or update rules at that scope. |
| `list` | Run `rules.cjs status` from the cwd, show every rule file that applies here in precedence order, and whether first run is done. No writes. |

## First-run mode (asked once)

1. Run `rules.cjs onboarding`. `onboarded: true` → do not ask; continue the user's task (or the mode they asked for).
2. Run `rules.cjs status` for the cwd to know what exists: plugin rules, a workspace, repos with or without `AGENTS.md`.
3. Ask one question, "ai-kit can follow your own rules. Create them now?", options:
   - **Yes, set up rules now (Recommended)** → create flow, step 1.
   - **Not now** → step 5.
   Say in the question that it is asked only once and `/ai-kit:create-rules` works any time later.
4. After the create flow writes at least one scope, run `rules.cjs onboarded created`.
5. Not now → run `rules.cjs onboarded later`, tell the user in one line how to create rules later (`/ai-kit:create-rules`, or `/ai-kit:create-rules repo <path>` / `folder <path>` / `plugin`), and resume what they asked for with ai-kit defaults.

Always record the answer — also when the user cancels the flow half-way — so the question never comes back. `rules.cjs reset-onboarding` re-arms it if the user wants the first-run question again.

## Create flow

### 1. Pick the scope
Ask "Where should these rules apply?" (multiSelect — several scopes in one session is fine):
- **This workspace / project** — `<detected root>` (show repo count). Recommended when the cwd holds several repositories or has no rules yet.
- **One repository** — show the detected git root, or list child repos to pick from.
- **A subfolder / module** — ask for the path (e.g. `apps/web`, `services/billing/api`).
- **Plugin-wide (all my projects)** — personal habits that hold everywhere: reply language, commit style, review strictness, tools to prefer or avoid.

When the user is unsure: team conventions belong in workspace/repo/folder rules (committed, shared with the team); personal preferences belong in plugin-wide rules (private, on this machine).

### 2. Collect the rules
Work per chosen scope, broadest first.

- **plugin** — ask, with a recommended answer each: reply language and tone; workflow habits; testing expectations; commit style; tools to prefer or avoid; always / never rules. Start from `plugin-AGENTS.md`. If `~/.ai-kit/AGENTS.md` exists, show it and edit only what the user changes.
- **workspace** or **repo** — follow `ai-kit:setup-rules` (full setup or `update <repo>`): it detects stacks and commands, interviews the user about tracker, VCS, architecture, conventions and testing, and writes `workspace.json`, `AGENTS.md` and the `CLAUDE.md` import. Do not duplicate that interview here; hand over, then continue with the remaining scopes.
- **folder** — run `rules.cjs detect <dir>` when the folder has its own build file; read its README and a few representative files. Ask only what differs from the parent rules (stack, commands, layering, naming, UI library, testing, Do/Don't). Start from `folder-AGENTS.md`; drop sections that only repeat the parent.

Prefer facts found in the code over guesses; ask about every guess. Never put secrets, tokens or personal data in rule files.

### 3. Confirm, then write
Show the files to create or change (path, scope, one-line summary each) and wait for approval. Then:
- existing `AGENTS.md` → merge, never overwrite; show the diff first;
- `rules.cjs link-claude <dir>` for every workspace, repo and folder `AGENTS.md`, so Claude imports it (`plugin` scope needs no import — the hooks inject it);
- a `folder` inside a workspace needs nothing else — the rules gate loads every `AGENTS.md` between the workspace root and the edited file;
- a `repo` inside a workspace: add or update its entry in `workspace.json` (`status: ready`);
- keep each file well under 32 KB; link to longer docs instead of pasting them.

### 4. Hand over
- Run `rules.cjs status` (or `list` mode) and show which rule files now apply here, in precedence order.
- Tell the user: workspace/repo/folder rule files live in their repos — commit them to share with the team; plugin-wide rules stay private in `~/.ai-kit/AGENTS.md`; `/ai-kit:create-rules <scope> <path>` adds or changes rules later.
- In first-run mode, run `rules.cjs onboarded created`, then resume the task the user started with.
- Do not commit unless the user asks.
