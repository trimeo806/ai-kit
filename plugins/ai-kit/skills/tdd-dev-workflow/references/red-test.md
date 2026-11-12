# Test integrity — red-proof, bent tests, and what to do when a test goes red

Paste this file into every tester and developer prompt. The orchestrator reads the *Case (c)* and
*Three attempts* sections when a subagent returns with a stop.

The standing requirement, in the user's words:

> "Make sure the unit tests are covered, tests are useful and the idea of unit test is to verify
> the code, DO NOT CHANGE THE TEST TO MAKE IT GREEN ONLY"

A suite bent until it passed is worse than no suite. No suite is *honestly* unverified; a bent one
tells the reviewer and the cross-tester that behaviour is proven when nothing was. **The goal is not
a green run. The goal is a suite that would go red if the code broke.**

Where tests live, how they are named and how mocks are structured belong to the repo rules
(the Testing section of its `AGENTS.md`). This file is only about whether they are
worth running.

## What a useful test looks like

- **Every AC maps to at least one test, and you can name which.** In ticket mode the ACs are Gherkin:
  *Given* is the arrange, *When* the act, *Then* the assertion. A scenario that will not translate
  cleanly usually means the test sits on the wrong seam.
- **Assert the outcome, not the choreography.** `expect(renameMock).toHaveBeenCalled()` proves a call,
  not that the folder was renamed. Assert the arguments *and* the result.
- **Cover the guards, not just the happy path.** Many ACs are guards: system folder protected,
  no subscription, name too long, 403. A unit with only its happy path tested is half-covered.
- **Mirror the sibling.** When the plan's `Reuse map` names a shipped sibling, open its spec file
  first and copy its structure, mock helpers and naming.
- **Read the count, not the colour.** Check `Tests: N passed` and confirm N rose by the number of
  tests you added. `passWithNoTests` makes a pattern that matches nothing green.

## Red-proof: see it fail

A test that also passes against the old code proves nothing, and reading it cannot tell you so. Only
watching it fail can.

- **Default (Phase 1):** write the test before the production change, run the targeted command, and
  confirm it fails **for the expected reason**: an assertion or the missing behaviour, not a syntax,
  import or wiring error. Minimal stubs or types to make it compile are allowed and listed.
- **When the shape does not exist yet** (an adapter or wiring with no seam to test against, where a
  test against an imagined API is the one that gets "adjusted" later): the tester records
  `RED evidence: deferred — <reason>`. After Phase 2, Phase 4 proves it by temporarily reverting or
  breaking the production change, running the same command, confirming red, and restoring. Both
  runs go into the evidence.
- A test that stays green without the production change is not testing this task. Rewrite it.

## Moves that turn a test into decoration

| Move | What it costs |
| :-- | :-- |
| `.skip` / `xit` / a stray `.only` / deleting a case | The failure is still there, now invisible and unowned. `.only` silently drops the rest of the file. |
| `expect.anything()` / `toBeTruthy()` where the value is known | Asserts that *something* happened. `toBeTruthy()` passes for `"error"`, `{}` and `-1`. |
| Loosening `toEqual` to `toMatchObject`, or widening a tolerance | That field *was* the finding. Now nothing watches it. |
| Snapshot `-u` without reading the diff | Re-records the bug as expected output. |
| Editing the fixture until it matches the output | The same move, one level down. |
| `jest.mock`-ing the unit under test | The test now asserts that your mock is your mock. |
| try/catch around the call, or `.resolves` where it should reject | Converts a failure into a pass. Use `await expect(fn()).rejects.toThrow(X)`. |
| Raising `jest.setTimeout`, sleeping or retrying to settle a flake | Silences a race that will fire in CI. Fix the `await` / `act`. |
| Narrowing the run to the green files and reporting green | A report about a subset presented as a report about the suite. A targeted run is fine *because* the report labels it as targeted. |
| A missing `await`, or an assertion inside an `if` that never fires | Passes without executing. `expect.assertions(n)` catches it. |

`as any`, `@ts-expect-error`, `@ts-ignore` and `eslint-disable` added to clear a check are the same
offence: the error was a defect report about the code, and the move deletes the report.

## When a test goes red

1. **Read the actual failure**: assertion, expected vs received, top stack frame, *which* test. Five
   failures with one root cause are a different fix from five unrelated ones.
2. **Classify it as exactly one of:**
   - **(a) the code is wrong**: behaviour does not match the AC;
   - **(b) the harness is wrong**: a mis-wired mock, missing provider, stale path alias. *What* is
     asserted is fine; *how the unit is exercised* is broken;
   - **(c) the expectation is wrong**: the test demands behaviour the AC do not ask for.
3. **Start at (a) and stay there until evidence moves you.** The test came from ACs the ticket and
   the user agreed on; the code came from minutes ago and nobody has reviewed it. "The test must be
   wrong" is exactly what a bug feels like from the inside.
4. **(b): fix it and disclose it** in the step report. It does not change what counts as correct, so
   it needs no permission, but a mock rewired the wrong way is how a test quietly stops testing.
   The developer never makes (b) fixes; it returns them to the orchestrator, which routes them to
   the tester.
5. **(c): full stop.** The subagent does not edit the test. It returns to the orchestrator with the
   evidence below, and the orchestrator asks the user.
6. **Never fix the code and relax the test in the same move.** If both change and it goes green,
   nobody can say which one did it.

## Case (c): changing what counts as correct

An expectation only changes when the test demands behaviour the ACs do not ask for, or contradict.
Not when it is inconvenient, not when the code is nearly right.

The orchestrator brings the user one message with all four of:

1. **The failing output, verbatim.**
2. **The AC line the test contradicts, quoted.** If none can be found, this is not (c); it is (a).
3. **Both expectations side by side**, current and proposed.
4. **One sentence on why the old expectation is wrong.** If the honest sentence is about cost or
   effort, it belongs in (a).

Then wait for an explicit yes. "Looks fine" about the step is not consent to change a test's
meaning. Once approved, the tester makes the change, and it is recorded in the step report's
`Test expectations changed:` line, in the tracker or log, and in the commit body:

```
Test expectation changed: tests/.../rename-folder.test.ts — expected 409 → 403
(AC: "Then the folder is not renamed and a permission error is shown"); approved by user.
```

## Three attempts, then stop

If a failure cannot be classified, or three honest fixes have not turned it green, the subagent
stops and reports the failure, what it tried and what it thinks is going on. A pause costs the user
two minutes; a bent test costs an incident months later. No fourth attempt "just trying something".
That is where the loosened assertion comes from.

## Inherited red

A test that was already failing before the change is not yours to adopt or delete. Confirm it with
the same targeted command, never the full suite:

```bash
git -C <repo> stash
<targeted test command>
git -C <repo> stash pop
```

Already red: say so in the report, name the test, leave it alone, and log it under
`### Out-of-scope observations` (ticket mode) or the task's notes. Green before the change: it is
yours, and you are in case (a).
