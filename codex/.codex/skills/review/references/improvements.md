---
name: review-improvements
description: "Review session improvement metrics, detect patterns, surface recommendations"
user-invocable: false
disable-model-invocation: true
allowed-tools: Read, Write, Bash(ls *), Bash(wc *), Bash(date *)
---

# Review Improvements

Run the detection engine to analyze session metrics and surface improvement opportunities.

## Steps

1. Read session data:
```
.kit-data/improvements/sessions.jsonl
```

3. Present findings grouped by severity (high → medium → low)

4. For each finding:
   - Explain the detection and what it means
   - Provide the recommended action
   - If actionable now, suggest the specific next step

5. If no findings: report that the system is healthy and show session count analyzed

6. Summary table at the end:
   | Severity | Count |
   |----------|-------|
   | High | N |
   | Medium | N |
   | Low | N |

## Biweekly Summary Report

After presenting findings, generate a summary report:

1. Create `docs/summaries/improvement-summary-YYYY-MM-DD.md` with this template:

```markdown
# Improvement Summary — {date}

## Period
{start_date} to {end_date} ({session_count} sessions)

## Key Metrics
| Metric | Value |
|--------|-------|
| Total sessions | N |
| Avg duration | Xm |
| Total errors | N |
| Rework iterations | N |
| Skills loaded | N unique |

## Top Errors
{list of most frequent error types from sessions}

## Most-Used Skills
{list of most frequently loaded skills}

## Routing Patterns
{breakdown of intent/platform/command usage}

## Findings
{improvement patterns detected from sessions.jsonl}

## Recommendations
{actionable improvements based on patterns}
```

2. Update the gate marker so the biweekly prompt doesn't fire again:
```
Write to .kit-data/improvements/last-summary.json:
{ "generatedAt": "<ISO timestamp>", "sessionCount": N, "reportPath": "docs/summaries/improvement-summary-YYYY-MM-DD.md" }
```

3. Confirm the summary was written and show its path.
