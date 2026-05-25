# Research Report Template

Use this template when writing a research findings report.

---

```markdown
# researcher: {Topic}

**Date**: {YYYY-MM-DD HH:mm}
**Agent**: researcher
**Scope**: {1-line topic description}
**Status**: COMPLETE

---

## Executive Summary

{2-3 sentences: what was researched, key finding, recommendation}

---

## Problem Statement

- **What**: {clear definition of the problem being investigated}
- **Root Cause Analysis**:
  - *Causal chain*: {why it occurs — sequence of conditions that lead to the problem}
  - *Ownership*: {which system, component, or team is the trigger point}
- **Severity**: High | Medium | Low

---

## Findings

### {Finding 1}
{evidence, source, relevance}

### {Finding 2}
{evidence, source, relevance}

## Options / Approaches

> If only one viable approach exists, explain why alternatives were ruled out instead of leaving this table empty.

| Option | Pros | Cons | Impact on Current System | Recommendation |
|--------|------|------|--------------------------|---------------|
| {option} | | | {technical, business, risk, or migration impact} | |

## Methodology

| | |
|--|--|
| **Files Scanned** | `{path/to/file}` — {what it revealed} |
| **Knowledge Tiers** | L1 docs/ ({found/not found}), L2 RAG ({available/unavailable}), L5 Context7 ({used/unavailable}), WebSearch ({used/skipped}) |
| **Standards Source** | Official docs: {URLs}, community: {sources} |
| **Coverage Gaps** | {e.g. "Context7 returned no results for X — fell back to WebSearch" or "None"} |

### External Sources
- [{title}]({url}) — {key takeaway}

---

## Verdict

**{ACTIONABLE | INCONCLUSIVE | NEEDS-MORE}** — {one-line reason}

---

*Unresolved questions:*
- {question or "None"}
```
