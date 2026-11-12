# A worked run (ticket mode) — PROJ-123

Read-once calibration for the shape of a whole ticket-mode run and the texture of its decisions,
especially the ones where the flow stops rather than proceeds. Nothing in the loop needs this mid-run.

Input: *"implement PROJ-123"*, from the workspace root; repo `web-app` on `main`.

**Plan and preflight.** T0 found `docs/PROJ-123/plan.md` at the workspace root, outside the repo.
`preflight.sh` (run inside `web-app` with the absolute plan path) parsed 7 steps and reported
`FILES_RESOLVED=0/8`. Every path missing meant a prefix mismatch, not drift: the plan wrote
`web-app/src/...`. Stripped, 7/8 resolved; the one miss was a moved file, named at kickoff as D1.
`PLAN_FILE_IGNORED=no` was ignored because the plan is not in the repo, and `--exclude-plan` was not
passed. The kickoff echoed the 7 steps and the plan's 10 numbered ACs. The user shortened the slug
when shown `PR_TITLE=PROJ-123 private folder management`, which is why the title is shown before
the branch exists.

**Log.** The implementation log went under the plan with `Status: in-progress`, 7 rows `pending`,
and an AC map of 10 rows, one per plan AC, numbers unchanged.

**Step 1 of 7.** A backend-verification step with no code. Confirmed against staging, evidence in the
step block, marked `done` with no commit, paused. Git alone cannot represent this step.

**Step 2 of 7.** Tester mirrored the sibling's spec, wrote `S2-AC1` and `S2-AC2`, and saw both fail on
the missing `createFolder`. Developer made them pass and ran `simplify`; reviewer found nothing
blocking; tester verified with the related tests and lint on the changed files only. The pause
reported the red-proof and the verbatim result line. User replied `mine`.

**Step 3 of 7.** The path in `Files to change` did not exist. `git log --follow` found the rename with
identical substance: mechanical D1, auto-adjusted, logged under `### Drift`, mentioned at the pause.

**Step 5 of 7.** Phase 4 went red. Classified **(a)**: the guard returned 409 where AC-6 says 403. The
code was wrong, not the test; back to the developer. 409 was *nearly* right, and the prior ("the test
came from ACs the user agreed on; the code came from minutes ago") is what settled it.

**Step 6 of 7.** The developer's `Craft` line read `peak: 39/8/4 → 16/3/1 (extracted
assertRenameable)` and three ticket-narrating comments were deleted; the one explaining the backend's
ambiguous 409 stayed. A self-caught simplification showing as before → after is this working.

**Done check.** `done_check.sh` was clean on integrity but reported `ACCRETED_FILES=adapter.ts`.
Re-reading its current state found `handleAction` at 34/8/3 although every step report had been
honest. The developer extracted a helper in one new `feat(...)` commit, not `refactor:`, because the
newest subject sets the PR's kind. 9 of 10 ACs mapped to passing tests; AC-10 (copy across four
locales) is a manual E2E item. The full-suite, typecheck and build commands from the repo's Commands
section were handed to the user to run; nothing full-suite ran here. `Status: complete`, worktree
clean, nothing pushed; handed off to `/ai-kit:review story`.
