# Configuration reference

Read this when a value needs overriding, when a resolved value looks wrong, or when the host's
login is missing. A normal run needs nothing beyond the project rules.

The scripts live in `${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/`. Each value resolves as
**env var → `.ai-kit/workspace.json` → what git can tell** and `context.sh` prints what it picked
plus where it came from (`VCS_HOST_FROM`, `TARGET_FROM`).

## Values

| Env var | workspace.json | Fallback | Purpose |
| :-- | :-- | :-- | :-- |
| `AI_KIT_VCS_HOST` | `vcs.host` | guessed from the `origin` URL | `github` · `gitlab` · `bitbucket` · `azure-devops` · `other` |
| `AI_KIT_VCS_CLI` | `vcs.cli` | `gh` / `glab` / `az` / `none` by host | informational; the scripts dispatch on the host |
| `AI_KIT_TARGET_BRANCH` | `vcs.defaultBranch` | `origin/HEAD`, then `main`, then `master` | PR destination |
| `AI_KIT_DIRTY` | — | `auto` | what to do about uncommitted changes (below) |
| `AI_KIT_REVIEWERS` | — | the **Git & PR** section | reviewers for `pr.sh add-reviewers` when `--reviewers` is not given |
| — | `tracker.keyPattern` | `[A-Z][A-Z0-9]+-[0-9]+` | finds the ticket key in the branch name |
| — | `docsDir` | `docs` | where `<KEY>/` work folders live |

`workspace.json` is found by walking up from the repo root, so one file serves every repo in a
multi-repo workspace. A repo on a different host than the workspace default: set
`AI_KIT_VCS_HOST` for that run, or ask the owner to record the exception in the repo's
`AGENTS.md` and pass it explicitly.

## Host login

The user runs these; never type a password or token for them, never ask for one in chat.

| Host | Needs | Check |
| :-- | :-- | :-- |
| GitHub (incl. Enterprise) | `gh auth login` | `gh auth status` |
| GitLab (incl. self-managed) | `glab auth login` (`--hostname` for self-managed) | `glab auth status` |
| Azure DevOps | `az login` plus `az extension add --name azure-devops` | `az account show` |
| Bitbucket Cloud | `BITBUCKET_TOKEN` in the environment; add `BITBUCKET_USER` (Atlassian account email) for a personal API token | `context.sh` → `HOST_AUTH=yes` |

**Bitbucket token scopes:** `pullrequest:write` on top of `repository:write` (read/write
repository and pull request scopes for a personal API token). A token with only
`repository:write` pushes branches fine and then gets 403 on PR creation — the most common setup
problem. A 404 on the repo's API means the token is scoped to a different project or workspace.
The scripts pass the token to `curl` through a `0600` config file, so it never appears in argv,
output or the transcript. Keep it that way.

## Uncommitted changes

Nothing in this flow ever commits, stashes or discards local work. The policy only decides how
`preflight.sh` reacts; `--dirty <value>` overrides the env var for one run.

| Value | Behaviour |
| :-- | :-- |
| `auto` (default) | Run. Skip the sync-merge only for paths the incoming target commits also write (`DIRTY_ACTION=sync-skipped`), since `git merge` would refuse those anyway. |
| `allow` | Run, same as `auto`. |
| `block` | Refuse to run while anything is uncommitted (exit 3). |

`preflight.sh` prints `WORKTREE`, `DIRTY_POLICY`, `DIRTY_TRACKED`, `DIRTY_UNTRACKED`,
`DIRTY_FILES`, `DIRTY_OVERLAP_SYNC` (in the merge's way), `DIRTY_OVERLAP_DIFF` (in the PR *and*
edited locally) and `DIRTY_ACTION`.

## PR body and review criteria

- `context.sh` reports `PR_TEMPLATE` when the repo has one of the usual template files
  (`.github/pull_request_template.md`, `.gitlab/merge_request_templates/Default.md`, …). A
  template, or one described in the **Git & PR** section, wins over the default body.
- `REVIEW_GUIDELINES` is a repo-local review checklist (`CODE_REVIEW.md`, `docs/code-review.md`,
  …). It goes to `/ai-kit:review pr` as criteria, alongside the **Conventions** and
  **Architecture & boundaries** sections of the project rules.

## Artifacts

Everything the flow writes lives in `<repo>/.git/pr-review/` (`diff.patch`, `diffstat.txt`,
`changed-files.txt`, `pr-title.txt`, `pr-body.md`, `comment.md`, `typecheck.tsv`,
`findings.tsv`, raw host responses). Inside `.git/`, so it is never committed. Inline-comment
drafts sit in `pr-<id>/` under the same folder.
