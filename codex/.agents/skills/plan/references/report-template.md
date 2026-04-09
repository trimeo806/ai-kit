# Plan Report Template

Use this template when writing a plan summary report.

---

```markdown
# planner: {Plan Title}

**Date**: {YYYY-MM-DD HH:mm}
**Agent**: planner
**Plan**: `plans/{dir}/plan.md`
**Status**: COMPLETE

---

## Executive Summary

{2-3 sentences: what was planned, scope, approach}

---

## Problem Context

> Skip if this plan builds new functionality rather than resolving an existing problem.

- **What**: {problem being addressed}
- **Root Cause Analysis**:
  - *Causal chain*: {why it occurs — sequence of conditions that led to this work}
  - *Ownership*: {which system, component, or team is the trigger point}
- **Severity**: High | Medium | Low

---

## Approaches Considered

> Include when 2+ viable approaches were evaluated. If only one exists, note why alternatives were ruled out.

| Approach | Pros | Cons | Impact on Current System | Selected |
|----------|------|------|--------------------------|---------|
| {approach} | | | {technical, business, risk, or migration impact} | Yes / No |

---

## Plan Details

- **Directory**: `plans/{dir}/`
- **Phases**: {N} phases
- **Effort**: {estimate}
- **Platforms**: {web | ios | android | backend | kit | all}

## Methodology

| | |
|--|--|
| **Files Scanned** | `{file or path}` — {why it was read}; `reports/{research-report}.md` — prior research used |
| **Knowledge Tiers** | L1 docs/ ({found/not found}), L2 RAG ({available/unavailable}), L4 Grep ({used/not needed}) |
| **Standards Source** | `plan/SKILL.md`, `core/references/orchestration.md`, project `docs/architecture/` |
| **Coverage Gaps** | {e.g. "No prior ADR for this decision" or "None"} |

## Files to Touch

| File | Action | Phase |
|------|--------|-------|
| `{path/to/file}` | Create/Modify/Delete | Phase {N} |

## Key Dependencies

- {dep 1}
- {dep 2}

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| {risk} | High/Med/Low | {mitigation} |

---

## Verdict

**{READY | NEEDS-RESEARCH | BLOCKED}** — {one-line reason}

---

*Unresolved questions:*
- {question or "None"}
```
