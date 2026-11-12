---
name: setup-rules
description: Set up, update, check or skip the project rules ai-kit needs before implementation — workspace rules at the top of the workspace plus per-repository rules (AGENTS.md, CLAUDE.md import, .ai-kit/workspace.json). Use on first use of ai-kit in a workspace, when the rules gate blocks an edit, when the user says "set up project rules", "init rules", "add rules for repo X", "update the rules", "our conventions changed", or "skip rules for this folder".
argument-hint: "[setup|update|check|skip] [repo-path]"
---

# setup-rules

Interactive session that writes the user's **project rules** so every later Claude or Codex session follows the workspace's own conventions. ai-kit itself only carries general SDLC rules; everything team- or codebase-specific goes here.

Contract (layout, `workspace.json` fields, precedence, how the gate loads rules): `${CLAUDE_PLUGIN_ROOT}/references/project-rules-contract.md`. Read it first.

Helper: `node "${CLAUDE_PLUGIN_ROOT}/scripts/rules.cjs" <status|detect|link-claude|skip|unskip> [dir]` and `<allow|disallow> <dir> --session <id>` (JSON output).
Templates: `${CLAUDE_PLUGIN_ROOT}/templates/project-rules/` (`workspace-AGENTS.md`, `repo-AGENTS.md`, `workspace.json`, `examples/`).

Asking questions: use AskUserQuestion when available (Claude); in Codex ask in plain chat, a few numbered questions at a time, each with your recommended answer.

## Modes

| Argument | Mode |
|---|---|
| none / `setup` | Full first-time setup (below). If rules already exist, switch to `update`. |
| `update [repo]` | Re-detect, show what changed vs the current rules, edit only the sections the user approves. Also adds a newly cloned repo. |
| `check` | Run `status`, report what exists, what is missing, which repos are `pending`/`skip`. No writes. |
| `skip [dir]` | The user never wants rules for this folder. Confirm once, run `rules.cjs skip <dir>`, tell them `rules.cjs unskip <dir>` or `/ai-kit:setup-rules` reverses it. |

## Entry point: create-rules

`ai-kit:create-rules` owns the first-run question (asked once per machine) and the scope choice (plugin, workspace, repo, folder). It hands workspace and repo scopes to this skill. When this skill is invoked directly and `rules.cjs onboarding` reports `onboarded: false`, run `rules.cjs onboarded created` after writing the rules so first run is not asked again.

From the first-run gate with "create rules now": if a workspace already exists, run `update <repo>` for that repo only; otherwise full setup, where the workspace root defaults to the project root (offer its parent if it holds sibling repos). Keep it short: confirm detected facts in one batch, ask only the gaps, write, verify. Then **resume the original task** — re-run the edit that was paused.

## Full setup

### 1. Find the workspace root
- Run `rules.cjs status`. The workspace root is the folder that holds all repositories the user works on together (often the cwd, sometimes its parent). Confirm it with the user if `repos` looks wrong or empty.
- Single repo → the repo root is the workspace root.

### 2. Survey every repository
- Run `rules.cjs detect <repo>` for each repo (in parallel when several). Read the `existingRules` files it lists (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.github/copilot-instructions.md`, `CONTRIBUTING.md`), the README, and the build file (`package.json` scripts, `Makefile`, `pom.xml`, …) to draft commands and conventions.
- Many repos (more than ~4): survey them with parallel subagents (Claude: `ai-kit:researcher`; Codex: a subagent briefed with `${CLAUDE_PLUGIN_ROOT}/agents/researcher.md`), each returning stack, commands, architecture notes and observed conventions in compressed form.
- Prefer facts found in the repo over guesses. Mark every guess as `<!-- confirm -->` in your draft notes (not in the final files) and ask about it.

### 3. Interview the user (workspace level)
Ask only what detection did not answer, recommend an answer for each:
1. Workspace name and one-line purpose; which repos are in scope, which to `skip`.
2. Tracker: type, key pattern, how the agent reaches it (MCP server, CLI, or manual paste).
3. VCS host and CLI, default branch, branch naming, commit convention, PR rules (reviewers, template, merge strategy).
4. Work-docs folder (`docsDir`, default `docs`).
5. Cross-repo architecture: how repos talk, who owns which domain, shared contracts.
6. Security: secrets handling, environments never to touch, data rules.
7. Hard workspace-wide Do / Don't.

### 4. Interview per repository
For each in-scope repo, show the detected stack and commands and ask the user to confirm or correct: test (all + single), lint, typecheck/build, run locally; architecture/layers; conventions (naming, folders, error handling, UI library and tokens, API and persistence patterns); testing rules; repo-specific Do / Don't. Offer `templates/project-rules/examples/` content as a starting point when the user has no written conventions. Keep a repo session short: confirm detected facts in one batch, then ask only the gaps.

### 5. Write the files
Show the user a summary of files to create/change and wait for approval, then:
- `<root>/.ai-kit/workspace.json` from the template (all repos listed with `status`: `ready`, `pending` if its rules are not written yet, `skip`).
- `<root>/AGENTS.md` from `workspace-AGENTS.md`; `<repo>/AGENTS.md` from `repo-AGENTS.md` for each `ready` repo. Fill real content, drop sections that do not apply, keep each file well under 32 KB (Codex limit) — link to longer docs instead of pasting them.
- `rules.cjs link-claude <dir>` for the root and every repo, so `CLAUDE.md` imports `@AGENTS.md`.
- Existing files:
  - existing `AGENTS.md` → merge, never overwrite; show the diff first;
  - existing `CLAUDE.md` with real content → ask whether to move that content into `AGENTS.md` (shared by Claude and Codex, recommended) or keep it as Claude-only notes below the import line.
- Never put secrets, tokens or personal data in rule files.
- In a monorepo, offer module-level `AGENTS.md` files (e.g. `apps/web/AGENTS.md`) for modules with different stacks.

### 6. Verify and hand over
- Run `rules.cjs status` again and show the result.
- Tell the user: rule files live in their repos (commit them so the team shares them); the rules gate now injects each repo's rules on the first edit there; `/ai-kit:create-rules` adds rules for another repo, a subfolder or plugin-wide later, `/ai-kit:setup-rules update` re-syncs workspace rules.
- Do not commit unless the user asks.

## Update mode
- Load current `workspace.json` and rule files, re-run `detect`, and list concrete drifts (new scripts, renamed commands, new repos, repos removed).
- Propose edits per section; apply only approved ones. Bump nothing else.
- A repo marked `pending` → run steps 2, 4 and 5 for it.
