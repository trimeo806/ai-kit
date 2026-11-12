# Ticket mode — plan file → reviewed, committed feature branch

Ticket mode executes the plan written by `/ai-kit:plan` (ticket mode) in increments a human
can check: cut the branch, run one plan step at a time through the normal pipeline (tester RED →
developer → code-reviewer → tester verify), prove each step with tests that fail without it, and
**pause after every step** so the user can look at real code before anything moves on.

```
ticket → /ai-kit:plan <T> → [ /ai-kit:tdd-dev-workflow <T> ] → /ai-kit:review story → /ai-kit:pr-submit → (cross-test: someone else)
```

Three things make or break it, and none is "can the model write the code": **drift** (reality
contradicts the plan and someone quietly improvises), **bent tests** (a red test loosened instead of
the code fixed), and **code nobody wants to open next** (a function that grew one branch per step, a
comment narrating the ticket). Every pause report therefore carries a `Drift` line and two test
self-report lines even when the answer is "none", and a `Craft` line that has no "none".

## Scripts

`S=${CLAUDE_PLUGIN_ROOT}/scripts/ticket-implement`. Invoke with `bash` (they rely on real exit codes),
from **inside the module repo**: `cd <repo> && bash "$S/<name>.sh" ...`. Each prints `KEY=value`
lines; read the values instead of re-deriving them with git.

| Script | Use in ticket mode |
| :-- | :-- |
| `preflight.sh <plan-path>` | validates the plan, resolves git state, derives branch and PR title, parses steps |
| `done_check.sh` | whole-branch: accretion, test-integrity scan, commit-type consistency (git only, any repo) |

Exit codes: **0** ok · **2** prerequisite · **3** dirty worktree → ask · **4** no plan · **5** plan
missing sections · **6** ask the user · **7** commit types inconsistent.

Both scripts are git-only and work in any repo. Lint,
related-test and full-run commands come from the repo's **Commands** section, never from a script.

**Script output.** Any mention of "pr-review" in `preflight.sh` or `done_check.sh` output means
`/ai-kit:pr-submit`.

## Environment facts (give these to the tester)

The ways a run prints a green that means nothing. Add the repo's own from its **Testing** section.

- A pattern matching no test can pass (`passWithNoTests` and similar). Check the reported count.
- Cached task runners replay old results; a cache hit looks like a real run. Bypass the cache when a
  result looks too good, and mark cached results `(cached)` in reports.
- Runner flags change between major versions; check the installed version before trusting a flag.
- **Which repo?** When a step reaches outside the current repo, use `workspace.json` `repos[]` and each
  repo's `AGENTS.md` Overview before searching.
- **Repo rules** in the `AGENTS.md` chain own code contracts, test mechanics and naming/placement.
  Ticket mode owns the execution loop, test integrity and code craft.

## T0 — Resolve the plan

Ticket from: the argument (key, ticket URL or plan path), else a key matching `tracker.keyPattern` in
the current branch of the target repo. Plan path, first hit wins:

1. `<workspace-root>/<docsDir>/<TICKET-KEY>/plan.md`
2. `<repo>/<docsDir>/<TICKET-KEY>/plan.md`
3. `<repo>/<TICKET-KEY>.md` (legacy location; read only, new plans go to 1)

Two candidates → ask which. None → stop: *"Run `/ai-kit:plan <TICKET-KEY>` first; ticket
mode executes a plan, it does not author one."* Offer standard mode from the ticket's ACs only as the
alternative the user chooses, never as a silent fallback.

Target repo: the one the plan's `## Files to change` names. A plan spanning several repos gets one
branch and one log section per repo, worked one repo at a time; confirm the order with the user.

## T1 — Preflight, then decide

```bash
cd <repo> && bash "${CLAUDE_PLUGIN_ROOT}/scripts/ticket-implement/preflight.sh" "<absolute plan path>"
```

The script resolves the mechanism; the consent decisions stay with you and the user:

- **exit 4 / exit 5** (`SECTIONS_MISSING`): back to `/ai-kit:plan`. A plan without `## Steps`,
  `## Files to change`, `## Verification` or `## Acceptance criteria` cannot be executed as written.
- **exit 6**: several candidates; ask, never guess.
- **exit 3** (dirty beyond the plan file): offer commit first · `git stash push -u -m "pre-implement
  <TICKET>"` (print the pop command) · abort. Never auto-stash, never `git checkout -- .`. On resume,
  dirt inside the plan's own file set is probably the user's in-progress work: offer to fold it into
  the current step, never silently.
