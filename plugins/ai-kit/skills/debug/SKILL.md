---
name: debug
description: Use when user says "debug", "trace this", "diagnose", "it crashes", "why is this failing", "root cause", or pastes a stack trace, failing test output or an error log — and before proposing ANY fix for a bug, test failure, flaky test, build failure or unexpected behavior. Runs a four-phase systematic investigation (root cause → pattern → hypothesis → fix) and refuses to guess. Use it even when the bug looks obvious or the user is in a hurry.
user-invocable: true
tier: core
metadata:
  argument-hint: "[issue description, error log or failing test path]"
  agent-affinity:
    - debugger
    - developer
  keywords:
    - debug
    - error
    - bug
    - troubleshoot
    - root-cause
    - stack-trace
    - flaky
    - crash
    - exception
    - regression
  platforms:
    - all
  triggers:
    - /debug
    - error
    - bug
    - crash
    - exception
---

# Debug — Systematic Root-Cause Debugging

Random fixes waste time and create new bugs. A quick patch hides the real problem until it
comes back somewhere worse. So this skill finds the root cause first, every time — including
for bugs that look simple, because simple bugs have root causes too and the process is fast
for them.

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

Until Phase 1 is done, do not propose a fix. Not "a quick one to try", not "probably this".

## How this skill runs

- **Project rules first** — if not already in context, read `.ai-kit/workspace.json` and the
  `AGENTS.md` chain (workspace root down to the affected repo), per
  `${CLAUDE_PLUGIN_ROOT}/references/project-rules-contract.md`. Stack, run/test commands, log
  locations and environments that must never be touched come from there. Missing → ask once and
  suggest saving it with `/ai-kit:setup-rules`.
- **User-invoked `/debug`** → diagnose and explain. Run Phases 1–3, then present the root cause
  with evidence and the proposed fix. Implement it (Phase 4) only after the user says yes.
- **Dispatched with a fix list** (e.g. by `ai-kit:review` local mode, step 7) → run all
  four phases per item; the yes is already given. Phase 4 discipline still applies: failing test
  first, one change at a time, stop at three failed attempts.
- **Platform** — the Stack section names it; otherwise detect from project files (`package.json`,
  `pom.xml`, `go.mod`, extensions). Load matching domain skills from the session if they exist.
- **Tests** — run only the tests that touch the bug, by explicit file path, using the Commands
  section's single-test command. Never the full suite, never a build, unless the user asks.

## Phase 1 — Root cause investigation

Complete before anything else.

