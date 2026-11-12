# Local mode — review your implementation

Reviews code that isn't in a PR yet: your uncommitted work, your branch, or files you name. The
review runs in `code-reviewer` agents, so it sees the code with fresh eyes, not the reasoning that
produced it.

## 1. Scope

- **Named files, a component or a module** → review those, whole. No diff.
- **Otherwise** → the branch against its base (`git merge-base HEAD origin/<base>`), plus
  uncommitted changes (`git diff`, `git status`). Resolve the base the way pr-submit will:
  `vcs.defaultBranch` in `workspace.json` → the Git & PR section → `origin/HEAD` → `main` → `master`.
  Several candidates and no clear default → ask. Name the base in the report.
- In a workspace that isn't itself a git repo, run git inside the repo that owns the files (`git -C <repo>`).

Read the plan file, ticket or acceptance criteria if there is one. Write the intent in one sentence.
If you can't, ask before reviewing.

## 2. Load the rules

From `SKILL.md`'s table: the project rules first, then the checklist sections for the file types in
scope, the language lens for each language, the code-review standards (default pass), and the
security lens (`security-frontend.md` / `security-backend.md`) for security-sensitive files.

## 3. Think through the edge cases

List them before anyone verifies:
- null / undefined;
- boundaries: empty, zero, max, off-by-one;
- error paths, async ordering and races;
- input validation, auth, resource leaks;
- untested branches;
- every applicable rule ID.

```markdown
### Category: [area]
1. [edge case] → files: [a.ts, b.ts] · rule: LOGIC-001
```

## 4. Spec compliance (when there is a spec)

Per `spec-compliance-review.md`:
- Read the code, not the summary.
- Each requirement is ✅ met at `file:line`, or ❌ expected X, found Y.
- Any ❌ is reported first, as `blocking`.
- When the plan has a `## Test cases` section, check it against the criteria: a case no criterion
  covers, or a criterion no case exercises, is a `should-fix`.

## 5. Verify in parallel

Group the edge cases by area, at most 6 groups, one **`ai-kit:code-reviewer`** agent per
group. Each prompt carries:
- the files;
- its edge cases to **verify**, not discover;
- the pasted rule sections for those files, plus the `language-lens.md` section for their language;
- the `feedback-examples.md` tone notes;
- never the implementation narrative: how the code came to be is what the fresh eyes are for.

```
Verify these edge cases against the pasted rules. Static review: run no tests, no build, edit nothing.
For each edge case: Handled (how) / Unhandled (missing) / Partial (improve).
Then any other rule violation in these files, one per line:
<proposed severity> · <file:line> · <what breaks and when, one sentence> · <rule id or doc §> · <fix, one sentence>
Ambiguous → report it as a question, don't guess.
```

## 6. Consolidate and grade

- Deduplicate, keeping the most specific citation.
- Grade every finding with `severity-guide.md`: the agent's severity is only a proposal.
- Run the **full pass** (`code-review-standards.md`) on the affected files as soon as a `security`
  or `blocking` finding appears.

## 7. Fix (only on a yes)

"Found N issues (B blocking). Fix them? [Y/n]". On yes, dispatch `ai-kit:debugger` with the
list. The fixes follow the same rules, including the project's placement conventions.

Then **one** re-review: one `code-reviewer` checks each previous issue against the fixed files —
resolved, still open, or regression. Still open → report and stop. There's no third loop.

## 8. Report

`report-template.md`, in the session. Offer a commit only if step 7 changed files, and only on a yes.
