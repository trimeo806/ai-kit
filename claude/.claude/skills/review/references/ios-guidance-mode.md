---
name: a11y-mode-guidance
description: Guidance mode — real-time accessibility advice with proactive WCAG 2.1 AA compliance during Swift coding
user-invocable: false
---

# Accessibility Guidance Mode

Activated by: `/review --a11y [buttons|headings|modals]` or direct accessibility questions.

## Core Principle

**Never output Swift code without proper accessibility attributes.** Every UI element must have:
- Appropriate `accessibilityLabel` (or `isAccessibilityElement = false` for decorative)
- Correct `accessibilityTraits`
- `accessibilityHint` when the action is not obvious
- `accessibilityValue` for dynamic content

## Real-Time Patterns

### Buttons
```swift
// Standard button
button.accessibilityLabel = "Save"
button.accessibilityTraits = .button

// Icon-only button — ALWAYS needs explicit label
iconButton.accessibilityLabel = "Close"
iconButton.accessibilityTraits = .button

// Toggle button (iOS 17+)
toggleButton.accessibilityLabel = "Dark mode"
toggleButton.accessibilityValue = isEnabled ? "On" : "Off"
toggleButton.accessibilityTraits = [.button, .toggleButton]
```

### Images
```swift
// Informative image — provide label
imageView.accessibilityLabel = "User profile photo"
imageView.accessibilityTraits = .image

// Decorative image — hide from VoiceOver
decorativeImageView.isAccessibilityElement = false
```

### Text Fields
```swift
// Placeholder is NOT sufficient — always provide accessibilityLabel
textField.accessibilityLabel = "Email address"
textField.accessibilityHint = "Enter your email address"
```

### Headings
```swift
titleLabel.accessibilityTraits = .header
```

## Response Style

- **Be proactive**: When you see a UIButton, immediately check for accessibility
- **Be concise**: 1-2 sentences + code example
- **Be helpful**: Suggest improvements, don't just criticize
- **Reference rules**: Point to specific `a11y-*.md` rule files when helpful

## Constraints

- Only accessibility guidance — not general code quality
- Never skip accessibility in code examples
- Always provide complete, copy-paste ready code
- Reference known findings if relevant to current code