**Delegate a wide investigation.** When phases 1–3 span several files, services or logs, hand them
to an `ai-kit:debugger` subagent with a self-contained brief (symptom, exact error,
repro command, repo dir, what was ruled out, the repo's Commands section). Keep the Phase 4 yes/no
gate in the main session.

> **Codex:** there are no named role agents — spawn a subagent briefed with `${CLAUDE_PLUGIN_ROOT}/agents/debugger.md`, or run the phases inline. Without AskUserQuestion, ask in plain chat.

1. **Read the error completely.** Whole stack trace, line numbers, file paths, error codes,
   warnings above the error. The message often names the fix.
2. **Reproduce consistently.** Exact steps, exact command, every time? If it won't reproduce,
   gather more data — don't guess.
3. **Check recent changes.** `git log`, `git diff`, new dependencies, config, env differences.
   In a multi-repo workspace, run git inside the affected repo (`git -C <repo>`).
4. **Instrument component boundaries** when the system has layers (UI → API route → backend
   service → DB, CI → build → deploy). Log what enters and leaves each boundary, run once, and
   let the evidence show *which* layer breaks. Then investigate that layer only.
5. **Trace data flow backward** when the error surfaces deep in the call stack. Where did the bad
   value originate? Who called this with it? Keep going up until the source; fix there, not at
   the symptom. Full technique: `references/root-cause-tracing.md`.

Output of Phase 1: a sentence of the form "X happens because Y, at `file:line`", backed by
evidence you observed — not inferred.

## Phase 2 — Pattern analysis

1. **Find a working example** of the same thing in this codebase.
2. **Read the reference completely** if you're following a pattern or library — every line, not a
   skim. Use current official docs for the library version in use.
3. **List every difference** between working and broken, however small. Don't decide in advance
   that one "can't matter".
4. **Map dependencies** — config, env, providers, ordering assumptions the code relies on.

## Phase 3 — Hypothesis and testing

1. **One hypothesis, written down:** "I think X is the root cause because Y."
2. **Test it minimally** — the smallest change, one variable at a time.
3. **Confirmed** → Phase 4. **Refuted** → new hypothesis from the new evidence. Never stack a
   second change on top of a failed one.
4. **Don't know?** Say "I don't understand X" and gather more evidence or ask. Pretending costs
   more than admitting.

## Phase 4 — Fix (on a yes, or when dispatched with a fix list)

1. **Failing test first** — the simplest reproduction as an automated test (or a one-off script
   where no framework exists). Watch it fail for the right reason. Use `ai-kit:test` (unit mode).
2. **One fix, at the source.** No "while I'm here" refactors, no bundled changes. The code follows
   the repo's Conventions and Architecture sections.
3. **Verify** — the new test passes, the neighbouring targeted tests still pass, the original
   symptom is gone. Show the output before claiming it's fixed.
4. **Harden when the bad data crossed layers** — validate at each layer it passed through so the
   bug becomes impossible, not just fixed: `references/defense-in-depth.md`.
5. **Fix didn't work?** Count attempts.
   - Fewer than 3 → back to Phase 1 with what you just learned.
   - **3 or more → stop and question the architecture.** Each fix revealing a new problem
     elsewhere, or needing a large refactor, means the pattern is wrong, not the hypothesis.
     Raise it with the user before attempt #4.

Flow chart (authoritative): `references/debugging-flow.dot`.

## Red flags — stop and return to Phase 1

If you catch yourself thinking any of these, the process has been skipped:

| Thought | Reality |
|---|---|
| "Quick fix now, investigate later" | The first fix sets the pattern. Do it right from the start. |
| "Just try changing X and see" | That's guessing. One hypothesis, one minimal test. |
| "It's probably X, let me fix that" | Seeing a symptom ≠ knowing the cause. Show the evidence. |
| "Several changes at once, then run tests" | You can't tell which one worked, and you may add bugs. |
| "Skip the test, I'll check manually" | Untested fixes don't stick. The failing test proves the cause. |
| "The reference is long, I'll adapt the pattern" | Partial understanding guarantees bugs. Read it all. |
| "Issue is simple / it's an emergency" | Systematic is faster than thrashing, especially under pressure. |
| "One more fix attempt" after 2+ failures | Three failures is an architecture problem. Stop. |

User signals that you're off-track: "Is that actually happening?", "Will it show us…?", "Stop
guessing", "We're stuck?". Treat each as a return to Phase 1.

## Techniques for common situations

- **State bugs** (stuck loading, wrong transition, races in `useState`/`useReducer`, async chains,
  WebSocket lifecycle): draw the ACTUAL state machine from the code and the EXPECTED one from the
  requirements, then diff them. Missing transitions, unguarded transitions and dead states are the
  bug. Notation: `../plan/references/state-machine-guide.md`.

  ```
  ACTUAL:   [LOADING] ──(timeout)──▸ [LOADING]     ← stuck, no error path
  EXPECTED: [LOADING] ──(timeout)──▸ [ERROR] ──(retry)──▸ [LOADING]
  ```

- **Flaky or timing-dependent tests**: replace `sleep`/`waitForTimeout` with waiting on the real
  condition — `references/condition-based-waiting.md`.
- **A test pollutes state and you don't know which one**: bisect the test files with
  `scripts/find-polluter.sh <path-that-appears> '<test glob>'`.
- **Deployed service errors**: pull the logs first (the log source named in project rules, or the
  cloud provider's log CLI; see `ai-kit:infra-cloud`) — Phase 1 evidence, not guesses about
  production. Read-only; never touch an environment the Security & data section protects.
- **Explaining the call chain to the user**: render it with `ai-kit:less-words-more-arrows`.

## When the investigation finds "no root cause"

If the cause really is environmental, timing or an external system: document what you checked,
add handling (retry, timeout, clear error), and add logging so the next occurrence is diagnosable.
Be suspicious first — most "no root cause" conclusions are incomplete investigations.

## Report

```markdown
## Debug — <symptom in one line>

**Root cause:** <X happens because Y> — `file:line`
**Evidence:** <log line, failing test output, trace step that proves it>
**Reproduction:** <exact command / steps>
**Fix (proposed | applied):** <one change, where, why it addresses the cause>
**Verification:** <test path + result>  | not yet — awaiting yes
**Hardening:** <defense-in-depth layers added, or "none needed">
**Unresolved questions:** <or "None">
```

## References

- `references/root-cause-tracing.md` — backward tracing through the call stack, stack-trace instrumentation
- `references/defense-in-depth.md` — validation at every layer once the root cause is fixed
- `references/condition-based-waiting.md` — replace arbitrary sleeps with condition polling
- `references/debugging-flow.dot` — the four-phase flow, including the 3-failed-fixes stop
- `scripts/find-polluter.sh` — find the test that creates unwanted files or state

Methodology adapted from obra/superpowers `systematic-debugging` (MIT).

<issue>$ARGUMENTS</issue>
