---
name: pr-comment
description: Post review findings as inline comments on the exact changed lines of a pull request / merge request on GitHub, GitLab, Bitbucket Cloud or Azure DevOps (plus general comments for what has no line), after showing the drafts and getting the user's yes. Works on any open PR, the user's own or a teammate's, from its URL. Use when a review's findings should go onto a PR — "add these as inline comments", "comment on the lines", "post the review to the PR" — or when /ai-kit:review or /ai-kit:pr-submit hands over findings or a drafts file.
argument-hint: "<pr-url> [--file <drafts.json>]"
---

# Post inline review comments on a PR

Arguments this run was invoked with: `$ARGUMENTS`

This skill posts; it does not review. The findings come from a review — `/ai-kit:review` (pr or
story mode), `/ai-kit:pr-submit`'s findings file, or a review already in this session.

Read `${CLAUDE_PLUGIN_ROOT}/references/shared/inline-comments.md` first. It defines the drafts
file, the anchoring rules, the comment text and the approval rule this skill enforces.

The script is `${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/pr_inline.sh`, run with `bash` (needs
`python3`). It recognises the host from the PR URL — GitHub `/pull/<n>`, GitLab
`/-/merge_requests/<n>`, Bitbucket `/pull-requests/<n>`, Azure DevOps `/pullrequest/<n>` — and
drives `gh`, `glab`, REST with `BITBUCKET_TOKEN`, or `az devops invoke`. It never checks out,
fetches into or pushes the author's branch. A bare PR id works inside the repo, using `vcs.host`
from `.ai-kit/workspace.json`. Azure DevOps diffs are built from the local clone, so run it inside
the repo there.

Missing CLI or login (exit 2) → the user runs the login listed in
`${CLAUDE_PLUGIN_ROOT}/skills/pr-submit/references/configuration.md`. Ask questions in plain chat
when AskUserQuestion is unavailable (Codex).

## Step 1 — Read the PR

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/pr_inline.sh" info "<pr-url>"
```

Note `VCS_HOST`, `STATE`, `SOURCE_COMMIT`, `SOURCE_BRANCH`, `TARGET_BRANCH` and `WORKDIR`
(`WORKDIR/pr.json` holds the normalised title and description). A PR that is not `OPEN` takes no
comments: say so and stop.

## Step 2 — Get the drafts

- **A drafts file was handed over** (`--file`, or the calling review named it): use it. If its
  `commit` is not `SOURCE_COMMIT`, the PR moved after the review. Say so, and re-check the anchors
  against the new diff before going on.
- **Only findings** (in the session, or a findings file such as
  `<git-dir>/pr-review/findings.tsv` or `<git-dir>/story-review/findings.tsv`): draft the file
  from them, following the spec, into `WORKDIR/drafts.json`, with `commit` set to
  `SOURCE_COMMIT`. Anchor against the PR's own diff: `WORKDIR/pr.diff` once a dry run has fetched
  it, or `git show <SOURCE_COMMIT>:<path>` for the file itself. Never use the local checkout's
  line numbers.

## Step 3 — Validate, show, confirm

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/pr_inline.sh" post "<pr-url>" --file "<drafts.json>" --dry-run
```

Nothing is sent. `BAD_ANCHORS` (exit 1) names every draft whose line is not in the PR diff.
Re-anchor them using the spec's rules, then dry-run again until it is clean. Exit 6 means the PR
moved or closed since drafting; handle it as in step 2.

Then show the table the spec describes, with `TO_POST` and `SKIPPED_DUPLICATE` (already on the
PR word for word), and ask whether to post. **Always ask, and wait for a yes**, on the user's own
PR as much as a teammate's. Apply any edits, dry-run again, and show the changed rows.

## Step 4 — Post

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/pr_inline.sh" post "<pr-url>" --file "<drafts.json>"
```

The script re-checks the commit and every anchor, then posts one comment per draft. Add
`--reviewer "<name>"` only when the comments go out under a shared or bot account, so the footer
names the human reviewer.

- **`POSTED` equals `TO_POST`** → done.
- **`FAILED_AT=<id>`** → it stopped at that draft; `POSTED_FILE` lists what landed. Report the
  error. Once the cause is fixed, re-run the same command: drafts already on the PR are skipped.

## Finish

Report the PR URL, how many inline and general comments were posted and how many skipped as
duplicates, and the commit they are anchored on. Say that this skill did not approve the PR or
request changes. It never does: that verdict is the reviewer's to give on the host.
