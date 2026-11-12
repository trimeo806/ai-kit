# Converge mode — close the gap between the spec and the code

Compares what `spec.md`, `plan.md` and `tasks.md` call for against what the codebase implements now.
Every spec point that isn't built, or is only partly built, becomes a new traced task appended to
`tasks.md`, so `/ai-kit:tdd-dev-workflow` can finish it. Adapted from Spec Kit `/converge`.

Run it:
- after implementation, before story review or a PR;
- after `spec.md` changed mid-implementation;
- when a branch was built without the plan, or drifted from it.

The spec is the source of intent. The code is evidence. This mode never edits code.

## Inputs

- The plan dir `<docsDir>/<intention-name>/`: `spec.md` and `tasks.md` required, `plan.md` read for the test plan
  and decisions.
- A ticket folder `<docsDir>/<TICKET-KEY>/` (or a ticket key): `spec.md` when present, else the plan's
  `## Acceptance criteria`. The plan's `## Steps` play the role of `tasks.md`.
- Scope: the repo, or the branch diff when `--diff <base>` is given. The diff only narrows where to
  look first. A spec point built outside the diff still counts as built.

## Steps

1. **Inventory the spec.** List every `US*-AC*`, `FR-*` (including `FR-U-*` unchanged behavior),
   `EC-*` and `SC-*` that needs buildable work. Skip post-launch business metrics.
2. **Assess each point.** Dispatch `ai-kit:code-reviewer` with the spec points (text + ID),
   the test plan rows, the repo path and the scope. Do not include the implementation narrative. It
   returns, per point:

   `<ID> · built | partial | missing | contradicted · <evidence file:line> · <test file › name or "no test"> · <what is missing>`

   A point counts as **built** only when the code at `file:line` does it **and** its test from the
   plan exists. Do not run the full suite here: name the test, and leave the targeted run to tdd.
3. **Check the other direction.** List code in scope that traces to no spec point and no task. It is
   either a plan gap (the spec is missing something real) or over-engineering. Name which. Also list
   **boundary crossings**, measured against the plan's `## Boundaries` and the spec's `OOS-*`:
   - changed files outside the Change surface;
   - changed files inside Do not touch;
   - code that implements an `OOS-*`.
   Fold all of this into the same subagent call.
4. **Draft new tasks** for every `partial`, `missing` and `contradicted` point. Use the plan skill's
   format, test first:

   ```markdown
   ## Converge — YYYY-MM-DD
   - [ ] T041 [US2] Write failing test for US2-AC3 in src/x.test.ts  [Trace: US2-AC3]
   - [ ] T042 [US2] Handle expired session in src/x.ts  [Trace: US2-AC3]
   ```

   In ticket mode, append numbered steps under `### Converge — YYYY-MM-DD` at the end of
   `## Steps` instead. Continue the step numbering, each step citing its AC. `tdd-dev-workflow` ticket
   mode picks them up as rows that aren't `done` yet.

   Continue the existing T-numbering. Never edit, renumber or reopen existing tasks. A `[x]` task
   whose point is now `missing` gets a new task, and the report names the regression.
5. **Show, then write.** Show in the session:
   - a coverage table: ID, status, evidence;
   - the draft tasks;
   - the untraced code.

   On the user's yes:
   - append the tasks under `## Converge — <date>` in `tasks.md` (ticket mode: the steps block in the
    plan file's `## Steps`);
   - append one Plan-gap log row in `plan.md` per gap the spec or plan missed (not per task left
     undone). A ticket plan without that section gets `## Plan-gap log` appended at its end.
6. **Report:**
   - convergence % (built ÷ buildable points);
   - counts per status;
   - grade, using the severity guide:
     - a `missing` or `contradicted` P1 point is `blocking`;
     - P2/P3, `EC-*` and `SC-*` gaps are `should-fix`;
     - untraced code is `should-fix` (over-engineering) or a spec question;
     - a file outside the Change surface is `should-fix`: widen the surface in `plan.md` with a
       trace, or revert;
     - a change inside Do not touch, or code implementing an `OOS-*`, is `blocking`;
   - the next step:
     - `/ai-kit:tdd-dev-workflow` (on `tasks.md`, or `<TICKET>` in ticket mode) when tasks were
       added. It appends the new tasks to its tracker or log and resumes;
     - `/ai-kit:review story` when convergence is 100%.

## Rules

- **Never edit code, `spec.md` or existing tasks.** The only writes are the appended converge block
  (in `tasks.md`, or in the ticket plan's `## Steps`) and Plan-gap log rows, both only after a yes.
- A spec point that is ambiguous comes back as a question, not a task. Its fix is a spec change via
  the plan skill.
- Zero gaps is a valid result. Report it with the coverage table, not as "nothing to do".
