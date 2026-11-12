# Reusing a review that already ran

`/ai-kit:review story --pr-coming` (run by `ai-kit:story` before pr-submit) reviews the branch
without opening a PR. It writes its findings in pr-submit's findings contract plus a record of the
diff it reviewed, under `$(git rev-parse --absolute-git-dir)/story-review/`:

- `findings.tsv` — the findings, one per line;
- `handoff.env` — `SCHEMA`, `BASE_BRANCH`, `MERGE_BASE`, `HEAD_SHA`, `DIFF_SHA`, `REVIEWED_AT`,
  `REVIEW_SOURCE`. Written last, so its presence proves the review finished: an empty
  `findings.tsv` then reads as "reviewed, found nothing".

The PR usually goes up days later, in another session, so read it off disk:

```bash
d="$(git rev-parse --absolute-git-dir)/story-review"; cat "$d/handoff.env" 2>/dev/null; ls -l "$d/findings.tsv" 2>/dev/null
```

Nothing there is the ordinary case. When `handoff.env` exists, take the **first case that
applies**:

| Case | Meaning | Do |
| :-- | :-- | :-- |
| `DIFF_SHA` equals preflight's `DIFF_SHA` | same diff | **reuse** (below) |
| shas differ, `BASE_BRANCH` ≠ this run's `TARGET_BRANCH` | **base mismatch**: the runs measured against different bases | name both branches and `TARGET_FROM`; if the PR target is wrong, `AI_KIT_TARGET_BRANCH` or `vcs.defaultBranch` fixes it. Review normally now |
| shas differ, same base | **superseded**: the diff moved | a `HEAD_SHA` that is not the current `HEAD` means commits were added; a changed `MERGE_BASE` means the base moved, including preflight's own sync-merge. Say which, review normally |
| `findings.tsv` without `handoff.env`, or `SCHEMA` not `1` | **unverifiable** | never reuse; say so in one line, review normally |

The sha match is the entire safety condition — findings about a diff the reviewer will never see
are worse than no findings.

## Reuse

- Copy `$d/findings.tsv` into the findings file and render with
  `--review-source "prior /ai-kit:review story (<REVIEW_SOURCE>, <REVIEWED_AT>)"`.
- An empty file is a complete review that found nothing — do not re-review it.
- If `render_comment.sh` rejects the file (unknown severity), the hand-off is malformed: drop it
  and review normally rather than editing it.
- **Inline comments** — the reuse path skips `/ai-kit:review pr`, so offer the findings as inline
  comments through `/ai-kit:pr-comment <PR_URL>`, which drafts them against the PR's own diff,
  shows the drafts and posts only on a yes.
