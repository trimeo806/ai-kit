---
name: tdd-dev-workflow
description: The implementation workflow. Use when user says "implement", "implement PROJ-123", "implement the plan (for this ticket)", "/implement", "work through the plan", "continue implementing", "resume the implementation", "next step", "code this ticket up", "build a feature", "make this work", "continue the plan", "tdd workflow", "run dev workflow", "track and implement these tasks", or "go ahead and build it" after a plan was written, or gives tasks/ACs (pasted, plan file, ticket key) to deliver test-first. Ticket mode runs the plan from /ai-kit:plan (<docsDir>/<TICKET-KEY>/plan.md or <repo-root>/<TICKET-KEY>.md) on a feature branch, one step per turn with a review pause and commit decision, red-proven tests, drift handling and an implementation log in the plan file. Each task: tester writes failing tests per AC -> developer implements + /simplify -> code-reviewer -> tester verifies. Targeted tests only; no full-suite/build gate. Resumable. Does not author plans or open PRs.
---

# TDD Dev Workflow

Orchestrator = you (main session). You do NOT write tests or implementation yourself. You dispatch subagents, gate each phase, and keep the tracker current. All questions to the user are yours: subagents cannot ask, so they stop and return.

> **Codex:** there are no named role agents — spawn a subagent briefed with `${CLAUDE_PLUGIN_ROOT}/agents/<agent>.md` (`tester`, `developer`, `code-reviewer`), or do the phase inline, keeping the phases separate. Without AskUserQuestion, ask in plain chat.

Pipeline per task (RED then GREEN only):

```
tracker -> [1] tester:write (RED) -> [2] developer (GREEN + simplify) -> [3] code-reviewer -> [4] tester:verify -> done
                                          ^                                  |
                                          +------ blocking findings (max 2) -+

standard mode: all tasks done -> wrap up -> commit / PR (only if user asks)
ticket mode:   each plan step done -> pause report + commit decision -> next step on the user's reply
```

## Project rules first

If not already in context, read `.ai-kit/workspace.json` and the `AGENTS.md` chain (workspace root down
to the target repo), per `${CLAUDE_PLUGIN_ROOT}/references/project-rules-contract.md`. The **Commands**
section gives the test (all + single test), lint and typecheck commands; **Testing** gives framework,
test location and naming; **Conventions** and **Architecture & boundaries** govern placement; **Git &
PR** gives branch and commit style. A command or rule this run needs is missing → ask once and suggest
saving it with `/ai-kit:setup-rules`. `<docsDir>` below is `docsDir` from `workspace.json` (default `docs`).

## Modes

