# Inline review comments on a PR

How a review's findings become comments on the exact line of a PR. `/ai-kit:review` (pr and story
mode) drafts them, `/ai-kit:pr-comment` validates and posts them. The VCS host and CLI come from
`vcs` in `.ai-kit/workspace.json`. Both read this one spec, so a draft written by
one is accepted by the other.

This is a **second output** of a review, not a replacement for the first. The findings list
(one sentence, max 140 characters, no fix) stays as it is. An inline comment
is written for the PR author and carries the fix, so it is drafted separately from the same
findings.

## When

- A PR exists for the diff that was reviewed: `/ai-kit:review story --pr <url>` or `/ai-kit:review pr <url>` on anyone's PR, or a
  branch review whose branch already has an open PR.
- The user asked for comments on the PR. Drafting is cheap; posting notifies the author.

**Always show the drafts and get a yes before posting.** Every time, own PR or not. Inline
comments are outward-facing and land in the author's inbox; a wrong anchor or a harsh line cannot
be taken back quietly.

## Draft file

JSON, written next to the review's other artefacts (inside the git dir, never the worktree):

```json
{
  "pr": "<PR URL>",
  "commit": "<PR source commit the anchors were checked against>",
  "inline": [
    {"id": "M1", "path": "src/orders/a.ts", "line": 342, "content": "**[Must fix]** Change: … Why: …"},
    {"id": "m3", "path": "src/orders/b.ts", "from_line": 12, "content": "**[Should fix]** Change: … Why: …"}
  ],
  "general": [
    {"id": "G1", "content": "**[Should fix]** Change: … Why: …"}
  ]
}
```

- `path` — repo-relative, exactly as the PR diff names the file.
- `line` — the line number in the **new** file (the PR's version). Use it for added and context
  lines. `from_line` instead anchors to a **removed** line, by its old-file number. Exactly one of
  the two.
- `id` — the finding's id from the review report, so a comment can be traced back.
- `commit` — the PR's source (head) commit at drafting time, read from the host's API or CLI.
  Posting refuses when the PR has moved past it.

## Anchoring

Most hosts (GitHub, GitLab, Bitbucket, Azure DevOps) only accept an inline comment on a line that
appears in the PR diff. A finding often
names a line that does not — the function signature above a changed body, a sensor configured
three hunks away. So, per finding:

1. Its line is an added or context line of the PR diff → anchor there.
2. It is not, but the finding is about code the diff changed → anchor on the nearest changed line
   in the same hunk that the finding is about, and name the original line in the text
   ("`KeyboardSensor` at line 158 …").
3. Nothing in the diff is a sensible anchor (a folder-layout point, a missing test, the PR as a
   whole) → put it in `general`.

Check every anchor against the diff yourself, with the line numbers from the PR's source commit,
not the local checkout: a line number off by one lands the comment on the wrong statement.
`ai-kit:pr-comment` re-checks all of them before posting and names any that miss.

**One comment per finding per place.** A finding that spans several files becomes one comment per
file. The same issue repeated within one file becomes one comment that lists the other lines
("also lines 52, 59, 96"), not a comment on each.

## Text

Plain, polite English, written to the author. Two parts, one to three sentences in total:

```
**[<label>]** Change: <what to change, concretely>. Why: <what it fixes or which rule it follows>.
```

| Finding severity (`severity-guide.md`) | Label |
| :-- | :-- |
| `security` | `Must fix · security` |
| `blocking` | `Must fix` |
| `should-fix` | `Should fix` |
| `nit` | `Nit` |

- **Change** names the fix: the API to call, the line to delete, where to move the type. Not
  "consider improving".
- **Why** gives the consequence or the rule: the bug it causes and when, or the rule it follows
  (a project-rules item, "WHY-comments only"). A rule id alone is not a why.
- No severity jargon beyond the label, no "as an AI", no restating the code back.
- Ask a question instead of asserting when the review could not tell ("Is keyboard drag meant to
  be supported here? If so, …").

## Showing the drafts

Before posting, show one table: `# · id · file:line · comment`, with the common path prefix taken
out and named once above it. Say how many are inline and how many general, and which anchors were
moved off the line the review report gave (rule 2 above) and why. Then ask whether to post. Accept
edits ("drop n4", "soften M1") and redraft before asking again.

## Posting

`/ai-kit:pr-comment` posts the file. It refuses to post anything when:

- the PR is not open, or its source commit is not the draft's `commit` — re-check the anchors on
  the new commit, update `commit`, show the changed rows, confirm again;
- any anchor is not on a line of the PR diff — fix it with the rules above.

It skips a draft whose identical text is already on the same line, so re-running after a partial
failure posts only what is missing. When comments go up under a shared or bot token, each one ends with a
`_Review by <git user.name>_` line; without it the author cannot tell who reviewed.
