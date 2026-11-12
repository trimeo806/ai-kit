---
name: pr-submit
description: Submit the current branch as a pull request (merge request) end to end, on GitHub, GitLab, Bitbucket Cloud or Azure DevOps — whatever the project rules name. Syncs with the target behind conflict gates, runs the project's static checks on the changed code, opens the PR with a fixed-template body, attaches reviewer evidence (UI demo GIFs or screenshots, API flow diagram and test results) as a comment, reads the PR's CI checks, reviews the diff, posts findings as inline comments plus a summary comment, and gives the verdict — safe to merge, needs attention, or blocked. Use when the user wants to open or submit a PR / MR, push a finished branch for review, "create the PR and review it", asks what a branch would look like as a pull request, or whether a branch is safe to merge — even if they don't name the skill.
argument-hint: "[--no-typecheck] [--dirty auto|allow|block] [--demo per-feature|single|screenshots|none] [--no-evidence]"
---

# PR submit — open, check, review, verdict

Arguments this run was invoked with: `$ARGUMENTS`

End-to-end flow for the current branch: sync with the target, run static checks, capture what
the PR shows, open the PR with its evidence, read CI, review the diff, comment on the PR's lines,
and post the verdict.

The deterministic parts — host detection, conflict gates, git plumbing, the host CLI / REST
calls, JSON payloads, **and the shape of everything this flow writes** — live in bundled
scripts. Run them instead of re-deriving commands or hand-writing markdown. **Your** job is what a
script can't do: the description's content, finding the issues, and deciding when to stop and
ask. You never write the PR body or the summary comment as free markdown: you fill slots,
`draft_pr.sh` and `render_comment.sh` render them.

**In Codex** (no named agents, no AskUserQuestion): where this flow or a skill it calls dispatches
`ai-kit:<agent>`, spawn a subagent briefed with `${CLAUDE_PLUGIN_ROOT}/agents/<agent>.md`, or do
the step inline; ask questions in plain chat.

## Scripts and references

All in `${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/`, run with `bash` (they rely on real exit
codes) and `python3` on PATH. Each prints `KEY=value` lines; read the values instead of re-running
git to find them out.

| Script | Does |
| :-- | :-- |
| `context.sh` | workspace file, VCS host and CLI, branches, ticket key, auth, PR template, review guidelines — read-only |
| `preflight.sh` | conflict gate → sync-merge → writes the diff to review |
| `draft_pr.sh` | renders the PR title/body from the fixed template |
| `pr.sh create\|conflicts\|add-reviewers\|comment\|checks\|upload` | host calls, dispatched on `vcs.host` |
| `render_evidence.sh` | renders the "Demo & evidence" comment from the evidence manifest |
| `pr_inline.sh info\|post` | inline comments, anchors validated against the PR diff |
| `render_comment.sh` | renders the summary comment from the findings, verdict derived |

Exit codes: **0** ok · **2** missing prerequisite · **3** uncommitted changes under
`--dirty block` · **4** nothing to submit · **5** conflict → stop everything · **6** ask the user ·
**7** checks still running → poll again · **9** not available → continue and report it.

| Read | When |
| :-- | :-- |
| `references/configuration.md` | a resolved value looks wrong, needs overriding, or host auth is missing |
| `references/troubleshooting.md` | any unexpected exit or HTTP status |
| `references/review-handoff.md` | step 5, when a `/ai-kit:review story` hand-off exists |
| `${CLAUDE_PLUGIN_ROOT}/references/shared/severity-guide.md` | before grading any finding |
| `${CLAUDE_PLUGIN_ROOT}/references/shared/inline-comments.md` | drafting inline comments |

`references/` paths are relative to this skill's folder.

## Step 0 — Project rules and context

