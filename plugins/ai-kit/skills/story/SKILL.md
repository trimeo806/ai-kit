---
name: story
argument-hint: "[TICKET-KEY | intention] [stage]"
description: "Run a whole story end to end through gated stages — read the ticket, grill the acceptance criteria (when missing or vague), plan, implement, test, review, pull request — carrying the acceptance criteria forward as the spine. Works with any tracker and VCS host the project rules name. Use when asked to \"run / take / drive story PROJ-123 end to end\", \"story workflow\", \"start this story\", \"resume the story\", \"where is this story at\" or \"what's the next stage on this ticket\". Not for a single step: a plan alone, an implementation alone, a review alone or a PR alone go to their own skills."
---

# Story workflow

One stage per phase of a story, in this order:

| Stage | Skill | Ends when |
|---|---|---|
| 0. Ticket | `ai-kit:ticket` (read mode) | the ticket is read, or the user has described the intention |
| 1a. Grill the ACs | `ai-kit:brainstormer` — default when the ticket has no Given/When/Then ACs or is high risk; skippable | the user confirms the numbered AC list |
| 1. Plan | `ai-kit:plan` (spec → clarify → design → tasks → analyze), plus `/ai-kit:review checklist` when risk is high | the plan is approved |
| 2. Implement | `ai-kit:tdd-dev-workflow` | the user says implementation is done |
| 3. Test | `ai-kit:test` | the full suite (and E2E for the AC flows, where the project has it) is green or failures are consciously accepted |
| 4. Review | `/ai-kit:review converge`, then `/ai-kit:review story` | spec converged; findings are triaged |
| 5. Pull request | `ai-kit:pr-submit` | the PR is merged |

This skill orchestrates; the stage skills do the work. Delegate to each and let it run its own
flow. Several stage skills dispatch role agents (`ai-kit:planner`, `ai-kit:developer`,
`ai-kit:tester`, `ai-kit:code-reviewer`, …). **In Codex**, which has no named role agents, a
dispatch means: spawn a subagent briefed with `${CLAUDE_PLUGIN_ROOT}/agents/<agent>.md`, or do
the step inline. Ask questions in plain chat when AskUserQuestion is unavailable.

**This is the implementer's workflow, and it ends at the merge.** Verifying the change in a shared
environment afterwards is usually someone else's task; what this workflow owes them is the test
matrix drafted in stage 2 (see **Hand-off after merge**).

## Load project rules first

If not already in context, read `.ai-kit/workspace.json` at the workspace root and the
`AGENTS.md` chain for each repo the story touches (contract:
`${CLAUDE_PLUGIN_ROOT}/references/project-rules-contract.md`). This workflow needs:

| Fact | Source |
|---|---|
| Where work artifacts go | `docsDir` (default `docs`) |
| Ticket key format, tracker, how to reach it | `tracker.keyPattern`, `tracker.type`, `tracker.access` |
| Branch naming, target branch, PR host | `vcs.branchPattern`, `vcs.defaultBranch`, `vcs.host` / `vcs.cli` |
| Which repos exist and are in scope | `repos[]` |
| Commands, testing rules, definition of done | **Commands**, **Testing**, **Tracker** sections |

A fact a stage needs is missing → ask the user once, use the answer, and suggest
`/ai-kit:setup-rules` (update mode) to save it. `tracker.type: none` is fine: the story runs from
an intention name instead of a ticket key.

## The work folder and the plan file

Every artifact of the story lives in one folder at the workspace root:
`<docsDir>/<TICKET-KEY>/`, or `<docsDir>/<intention-name>/` when there is no ticket (a short
kebab-case name the user agrees to, e.g. `csv-user-export`). Below, `<KEY>` means either.

Stage 1 writes `<docsDir>/<KEY>/plan.md` — **the plan file** — and later stages read and append
to it. Spec, decision log, checklists, tracker, reports and solution sit beside it. It holds
everything this workflow needs to survive between stages:

| What | Where |
|---|---|
| The spec — source of truth | `spec.md` beside the plan file (user stories, `US*-AC*` scenarios, FR/EC/SC IDs), written by stage 1's `spec` step |
| The numbered acceptance criteria | `## Acceptance criteria` in the plan file, written by stage 1 — which also offers to sync them into the ticket when the ticket has no AC section of its own |
| Which increments landed, and where the run stopped | `## Implementation log` — `Status: in-progress \| paused \| complete` plus a step/commit table, appended by stage 2; when stage 2 kept only its tracker, the log points at it |
| The test matrix | `## Test cases`, drafted early in stage 2 |

**Stages are usually days apart, in different sessions.** Nothing carries in context across a
gap like that, so "remember the list from stage 1" is not an instruction anyone can follow. The
file is what makes the rest of this skill work.

## Gates — the point of the wrapper

**Never run two stages back to back without the user saying so.** Each boundary is a real
decision: a plan can be wrong, an implementation unfinished, a review can send you back to stage
2. Auto-chaining turns those decisions into surprises.

