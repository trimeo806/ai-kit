---
name: test
description: Use when user says "run tests", "add tests", "check coverage", "write unit tests", or "validate this works" — detects platform and runs the appropriate test suite (Jest, XCTest, JUnit, Espresso)
user-invocable: true
metadata:
  argument-hint: "[--unit | --ui | --coverage | test description]"
---

# Test — Unified Test Command

Run tests with automatic platform detection.

## Platform Detection

Detect platform per `skill-discovery` protocol.

## Arguments

- `--unit` — unit tests only
- `--ui` — UI/E2E tests only
- `--coverage` — include coverage report
- Test target name — run specific target

## Execution

1. Detect platform
2. Route to platform-specific agent
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

**IMPORTANT:** Analyze the skills catalog and activate needed skills for the detected platform.
