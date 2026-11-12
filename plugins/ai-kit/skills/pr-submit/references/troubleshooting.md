# Troubleshooting

Read this when a script exits non-zero and the message alone doesn't make the next move obvious.
Every script prints `KEY=value` lines before it fails, so the values it already resolved are
visible above the error.

## Exit codes

| Code | Meaning | What to do |
| :-- | :-- | :-- |
| 0 | success | continue |
| 1 | bad usage / contract violation | fix the invocation (`--help` on any script) or the input file |
| 2 | missing prerequisite | usually host login or a CLI not installed — see `configuration.md` |
| 3 | uncommitted changes under `--dirty block` | relax the policy (`--dirty auto`) — never touch their files |
| 4 | nothing to submit | on the target branch, or no commits ahead — stop and say so |
| 5 | merge conflict | **stop the whole flow**: no push, PR, review or comment |
| 6 | needs a human decision | show the choice and ask; then re-run |
| 7 | checks still running | call `pr.sh checks <id> --wait` again, or report them as still running |
| 9 | not available | continue the flow and report what was not done, with the reason |

5 means stop, 6 means ask, 9 means carry on with a caveat. Treating a 9 as fatal loses a PR that
was otherwise fine; treating a 5 as a warning creates a PR nobody can merge.

## Merge conflicts

`preflight.sh` exits 5 with `CONFLICT=local` before it touches anything; `pr.sh conflicts` exits
5 after the PR exists. Both mean the branch does not merge into the target. Report the files and
hand it back:

```bash
git fetch origin && git merge origin/<target>
```

then resolve, commit, push and re-run `/ai-kit:pr-submit`. Two gates exist because the local
check compares against the last-fetched target while the host checks the real one. A clean local
check plus a conflicted host check is expected, not a bug. `CONFLICT=unknown` means the host had
not computed mergeability yet; carry on and say so.

## Uncommitted changes you want to keep

Keeping files local is supported. The review diff is `git diff --merge-base origin/<target> HEAD`
and `pr.sh create` pushes commits, so uncommitted work can't reach the PR. The one thing it can
break is the sync-merge, and only for paths the incoming commits also write:

| `DIRTY_ACTION` | What happened | What to do |
| :-- | :-- | :-- |
| `proceed` | dirt, none of it in the merge's way | nothing; mention the files stay local |
| `sync-skipped` | `DIRTY_OVERLAP_SYNC` files are edited locally, so `origin/<target>` was **not** merged in | continue; say the review ran without the target's newest commits |
| `blocked` (exit 3) | `--dirty block` | `--dirty auto` for this run |

To get the full picture on `sync-skipped`, the user can stash only the overlapping files and
re-run (`git stash push -- <files>`, then `git stash pop` afterwards). Never do that for them
without being asked.

## Host errors

| Symptom | Cause | Do |
| :-- | :-- | :-- |
| `gh` / `glab` / `az` "not logged in", HTTP 401 | no login on this machine | the user runs the login from `configuration.md` |
| Bitbucket 403 on create or comment | token lacks `pullrequest:write` | mint a token with the scope; nothing in the flow can work around it |
| Bitbucket 404 on the repo | token scoped to another project or workspace | mint one on the right project |
| `glab` 404 on `projects/:id` | `origin` points at a mirror or the CLI's default host differs | run inside the right clone, or `glab auth login --hostname <host>` |
| `az devops invoke` "extension not found" | azure-devops extension missing | `az extension add --name azure-devops` |
| `unsupported VCS host 'other'` | host not recognised | set `vcs.host` with `/ai-kit:setup-rules`, or open the PR by hand with the rendered body |

## A PR already exists for this branch

`pr.sh create` looks for an open PR from this branch to the target first. If it finds one it
prints `PR_STATE=existing`, reuses that PR and writes nothing to it. This is the normal path when
re-running after a fix — say so in the report, and that the new title and body were not applied.
If the lookup itself fails, `create` stops instead of creating blind (on Bitbucket a blind create
would overwrite the open PR and clear its reviewers).

## No CI checks (`pr.sh checks` exit 9)

The host reports no checks for the PR: CI is not set up for it, or not on this host. Offer to run
the **Commands** section's test command locally for the changed modules. Never trigger a pipeline
or deploy job by name — a wrong job can deploy.

## Inline comments refused (`pr_inline.sh`)

| Output | Meaning | Do |
| :-- | :-- | :-- |
| `BAD_ANCHORS` (exit 1) | a draft's line is not in the PR diff | re-anchor per `references/shared/inline-comments.md`, dry-run again |
| exit 6 | the PR moved or closed since the drafts were anchored | re-anchor on the new `SOURCE_COMMIT`, show the changed rows |
| `FAILED_AT=<id>` | stopped at that draft; `POSTED_FILE` lists what landed | fix the cause, re-run: drafts already on the PR are skipped |
| exit 2 | CLI or login missing | as **Host errors** above; nothing was posted |

## `draft_pr.sh` or `render_comment.sh` exits 1

These are the format contracts refusing input, not a bug:

| Message | Fix |
| :-- | :-- |
| `--what has more than 5 bullets` | Merge related ones. Six unrelated things → tell the user the PR should be split. |
| `--what bullet N is 137 chars, the limit is 120` | One behavioural change per bullet. A bullet that long is usually two bullets or an implementation detail. |
| `--why is 300 chars, the limit is 240` | Two sentences. The rest belongs in the ticket. |
| `--requirement has more than 3 bullets` | Keep the business need, drop the detail. |
| `--requirement and --why both given` | The requirement already states why. Drop `--why`. |
| `findings line N is 172 chars, the limit is 140` | Say what breaks and when, not how to fix it. |
| `findings line N has unknown severity 'critical'` | Only `security`, `blocking`, `should-fix`, `nit`. |
| `findings line N has no field separator` | Three fields per line, TAB-separated (` | ` also works). |

Don't work around a rejection by editing the rendered file — it is regenerated on the next run.

## The verdict looks wrong

`render_comment.sh` derives it and takes no override. ⛔ Blocked you disagree with means a
finding is graded `security` or `blocking` that shouldn't be — fix the severity and re-render.
Unrun or still-running checks never produce ✅, by design.