In particular: do not start review because the code *looks* finished. Wait to be told.

## The acceptance-criteria spine

Enumerate the acceptance criteria **once**, in stage 1, into the plan file's
`## Acceptance criteria` section. Every later stage **quotes that section by number** instead of
reading the ticket again.

Do not re-derive or re-word them per stage. Independent re-readings of the same ticket are how a
misread criterion survives all the way to verification — each stage quietly agrees with its own
paraphrase. Reading one written list breaks that chain.

If the plan file has no AC section — an older plan, or one written by hand — write one and have
the user confirm it before going further.

## Stage 0 — Ticket

Find the key in the request or the current branch name (`tracker.keyPattern`); ask once if
neither has one. Read it with `ai-kit:ticket` (read mode) through the tracker the rules name.
No tracker, or the user has no ticket → ask for the intention in two or three sentences and
agree on the intention name for the work folder.

## Stage 1a — Grill the ACs

Run `/ai-kit:brainstormer <KEY>` when the ticket has no Given/When/Then ACs, its scope is vague,
or the change is high risk (auth, data, money, public API, several roles). Otherwise say why it
is skipped and go to stage 1; the user can still ask for it.

It grills in rounds, writes `<docsDir>/<KEY>/decision-log.md` after every round, and synthesises
`spec.md` with every AC citing its `DEC-*`. The decision log is the story's record of **why**
each AC reads as it does; later stages cite it, never re-decide silently.

**Gate:** the user confirms the numbered AC list (`decision-log.md` → `status: confirmed`). Stage
1 then picks up `spec.md` and continues at `clarify` or `design`.

## Stage 1 — Plan

Run `/ai-kit:plan <KEY>`. It runs as steps — `spec`, `clarify`, `design` (the plan file),
`tasks`, `analyze` — asks before each next step, and asks before any tracker write. A stop
between steps is not the stage-1 gate: on resume, run `/ai-kit:plan <KEY>` again and it continues
at the first missing step.

**Checklist when the risk is high.** When `analyze` leaves the plan at `risk: high`, run
`/ai-kit:review checklist <KEY>` before the user approves. Its `[Gap]` items are missing
requirements: answer them through `/ai-kit:plan clarify <KEY>` so they land in `spec.md` and flow
into the plan. Do not patch them into the plan file alone. `tdd-dev-workflow` stops on unchecked
items, so approving with open items is a conscious choice: say so.

Afterwards, read back the `## Acceptance criteria` section, show it numbered, and have the user
confirm it. Correct it **in the file**, not only in the conversation.

**Gate:** the user (with whoever the project rules name as plan reviewer) approves the plan, and
its status is `approved`.

## Stage 2 — Implement

**Draft the test matrix first.** Before the first increment, write `## Test cases` into the plan
file: one row per AC plus the cases the ACs imply (permissions, empty / one / limit, error paths,
unchanged behaviour), each marked `unit`, `integration`, `e2e` or `manual`. It is a gap-finder: it
regularly turns up a permission the backend must refuse or an error text nobody wrote, which is
far cheaper to find now. The rows marked `unit` tell you which tests to write while in the code.
Offer to sync the matrix to the ticket (as a comment or sub-task, per the Tracker section) so
whoever verifies after merge can reach it; the plan file stays local.

If the matrix surfaces a gap that changes what "done" means, that is an AC correction — fix the
`## Acceptance criteria` section and say so.

Then run `ai-kit:tdd-dev-workflow` with the plan file as its input. Tell it two things:

- **Keep the plan's AC numbers.** Its tracker's criterion IDs must map one to one onto the plan
  file's numbered list (e.g. `T1-AC1` ↔ AC-1).
- **Log into the plan file.** Increments and the run's state go into `## Implementation log`, so
  a later session can resume from the file.

Branches follow `vcs.branchPattern`. Each increment stops for review before the next one; that
pause is the stage skill's, not a gate of this workflow.

Read the log as evidence, but the decision is the user's — work finished by hand leaves the log
saying `paused` on a branch that is genuinely done. When the log and the user disagree, say so
once and take their word.

**Gate:** the user says implementation is done.

## Stage 3 — Test

Run `/ai-kit:test` over the branch in each repo the story touched: the full unit suite with the
commands from the **Commands** section, and — when the **Testing** section names an E2E runner —
the `e2e` rows of `## Test cases`. Record the result per row in the matrix. Failures go back to
stage 2; flaky or environment-blocked rows are stated, not hidden.

**Gate:** green, or each failure consciously accepted with its reason.

## Stage 4 — Review

**Converge first.** Run `/ai-kit:review converge <KEY>`. It checks every spec point against the
code on the branch — built, partial, missing or contradicted, with evidence — and lists code that
traces to no spec point.
- **Any gap** — it appends new steps to the plan file on the user's yes. Go back to stage 2 for
  those steps. Don't review code that is known to be incomplete.
