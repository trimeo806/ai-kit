---
name: test
description: Use when user says "run tests", "add tests", "check coverage", "write unit tests", or "validate this works" — detects the runner and executes the appropriate suite (Vitest, Jest, Playwright, go test, pytest)
user-invocable: true
metadata:
  argument-hint: "[--unit | --ui | --coverage | test description]"
---

# Test — Unified Test Command

Run tests with automatic runner detection.

## Runner Detection

| Signal | Runner | Skills |
|--------|--------|--------|
| `vitest.config.*` | Vitest | `web-testing` |
| `jest.config.*` | Jest | `web-testing` |
| `playwright.config.*` | Playwright | `playwright-expert` |
| `*_test.go` / `go.mod` | `go test` | `golang-pro` |
| `pytest.ini` / `conftest.py` | pytest | `fastapi-python` |
| `*.test.cjs` under `__tests__/` | Node (custom harness) | — |

Fall back to `skill-discovery` protocol if no marker matches.

## Arguments

- `--unit` — unit tests only
- `--ui` — UI/E2E tests only
- `--coverage` — include coverage report
- Test target name — run specific target

## Execution

1. Detect runner
2. Route to `tester` with the matching skills
3. Run appropriate test commands
4. Report results with pass/fail counts and coverage

## Output Format

Use `references/report-template.md` for all test reports.

Key requirements:
- Header: Date, Agent, Plan (if applicable), Status
- Executive Summary first
- Results table with Check, Result (PASS/FAIL/SKIP), Evidence
- Coverage section when coverage data available
- Verdict: `PASS` | `FAIL` | `PARTIAL`
- Unresolved questions footer always present

<request>$ARGUMENTS</request>

**IMPORTANT:** Analyze the skills catalog and activate needed skills for the detected runner.
