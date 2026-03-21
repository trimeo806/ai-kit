---
name: android-audit-mode
description: Android audit mode — JSON output schema, violation types, block-PR logic, detection rules for Compose and Views/XML
user-invocable: false
---

# Android Accessibility Audit Mode

Activated by: `/audit --a11y` when Android files (`.kt`/`.kts`) are detected.

**CONSTRAINT: Read-only. Do NOT use Write, Edit, or Bash tools. Only analyze and produce JSON output.**

## Output Format

Same JSON schema as iOS audit mode — see audit SKILL.md.

## Violation Types

### Critical (block PR)
- `missing_content_description` — Image/Icon without contentDescription (Compose) or `android:contentDescription` (XML)
- `missing_form_label` — Input without label (no `labelFor`, no `contentDescription`)
- `decorative_with_description` — Decorative image incorrectly labeled
- `missing_heading_semantic` — Visual heading without `heading()` (Compose) or `accessibilityHeading` (XML)
- `focus_trap` — Dialog/BottomSheet without dismiss option
- `missing_state_description` — Custom toggle without stateDescription
- `unreachable_element` — Interactive element with `importantForAccessibility="no"`

### Warning (report only)
- `small_touch_target` — Touch target below 48×48dp minimum
- `poor_contrast` — Color contrast below WCAG AA (4.5:1 text, 3:1 large text)
- `missing_live_region` — Dynamic content without `liveRegion` announcement
- `redundant_description` — contentDescription repeats visible text

## Detection Rules

Reference `android-a11y` skill references:
- `android-content-descriptions.md` — Image/Icon description patterns
- `android-touch-targets.md` — Touch target sizing
- `android-focus-semantics.md` — Focus order, mergeDescendants, stateDescription
- `android-headings.md` — Heading semantics
- `android-contrast.md` — Color contrast
- `android-views-xml-a11y.md` — Views/XML patterns, RecyclerView, AccessibilityDelegate

## Compose vs Views/XML Detection

| Signal | Framework |
|--------|-----------|
| `@Composable`, `Modifier.`, `semantics {` | Compose |
| `.xml` layout, `findViewById`, `ViewHolder` | Views/XML |
| Mixed in same module | Check file extension — `.kt` with `@Composable` = Compose, `.xml` = Views |

## Constraints

Same as iOS audit mode — valid JSON only, precise line numbers, match known findings.

Include `methodology` object in output (same schema as iOS audit mode):
- `filesScanned` — all `.kt`/`.kts`/`.xml` files read
- `knowledgeTiersUsed` — L1 known-findings, L2 RAG, L3 android-a11y skill
- `standardsSource` — `android-a11y/SKILL.md`, `audit/references/a11y-checklist-android.md`, `WCAG 2.1 AA`
- `coverageGaps` — e.g. `"RAG unavailable — Grep fallback used"` or `"Compose-only rules loaded, no XML rules needed"`
