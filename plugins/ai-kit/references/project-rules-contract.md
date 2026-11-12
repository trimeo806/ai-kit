# Project rules contract

ai-kit carries only general software-development-lifecycle rules. Everything specific to a team, product or codebase lives in **project rules** inside the user's workspace. Every skill and agent reads project facts from here instead of assuming them.

## Precedence

1. The user's instruction in the current turn.
2. Project rules: the nearest `AGENTS.md` wins over a farther one (folder over repo over workspace).
3. Plugin-wide personal rules: `~/.ai-kit/AGENTS.md` (this user, every project).
4. ai-kit general rules (`rules/ai-kit-rules.md`).

## Scopes and first run

`ai-kit:create-rules` writes rules at four scopes: **plugin** (`~/.ai-kit/AGENTS.md`), **workspace** (`<root>/AGENTS.md` + `.ai-kit/workspace.json`), **repo** (`<repo>/AGENTS.md`), **folder** (`<dir>/AGENTS.md`). Workspace and repo setup runs through `ai-kit:setup-rules`.

ai-kit asks about rules **once per machine**. Until `~/.ai-kit/onboarding.json` exists, the SessionStart hook tells the agent to run `create-rules` in first-run mode, and the rules gate pauses the first edit in a project without rules to ask the same question. Either answer ("create now" or "not now") is recorded with `rules.cjs onboarded <created|later>`; from then on nothing prompts for rules and the user runs `/ai-kit:create-rules` when they want them. `rules.cjs reset-onboarding` re-arms the question.

## Layout

```
<workspace-root>/
├── .ai-kit/
│   └── workspace.json        # structured facts skills and hooks read
├── AGENTS.md                 # workspace rules (Codex loads it natively)
├── CLAUDE.md                 # contains the line `@AGENTS.md` (Claude loads it natively)
├── <repo-a>/
│   ├── AGENTS.md             # repo rules, override workspace rules
│   └── CLAUDE.md             # `@AGENTS.md`
└── <repo-b>/ ...
```

- Single-repo workspace: the repo root is the workspace root; `repos` has one entry with `"path": "."`.
- `AGENTS.md` is the single source of truth for rule text. `CLAUDE.md` only imports it, so Claude and Codex read the same rules.
- Deeper `AGENTS.md` files (e.g. `<repo>/apps/web/AGENTS.md`) are allowed for module-level rules.

## `.ai-kit/workspace.json`

```json
{
  "version": 1,
  "name": "acme-platform",
  "gate": "on",
  "docsDir": "docs",
  "tracker": {
    "type": "jira",
    "keyPattern": "[A-Z][A-Z0-9]+-\\d+",
    "baseUrl": "https://acme.atlassian.net",
    "access": "Atlassian MCP"
  },
  "vcs": {
    "host": "github",
    "cli": "gh",
    "defaultBranch": "main",
    "branchPattern": "feat/<KEY>-<slug>"
  },
  "repos": [
    { "path": "services/api", "name": "api", "stack": ["java", "quarkus", "postgres"], "status": "ready" },
    { "path": "apps/web", "name": "web", "stack": ["typescript", "nextjs"], "status": "ready" },
    { "path": "legacy/batch", "name": "batch", "stack": ["java"], "status": "skip" }
  ]
}
```

| Field | Meaning |
|---|---|
| `gate` | `on` (default) loads each folder's `AGENTS.md` chain before the first edit there (and asks the first-run question before onboarding); `off` disables the gate for this workspace. |
| `docsDir` | Root folder for work artifacts (default `docs`). |
| `tracker.type` | `jira` · `github` · `gitlab` · `linear` · `azure-devops` · `none`. |
| `tracker.keyPattern` | Regex for ticket keys, used to find the ticket in a request or branch name. |
| `tracker.access` | How to read/write tickets: an MCP server name, a CLI (`gh`, `glab`, `az`), or `manual` (ask the user to paste). |
| `vcs.host` | `github` · `gitlab` · `bitbucket` · `azure-devops` · `other`. |
| `vcs.cli` | CLI used for PRs: `gh`, `glab`, `az`, `none` (REST/manual). |
| `vcs.branchPattern` | Branch naming; `<KEY>` and `<slug>` are placeholders. |
| `repos[].status` | `ready` (has rules) · `pending` (setup not finished) · `skip` (no rules wanted; gate lets edits through). |

Missing field → the skill asks the user once, then offers to save the answer with `ai-kit:create-rules` (or `ai-kit:setup-rules update`).

## Rule file sections (`AGENTS.md`)

Workspace and repo rule files use the same headings; leave out sections that do not apply.

1. **Overview** — what the workspace/repo is, who owns it.
2. **Stack** — languages, frameworks, versions, package manager.
3. **Commands** — install, build, run, test (all + single test), lint, format, typecheck.
4. **Architecture & boundaries** — modules, layers, what may import what, API contracts.
5. **Conventions** — naming, folder structure, error handling, logging, UI library and design tokens.
6. **Testing** — frameworks, where tests live, required coverage, test data rules.
7. **Git & PR** — branch naming, commit style, PR template, reviewers, merge strategy.
8. **Tracker** — ticket workflow, definition of ready/done.
9. **Security & data** — secrets handling, PII, environments that must never be touched.
10. **Do / Don't** — short hard rules.

## How rules are loaded

- Claude loads `CLAUDE.md` (and through it `AGENTS.md`) from the cwd ancestry at start and from subfolders when it reads files there. Codex loads `AGENTS.md` from the git root down to the cwd.
- The ai-kit **rules gate** (PreToolUse on Edit/Write/apply_patch) closes the gap: the first edit in a folder whose rule files are not loaded yet is denied once, with the rule text in the denial reason. Retry the edit after reading it.
- First run only (no `~/.ai-kit/onboarding.json`): a project (git repo) without rules has its first edit paused and the agent asks the user once:
  1. **Create rules now** — run `ai-kit:create-rules` (scope question, then the interview), then resume the original task.
  2. **Not now** — `rules.cjs onboarded later`, continue with ai-kit defaults.
- After first run, a project without rules is never paused; existing `AGENTS.md` files are still loaded by the gate.
- Per-project opt-outs still work: `rules.cjs allow <project> --session <id>` (state in `~/.ai-kit/state/`, pruned after 7 days) and `rules.cjs skip <project>` (stored in `~/.ai-kit/skip.json`; `unskip` reverses it).
- Edits to `AGENTS.md`, `CLAUDE.md` and `.ai-kit/**` always pass so setup can run.
- Other opt-outs: `"gate": "off"` in `workspace.json`, `"status": "skip"` for one repo, the plugin option `rules_gate = false`, or env `AI_KIT_GATE=off`.

## For skill and agent authors

- Never hard-code a tracker, VCS host, UI library, language or folder convention. Read `.ai-kit/workspace.json` and the loaded `AGENTS.md` sections.
- Write work artifacts under `<docsDir>/<TICKET-KEY>/` or `<docsDir>/<intention-name>/` at the workspace root.
- When a needed fact is missing, ask once and suggest saving it to project rules.
