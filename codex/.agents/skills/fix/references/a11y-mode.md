---
name: fix-a11y
description: "Fix accessibility findings — by ID (#<id>) or top N by priority (<n>)"
user-invocable: false
disable-model-invocation: true
metadata:
  argument-hint: "[<n> | #<id>]"
---

Fix accessibility findings from `reports/known-findings/a11y.json`.

## Aspect Files

| File | Coverage |
|------|----------|
| `references/ios-fix-mode.md` | iOS fix mode: fix templates, known-findings input, status codes, surgical fix process |
| `references/android-fix-mode.md` | Android fix mode: Compose + Views/XML fix templates, code examples, surgical fix process |

**Argument:**
- `#<id>` — fix a specific finding by ID (e.g. `/fix-a11y #3`)
- `<n>` — fix top N unresolved priority-1 findings (e.g. `/fix-a11y 5`)
- _(none)_ — fix top 1 priority finding

**IMPORTANT:** Analyze the skills catalog and activate ONLY the skills needed for the detected platforms.

## Argument Parsing

Parse `$ARGUMENTS` to determine mode:
1. Starts with `#` → **single mode** — extract numeric ID (e.g. `#3` → id=3)
2. Is a positive integer → **batch mode** — use as N (e.g. `5` → top 5)
3. Empty or missing → **batch mode** — N=1 (default)

## Platform Detection

See `a11y` skill for platform routing. Read the finding's `platform` field to select the correct skill.

## Instructions

### If argument is `#<id>` (single finding)

1. Load finding with matching `id` from `reports/known-findings/a11y.json`
2. If not found, report error with available IDs
3. If `resolved: true`, skip and report SKIPPED
4. Use `file_pattern` (glob) to locate the relevant file(s)
5. Use `code_pattern` (regex) to locate the specific code element
6. Show diff preview using the appropriate fix template — do NOT write files yet
7. **Ask for confirmation**: "Apply this fix? (yes / cancel)"
   - `yes` → apply the fix template to source file
   - `cancel` → stop, nothing written
8. **Update finding status** — if status is FIXED, set `fix_applied: true` and `fix_applied_date: today` in `reports/known-findings/a11y.json`
9. Suggest: `Run /audit --close --a11y {id} to mark as resolved after verification`

**Output:** single JSON object

### If argument is `<n>` or empty (batch)

1. Load `reports/known-findings/a11y.json`
2. Filter: `resolved !== true` and `priority = 1`
3. Sort: priority ascending, then ID ascending
4. Take top N (default N=1 when no argument)
5. For each finding:
   - Read `platform` field to select correct skill
   - Locate file via `file_pattern`, locate code via `code_pattern`
   - Apply `fix_template` per platform-specific skill rules
   - Determine status (FIXED / NEEDS_REVIEW / SKIPPED)
6. Show diffs for review — do NOT apply patches automatically
7. **Update finding status** — for each FIXED finding, load `known-findings.json`, set `fix_applied: true` and `fix_applied_date: today`, save
8. After verification, suggest `/audit --close --a11y <id>` for each fixed finding

**Output:** JSON array (one object per finding)

## Output Schema

```json
{
  "finding_id": 3,
  "platform": "ios|android|web",
  "file": "path/to/file",
  "status": "FIXED|NEEDS_REVIEW|SKIPPED",
  "diff_summary": "Added accessibilityLabel to mapButton",
  "lines_changed": 2,
  "confidence": "high"
}
```

Single finding → object. Multiple findings → array of objects.

## Constraints
- Surgical changes only — do NOT refactor
- Only add accessibility attributes
- Don't change variable names or reorganize code
- If ambiguous, return `NEEDS_REVIEW`
- Preserve existing code style
