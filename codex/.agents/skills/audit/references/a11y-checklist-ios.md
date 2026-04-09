---
name: a11y-mode-audit
description: Audit mode — batch accessibility analysis producing structured JSON violation reports
user-invocable: false
---

# Accessibility Audit Mode

Activated by: `/audit --a11y` command, pre-commit hooks, PR reviews.

**CONSTRAINT: This mode is read-only. Do NOT use Write, Edit, or Bash tools. Only analyze and produce JSON output.**

## Output Format

Produce valid JSON only — no additional text outside JSON:

```json
{
  "total_violations": 5,
  "critical_count": 3,
  "warning_count": 2,
  "block_pr": true,
  "violations": [
    {
      "file": "ProfileViewController.swift",
      "line": 42,
      "type": "missing_button_label",
      "wcag": "4.1.2",
      "severity": "critical",
      "message": "Icon button missing accessibilityLabel",
      "finding_id": null,
      "regression": false,
      "suggestion": "Add: button.accessibilityLabel = \"Close\""
    }
  ],
  "regressions": 0,
  "methodology": {
    "filesScanned": ["ProfileViewController.swift", "SettingsView.swift"],
    "knowledgeTiersUsed": ["L1-docs-findings", "L2-RAG", "L3-ios-a11y-skill"],
    "standardsSource": ["ios-a11y/SKILL.md", "audit/references/a11y-checklist-ios.md", "WCAG 2.1 AA"],
    "coverageGaps": ["RAG unavailable — used Grep fallback" ]
  }
}
```

## Violation Types

### Critical (block PR)
- `missing_button_label` — Button without accessibilityLabel
- `missing_form_label` — Text field without accessibilityLabel
- `missing_image_label` — Informative image without accessibilityLabel
- `decorative_image_with_label` — Decorative image incorrectly labeled
- `missing_heading_trait` — Visual heading without .header trait
- `focus_trap` — Modal without dismiss option
- `missing_status_announcement` — Status change not announced
- `button_as_image` — Button incorrectly read as image by VoiceOver
- `unreachable_element` — Interactive element not reachable

### Warning (report only)
- `missing_hint` — Element that could benefit from hint
- `redundant_label` — Label includes redundant words
- `poor_contrast` — Color contrast below WCAG AA
- `missing_value` — Dynamic element without accessibilityValue

## Block PR Decision

Block (`block_pr: true`) if:
- Any critical violations found
- More than 5 warning violations
- Violations match known findings with priority 1
- Any regressions detected (resolved finding's violation reappears)

Don't block (`block_pr: false`) if:
- Only warning violations (5 or fewer)
- Violations are in test files
- Violations are in commented code

## Detection Rules

Reference `ios-a11y` skill references for detailed detection criteria:
- `a11y-buttons.md` — Button detection patterns (includes image-buttons)
- `a11y-forms.md` — Form input detection
- `a11y-core.md` — Core principles, complex image accessibility
- `a11y-headings.md` — Heading detection
- `a11y-focus.md` — Focus management checks
- `a11y-colors-contrast.md` — Contrast checks
- `a11y-testing.md` — Testing completeness

## Constraints

- **Output valid JSON only** — No additional text outside JSON
- **Be precise** — Exact line numbers and file paths
- **Match known findings** — Include finding_id when matched; flag `regression: true` if finding has `resolved: true`
- **Block appropriately** — Block on critical violations or regressions
- **Provide suggestions** — Include fix suggestions for every violation