If not already in context, read `.ai-kit/workspace.json` and the repo's `AGENTS.md` chain
(contract: `${CLAUDE_PLUGIN_ROOT}/references/project-rules-contract.md`). From them you need:
`vcs.host`, `vcs.cli`, `vcs.defaultBranch`, `tracker.keyPattern`, `docsDir`, and the
**Commands**, **Git & PR** (PR template, reviewers, merge rules, paths that need an owner's
sign-off) and **Conventions** sections. Then:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/context.sh"
```

Note `VCS_HOST`, `VCS_HOST_FROM`, `HOST_AUTH`, `SOURCE_BRANCH`, `TARGET_BRANCH`, `TARGET_FROM`,
`TICKET`, `PR_TEMPLATE`, `REVIEW_GUIDELINES`, `WORKSPACE_ROOT`, `DOCS_DIR`.

**Target branch** resolves as `vcs.defaultBranch` → the **Git & PR** section → `origin/HEAD` →
`main` → `master` (the same order `/ai-kit:review` uses). The scripts read everything except the
prose section: when `vcs.defaultBranch` is unset and **Git & PR** names a target, prefix every
script call with `AI_KIT_TARGET_BRANCH=<that branch>`.

- `VCS_HOST_FROM=remote-url` → the host was guessed from `origin`; say so once and suggest saving
  `vcs.host` with `/ai-kit:setup-rules`.
- `VCS_HOST=other` → no supported host: the flow still runs steps 1–2 and renders the body, then
  hands the title and body to the user to open the PR by hand.
- `HOST_AUTH=no` → see `references/configuration.md` for the login the host needs; the user runs
  it. Never ask for a token in chat.

## Step 1 — Preflight: conflict gate, sync, diff

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/preflight.sh"
```

Pass `--dirty <value>` through when the arguments carry it. It checks the branch merges cleanly,
merges `origin/<target>` in if behind, and only then writes the diff.

- **exit 5** — conflict. **Stop.** Report the files and the resolution commands; no push, PR,
  checks, review or comment.
- **exit 4** — nothing to submit. Say so and stop.
- **exit 3** — only under `--dirty block`; say `--dirty auto` continues.

Uncommitted changes are the user's. **Never** commit, stash, discard or `git checkout --` them.
Preflight reports `DIRTY_ACTION`:

- **`proceed`** — carry on; in the step 3 confirmation say how many files stay behind.
- **`sync-skipped`** — `origin/<target>` was *not* merged in because the `DIRTY_OVERLAP_SYNC`
  files are edited locally. Say the review sees the branch without the target's latest commits,
  that the host's conflict check in step 3 still gates mergeability, and that
  `git stash push -- <those files>` then a re-run gets full fidelity. Offer it; don't run it.

Note `DIFF_FILE`, `DIFF_SHA`, `CHANGED_FILES_LIST`, `DIFFSTAT_FILE`. For a large diff read it per
file. Files in `DIRTY_OVERLAP_DIFF` are in the PR *and* edited locally: review the diff, mention
once that it isn't what's on disk.

## Step 2 — Static checks

Skip with `--no-typecheck`, and say so in the final report.

Take the typecheck, lint and build commands from the **Commands** section. Run them **only for
the modules / projects the changed files belong to** (the section says how the repo is split —
workspaces, packages, modules), never the whole monorepo. Run slow ones in the background and
carry on with step 3. No command in the rules → ask once which one to run, or skip and say so.

- An error **in a changed file** is a `blocking` finding (`file:line`, compiler message cut to
  one sentence). An error only in unchanged files is pre-existing: report it in chat, not as a
  finding.
- From the diff's added lines, record as `should-fix` unless a WHY comment justifies it:
  type-system escapes the language allows (`any`, `@ts-ignore`, unchecked casts,
  `# type: ignore`, `@SuppressWarnings("unchecked")`, `//nolint`) and non-null assertions on
  values that can be absent.

Write the findings in the contract (below) to `$(git rev-parse --absolute-git-dir)/pr-review/typecheck.tsv`.

## Step 3 — Create the pull request

**3a — Slot content from `ai-kit:solution-doc` (PR-body mode).** Resolve its inputs: `TICKET`
from step 0, `DOCS_DIR` = `<WORKSPACE_ROOT>/<DOCS_DIR>/<TICKET>` if it exists (else `none`),
`REPO` (basename of the repo root), `DIFF_FILE`, `CHANGED_FILES_LIST`, and
`OUT_DIR=$(git rev-parse --absolute-git-dir)/pr-review` (never `/tmp`). It is read-only and
returns `REQUIREMENT_FILE=`, `SOLUTION_FILE=`, `NOTES_FILE=`. **Fallback, never blocking:** no
ticket or nothing usable → write `--what` and `--why` yourself from the diff, and say which source
filled the body.

