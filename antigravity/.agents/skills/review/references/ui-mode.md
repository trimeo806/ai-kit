---
name: review-ui-mode
description: "Lightweight UI component review by focus area"
user-invocable: false
metadata:
  argument-hint: "<ComponentName> [--focus structure|reuse|tokens|react|a11y|all]"
---

# Review UI Mode

Invoked when: `review --ui <ComponentName> [--focus structure|reuse|tokens|react|a11y|all]`

Default focus: `all`

## Steps

1. Pre-audit KB load:
   - Check `docs/index.json` for component FEAT/CONV entry
   - If found: treat documented patterns as intentional conventions
2. Read component source file(s) — target file only, not full module scan (max 2 files)
3. Run ONLY the rules for the selected focus area:

   | Focus | Rules Applied |
   |-------|---------------|
   | structure | STRUCT-001..006 |
   | reuse | REUSE (RU-1..8) from consumer mode, or STRUCT for library mode |
   | tokens | TOKEN-001..006 |
   | react | REACT (RE-1..8) |
   | a11y | A11Y-001..005 (surface check only; delegate to a11y-specialist for deep WCAG) |
   | all | All applicable rules for mode (library or consumer) |

4. Collect violations — no full audit report, quick findings list only
5. Optionally append to `.kit-data/ui/known-findings.json` (ask user if not automated)
6. Output: short findings table

   | ID | Rule | File:Line | Issue | Quick Fix |
   |----|------|-----------|-------|-----------|
   | UI-001 | TOKEN-003 | `component.tsx:42` | {issue} | {fix} |

## Boundaries

- Lightweight: max 2 files read per review
- No delegation to other agents — this is a quick check (full audit → `/audit --ui`)
- A11y focus: surface ARIA/label issues only; delegate to a11y-specialist for full WCAG analysis
- No score calculation — findings list only
- No report file written — inline output only

## Schema Reference

See `audit/references/ui-findings-schema.md` for known-findings.json field definitions when appending.