| Mode | Input | Tracker | Rhythm |
|------|-------|---------|--------|
| **Standard** | pasted tasks, `todo.md`, a planner plan dir (`<docsDir>/<intention-name>/tasks.md` + `spec.md`; ACs = the spec's `US*-AC*` / `FR-*` IDs, kept as-is), a ticket key the user chose to run without a ticket plan | `<plan dir>/tracker.md`, else `<docsDir>/<intention-name>/tracker.md` | tasks run back to back, wrap up at the end |
| **Ticket** | a ticket key or URL with a ticket plan, a ticket plan file (`<docsDir>/<TICKET-KEY>/plan.md` or `<repo-root>/<TICKET-KEY>.md` with `## Steps`, `## Files to change`, `## Acceptance criteria`, `## Verification`), "/implement", "next step" | the plan file's `## Implementation log` | feature branch, one plan step per turn, pause + commit decision after each |

Ticket mode = the same four phases per plan step, plus preflight, branch, AC-number spine, drift
gate, pause reports, per-step commits and a whole-branch done check. Its full procedure is
`references/ticket-mode.md`: read it before the first ticket-mode action and follow it.

## Test & build scope (applies to every phase, both modes)

| When | Tests | Build / project-wide typecheck |
|------|-------|-------------------------------|
| Phases 1-4 (per task) | ONLY the task's targeted test command (RED then GREEN, plus related tests and lint of changed files in Phase 4) | NEVER |
| Ticket done check | git-only `done_check.sh`; full-run commands are printed for the user, not run | NEVER |

Full suite and build are slow and are never run by the agent unless the user asks. The user runs them. Commands come from the repo's Commands section.

## Rules pasted into subagent prompts (both modes)

- **Project rules**: the target repo's Conventions, Architecture & boundaries and Testing sections,
  pasted verbatim (folder structure, naming, UI library, error handling, test location). To tester,
  developer and code-reviewer.
- **Test integrity**: `references/red-test.md` (useful tests, red-proof, decoration moves, the
  (a)/(b)/(c) red classification, three attempts, inherited red). To tester and developer.
- **Code craft**: `references/code-craft.md` (comments say why or nothing, complexity 15 / nesting 3,
  search before writing a helper, the `Craft` line). To developer and code-reviewer.
- **Plan boundaries** (when the plan has them): the plan's `## Boundaries` (Change surface, Do not touch) and the spec's `OOS-*` list, pasted verbatim, plus the task's `[Done]` line as its finish line. A file outside the Change surface or inside Do not touch, or work that implements an `OOS-*`, means stop and return it as drift, not an edit. To tester, developer and code-reviewer.
- **Ticket mode only**: the drift gate rule and D1-D8 from `references/drift.md`. To tester and developer.

## Step 0 - Resume or start

1. Ticket key, ticket URL, ticket plan path, or "/implement" / "next step" / "continue implementing" -> resolve the plan as `references/ticket-mode.md` T0 says.
   - Plan has `## Implementation log` with `Status: in-progress` or `paused` -> resume it: reconcile log vs `git log` `Plan-Step:` trailers (`references/drift.md` § Resuming), report the step table, continue at the first row not `done`/`skipped`.
   - Plan without a log -> ticket mode from T1.
   - Ticket key and no plan -> stop and recommend `/ai-kit:plan <TICKET-KEY>`. Run standard mode from the ticket's ACs only if the user picks that.
2. Otherwise look for an existing tracker: `<docsDir>/*/tracker.md` with tasks not `done`, or whose plan dir's `tasks.md` has tasks the tracker lacks (e.g. a `## Converge — <date>` block). If user named a plan dir, use it. Found -> append the missing tasks as `pending`, read it, report status table, resume each task from its current status.
3. Not found -> Step 1.

## Step 1 - Build tracker

**Ticket mode:** follow `references/ticket-mode.md` T1-T3 (preflight, branch, implementation log). Tasks are the plan's `## Steps`; ACs keep the plan's own numbers as `S<step>-AC<n>` (`S2-AC3` <-> AC-3), recorded one to one in the log's `### AC map`. Never renumber, reword or invent ACs. Then go to Step 2.

**Standard mode input sources (any):** pasted task list, plan file path, ticket key/URL (fetch it the way `tracker.access` in `workspace.json` says; `manual` or missing → ask the user to paste it), or `todo.md`.

1. Extract tasks + acceptance criteria (ACs). Give each AC an ID: `T1-AC1`, `T1-AC2`, .... If the source numbers its ACs, keep those numbers (`T1-AC3` <-> AC-3) and say so in the tracker.
2. ACs vague, missing, or untestable -> ASK user before continuing. Do not invent ACs.
   Plan dir has `checklists/*.md` with unchecked `- [ ]` items -> report the count per file and ASK before continuing. Never tick them; they are reviewer-owned.
3. Per task determine target repo dir (sub-repos are separate git repos).
4. Write tracker at `<plan dir>/tracker.md` (no plan dir: `<docsDir>/<TICKET-KEY>/tracker.md` for a ticket key, else `<docsDir>/<intention-name>/tracker.md`) using template below. Targeted test command stays `-` until tester fills it in Phase 1.
5. Show tracker summary to user. Proceed unless user objects.

### Tracker template (standard mode)

```markdown
# Tracker: <title>
Source: <ticket key | plan path | pasted>
Created: <date>

| ID | Task | Repo | Status | Review rounds |
|----|------|------|--------|---------------|
| T1 | <short> | my-repo | pending | 0 |

## T1 - <task title>
**ACs**
- T1-AC1: <criterion>
- T1-AC2: <criterion>

**Targeted test command:** -
**Test files:** -
**Impl files changed:** -
**RED evidence:** -
**Review findings:** -
**Verify evidence:** -
**Craft:** -
**Notes / blockers:** -

```

Ticket mode uses `assets/implementation-log.md` instead (same per-task fields, plus `### AC map`, `### Drift`, `### Out-of-scope observations` and a `Status:` line).

Task statuses: `pending -> tests-red -> implemented -> reviewed -> done` (or `blocked`; ticket mode also `skipped`).

## Step 2 - Run tasks

Standard mode: sequential by default; parallel only if tasks touch disjoint files/repos.
Ticket mode: one plan step per turn, in plan order, then the pause (`references/ticket-mode.md` T4). No-code and untestable steps are classified in the micro-plan before Phase 1.

Subagents share NO context with you. Every prompt MUST include: tracker path (ticket mode: the plan file and its step-details block), task ID, full AC list with IDs, repo dir, targeted test command (once known), the pasted rules for that role, the instruction to update its section of the tracker, and this scope rule verbatim:

> Scope rule (overrides your default quality gates): run ONLY the targeted test command for this task. Do NOT run the full test suite, a build, or a project-wide typecheck/lint. The user runs those.

Include environment info (OS, CWD, date) and the repo's Commands section. Ticket mode adds the step text, its `Files to change` and `Reuse map` rows, the sibling to mirror, and (tester) the environment facts in `references/ticket-mode.md`.

### Phase 1 - Tester: write failing tests (`subagent_type: ai-kit:tester`)

Prompt must require:
- At least one test per AC. Test names and `describe` blocks state the behavior (e.g. `returns 409 when the folder is locked`) and never carry an AC, task, spec or ticket ID; record the AC ID → `file › test name` mapping in the tracker instead.
- No doc comments (Javadoc, JSDoc, docstrings) and no comments in test code unless the user asked for them.
- Useful tests per `references/red-test.md`: outcomes not choreography, guard cases covered, mirror the sibling spec when one is named.
- Follow the repo's Testing rules and existing test framework, location, naming conventions.
- Write NO implementation code. Minimal stubs/types only if needed to compile, and list them.
- Record a **targeted test command** that runs ONLY this task's test files, with explicit paths. Derive it from the Commands section's single-test command; shapes vary by stack, e.g. `npx jest <file>`, `npx vitest run <file>`, `pytest <file>::<test>`, `go test ./pkg/x -run <Name>`, `mvn -f <repo>/pom.xml test -Dtest=<Class>`.
- Run the targeted command; confirm tests FAIL for the right reason (assertion/missing behavior, not syntax/import errors), and that the reported test count includes the new tests.
- If no seam exists to test against yet, record `RED evidence: deferred - <reason>`; Phase 4 then proves red by revert.
- Update tracker: targeted test command, test files, RED evidence (short output excerpt), status `tests-red`.

Gate: tracker has targeted command + failing-for-right-reason evidence (or a justified deferral). Else re-dispatch tester.

### Phase 2 - Developer: implement (`subagent_type: ai-kit:developer`)

Prompt must require:
- Make Phase 1 tests pass. Do NOT edit test files. A red test is classified per `references/red-test.md`: (a) fix the code; (b) harness wrong or (c) expectation wrong -> stop and return with the evidence; after three failed attempts -> stop and return. Never fix the code and relax a test in the same move.
- Follow repo conventions, YAGNI/KISS/DRY, and `references/code-craft.md`: no comments unless the user asked for them, and any comment that stays explains a constraint, never the ticket; no doc comments (Javadoc, JSDoc, docstrings); no plan, spec, task or ticket ID in code, comments, log or error messages; complexity under 15, nesting <= 3; search for an existing helper before writing one.
- Files follow the pasted project rules (folder structure, naming, layering).
- Ticket mode: touch only the step's `Files to change`; anything else, later-step work, or a non-mechanical deviation is drift -> stop and return. Mechanical drift is logged under `### Drift`.
- Verify with the targeted test command ONLY (scope rule). No build, no full suite, no project-wide typecheck.
- After green: simplify the changed files (the `simplify` skill where available), then re-run the targeted command (must stay green). Simplification must not edit tests or break the project's placement rules.
- Report the `Craft` line (`references/code-craft.md`).
- Update tracker: impl files changed, Craft, status `implemented`.

Gate: targeted tests green per developer output. Else loop developer. A returned (b) goes to the tester; a returned (c), drift or third-attempt stop goes to the user (`references/red-test.md` § Case (c), `references/drift.md`).

### Phase 3 - Code reviewer (`subagent_type: ai-kit:code-reviewer`)

Prompt must require:
- Review files listed in tracker (test + impl) via `git -C <repo> diff` / `git status` in the repo that owns them (in a multi-repo workspace the root may not be a git repo).
- Check correctness vs ACs, bugs, security, conventions, test quality (tests actually assert AC behavior, none of the decoration moves in `references/red-test.md`), code craft (`references/code-craft.md`), leftovers (`console.log`, `debugger`, commented-out code, unused imports, a locale missed in sibling files). Ticket mode: also the step's `Reuse map` and the `Files to change` boundary.
- Static review only - run no tests and no build.
- Paste the rules `ai-kit:review` local mode applies: the repo's project rules, `references/shared/code-review-guidelines.md` and `references/shared/severity-guide.md`, and `skills/review/references/code-review-standards.md` (default pass).
- Classify findings: `blocking` / `non-blocking`.
- Update tracker: review findings, increment review rounds.

Gate:
- Blocking findings -> back to Phase 2 developer with findings verbatim, then Phase 3 again.
- Max 2 review rounds. Still blocking -> set `blocked`, escalate to user.
- None blocking -> status `reviewed`.

### Phase 4 - Tester: verify (`subagent_type: ai-kit:tester`)

Prompt must require:
- Run the targeted test command, plus tests related to the changed impl files (e.g. jest `--findRelatedTests <impl files>`, or the test classes covering the changed classes). NOT the full suite, NOT a build.
- Lint only the changed files if the repo has a linter (the Commands section's lint command, scoped to the files).
- Confirm the Phase 1 tests are unchanged since RED, except an approved (c) change recorded in the tracker. Report `Test expectations changed:` and `Tests skipped or deleted:` even when "none".
- RED deferred in Phase 1 -> prove it now: temporarily revert or break the production change, run the targeted command, confirm red, restore, confirm green. Both lines go into the evidence.
- Build AC -> test -> result mapping; every AC must map to >=1 passing test (ticket mode: update the `### AC map`).
- A failure that was red before this task is inherited red (`references/red-test.md`): prove it with `git stash`, report it, do not fix it.
- Paste short verbatim output (the runner's summary line, and `(cached)` if the runner served a cached result) into tracker Verify evidence.
- All ACs pass -> set status `done`. Any fail -> set `implemented` with failure notes (you route back to Phase 2).

Only Phase 4 may mark a task `done`. You never mark done yourself (ticket mode exception: a no-code step you verified, with its evidence logged).

## Step 3 - Wrap up

**Ticket mode:** after each step, the pause report and commit decision (`references/ticket-mode.md` § The pause, § Commits); after the last step, T5 (done check, AC map, commands the user still runs, `Status: complete`, handoff to `/ai-kit:review story` -> `/ai-kit:pr-submit`).

**Standard mode:**
- Update tracker summary table.
- Report to user: per-task status, files changed per repo, any blocked items + reason, non-blocking review findings left open. State that full suite and build were not run (user runs them).
- Do NOT commit/push/open PR unless user asks. No gate blocks commit/PR.

## Pitfalls

- In a multi-repo workspace each repo is its own git repo - always `git -C <repo>`. Ticket scripts run as `cd <repo> && bash <script>`.
- A pattern that matches no test can still report green (`passWithNoTests` and similar) - read the test count. Cached task runners can replay an old result; bypass the cache when a result looks too good.
- Never skip RED phase "because it's obvious" - the gate is the point.
- Don't let developer weaken tests to pass; test edits go through tester, and expectation changes through the user.
- Subagent ran full suite / build mid-plan anyway -> re-state the scope rule in the next prompt; it overrides agent default quality gates.
- Ticket mode: never chain two plan steps in one turn unless the user asked; never commit, push or write to the tracker without the user's reply.
