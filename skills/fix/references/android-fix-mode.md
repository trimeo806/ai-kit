---
name: android-fix-mode
description: Android fix mode — fix templates, known-findings input, status codes, surgical fix process for Compose and Views/XML
user-invocable: false
---

# Android Accessibility Fix Mode

Activated by: `/fix --a11y [<n> | #<id>]` when finding `platform` is `android`.

## Input

Same finding schema as iOS — see fix SKILL.md.

## Fix Templates

| Template ID | Violation | Fix (Compose) | Fix (Views/XML) |
|-------------|-----------|---------------|-----------------|
| `add_content_description` | Image/Icon missing description | `Image(contentDescription = "...")` | `android:contentDescription="..."` |
| `make_decorative` | Decorative image announced | `Image(contentDescription = null)` | `android:importantForAccessibility="no"` |
| `add_touch_target` | Tap target < 48×48dp | `Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp)` | `android:minWidth="48dp" android:minHeight="48dp"` |
| `add_heading_semantic` | Section title not heading | `Modifier.semantics { heading() }` | `android:accessibilityHeading="true"` |
| `add_state_description` | Custom toggle no state | `Modifier.semantics { stateDescription = "..." }` | `AccessibilityNodeInfoCompat.setStateDescription("...")` |
| `add_form_label` | Input missing label | `Modifier.semantics { contentDescription = "..." }` | `android:labelFor="@id/input"` on label TextView |
| `other_manual` | Complex issue | Flag `NEEDS_REVIEW` | Flag `NEEDS_REVIEW` |

## Compose Fix Examples

```kotlin
// add_content_description
Image(
    painter = painterResource(R.drawable.map),
    contentDescription = "Show map"  // added
)

// make_decorative
Image(
    painter = painterResource(R.drawable.divider),
    contentDescription = null  // decorative
)

// add_heading_semantic
Text(
    text = "Settings",
    modifier = Modifier.semantics { heading() }  // added
)

// add_touch_target
IconButton(
    onClick = { /* ... */ },
    modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp)  // added
) { /* ... */ }

// add_state_description
Switch(
    checked = isEnabled,
    onCheckedChange = { /* ... */ },
    modifier = Modifier.semantics {
        stateDescription = if (isEnabled) "Enabled" else "Disabled"  // added
    }
)
```

## Views/XML Fix Examples

```xml
<!-- add_content_description -->
<ImageButton
    android:contentDescription="@string/show_map"
    android:src="@drawable/ic_map" />

<!-- make_decorative -->
<ImageView
    android:importantForAccessibility="no"
    android:src="@drawable/divider" />

<!-- add_heading_semantic (API 28+) -->
<TextView
    android:accessibilityHeading="true"
    android:text="Settings" />
```

## Constraints

Same as iOS fix mode — surgical changes only, no refactoring, preserve code style.
