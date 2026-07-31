---
name: review
description: Use when user says "review", "check my code", "is this good", "look at this before I commit", or "suggest improvements" — detects review type (code quality, a11y, or general improvements) and runs the appropriate review
user-invocable: true
metadata:
  argument-hint: "[--code | --a11y | --ui | --architecture | --improvements]"
  connections:
    enhances: []
---

# Review — Unified Review Command

Auto-detect and execute the appropriate review workflow.

## Step 0 — Flag Override

If `$ARGUMENTS` starts with `--code`: load `references/code.md` and execute.
If `$ARGUMENTS` starts with `--a11y`: load `references/a11y.md` and execute.
If `$ARGUMENTS` starts with `--ui`: load `references/ui-mode.md` and execute inline.
If `$ARGUMENTS` starts with `--architecture`: load `references/architecture.md` and execute inline.
If `$ARGUMENTS` starts with `--improvements`: run improvements inline (see below).
Otherwise: continue to Auto-Detection.

## Aspect Files

| File | Purpose |
|------|---------|
| `references/code.md` | Ultrathink edge cases, then parallel verify with reviewers |
| `references/a11y.md` | Review accessibility compliance (WCAG 2.1 AA) |
| `references/ui-mode.md` | Lightweight UI component review by focus area |
| `references/architecture.md` | Read-only pass for module depth, seams, coupling — no files written |
| `references/improvements.md` | Review auto-improvement metrics, detect patterns |

## Auto-Detection

Analyze `$ARGUMENTS` keywords:

| Keyword match | Load Reference |
|--------------|----------------|
| "a11y", "accessibility", "wcag" | `references/a11y.md` |
| "ui", "component", "token" | `references/ui-mode.md` |
| "architecture", "structure", "coupling", "shallow", "hard to test" | `references/architecture.md` |
| "improvements", "metrics", "patterns" | Run improvements inline (see below) |
| Default (no keyword match) | `references/code.md` |

## Review vs Audit

| Want | Command |
|------|---------|
| Quick structural read on a diff or module, nothing written | `/review --architecture` |
| Full scan, before/after visual report, grilled decision, persisted findings | `/audit --architecture` |

`references/architecture.md` is deliberately terminal — it reports and stops. It borrows its vocabulary from `audit/references/architecture-workflow.md` rather than redefining it.

## Review-Improvements (Inline)

When dispatching review-improvements, run inline instead of forking (uses haiku model, restricted tools):

1. Read session metrics from `.kit-data/improvements/sessions.jsonl`

2. Read `.kit-data/improvements/sessions.jsonl`
3. Present findings grouped by severity (high → medium → low)
4. For each finding: explain detection, recommended action, next step
5. If no findings: report healthy, show session count
6. Summary table: severity × count

## Execution

For code, a11y, ui, and architecture reviews: load the reference file and execute its workflow. For improvements: execute inline per the Review-Improvements section above.
