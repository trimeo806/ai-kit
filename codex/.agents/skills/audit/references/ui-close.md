---
name: audit-close-ui
description: "Mark a UI finding as resolved in reports/known-findings/ui-components.json"
user-invocable: false
metadata:
  argument-hint: "<finding-id>"
---

# Close UI Finding

Invoked when: `audit --close --ui <finding-id>`

## Steps

1. Load `reports/known-findings/ui-components.json`
   - If file not found: report "no UI findings DB — run `/audit --ui` first" and stop
2. Find entry with `id == <finding-id>`
   - If not found: list all open finding IDs and prompt user to confirm the correct ID
3. Check current state:
   - If already `resolved: true`: report "already resolved on {resolved_date}" and stop
   - If `fix_applied: false`: warn "fix not yet applied — run `/fix --ui --finding-id {id}` first"
4. Set:
   - `resolved: true`
   - `resolved_date: today`
5. Save updated JSON
6. Output confirmation:

```json
{
  "finding_id": 1,
  "component": "<component>",
  "rule_id": "<rule_id>",
  "status": "RESOLVED",
  "resolved_date": "<YYYY-MM-DD>"
}
```

## Constraints

- Only updates `resolved` and `resolved_date` — never modifies source code
- Does not delete the finding entry (DB is append-only for audit trail)
- Only modify the targeted finding — no other fields on any other entry

## Schema Reference

See `audit/references/ui-findings-schema.md` for field definitions and resolution state machine.