**3a+ — Evidence via `ai-kit:pr-evidence` — on by default.** Every run invokes it, once per repo.
Only `--no-evidence` skips it. Never skip it on your own judgment — a slow app, a sign-in, test
data, a small change: those are for `pr-evidence` to put to the user. Invoke it with `DIFF_FILE`,
`CHANGED_FILES_LIST`, `SOLUTION_FILE` (or your fallback `--what` file), `TICKET`, `DOCS_DIR`, and
`--demo` when given — **no `PR_ID` yet**. It returns a preview plus
`EVIDENCE=preview|none|failed`. Never blocking. Run it while the static checks run.

**3b — Render.**

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/draft_pr.sh" \
  --requirement "$REQUIREMENT_FILE" --what "$SOLUTION_FILE" --notes "$NOTES_FILE"
```

Omit `--notes` when `NOTES_FILE` is empty. Budgets — the script rejects anything over them:

- **`--requirement`** ≤ 3 bullets × 120 chars: what the business needs, in their terms.
- **`--what`** ≤ 5 bullets × 120 chars (*Solution*): one *behavioural* change per bullet — not per
  file, not per commit. More than five → tell the user the PR probably should be split.
- **`--why`** — fallback only, ≤ 240 chars; refused together with `--requirement`.
- **`--notes`** ≤ 3 bullets, optional: where a reviewer should look first. Never invent notes.

**The repo has its own PR template** (`PR_TEMPLATE`, or one described in **Git & PR**) → it wins:
put the same slot content into the template's sections, keep its checkboxes and headings, and
leave sections you have nothing for as the template's prompt rather than inventing content. Write
the result to the `BODY_FILE` path `draft_pr.sh` printed.

The meta line (`**PROJ-123** · feat · 7 files · +212/−48`) is derived; don't restate it and never
add a commit list.

**3c — Confirm, then create.** Show the title, the body and `source → target`, and **get the
user's confirmation** — creating a PR notifies reviewers. In the same message, one line each:
uncommitted files staying behind, `sync-skipped`, static-check errors from step 2 (they don't stop
the PR), the reviewers that will be requested, and an **`Evidence:`** line — `preview` with its
files (name, size) and where they go, `none` / `failed` with the reason, or `off (--no-evidence)`.
This one yes covers posting the evidence.

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/pr.sh" create --title "<title>" --body-file "<BODY_FILE>" [--reviewers "<a,b>"]
bash "${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/pr.sh" conflicts <PR_ID>
```

`create` pushes, opens the PR and prints `PR_ID`, `PR_URL`, `PR_STATE`. `existing` means an open
PR from this branch to the same target is reused read-only — its title, body and reviewers stay
as they are; say so when they differ from what was confirmed. `conflicts` asks the host; **exit 5
stops the flow** — no review, no comment.

