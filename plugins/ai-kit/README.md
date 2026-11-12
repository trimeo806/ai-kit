# ai-kit plugin

General software-development-lifecycle kit for **Claude Code** (source of truth) and **Codex** (same folder, `.codex-plugin/` manifest). It holds no project-specific rules: those live in each workspace as **project rules**, set up on first use.

## First run: project rules

1. Open Claude/Codex in your workspace (the folder above your repositories, or a single repo) and work as usual.
2. The first time the agent is about to change code in a project that has no rules, it pauses and asks you:
   - **Create the rules now** — it runs **`/ai-kit:setup-rules`** (Codex: the `setup-rules` skill) with you, then resumes the task;
   - **Continue without rules** — for this session only; it follows ai-kit defaults and says so in its report;
   - **Never ask for this project**.
3. The setup session detects each repository's stack and commands, interviews you about tracker, VCS, architecture, conventions and testing, then writes:

```
<workspace>/.ai-kit/workspace.json   # structured facts (tracker, vcs, docsDir, repos)
<workspace>/AGENTS.md                # workspace rules  (Codex reads natively)
<workspace>/CLAUDE.md                # @AGENTS.md       (Claude reads natively)
<workspace>/<repo>/AGENTS.md         # repository rules
<workspace>/<repo>/CLAUDE.md         # @AGENTS.md
```

4. Commit the rule files in each repo so the whole team shares them.

The **rules gate** (PreToolUse on edits) enforces that choice. Once rules exist, the first edit in a repository whose `AGENTS.md` is not loaded yet is denied once with the rules attached, then allowed — so the agent always reads a repo's rules before changing it.

Other opt-outs: `"gate": "off"` in `workspace.json`, a repo marked `"status": "skip"`, the plugin option `rules_gate`, or `AI_KIT_GATE=off`. "Never ask" lives in `~/.ai-kit/skip.json`; per-session choices in `~/.ai-kit/state/`.

Full contract: [references/project-rules-contract.md](references/project-rules-contract.md).

## Skills

| Skill | Use |
|---|---|
| `setup-rules` | Set up / update / check / skip project rules |
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
| SessionStart | `session-start.cjs` | Injects `rules/ai-kit-rules.md` and project-rules status (or the first-run setup prompt) |
| SubagentStart | `subagent-start.cjs` | Implementation rules, project rules pointer, role skill set |
| UserPromptSubmit | `rule-router.cjs` | Routes prompts to skills; workspace can add routes in `.ai-kit/routes.json` |
| PreToolUse (edits) | `rules-gate.cjs` | Project-rules gate (Claude `Edit/Write`, Codex `apply_patch`) |
| PreToolUse | `scout-block`, `privacy-block`, `destructive-guard` | Skip heavy dirs, protect secrets, confirm destructive git/rm |
| PostToolUse | `no-comments-guard.cjs` | Flags unrequested comments and plan IDs in code |
| Stop | `notifications/notify.cjs` | Optional Telegram/Discord/Slack notify (env-configured) |

Turn a hook off per workspace with `"hooks": { "<name>": false }` in `workspace.json`, or `AI_KIT_HOOKS_OFF=scout,privacy`. Custom scout patterns: `.ai-kit/scout-ignore`.

## Options (Claude plugin settings)

`inject_rules`, `rules_gate`, `no_comments_guard` — all default on.