- **`PLAN_FILE_IGNORED`**: `outside-repo` when the plan lives in the workspace docs folder (the
  default); only meaningful when the plan sits inside the repo (option 3, or 2 when untracked). Then the plan file would block pr-submit's preflight later: re-run with
  `--exclude-plan` and say so. When the plan is outside the repo, ignore the key and **never** pass
  `--exclude-plan` (it would write an absolute path into `.git/info/exclude`).
- **`FILES_RESOLVED=x/y`**: name the misses at kickoff (drift D1, see `drift.md`; rule out a repo-prefix
  mismatch first).
- **Echo the parsed step list** from `--- steps ---`. A mis-parse caught now costs a sentence; at step
  5 it costs the run.
- **Echo the plan's ACs with their numbers.** These numbers are the spine of the run (see T3).
- When the plan has `## Test cases` (the cross-test draft), note the rows marked unit-testable; they
  go to the tester with the step's ACs.

## T2 — Branch

Show `BRANCH` and `PR_TITLE` **before the branch exists** (when `vcs.branchPattern` in `workspace.json`
or the Git & PR section names a different pattern, that pattern wins over the script's guess) and let the user correct the slug there;
after the first commit it costs a rename, after the PR a new PR.

> Branch: `PROJ-123/private-folder-management`
> → PR title will be "PROJ-123 private folder management"

`TICKET_BRANCHES` non-empty → resume that branch, never a second one (two branches, two PRs, split
review). `REF_CONFLICT=yes` → a bare `PROJ-123` branch blocks `PROJ-123/anything`; explain it
rather than surfacing git's error. On a yes:

```bash
git -C <repo> switch -c "<BRANCH>" "origin/<BASE_BRANCH>"
```

Always from `origin/<base>`, never a stale local base.

## T3 — Open the implementation log (the ticket-mode tracker)

Ticket mode keeps **one** progress record: the `## Implementation log` section appended to the plan
file from `${CLAUDE_PLUGIN_ROOT}/skills/tdd-dev-workflow/assets/implementation-log.md`. It replaces
the standard-mode `tracker.md`; do not write both.

Fill ticket, repo, branch, base sha, date, `Status: in-progress`, and one row per parsed step as
`pending`. **Append; never rewrite the sections the planning skill owns.** You are a second author on
a shared document, and silently rewording a plan is how scope changes without anyone noticing.

**AC IDs keep the plan's numbers.** Tracker IDs are `S<step>-AC<n>`, where `<n>` is the plan's own AC
number: `S2-AC3` ↔ AC-3. Never renumber, reword or merge criteria. The `### AC map` table has exactly
one row per plan AC, listing every tracker ID, step and test that serves it, so the mapping is
one-to-one in both directions and every AC is accounted for at handoff. Tests are named by behavior
and never contain the tracker ID; the AC map's test column (`file › test name`) is the only link.

Step statuses: `pending → tests-red → implemented → reviewed → done`, or `skipped` / `blocked`.
Log `Status:` is exactly one of `in-progress` · `paused` · `complete` (the `/ai-kit:story`
orchestrator reads it).

## T4 — The step loop

**One step per turn.** Run the step, render the pause report, end the turn. Do not chain two steps
because they look small: chaining removes the user's chance to verify, which is the point.

**S0 — Load from disk.** Every step, re-read from the files, never from memory: the log row and step
text, the matching `## Files to change` and `## Reuse map` rows, the AC scenarios this step serves,
`## Verification`, the real target files, and the sibling reference at its `path:line`. This is what
lets the loop survive compaction or a new session. Add the step-details block to the log; set the row
to in progress by its pipeline status.

**S1 — Micro-plan** (yours, written into the step block): files, the change, the tests that will prove
it, the plan ACs it serves. Decide the step's kind now:

- **Code step**: runs the pipeline below.
- **No-code step** (verify a backend accepts a call, confirm a permission): skip phases 1–4. Record the
  evidence in the step block, mark `done` with no commit, pause. This is the step git alone cannot
  represent and the reason the log exists.
- **Untestable step** (pure wiring, a config flag): say so now with the reason. Said upfront it is a
  design fact; said afterwards it reads like an excuse. Run phases 2–3 only and note it in the AC map.
- **Too big** (D4): propose the split now.

**S2–S5 — The pipeline** (SKILL.md Step 2, phases 1–4), with these additions to every prompt:

- the plan path, the step text, its `Files to change` and `Reuse map` rows, the AC scenarios verbatim
  with their tracker IDs, and the sibling spec/source to mirror;
- `references/red-test.md` (tester, developer), `references/code-craft.md` (developer, reviewer),
  the gate rule and D1–D8 from `references/drift.md` (tester, developer);
- "Touching a file outside `Files to change`, or work belonging to a later step, is drift: stop and
  return; do not do it." Subagents cannot ask the user; all asking is yours;
- the environment facts above (tester);
- update the step-details block in the plan file's log (not a separate tracker).

Phase 2 (developer) also returns the `Craft` line. Phase 3 (reviewer) checks the diff against the
step's ACs, `Reuse map`, repo rules, folder structure and code-craft, and flags leftovers
(`console.log`, `debugger`, commented-out code, unused imports, a locale added in one file and missed
in three). Phase 4 (tester) runs the targeted command plus related tests and lint of the changed files, and checks that the Phase 1 tests are unchanged unless an approved
(c) change is logged.

**S6 — Pause.** See *The pause*. The commit decision is part of it.

If the user explicitly asks for several steps without pausing, honour it, but still commit per step,
red-proof each, and break out to pause the moment a test fails or drift needs a decision. Never
default to that mode.

## Commits

**Ask every time.** Offer `commit` (you run it) or `mine` (the user runs it with the message shown).
Never commit silently.

Format: the Git & PR section's commit style; default `<type>(<TICKET-KEY>): <imperative summary>` with a
`Plan-Step: N/M` trailer:

```
feat(PROJ-123): add renameFolder to the private storage adapter

Delegates to FolderService.rename, mirroring the business adapter.

Plan-Step: 3/7
```

**Every commit on the branch uses the same type.** pr-submit's `draft_pr.sh` takes the PR's kind from
the newest commit subject (`git log … | head -1`), and a `<TICKET>/<slug>` branch matches none of its
`feature/` / `fix/` prefix fallbacks, so one trailing `chore:` retitles a branch of `feat`s.
`done_check.sh` exits 7 when this drifts. The scope in parentheses is safe.

Stage **explicit paths** with `git -C <repo> add <paths>`, never `git add -A`; re-check
`git status` and report leftovers. If preflight said `TEAM_COMMIT_CONVENTION=other`, say plainly that
this flow introduces conventional prefixes because the PR stage derives the kind from them.

**Never push**, never `--no-verify`, never force-push, rebase or squash on your own initiative.
pr-submit pushes when it opens the PR. The one sanctioned amend is the tip commit, when the user
asked for changes to the step it belongs to.

## The pause

Write it in this shape:

```
## Step N/M — <title>
**What changed** — <file — one line each>
**Diff** — <shortstat>
**Craft** — reuse: … · peak: <name> <lines>/<decisions>/<nesting> · comments added: <n> (<why>)
**Tests**
- `<targeted command>` → <verbatim runner summary line> <(cached) if cached>
- Scope: targeted + related tests only; full suite and build are run by the user
- Red-proof: <Phase 1 RED reason, or the revert-proof from Phase 4>
- lint (changed files) <pass|fail> · typecheck: not run (default policy)
- Test expectations changed: none
- Tests skipped or deleted: none
**Review** — <rounds, blocking fixed, non-blocking left open>
**AC covered** — <tracker IDs ↔ plan AC numbers; fully or partially>
**Drift** — none
**Verify it yourself**
    git -C <repo> diff
    <targeted command>
**Commit?** Proposed message: <type>(<TICKET>): <summary> / Plan-Step: N/M
Reply **commit** · **mine** · **changes: …** · **skip** · **stop** · **amend plan: …**
```

Not optional: **`Drift` appears even when it says "none"**, so silent improvisation is visible by its
absence. **`Verify it yourself` is copy-pasteable.** **`Craft` names code** (reuse source, worst
function by name), so no wording of it means "nothing to report".

Report the run, not an impression of it: verbatim result lines, `(cached)` when cached. **Anything
red or skipped goes first**, in plain words: which test, which assertion, and whether it was red
before this step. No "mostly green", no "unrelated failure" without `git stash` evidence.

### Handling the reply

| Reply | What to do |
|---|---|
| `commit` | Commit, mark the row `done` with the sha, advance to N+1 next turn |
| `mine` | Mark `done`, commit `-` with "user commits"; reconcile against git on resume |
| `changes: …` | **Do not advance.** Re-run the needed phases inside the same step, re-issue as `Step N/M · revision 2` with a "since last report" line. Amend the commit if there is one. A simplification revision shows `Craft` as before → after and re-runs the same tests unchanged |
| `skip` | Ask for a one-line reason; mark `skipped`; mark the uncovered ACs in the AC map. Committed at the tip → offer `git reset --hard HEAD~1`, else `git revert` |
| `stop` | Set `Status: paused`; print what is committed, what is left, that nothing is pushed, and the resume command `/ai-kit:tdd-dev-workflow <TICKET-KEY>` |
| `amend plan: …` | See `drift.md` § amend plan |
| A question | Answer it, then re-issue the reply line. **A question is not approval** |
| Ambiguous | "Looks good, but what about X?" is `changes` until clarified. Never infer consent |

A simplification never edits a test. If a test *had* to change, the refactor changed behaviour: case
(c), a full stop. It also never breaks the placement rules in the repo's Conventions section.

## T5 — Done check and handoff

When every row is `done`, `skipped` or `blocked`:

```bash
cd <repo> && bash "${CLAUDE_PLUGIN_ROOT}/scripts/ticket-implement/done_check.sh"
```

- **exit 2, no commits ahead**: the user answered `mine` and has not committed yet. Say so; run it
  again after they commit, or report without it.
- **exit 7**: mixed commit types. Fix before handoff: the off-type commits need rewording to the
  branch's type, which rewrites history, so propose it and act only on the user's yes.
- `SKIP_ONLY_ADDED`, `SUPPRESSION_ADDED`, `ANY_CAST_ADDED`, `LOOSE_ASSERT_ADDED`,
  `DEBUG_LEFTOVERS`, `TICKET_IN_COMMENTS`: anything non-zero is a finding to fix or explain.
- **`ACCRETED_FILES`** is what per-step reviews structurally cannot catch: three steps each adding one
  branch to the same function are three honest diffs and one function nobody wants to open. Open the
  **current** version of each listed file and report the worst function by name with its final
  numbers and what its step reported (`renameFolder 18/3/2 at step 3 → 34/8/3 now`), logic that now
  exists twice, and comments that read as ticket narration. Fixes go through the developer as a **new
  commit with the branch's type**, never `refactor:`; anything not fixed goes under
  `### Out-of-scope observations` with the reason.

Show the checklist with evidence: every row `done` or `skipped` with a reason · every plan AC in the
AC map with a passing test, a manual E2E item, or "not covered — why" · worktree clean · nothing
pushed, no PR, no tracker writes · and the **commands the user still has to run**: the full suite,
typecheck and build from the repo's Commands section. Full suite and build were not run here; say so.

Set `Status: complete` (the user's own full run is still pending; say that in the report, not in the
status). Then hand off, printing commands that exist:

1. `/ai-kit:review story` — the post-implementation review, before any PR.
2. `/ai-kit:pr-submit` — opens the PR, reviews it, comments back.
3. Offer `ai-kit:solution-doc` to refresh `<docsDir>/<TICKET-KEY>/solution.md`, the PR
   body's primary source.

The cross-test page is not on the list: publishing it belongs to whoever runs the cross-test against
DEV after the merge. **Under `/ai-kit:story`, its orchestrator owns the next move**: report
and stop.

## Guardrails

- **Execute the plan; don't author one.** No plan → point at `/ai-kit:plan`.
- **Append-only on the plan file.** You own `## Implementation log`; planning owns everything above
  it. The only exception is an explicit `amend plan:`, logged with before/after.
- **Never push, no PR, no VCS-host or CI calls, no wiki page, no tracker writes.**
- **No drive-by fixes**: log them under `### Out-of-scope observations`.
- **No dependency installs, lockfile, build or config changes** unless the plan names them.
- **No weakening of any gate to reach green**: tests, lint rules, compiler strictness, `--no-verify`.
- **Fail closed on unconfirmed prerequisites**: `blocked`, with what must be confirmed and by whom.
- **Never assume consent.** One step per turn; an ambiguous reply is a request for changes.

A worked run is in `references/example-run.md`.