- **100% converged** — continue. Its untraced-code findings carry into the story review.

Then run `/ai-kit:review story <KEY> --pr-coming`. Point it at the plan file's
`## Acceptance criteria` section so it compares against that list rather than re-reading the
ticket. When `decision-log.md` exists, name it: a finding that contradicts an accepted `DEC-*`
cites it, so the human sees a decision change, not a bug.

`--pr-coming` makes it write its hand-off — the graded findings to
`<git-dir>/story-review/findings.tsv`, then `handoff.env` with the sha of the diff it reviewed.
Those two files spare stage 5 a second full review.

Before you approve its plan, surface whatever side effects that plan declares — commits, pushes,
builds — so the user approves them knowingly.

**Fixing blocking findings changes the diff that was just reviewed.** Re-run the review over the
fixes, naming the areas they touched so it can narrow the run. The re-run also rewrites
`handoff.env` over the fixed diff; until it does, a resumed session should read the state as
**back to stage 4**, not on to stage 5.

**Gate:** converge is at 100% (or gaps consciously deferred, with a spec change), and findings
are triaged — blocking ones fixed and re-reviewed clean, or consciously accepted with the reason.

## Stage 5 — Pull request

Run `ai-kit:pr-submit` in each repo with changes. **Tell it stage 4's hand-off exists** — so it
can reuse that review when `DIFF_SHA` still matches the diff it is about to open, instead of
reviewing the same code again.

**What breaks the reuse is a changed diff, not a long gap.** A late fix, or a merge of the target
by pr-submit's own preflight, means the earlier review no longer covers what ships. An overnight
gap is fine; one more commit is not.

Its own gates stay its own: it shows the PR before creating it and comments before posting them.
Then the PR sits with human reviewers — usually the longest gap in the story.

**Gate:** the PR is merged — the branch is in `origin/<target>`.

## Hand-off after merge

Whoever verifies the change in a shared environment needs the test matrix. If stage 2 synced it
to the ticket, tell them where it is in one sentence; if not, say so plainly, or offer to sync it
now. Do not run their verification or publish their report for them.

## Resuming mid-story

Most invocations are a resume. **Read the plan file first**, then the branch, then the review
hand-off. In a multi-repo workspace the root is not a git repo, so run git inside the repo that
holds the story's branch:

```bash
d="$(git -C <repo> rev-parse --absolute-git-dir)/story-review"
cat "$d/handoff.env" 2>/dev/null
git -C <repo> diff --merge-base "origin/$BASE_BRANCH" HEAD | git hash-object --stdin
```

(`BASE_BRANCH` comes from `handoff.env`.) Equal shas mean the reviewed diff is still the current
one. Stage 2's state comes from `## Implementation log`; when there is none, from the
`ai-kit:tdd-dev-workflow` tracker (`<docsDir>/<KEY>/tracker.md`), where every task `done` counts
as `Status: complete`.

| What you find | Where you are |
|---|---|
| No work folder, no ticket read yet | stage 0 |
| `decision-log.md` with `status: in-progress` | mid-stage-1a — resume `brainstormer` at its `## Frontier` |
| `decision-log.md` confirmed, no plan file | stage 1a done, stage 1 next |
| No plan file, no decision log | stage 1a / 1 hasn't run |
| AC section, no implementation log and no tracker | stage 1 done, stage 2 not started |
| Log `in-progress`, or tracker tasks not all `done` | mid-stage-2 |
| Log `paused` | mid-stage-2 **or finished by hand** — ask before treating it as unfinished |
| Log `complete`, `## Test cases` without results | stage 3 next |
| Test results recorded, no `handoff.env` | stage 4 next |
| `handoff.env` whose `DIFF_SHA` **matches** the current diff, no PR | stage 5 next — the reuse holds |
| `handoff.env` whose `DIFF_SHA` **differs** | the diff moved after review — **stage 4 again**, not stage 5 |
| `findings.tsv` with no `handoff.env` | a review without a verifiable sha — re-run stage 4 |
| PR open, not merged | waiting on reviewers; no stage to run |
| Branch merged into the target | done — hand off the test matrix |

Say which stage you are resuming and why, and wait for confirmation if it is ambiguous. Re-read
the recorded AC list; do not regenerate it. If the user names a stage, start there.

## Do not

- Chain stages without a gate.
- Re-derive, re-word or renumber the acceptance criteria after stage 1 — quote the plan file.
- Change a logged decision silently — a changed decision is a new `DEC-*` that supersedes the old one, made by the user.
- Open the PR with blocking findings fixed but never re-reviewed.
- Send stage 5 off without telling it stage 4's hand-off exists while its sha still matches.
- Assume a tracker, host or branch convention the project rules don't state — ask.
- Duplicate a stage skill's work because its output looks thin — report that it looked thin instead.
