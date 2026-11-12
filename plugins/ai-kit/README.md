# ai-kit plugin

General software-development-lifecycle kit for **Claude Code** (source of truth) and **Codex** (same folder, `.codex-plugin/` manifest). It holds no project-specific rules: those live in each workspace as **project rules**, asked about once on first use, then created on demand with `/ai-kit:create-rules`.

## Rules: asked once, then on demand

ai-kit carries general SDLC rules only. Your own rules live at one of four **scopes**:

| Scope | File | Applies to | Shared? |
|---|---|---|---|
| **plugin** | `~/.ai-kit/AGENTS.md` | every project you open with ai-kit | no, personal |
| **workspace** | `<workspace>/AGENTS.md` + `.ai-kit/workspace.json` | all repositories under the workspace | yes, commit it |
| **repo** | `<repo>/AGENTS.md` | one repository | yes, commit it |
| **folder** | `<dir>/AGENTS.md` | one subfolder or module | yes, commit it |

Each `AGENTS.md` in a workspace, repo or folder gets a `CLAUDE.md` holding `@AGENTS.md`, so Claude and Codex read the same text. The more specific rule wins: **your current instruction → folder → repo → workspace → plugin → ai-kit defaults**.

### First run (asked once per machine)

1. Install ai-kit and open a session anywhere.
2. In that first session, ai-kit asks once: **create rules now?** If the agent starts editing code before it asks, the rules gate pauses the edit and asks the same question.
   - **Yes** — `create-rules` asks *where* the rules apply (plugin-wide, this workspace, one repository, a subfolder; several at once is fine). It detects the stack and commands, interviews you, shows the files and writes them after you approve. Workspace and repository setup runs through `setup-rules`.
   - **Not now** — ai-kit works with its defaults.
3. Either answer is saved in `~/.ai-kit/onboarding.json`. **ai-kit never asks about rules again.**

### Later: create rules when you want them

```
/ai-kit:create-rules                     # asks the scope
/ai-kit:create-rules plugin              # personal rules for every project
/ai-kit:create-rules workspace [path]    # workspace / project rules
/ai-kit:create-rules repo services/api   # one repository
/ai-kit:create-rules folder apps/web     # one subfolder or module
/ai-kit:create-rules list                # which rules apply here
/ai-kit:setup-rules update               # re-sync workspace rules after the code changed
```

Plain requests work too: "create rules for this repo", "add folder rules for apps/web", "set my personal rules". Codex: ask for the `create-rules` skill.

To get the first-run question again: `node <plugin>/scripts/rules.cjs reset-onboarding`.

### What a workspace setup writes

```
<workspace>/.ai-kit/workspace.json   # structured facts (tracker, vcs, docsDir, repos)
<workspace>/AGENTS.md                # workspace rules  (Codex reads natively)
<workspace>/CLAUDE.md                # @AGENTS.md       (Claude reads natively)
<workspace>/<repo>/AGENTS.md         # repository rules
<workspace>/<repo>/apps/web/AGENTS.md  # folder rules (optional)
```

Commit the rule files in each repo so the whole team shares them.

### Rules gate

The **rules gate** (PreToolUse on edits) makes sure the agent reads rules before changing code: the first edit in a folder whose `AGENTS.md` chain is not loaded yet is denied once with the rules attached, then allowed. Before first run it also pauses the first edit in a project without rules to ask the first-run question. After first run, a project without rules is never paused.

Opt-outs: `"gate": "off"` in `workspace.json`, a repo marked `"status": "skip"`, the plugin option `rules_gate`, or `AI_KIT_GATE=off`.

Full contract: [references/project-rules-contract.md](references/project-rules-contract.md).

## Skills

| Skill | Use |
|---|---|
| `create-rules` | Create rules at a scope you choose: plugin-wide, workspace, repository, subfolder; first-run question |
| `setup-rules` | Workspace and repository rules: detect, interview, update, check, skip |
| `story` | End-to-end: ticket → plan → implement → test → review → PR |
| `ticket` | Read or draft a ticket on the tracker from `workspace.json` |
| `brainstormer` | Grill acceptance criteria or an approach; decision log |
| `plan` | Spec, design, tasks for a ticket or feature |
| `tdd-dev-workflow` | Implement planned tasks test-first |
| `test` | Unit / e2e tests and reports |
| `debug` | Root-cause debugging |
| `review` | Local diff, PR, security, story-compliance reviews |
| `docs` | Project docs: init, update, component |
| `solution-doc` | Solution write-up and PR body |
| `pr-submit` · `pr-evidence` · `pr-comment` | Open a PR/MR on GitHub, GitLab, Bitbucket or Azure DevOps; attach evidence; post review comments |
| `less-words-more-arrows` | Diagrams instead of prose for flows |
| `infra-docker` · `infra-cloud` | Containers, cloud deployment, IaC |

## Role agents (Claude)

`researcher`, `planner`, `brainstormer`, `backend-architect`, `frontend-architect`, `developer`, `tester`, `debugger`, `code-reviewer`, `secure-code-review`, `security-auditor`, `devops-engineer`, `docs-manager`. Each gets its skill set and the project rules at start. Codex has no plugin agents; skills brief a generic subagent with `agents/<role>.md` instead.

## Hooks

| Event | Hook | Does |
|---|---|---|
| SessionStart | `session-start.cjs` | Injects `rules/ai-kit-rules.md`, your plugin rules (`~/.ai-kit/AGENTS.md`), project-rules status, and the first-run question until it was answered once |
| SubagentStart | `subagent-start.cjs` | Implementation rules, plugin rules, project rules pointer, role skill set |
| UserPromptSubmit | `rule-router.cjs` | Routes prompts to skills; workspace can add routes in `.ai-kit/routes.json` |
| PreToolUse (edits) | `rules-gate.cjs` | Loads `AGENTS.md` rules before the first edit in a folder; first-run question (Claude `Edit/Write`, Codex `apply_patch`) |
| PreToolUse | `scout-block`, `privacy-block`, `destructive-guard` | Skip heavy dirs, protect secrets, confirm destructive git/rm |
| PostToolUse | `no-comments-guard.cjs` | Flags unrequested comments and plan IDs in code |
| Stop | `notifications/notify.cjs` | Optional Telegram/Discord/Slack notify (env-configured) |

Turn a hook off per workspace with `"hooks": { "<name>": false }` in `workspace.json`, or `AI_KIT_HOOKS_OFF=scout,privacy`. Custom scout patterns: `.ai-kit/scout-ignore`.

## Options (Claude plugin settings)

`inject_rules`, `rules_gate`, `no_comments_guard` — all default on.
