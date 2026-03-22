# Test Report Template

Use this template when writing a test/validation report.

---

```markdown
# tester: {Scope}

**Date**: {YYYY-MM-DD HH:mm}
**Agent**: tester
**Plan**: `plans/{dir}/plan.md`     <- omit if standalone test run
**Status**: COMPLETE

---

## Executive Summary

{2-3 sentences: what was tested, pass rate, critical failures}

---

## Methodology

| | |
|--|--|
| **Files Scanned** | `{path/to/test.spec.ts}` ({suite name, N tests}), `{path/to/impl.ts}` (implementation checked) |
| **Knowledge Tiers** | L1 docs/ ({found/not found}), L2 RAG ({available/unavailable}), L4 Grep ({used/not needed}) |
| **Standards Source** | `test/SKILL.md`, project test conventions from `docs/conventions/`, platform test runner ({Jest/XCTest/JUnit}) |
| **Coverage Gaps** | {e.g. "No coverage data available" or "Integration tests not in scope" or "None"} |

## Results

| Check | Result | Evidence |
|-------|--------|---------|
| {check name} | PASS | {file:line or test name} |
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
