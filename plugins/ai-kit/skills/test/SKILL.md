---
name: test
description: Write, fix and run tests in two modes — unit (Jest/Vitest + Testing Library, JUnit 5, pytest, Go, …) and E2E (Playwright-style specs, plus exploratory browser checks). Runner and commands come from project rules. Use whenever the user says "test", "run tests", "add tests", "write unit tests", "cover this", "check coverage", "E2E", "end-to-end", "Playwright", "UI test", "test this flow in the browser", "validate this works", or a failing spec needs attention — and whenever implementation work needs a RED test before the code. Use it even when the user only names a file or a flow and says "make sure it works".
user-invocable: true
metadata:
  argument-hint: "[unit | e2e] [file, component, flow or test path] [--coverage]"
---

# Test

Two modes. Each has its own reference — read only the one you need.

| Mode | Pick it when | Reference |
| :-- | :-- | :-- |
| **unit** | a function, hook, component, service, route handler or class in isolation; "unit test", "cover this", a `*.test.ts`, `*.spec.ts` beside source, `*Test.java` | `references/unit-mode.md` |
| **e2e** | a user flow across pages or services in a real browser; "E2E", "Playwright", "UI test", "test the flow", a spec under the repo's Playwright `testDir` | `references/e2e-mode.md` |

Arguments: `unit` / `e2e` pick the mode; `--unit` and `--ui` are accepted as aliases. No mode
given → infer from the request and the target path. Still unclear → unit, since it's faster,
and say that E2E is available. Both asked ("unit and E2E for the upload flow") → unit first,
then e2e, one report.

## Load project rules first

If not already in context, read `.ai-kit/workspace.json` and the `AGENTS.md` chain (workspace root down
to the repo under test), per `${CLAUDE_PLUGIN_ROOT}/references/project-rules-contract.md`. The
**Commands** section gives the test commands (all + single test); **Testing** gives framework, test
location, naming, coverage and test-data rules. Missing → detect from the runner config, ask once to
confirm, and suggest saving it with `/ai-kit:setup-rules`.

## Rules for both modes

These keep test runs fast and the user in control of their machine and CI budget:

- **Run only the tests for this task, by explicit file path.** Never the full suite, never a
  build, never a project-wide typecheck. The user runs those. A full run happens only when the
  user asks for it in this turn.
- **Read the repo's own conventions first.** The project rules above (they often fix test location
  and naming), the runner config (`jest.config.*`, `vitest.config.*`, `playwright.config.*`,
  `pom.xml`, `pyproject.toml`), any testing guide the rules point to, and the closest existing test. Copy the sibling's
  helpers and setup; take location and naming from the written rules when they disagree with old
  files. Repo conventions beat this skill.
- **RED before GREEN when writing tests for new or changed behavior.** Run the new test, watch it
  fail for the expected reason, then let the implementation make it pass. A test that never
  failed may test nothing. Under `ai-kit:tdd-dev-workflow` this is the tester's step.
- **Check the premise against the code, then keep going.** If the user says "X returns 'email'"
  and the code returns `''`, tell them in one line — but when the behavior they want is still
  clear ("should be null"), write the tests for that behavior anyway and note the mismatch in the
  report. Stop to ask only when the mismatch leaves the target behavior genuinely unclear (you
  can't tell which function, or what the correct result is). Stalling on a clear request costs
  the user a round trip for nothing.
- **Test behavior, not implementation.** Assert what a caller or user observes. Tests coupled to
  internals break on every refactor and catch nothing real.
- **No arbitrary sleeps.** Wait for the condition you need — see
  `../debug/references/condition-based-waiting.md`.
- **A failing test you didn't write is a bug report, not an obstacle.** Don't weaken assertions,
  skip, or `.only` it to get green. Diagnose with `ai-kit:debug`.
- **Test file location follows the repo's Testing rule** (e.g. a top-level `tests/` mirror); only
  when the repo has none, follow the closest existing test.
- **No code comments** in tests unless the user asks, and **no doc comments** (Javadoc, JSDoc, docstrings).
- **Name tests by behavior**, never by plan, spec, task or ticket: `it('returns 409 when the folder is locked')`, not `it('S2-AC3 rename')` or `testAC3()`. Map spec points to tests in the tracker / plan as `file › test name`.

## Workflow

**Delegate a larger test set.** More than a file or two of specs, or an E2E flow → hand steps 2–4
to an `ai-kit:tester` subagent with a self-contained brief (mode, target paths, cases or
acceptance criteria, runner command for one file, the scope rules above, the repo's Testing
section). Check its report before step 5.

> **Codex:** there are no named role agents — spawn a subagent briefed with `${CLAUDE_PLUGIN_ROOT}/agents/tester.md`, or do the steps inline. Without AskUserQuestion, ask in plain chat.

1. Pick the mode; read its reference.
2. Find the target and its closest existing test; note the runner command for one file.
3. Write or fix the tests (cases from the mode reference's checklist).
4. Run just those files. Show the command and the pass/fail lines.
5. Report with `references/report-template.md`.

`--coverage` → add the coverage flag to the same targeted run (`--coverage` for Jest/Vitest,
JaCoCo report for Maven) and report coverage for the touched files only.

<request>$ARGUMENTS</request>
