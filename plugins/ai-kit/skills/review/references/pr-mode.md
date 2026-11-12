# PR mode — review a pull request, draft comments, post on your yes

Reviews an open PR, yours or a teammate's. It follows the project rules, the review checklist and the
code-review standards, drafts comments that improve the code on the PR's exact lines, and posts
them only after you approve the drafts.

**Strictly read-only on git and the remote:**
- never check out, merge into, push or reset the PR's branch;
- the working tree stays as it is — it may be on the default branch with uncommitted files.

The host and CLI come from `vcs` in `.ai-kit/workspace.json` (`github`/`gh`, `gitlab`/`glab`,
`azure-devops`/`az`, `bitbucket`, …). Missing → infer from the PR URL, confirm once, and suggest
saving it with `/ai-kit:setup-rules`. Posting goes through `/ai-kit:pr-comment`, which owns the
host API calls and token handling.

## 1. Read the PR

With the host CLI or API, read: id, state, source branch, source (head) commit, target branch,
author, title and description. For example `gh pr view <url> --json
number,state,headRefName,headRefOid,baseRefName,author,title,body`, or
`glab mr view <id> --output json`. No CLI and no API access → ask the user for the branches.

State not open → say so, and ask whether to review anyway without comments. Write the PR's intent in
one sentence. If you can't, the first comment is a question to the author.

## 2. Build the diff from refs

Run git in the PR's repo, never touching the worktree:

```bash
git fetch origin "<SOURCE_BRANCH>" "<TARGET_BRANCH>"
git rev-parse "origin/<SOURCE_BRANCH>"                 # must equal SOURCE_COMMIT; else the PR moved: fetch again
mb=$(git merge-base "origin/<TARGET_BRANCH>" "<SOURCE_COMMIT>")
git diff --name-only "$mb...<SOURCE_COMMIT>"; git diff --stat "$mb...<SOURCE_COMMIT>"
```

A fork PR whose branch is not on `origin`: fetch the host's PR ref instead (GitHub
`pull/<id>/head`, GitLab `merge-requests/<id>/head`).

`$mb...<SOURCE_COMMIT>` is the same diff the host shows. Read files at the PR's version with
`git show <SOURCE_COMMIT>:<path>`, and tell every subagent to do the same. Get the ticket key from
the branch or title (`tracker.keyPattern`). If `<docsDir>/<TICKET-KEY>/solution.md` exists at the
workspace root, read it as the spec.

## 3. Load the rules

Everything in `SKILL.md`'s table:
- **Project rules** — the repo's `AGENTS.md` chain and any review guide it names: **criteria only**.
  Never run a repo script that syncs, pushes, builds or resets on someone else's branch.
- **Code-review standards** — the full pass.
- **Language lens** — the `language-lens.md` sections for the languages in the diff.
- **Security lens** — `security-frontend.md` / `security-backend.md` sections for the
  security-sensitive changed files.

## 4. Review

Local mode's steps 3–6 on the PR diff:
- think through the edge cases;
- spec compliance, when a spec exists;
- parallel `ai-kit:code-reviewer` agents with the pasted rules;
- consolidate and grade with the severity guide.

Review the **changed lines** only; a placement rule on an edited file is the one exception.

A caller may hand in findings it already has, such as `ai-kit:pr-submit`'s own. Treat them as
raised: don't duplicate them, and leave them out of the drafts.

## 5. Draft the comments

Follow `references/shared/inline-comments.md`. It defines the drafts file, the anchoring rules, the
`**[Must fix · security | Must fix | Should fix | Nit]** Change: … Why: …` text, and the labels mapped
from the severity guide.
- **One comment per finding per place.** Anchor it on a changed line of the PR diff; if that's not
  possible, it goes in `general`.
- **Write to improve the code.** Name the concrete change, and give the consequence or the rule.
  Use `feedback-examples.md` for tone: specific, actionable, a question where you're not sure. Add a
  code suggestion when it fits in three lines.

Write the drafts file next to the review's other artefacts inside the git dir
(`$(git rev-parse --absolute-git-dir)/pr-review/<id>/drafts.json`), with `commit` set to the source
commit. Check every anchor against `$mb...<SOURCE_COMMIT>` yourself; `/ai-kit:pr-comment` validates
again before posting.

## 6. Show, then wait for your yes

Show:
- the verdict line;
- the counts per severity;
- the drafts table (`# · label · file:line · comment`, common path prefix named once), with any
  re-anchored row marked.

Then ask: post all, edit, or drop some. **Never post without a yes.** On edits, redraft and show the
changed rows.

## 7. Post

Hand the drafts file to `/ai-kit:pr-comment`. It re-checks the commit and every anchor, skips
comments already on the PR word for word, and posts one comment per draft.
- The PR moved → re-anchor on the new commit and show the changes.
- A partial failure → report it. Re-running is safe; what landed is skipped.

## 8. Report

`report-template.md`, with:
- the PR URL and the commit reviewed;
- inline comments posted, general comments posted, and duplicates skipped.

The verdict is **advice** (Approve / Request changes / Comment). Don't set it on the host.
