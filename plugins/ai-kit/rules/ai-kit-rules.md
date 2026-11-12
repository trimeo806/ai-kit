# ai-kit rules

General software-development-lifecycle rules. Project rules (`AGENTS.md` chain + `.ai-kit/workspace.json`) override these; the user's current instruction overrides both. Contract: `${CLAUDE_PLUGIN_ROOT}/references/project-rules-contract.md`.

## Project rules first
- Before planning or changing code in a repository, have its rules in context: the `AGENTS.md` files from the workspace root down to the folder you change, plus `.ai-kit/workspace.json`.
- Rules are asked about once: on the first use of ai-kit on a machine, `ai-kit:create-rules` (first-run mode) asks whether to create rules now and for which scope — plugin-wide, workspace, repository or subfolder — and records the answer. After that never prompt for rules; create them only when the user asks (`/ai-kit:create-rules [scope] [path]`).
- Plugin-wide personal rules (`~/.ai-kit/AGENTS.md`) are injected at session start; project rules override them.
- Project without rules: follow ai-kit defaults and what the code itself shows; state in the final report that no project rules were applied.
- Never invent a convention the rules do not state. Missing fact → ask once, then offer to save it with `ai-kit:create-rules` at the matching scope.
- Tracker, VCS host, stack, commands, UI library and folder conventions come from project rules, never from ai-kit defaults.

## Lifecycle
- Understand → plan → implement test-first → verify → review → ship. Skip steps only for trivial changes, and say which.
- Full delivery from a ticket: `ai-kit:story`. Pieces: `ai-kit:ticket`, `ai-kit:brainstormer`, `ai-kit:plan`, `ai-kit:tdd-dev-workflow`, `ai-kit:test`, `ai-kit:debug`, `ai-kit:review`, `ai-kit:solution-doc`, `ai-kit:pr-submit`.
- Root cause before fix. Reproduce a bug with a failing test before changing code when feasible.
- Verify before claiming done: run the targeted tests and the project's lint/typecheck commands for touched files, and report the real output. Full builds or full test suites only when the user asks or the project rules require it.

## Implementation text
- No code comments unless the user explicitly asks in the current turn; no doc comments (Javadoc, JSDoc/TSDoc, docstrings, KDoc, `///`, `/** */`) in implementation or test code. Names, types and signatures carry the meaning. Project rules may relax this.
- Code, test names, log and error messages never cite the plan, spec, tasks or ticket (`AC-1`, `FR-3`, `DEC-4`, `PROJ-123`, "per the spec"). Name by behavior; keep the spec-to-test mapping in the work docs.

## Work artifact location
- Every file written for one piece of work (spec, plan, tasks, tracker, decisions, diagrams, solution, reports) goes in one folder at the workspace root: `<docsDir>/<TICKET-KEY>/` with a ticket, else `<docsDir>/<intention-name>/` (short kebab-case goal, no date). `docsDir` defaults to `docs`.
- Reports: `<that folder>/reports/<agent-or-type>-<YYMMDD-HHMM>.md`.
- Long-lived project docs (`docs/architecture/`, `docs/decisions/`, `docs/api/`, …) stay where the project keeps them.

## Visualize flows
- Call chains, request flows and multi-step interactions: use `ai-kit:less-words-more-arrows` to draw them instead of prose only. Skip for single-function explanations.

## Delegation
- Dispatch self-contained heavy steps to role agents so the main context stays on the task: codebase sweep → `ai-kit:researcher`; tests → `ai-kit:tester`; planned task → `ai-kit:developer`; review → `ai-kit:code-reviewer`; root cause → `ai-kit:debugger`; docs → `ai-kit:docs-manager`; architecture → `ai-kit:frontend-architect` / `ai-kit:backend-architect`.
- Skip delegation for a handful of tool calls or when the step needs the user mid-way.
- The brief is the subagent's only context: goal, repo, file paths, acceptance criteria, what was ruled out, scope limits (targeted tests, no build, no commit) and the project rules it must follow. Check its result before reporting done.
- Codex has no named role agents: spawn a subagent briefed with `${CLAUDE_PLUGIN_ROOT}/agents/<role>.md`, or do the step inline.

## Safety
- Confirm before destructive or outward-facing actions: deleting data, force-push, history rewrite, pushing, opening PRs, posting comments, deploying, touching production.
- Never commit secrets. Never read or print `.env` files, keys or credentials unless the user asks.
- Commit, push or open a PR only when the user asks.
