# Plan drift — taxonomy and recovery (ticket mode)

Read this when reality and the plan disagree, which happens in most runs at least once. Paste the
gate rule and D1–D8 into developer and tester prompts: subagents cannot ask the user, so anything
that is not mechanical comes back to the orchestrator as a stop.

## The gate rule

> **Auto-adjust only when the change is mechanical AND the acceptance criteria, the file-set
> boundary and the reuse source are all unchanged. Everything else stops and asks — before code is
> written.**
>
> **Every deviation gets a `### Drift` entry in the implementation log. An unlogged deviation is a
> defect in the run.**

Asking costs the user a minute. Improvising silently produces a branch whose diff no longer matches
the plan the reviewer approved, and nobody finds out until the PR or later.

## Taxonomy

### D1 — A path in `Files to change` does not exist

The most common drift, which is why preflight's `FILES_RESOLVED` front-loads it.

First rule out a prefix mismatch: a workspace-level plan may write `<repo>/src/...` while
preflight checks against the module repo root. If every path is missing, strip the repo folder
prefix and re-check before calling anything drift.

Then look for the move: `git -C <repo> log --follow -- <old-path>` and grep for the symbol the plan
expects there. A high-confidence match with the same substance (moved or renamed, same code) →
**auto-adjust, log it, mention it at the pause**. No match, or the code changed shape → **stop and
ask**: a plan written against code that no longer exists may be wrong beyond the path.

### D2 — An API or signature differs from what the plan assumed

Mechanical adaptation with the ACs unchanged (an extra argument you can supply, a renamed method, a
promise where the plan expected a value) → adjust and log. If it changes the approach, or the AC
cannot be met the planned way → **stop and ask before writing code**. Writing first and explaining
afterwards presents a fait accompli instead of a decision.

### D3 — The step is already done

Usually a foundation or sibling ticket shipped it. **Never silently skip.** Prove it: cite
`path:line` and a passing test that shows the behaviour exists. Pause with a *skip proposed* report
and let the user confirm. Log as `skipped (already done)` with the evidence. "Already done" is also
what a step looks like when it has been misunderstood.

### D4 — The step is too big

Propose the split **at the start of the step**, not halfway, and add `N` / `N+1` rows to the log.
No permission needed (granularity, not scope), but announce it at the pause so the numbering in the
log stays legible.

### D5 — A prerequisite is missing or unverifiable

The backend does not support the call, a permission cannot be confirmed, a flag does not exist.
**Fail closed.** Do not ship a guessed implementation behind a hopeful comment. Mark the step
`blocked`, name exactly what must be verified and who can answer, and stop. If later steps do not
depend on it, offer to continue with those and leave the blocked one for the end.

### D6 — Scope creep: a real bug nearby

Do not fix it here. Record it under `### Out-of-scope observations` and surface it at handoff so it
becomes a ticket. A fix outside the plan makes the step's diff unreviewable and lands untested
against any AC.

### D7 — An AC cannot be achieved as written

**Stop and ask.** Propose the AC edit with the evidence. Never implement something that misses the
AC and call the step done: the AC is what the cross-test checks, so a silently unmet criterion
becomes a failed cross-test instead of a conversation. An approved AC edit goes through
`amend plan:` and keeps its number in the AC map.

### D8 — A `Verification` command is wrong

The plan names a script or task that does not exist, or a stale flag. Find the right one in the
repo's Commands section or its build config (`package.json`, `Makefile`, `pom.xml`, …), use it, log it
as minor drift. A step verified by a command that errored
is a step not verified. The workspace scope rule still applies: if the plan's command is a full
suite, a build or a project-wide typecheck, do not run it; list it for the user at handoff.

## Recovery procedures

### Resuming after context loss or a new session

1. Re-read the plan file, including `## Implementation log`.
2. `git -C <repo> log --format='%h %s%n%b' origin/<base>..HEAD` and read the `Plan-Step: N/M`
   trailers.
3. Reconcile: **git wins on "does this code exist"**; the log wins on skips, blocks, splits and
   drift, which git cannot express. A verification-only step produces no commit, which is why the
   log exists.
4. Steps in the plan's `## Steps` that have no log row (e.g. a `### Converge — <date>` block from
   `/ai-kit:review converge`) → append them as `pending` rows, with their ACs in the
   `### AC map`. This applies even when the log says `complete`.
5. Report the reconciliation in one line if they disagreed, set `Status: in-progress`, and resume at
   the first row that is neither `done` nor `skipped`.

### Undoing a step the user asked to skip after it was committed

- Tip commit: offer `git reset --hard HEAD~1`; never run it unprompted.
- Commits on top: `git revert <sha>`. Rewriting history under later work costs more than the extra
  commit.

Update the row to `skipped` with the reason, and mark the now-uncovered AC in the AC map so the gap is
visible at handoff, not in cross-test.

### `amend plan:`

The one sanctioned exception to append-only on the plan file.

1. Edit only the section the user named. AC numbers are never reused or renumbered; a removed AC is
   struck through, a new one gets the next free number.
2. Record before/after under `### Drift`.
3. Reload the current step from the amended plan and restart it at the micro-plan.

If the amendment is really a scope change (new ACs, a different architecture), recommend re-running
`/ai-kit:plan <TICKET-KEY>` instead. Patching a plan into a different plan loses the research
that made the original coherent.

### Verification cannot run at all

If the test runner will not start for reasons unrelated to the change (broken lockfile, missing
generated file), confirm it was already broken with `git stash`, report it and stop. Inherited
breakage is reported, never adopted, and never fixed as a drive-by.
