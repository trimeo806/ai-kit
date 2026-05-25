---
name: audit-a11y
description: "Audit staged changes for WCAG 2.1 AA accessibility violations"
user-invocable: false
disable-model-invocation: true
metadata:
  argument-hint: "[ios|android|web]"
---

**Mode: Audit — Do NOT use Write or Edit tools. Output valid JSON only.**

Audit all changed files for accessibility violations, scoped to the detected platform.

<platform>$ARGUMENTS</platform>

**IMPORTANT:** Analyze the skills catalog and activate ONLY the skills needed for the detected platform.

## Platform Detection

See `a11y` skill for platform routing.

## Instructions

1. **Detect platform** — from argument or changed file extensions
2. **Get Git diff** — all changed files matching detected platform
3. **Scan each file** — for accessibility violations using platform-specific skill rules
4. **Check known findings** — match against `.kit-data/a11y/known-findings.json` (if exists)
5. **Detect regressions** — if a `resolved: true` finding reappears, flag as `regression`
6. **Classify violations** — type, WCAG criterion, severity, finding ID, regression status
7. **Determine block** — critical violations, regressions, or 5+ serious = block PR
8. **Persist new findings** — for each violation NOT matched to an existing finding:
   a. Load `.kit-data/a11y/known-findings.json` (create with `{"version":"1.3","audit_date":"today","critical_findings":[]}` if missing)
   b. **Dedup**: skip if existing finding matches `wcag` + `file_pattern` + `code_pattern` (all three)
   c. If matched and `resolved: true` → flag as regression (already handled in step 5)
   d. If matched and unresolved → skip, set `finding_id` in output
   e. If unmatched → create new finding:
      - `id`: max(existing IDs) + 1
      - Map severity: critical/serious → priority 1, moderate → 2, minor → 3
      - `source: "audit"`, `first_detected_date: today`
      - Infer `file_pattern` from violation file path, `code_pattern` from violation context
      - Map type → `fix_template`: missing_button_label→add_button_label, missing_form_label→add_form_label, missing_heading_trait→add_heading_trait, focus_trap→add_modal_focus_trap, missing_status_announcement→add_status_announcement, *→other_manual
      - `estimated_effort_minutes`: priority 1 → 10, priority 2 → 15, priority 3 → 5
   f. Save file, report: "Persisted N new findings (IDs: X, Y, Z)"
9. **Save report file** — write the full JSON output to `.kit-data/a11y/fixes/findings/audit-YYMMDD-HHMM.json` (create directories if missing). Print: `Report saved: .kit-data/a11y/fixes/findings/audit-YYMMDD-HHMM.json`

## Output

## Aspect Files

| File | Coverage |
|------|----------|
| `references/a11y-checklist-ios.md` | iOS audit mode: JSON output schema, violation types, block-PR logic, detection rules |
| `references/a11y-checklist-android.md` | Android audit mode: Compose + Views/XML violation types, detection rules, framework detection |

Valid JSON only — no prose:

```json
{
  "platform": "ios|android|web",
  "total_violations": 0,
  "critical": 0,
  "violations": [
    {
      "file": "path/to/file",
      "line": 45,
      "type": "button|heading|form|image|focus|color|other",
      "wcag": "4.1.2",
      "severity": "critical|serious|moderate|minor",
      "message": "Description of the issue",
      "finding_id": null,
      "regression": false
    }
  ],
  "regressions": 0,
  "should_block_pr": false
}
```
