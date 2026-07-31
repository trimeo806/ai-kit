# Deep Diagnosis Loop

> Adapted from [`mattpocock/skills`](https://github.com/mattpocock/skills) → `skills/engineering/diagnosing-bugs` (MIT, © 2026 Matt Pocock).

A discipline for **hard** bugs — the ones where reading code and guessing has already failed. Skip phases only with explicit justification.

Entry criteria and the split against the quick triage path live in `SKILL.md` → **Deep Diagnosis Routing**. When the quick path applies, do not load this file.

Before exploring, read `CONTEXT.md` (if it exists) for the domain model of the relevant modules, and check ADRs in the area you're touching.

## Phase 1 — Build a feedback loop

**This is the skill.** Everything else is mechanical. With a **tight** pass/fail signal that goes red on *this* bug, you will find the cause — bisection, hypothesis-testing, and instrumentation all just consume it. Without one, no amount of staring at code will save you.

Spend disproportionate effort here. **Be aggressive. Be creative. Refuse to give up.**

### Ways to construct one — try roughly in this order

| # | Loop | Use when |
|---|------|----------|
| 1 | Failing test at whatever seam reaches the bug (unit/integration/e2e) | A seam exists |
| 2 | Curl / HTTP script against a running dev server | HTTP boundary |
| 3 | CLI invocation with fixture input, diff stdout vs known-good snapshot | CLI/codegen |
| 4 | Headless browser script (Playwright/Puppeteer) asserting DOM/console/network | UI bug |
| 5 | Replay a captured trace — save a real request/payload/event log, replay in isolation | Prod-only data shape |
| 6 | Throwaway harness — minimal subset of the system, mocked deps, one function call | System too big to boot |
| 7 | Property / fuzz loop — 1000 random inputs, look for the failure mode | "Sometimes wrong output" |
| 8 | Bisection harness — automate "boot at state X, check, repeat" for `git bisect run` | Appeared between two known states |
| 9 | Differential loop — same input through old vs new version (or two configs), diff outputs | Regression |
| 10 | HITL bash script — `scripts/hitl-loop.template.sh` drives the human; captured output feeds back | **Last resort** only |

Build the right feedback loop, and the bug is 90% fixed.

### Tighten the loop

Treat the loop as a product. Once you have *a* loop, tighten it:

- **Faster?** Cache setup, skip unrelated init, narrow test scope.
- **Sharper signal?** Assert the specific symptom, not "didn't crash".
- **More deterministic?** Pin time, seed RNG, isolate filesystem, freeze network.

A 30-second flaky loop is barely better than no loop. A 2-second deterministic one is a superpower.

### Non-deterministic bugs

Goal is not a clean repro but a **higher reproduction rate**. Loop the trigger 100×, parallelise, add stress, narrow timing windows, inject sleeps. 50% flake is debuggable; 1% is not — keep raising the rate.

### When you genuinely cannot build a loop

Stop and say so. List what you tried. Ask the user for one of:

- access to an environment that reproduces it
- a captured artifact (HAR, log dump, core dump, timestamped screen recording)
- permission to add temporary production instrumentation

Do **not** proceed to hypothesise without a loop.

### Completion criterion — a tight loop that goes red

Phase 1 is done when you can name **one command** — a script path, a test invocation, a curl — that you have **already run at least once** (paste the invocation and its output), and that is:

- [ ] **Red-capable** — drives the actual bug code path and asserts the **user's exact symptom**. Not "runs without erroring".
- [ ] **Deterministic** — same verdict every run (flaky: pinned high reproduction rate).
- [ ] **Fast** — seconds, not minutes.
- [ ] **Agent-runnable** — runs unattended; human only via `scripts/hitl-loop.template.sh`.

If you catch yourself reading code to build a theory before this command exists, **stop** — jumping straight to a hypothesis is the exact failure this loop prevents. No red-capable command, no Phase 2.

## Phase 2 — Reproduce + minimise

Run the loop. Watch it go red.

Confirm:

- [ ] The failure mode matches what the **user** described — not a nearby one. Wrong bug = wrong fix.
- [ ] Reproducible across multiple runs (or at a high enough rate to debug against).
- [ ] Exact symptom captured (error message, wrong output, timing) so later phases can verify the fix.

### Minimise

Shrink to the **smallest scenario that still goes red**. Cut inputs, callers, config, data, and steps **one at a time**, re-running after each cut.

Why: a minimal repro shrinks the Phase 3 hypothesis space and becomes the Phase 5 regression test.

Done when **every remaining element is load-bearing** — removing any one makes the loop go green.

Do not proceed until reproduced **and** minimised.

## Phase 3 — Hypothesise

Generate **3–5 ranked hypotheses** before testing any. Single-hypothesis generation anchors on the first plausible idea.

Each must be **falsifiable** — state its prediction:

> "If `<X>` is the cause, then `<changing Y>` makes the bug disappear / `<changing Z>` makes it worse."

No stateable prediction = a vibe. Discard or sharpen.

**Show the ranked list to the user before testing.** Domain knowledge re-ranks instantly ("we just deployed a change to #3") or rules items out. Cheap checkpoint, big saver. Don't block — proceed with your ranking if the user is AFK.

See `problem-solving` for complementary techniques (5 Whys, bisection, inversion).

## Phase 4 — Instrument

Each probe maps to a specific Phase 3 prediction. **Change one variable at a time.**

| Priority | Tool |
|----------|------|
| 1 | Debugger / REPL inspection — one breakpoint beats ten logs |
| 2 | Targeted logs at the boundaries that distinguish hypotheses |
| ✗ | Never "log everything and grep" |

**Tag every debug log** with a unique prefix, e.g. `[DEBUG-a4f2]`. Cleanup becomes a single grep. Untagged logs survive; tagged logs die.

**Perf branch.** For performance regressions logs are usually wrong. Establish a baseline measurement (timing harness, `performance.now()`, profiler, query plan), then bisect. Measure first, fix second.

## Phase 5 — Fix + regression test

Write the regression test **before the fix** — but only if a **correct seam** exists.

A correct seam exercises the **real bug pattern as it occurs at the call site**. If the only available seam is too shallow (single-caller test when the bug needs multiple callers; unit test that can't replicate the triggering chain), a test there gives false confidence.

**If no correct seam exists, that is itself the finding.** The architecture is preventing the bug from being locked down. Record it for Phase 6.

If a correct seam exists:

1. Turn the minimised repro into a failing test at that seam.
2. Watch it fail.
3. Apply the fix.
4. Watch it pass.
5. Re-run the Phase 1 loop against the original (un-minimised) scenario.

Note: `/debug` explains and proposes; applying the fix is `/fix`. When running the loop end-to-end under `/fix`, steps 3–5 execute here.

## Phase 6 — Cleanup + post-mortem

Required before declaring done:

- [ ] Original repro no longer reproduces (re-run the Phase 1 loop)
- [ ] Regression test passes (or absence of a correct seam is documented)
- [ ] All `[DEBUG-...]` instrumentation removed (grep the prefix)
- [ ] Throwaway harnesses deleted, or moved to a clearly-marked debug location
- [ ] The hypothesis that proved correct is stated in the commit / PR message — so the next debugger learns

**Then ask: what would have prevented this bug?** If the answer is architectural (no good test seam, tangled callers, hidden coupling), hand off to `/audit --architecture` with the specifics. Make that recommendation **after** the fix lands — you know more now than when you started.

Gate the "done" claim through `verification-before-completion`.

## Related

- `SKILL.md` → Deep Diagnosis Routing — when to enter this loop
- `scripts/hitl-loop.template.sh` — human-in-the-loop driver (Phase 1, option 10)
- `references/condition-based-waiting.md` — replace `sleep()` with condition polling when tightening a loop
- `problem-solving` — root cause techniques
- `audit --architecture` — Phase 6 architectural handoff