Reviewers come from the **Git & PR** section (handles in the host's format). On a reused PR,
`pr.sh add-reviewers <PR_ID> --reviewers "<a,b>"` adds missing ones and removes nobody. None named
→ skip and mention it.

**3d — Post the evidence** (evidence `preview` only), as `ai-kit:pr-evidence` step 5 describes.
Same on a reused PR: the evidence is a comment, so it lands even when the body stays untouched.

## Step 4 — CI checks

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/pr.sh" checks <PR_ID>
```

It reads the checks the host already runs on the PR (GitHub checks, GitLab pipelines, Bitbucket
build statuses, Azure build policies) and prints `TESTS=passed|failed|still-running|not-run` and
`CHECKS_URL`. This flow never triggers a pipeline or a deploy.

- **exit 7** — still running; carry on with step 5 and call `checks <PR_ID> --wait` in step 6.
- **exit 9** — no checks reported. Offer to run the test command from the **Commands** section
  locally for the changed modules; with a yes, report `passed` / `failed` from that run and say it
  was local. Otherwise `not-run` with the reason.

## Step 5 — Review

Review **only the diff from step 1**. Findings file:
`$(git rev-parse --absolute-git-dir)/pr-review/findings.tsv`.

**5a — Reuse a prior review first.** `ai-kit:story` runs `/ai-kit:review story --pr-coming`
before this skill, leaving `<git-dir>/story-review/findings.tsv` and `handoff.env`. Check it
(one command) and follow `references/review-handoff.md`. **When its `DIFF_SHA` equals step 1's
`DIFF_SHA`, reuse those findings and skip 5b**, then offer inline comments through
`/ai-kit:pr-comment <PR_URL>`. Base mismatch, superseded or unverifiable → say which, then review
normally.

**5b — `/ai-kit:review pr <PR_URL>`.** It builds the PR diff from refs (read-only; never pushes,
merges or builds the branch) and applies the project rules — hand it `REVIEW_GUIDELINES` and the
**Conventions** and **Architecture & boundaries** sections as the repo's review criteria
(criteria only; skip any sync, push, build or reset steps they contain). It verifies with
parallel `ai-kit:code-reviewer` agents, grades with the severity guide, drafts inline comments,
validates every anchor, **shows the drafts and posts only on a yes**.

Hand it `typecheck.tsv` as findings already raised, so it doesn't repeat them; those land in the
summary comment only. Then write `findings.tsv`: the review's graded findings in the contract,
with `typecheck.tsv` appended.

### The findings contract

One finding per line, three TAB-separated fields: `<severity>	<file:line>	<one sentence>`

- **severity** — `security`, `blocking`, `should-fix` or `nit`. Nothing else. Grade with the
  severity guide: `security` is a real reachable weakness; `blocking` misbehaves in production;
  `should-fix` is real but the PR works; `nit` is style.
- **file:line** — or `-` for a finding about the PR as a whole.
- **one sentence** — ≤ 140 chars: what breaks and when. Not the fix, not a code block.

A checklist item *passing* is not a finding. An empty file is a valid, complete review; never
skip writing it.

## Step 6 — Summary comment and verdict

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/pr.sh" checks <PR_ID> --wait
bash "${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/render_comment.sh" --findings "<findings.tsv>" \
  --tests "$TESTS" --checks-url "$CHECKS_URL" --review-source "<source in words>"
bash "${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/pr.sh" comment <PR_ID> --file "<COMMENT_FILE>"
```

- `checks --wait` exit 7 → call it again; after two or three rounds render with `still-running`.
- `not-run` → add `--reason "<why>"`.
- **Review source in words:** `ai-kit:review pr + static checks`, naming the repo's own
  guidelines file when there was one; reused → the string from `review-handoff.md`.
- **Owner sign-off:** when **Git & PR** names paths that need a named owner's approval and the
  diff touches them, add `--signoff "<paths> changed — <owner> sign-off required before merge"`.
  It renders ⛔ Blocked until given.

`render_comment.sh` prints `VERDICT`, the per-severity counts and `COMMENT_FILE`, and derives the
verdict: security, blocker, sign-off or failed checks → **⛔ Blocked**; should-fix or unproven
checks → **⚠️ Needs attention**; otherwise **✅ Safe to merge**. Never edit the rendered file — if
the verdict looks wrong, the severities are wrong.

- `TESTS=passed` → post straight away.
- `failed`, `still-running` or `not-run` → **show the rendered comment and confirm first.**

## Finish — the verdict

Lead with one line, from `VERDICT`:

| `VERDICT` | Say |
| :-- | :-- |
| ✅ Safe to merge | **Safe to merge.** No security finding, no blocker, checks green, no pending sign-off |
| ⚠️ Needs attention | **Not yet — needs attention**, and the should-fix count, or why the checks are unproven |
| ⛔ Blocked | **Do not merge**, and the first reason: security, blocker, static-check error, red checks, or sign-off |

Then: PR URL (created or reused); body source; evidence (`posted` / `manual` / `none` / `failed`
/ `off`) with what was captured and the evidence folder as a link; counts per severity; inline
comments posted, skipped as duplicate, or declined; static-check result per module, or skipped;
CI status and link; review source (hand-off reused or why not); reviewers requested; anything
skipped and why — including files kept uncommitted and, on `sync-skipped`, that the review ran
without the target's newest commits.

If the flow stopped early, the last thing the user sees is the concrete next command to run.

This skill never approves, merges or closes the PR. That stays a human's click.
