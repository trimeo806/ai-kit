# Test Report Template

Use this template when writing a test/validation report.

---

```markdown
# tester: {Scope}

**Date**: {YYYY-MM-DD HH:mm}
**Agent**: tester
**Mode**: unit | e2e (spec) | e2e (exploratory)
**Plan**: `<docsDir>/{work-dir}/plan.md`     <- omit if standalone test run
**Status**: COMPLETE

---

## Executive Summary

{2-3 sentences: what was tested, pass rate, critical failures. Only targeted files were run — say so.}

---

## Methodology

| | |
|--|--|
| **Files Scanned** | `{path/to/test.spec.ts}` ({suite name, N tests}), `{path/to/impl.ts}` (implementation checked) |
| **Standards Source** | `test/SKILL.md` + `references/{unit,e2e}-mode.md`, project rules (Commands, Testing), closest sibling test, runner ({Jest/Vitest/JUnit/Playwright}) |
| **Command(s) run** | `{exact targeted command, e.g. npx jest path/to/file.spec.ts}` |
| **Coverage Gaps** | {e.g. "No coverage data available" or "Integration tests not in scope" or "None"} |

## Results

| Check | Result | Evidence |
|-------|--------|---------|
| {check name} | PASS | {file:line or test name; e2e: screenshot/trace path} |
| {check name} | FAIL | {error message} |
| {check name} | SKIP | {reason} |

## Coverage (if applicable)

- **Overall**: {X}%
- **Critical paths**: {X}%
- **Uncovered**: `{file}` lines {N}-{N}

## Failures Detail

### {FAIL-001}: {Check name}
- **Expected**: {behavior}
- **Actual**: {behavior}
- **Fix**: {suggestion}
- **File**: `{path/to/file.ts}` — delegate to developer

---

## Verdict

**{PASS | FAIL | PARTIAL}** — {one-line reason}

---

*Unresolved questions:*
- {question or "None"}
```
