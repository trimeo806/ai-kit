---
name: a11y-mode-fix
description: Fix mode — surgical accessibility fixes from known-findings database with minimal code changes
user-invocable: false
---

# Accessibility Fix Mode

Activated by: `/fix --a11y [<n> | #<id>]` command.

## Input

Receives finding objects from `.kit-data/a11y/known-findings.json`:

```json
{
  "id": 3,
  "wcag": "4.1.2",
  "title": "Map button missing label",
  "screen": "Homescreen > My consignments > consignment history",
  "description": "Map button is read by VoiceOver only as 'button'.",
  "file_pattern": "*ConsignmentViewController*",
  "code_pattern": "mapButton|MapButton",
  "fix_template": "add_button_label",
  "priority": 1,
  "estimated_effort_minutes": 10
}
```

## Output

```json
{
  "finding_id": 3,
  "file": "ConsignmentViewController.swift",
  "status": "FIXED",
  "diff_summary": "Added accessibilityLabel to mapButton",
  "lines_changed": 1,
  "confidence": "high"
}
```

## Status Values

| Status | Meaning |
|--------|---------|
| `FIXED` | Fix applied, code matches rules, diff is minimal |
| `NEEDS_REVIEW` | Multiple matches, low confidence, or requires refactoring |
| `SKIPPED` | File/pattern not found, or fix requires major changes |

## Fix Templates

| Template | Action |
|----------|--------|
| `add_button_label` | Add `accessibilityLabel` + ensure `.button` trait |
| `make_image_decorative` | Set `isAccessibilityElement = false` |
| `add_heading_trait` | Add `.header` trait, optionally set level |
| `add_form_label` | Add `accessibilityLabel` to text field |
| `add_modal_focus_trap` | Add dismiss button + focus announcement |
| `add_status_announcement` | Add `UIAccessibility.post(notification:argument:)` |
| `other_manual` | Mark as `NEEDS_REVIEW` — requires manual intervention |

## Fix Process

1. **Check existing patches** — Look in `.kit-data/a11y/fixes/patches/` for `finding-{id}-*.diff`. If a patch exists, review it for applicability before generating a new one
2. **Check resolved status** — If finding has `resolved: true`, skip it
3. **Locate file** — Search for files matching `file_pattern` (glob)
4. **Locate code** — Search for `code_pattern` (regex) in file
5. **Apply fix** — Use `fix_template` to determine minimal change
6. **Generate diff** — Unified diff format with 3 lines context
7. **Generate summary** — Status, confidence, lines changed
8. **Suggest close** — After fix is applied and verified, suggest: `Run /audit --close {id} to mark as resolved`

## Constraints

### Do Not Refactor
- Only add accessibility attributes
- Don't change variable names
- Don't reorganize code
- Don't improve unrelated code quality

### Be Surgical
- Minimal changes only
- Target exact issue
- Don't fix other issues in same file
- Preserve existing code style

### Be Confident
- If unsure, mark `NEEDS_REVIEW`
- Don't guess at variable names
- Don't assume code structure
- Verify fix matches rules
