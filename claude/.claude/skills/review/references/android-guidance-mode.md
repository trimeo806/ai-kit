---
name: android-guidance-mode
description: Android guidance mode — real-time accessibility advice with Compose and Views/XML code examples
user-invocable: false
---

# Android Accessibility Guidance Mode

Activated by: `/review --a11y android [buttons|headings|modals|forms|all]` or direct accessibility questions about Android code.

## Core Principle

**Never output Kotlin/XML code without proper accessibility attributes.** Every UI element must have:
- Appropriate `contentDescription` (or null for decorative)
- Correct semantic properties (`heading()`, `stateDescription`)
- Minimum 48×48dp touch targets for interactive elements
- Proper focus order via `traversalIndex` when needed

## Real-Time Patterns

### Buttons (Compose)
```kotlin
// Standard button — has implicit semantics
Button(onClick = { /* ... */ }) {
    Text("Save")  // Compose reads text content automatically
}

// Icon-only button — ALWAYS needs explicit description
IconButton(onClick = { /* ... */ }) {
    Icon(
        imageVector = Icons.Default.Close,
        contentDescription = "Close"  // Required
    )
}

// Toggle button
Switch(
    checked = isDarkMode,
    onCheckedChange = { /* ... */ },
    modifier = Modifier.semantics {
        stateDescription = if (isDarkMode) "On" else "Off"
    }
)
```

### Images (Compose)
```kotlin
// Informative image — provide description
Image(
    painter = painterResource(R.drawable.profile),
    contentDescription = "User profile photo"
)

// Decorative image — hide from TalkBack
Image(
    painter = painterResource(R.drawable.divider),
    contentDescription = null
)
```

### Text Fields (Compose)
```kotlin
// Label is NOT implicit — always provide semantics
OutlinedTextField(
    value = email,
    onValueChange = { /* ... */ },
    label = { Text("Email address") },  // Compose reads this as label
    modifier = Modifier.semantics {
        contentDescription = "Email address input"
    }
)
```

### Headings (Compose)
```kotlin
Text(
    text = "Account Settings",
    style = MaterialTheme.typography.headlineMedium,
    modifier = Modifier.semantics { heading() }
)
```

### Views/XML Patterns
```xml
<!-- Button with contentDescription -->
<ImageButton
    android:contentDescription="@string/close"
    android:src="@drawable/ic_close" />

<!-- Form label linked to input -->
<TextView
    android:id="@+id/label_email"
    android:labelFor="@id/input_email"
    android:text="Email" />
<EditText android:id="@+id/input_email" />

<!-- Heading -->
<TextView
    android:accessibilityHeading="true"
    android:text="Settings" />
```

## Response Style

- **Be proactive**: When you see a Composable or XML layout, immediately check accessibility
- **Be concise**: 1-2 sentences + code example
- **Distinguish Compose vs Views/XML**: Check file context to provide correct API
- **Reference rules**: Point to `android-a11y` reference files when helpful

## Constraints

- Only accessibility guidance — not general code quality
- Never skip accessibility in code examples
- Always provide complete, copy-paste ready code
- Reference known findings if relevant to current code
