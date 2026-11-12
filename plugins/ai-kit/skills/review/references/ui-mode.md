---
name: review-ui-mode
description: "Lightweight UI component review by focus area"
user-invocable: false
metadata:
  argument-hint: "<ComponentName> [--focus structure|reuse|tokens|framework|a11y|all]"
---

# Review UI Mode

Invoked when: `review --ui <ComponentName> [--focus structure|reuse|tokens|framework|a11y|all]`, and
as the UI lens folded into local, pr and story mode for web UI files.

Default focus: `all`

## Steps

1. Load the project rules for the repo (Conventions: folder structure, UI library, design tokens).
   Documented patterns there are intentional conventions, not findings.
2. Read the component source — the target file only, not a module scan (max 2 files).
3. Check only the selected focus area:

   | Focus | Checks |
   |-------|--------|
   | structure | file placement and naming per the Conventions section; view files hold markup and wiring, not data fetching or business rules; no import from another feature's internals |
   | reuse | the mandated UI library is used where it already ships the component; public entry-point imports only; no second UI library |
   | tokens | spacing, type, colour and radius come from the design tokens; no arbitrary values, raw hex, static inline style or `!important` |
   | framework | `code-review-guidelines.md` § 4 (effects and dependencies, list keys, client vs server rendering, `any`) |
   | markup | no wrapper element without a job (layout, ref, handler, ARIA); no surface nested in a surface; semantic elements where they fit |
   | a11y | surface check of `references/a11y.md` (names, roles, labels, focus); a full WCAG pass is `a11y` focus of story mode |
   | all | every row above |

4. Collect violations — a quick findings list, not a full audit report.
5. Output: short findings table

   | ID | Check | File:Line | Issue | Quick Fix |
   |----|-------|-----------|-------|-----------|
   | UI-001 | tokens | `component.tsx:42` | {issue} | {fix} |

## Boundaries

- Lightweight: max 2 files read per review
- No delegation to other agents — this is a quick check (full UI review → `/ai-kit:review story --focus ux`)
- No score calculation — findings list only
- No report file written — inline output only
