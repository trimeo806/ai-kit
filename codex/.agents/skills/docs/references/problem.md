---
name: docs-problem
description: "Problem-analysis document mode — RCA, incident report, post-mortem, ADR"
user-invocable: false
metadata:
  connections:
    extends: [docs]
---

# Problem-Analysis Document Mode

Use this mode when writing: Root Cause Analysis (RCA), incident reports, post-mortems, or Architecture Decision Records (ADR) that frame a problem before proposing a solution.

## When to Use

Activate via `--problem` flag or when intent signals match: "RCA", "root cause", "incident report", "post-mortem", "why did X happen", "ADR for a fix".

Do NOT use for: API docs, component docs, README updates, standard KB entries — use `--init` or `--update` instead.

---

## Output Template

```markdown
# {Document Title}

**Type**: RCA | Incident Report | Post-Mortem | ADR
**Date**: {YYYY-MM-DD}
**Author**: {team or agent}
**Status**: Draft | Final

---

## Problem Statement

- **What**: {clear, one-paragraph definition of the problem}
- **When**: {when it was first observed; timeline of events if applicable}
- **Scope**: {what systems, users, or data were affected}

---

## Root Cause Analysis

- **Causal chain**: {step-by-step sequence of conditions that caused the problem — start from the trigger event, trace to the root}
- **Ownership**: {which system, component, service, or team is the trigger point — not blame, but technical accountability}
- **Contributing factors**: {secondary conditions that amplified the problem}

---

## Impact

| Dimension | Description |
|-----------|-------------|
| **Technical** | {performance degradation, data integrity, system availability} |
| **Business** | {user impact, SLA breach, cost, revenue} |
| **Risk** | {likelihood of recurrence without a fix} |

---

## Approaches to Resolution

> If only one viable approach exists, note why alternatives were ruled out.

| Approach | Pros | Cons | Impact on Current System | Selected |
|----------|------|------|--------------------------|---------|
| {approach} | | | {technical, business, risk, or migration impact} | Yes / No |

---

## Resolution Plan

> Link to a `/plan` if full implementation planning is needed.

- **Selected approach**: {name}
- **Steps**:
  1. {Step 1}
  2. {Step 2}
- **Verification**: {how to confirm the problem is resolved}
- **Rollback**: {how to revert if the fix causes regressions}

---

## Prevention

- {What process, test, or guardrail would have caught this earlier}
- {Monitoring or alerting to add}

---

## Open Questions

- {question or "None"}
```

---

## Guidance

- **Causal chain vs. ownership**: The causal chain explains *why* (technical sequence); ownership identifies *which* system/team is the trigger point. These are separate — do not conflate them.
- **Severity**: Embed severity in the Impact section, not as a standalone field — context determines severity.
- **Approaches table**: Always populate Impact on Current System — this is what decision-makers need most.
- **Single approach**: If only one approach is viable, write a brief "Alternatives considered" paragraph below the table explaining what was ruled out and why.
