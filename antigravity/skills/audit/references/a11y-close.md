---
name: audit-close-a11y
description: "Mark an accessibility finding as resolved"
user-invocable: false
disable-model-invocation: true
metadata:
  argument-hint: "<finding-id>"
---

Mark finding ID $ARGUMENTS as resolved in `reports/known-findings/a11y.json`.

## Instructions

1. Load `reports/known-findings/a11y.json`
2. Find the finding object with `id` matching the argument
3. If not found, report error with available IDs
4. If already `resolved: true`, report it's already resolved
5. Set `"resolved": true` and `"resolved_date": "<today YYYY-MM-DD>"`
6. Update top-level `"last_reviewed_date"` to today
7. Save the file

## Output

```json
{
  "finding_id": 3,
  "title": "Navigation bar buttons inaccessible",
  "platform": "ios|android|web",
  "wcag": "2.1.1",
  "status": "RESOLVED",
  "resolved_date": "2026-02-26"
}
```

## Constraints
- Only modify the targeted finding and `last_reviewed_date`
- Do not modify any other findings or fields
- If the finding ID does not exist, report error — do not create new entries
