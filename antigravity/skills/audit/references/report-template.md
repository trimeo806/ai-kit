# UI Audit Report Template

**One report per audit session.** All audit types (muji, a11y, code-reviewer) use this format. Multiple components or scopes → group by scope, not separate files.

## Session Folder Structure

```
reports/{YYMMDD-HHMM}-{slug}-audit/        # hybrid
  session.json
  report.md         # merged: code-reviewer owns
  muji-ui-audit.md  # muji pass
  a11y-audit.md     # a11y pass

reports/{YYMMDD-HHMM}-{slug}-ui-audit/     # standalone muji
  session.json
  report.md

reports/{YYMMDD-HHMM}-{slug}-code-review/  # inline code review
  session.json
  report.md
```

**Create the folder first:** `mkdir -p reports/{date}-{slug}-{type}/` before writing any file.

---

## Report Format

```markdown
# {Component Name} — {Audit Type} Report

**Date:** YYYY-MM-DD | **Auditor:** {agent} | **Maturity:** poc|beta|stable | **Scope:** `path/`

## Summary

| Severity | Count |
|----------|-------|
| Critical | N |
| High | N |
| Medium | N |
| Low | N |
| **Total** | **N** |

**Score:** N/Y applicable rules — **Verdict: PASS | FIX-AND-REAUDIT | REDESIGN**
One-sentence rationale.

---

## Checklist

| Rule | Description | Status | Finding | Fix |
|------|-------------|--------|---------|-----|
| ORGANISM-001 | Props interface exported + JSDoc | ✓ | — | — |
| ORGANISM-002 | Callback naming + domain-agnostic types | ✗ | `onSubmit` receives `ILetterDraft` (internal type) | Extract to `ISubmitPayload` in public API |
| STATE-001 | External state via props only | ✗ | `useAppSelector(selectDraft)` called inline | Lift to parent, inject via prop |
| WCAG-1.4.3 | Contrast ratio ≥ 4.5:1 | ⚠ | Gray text on white (#767676) — ratio 4.48:1 | Use #757575 or darker |
| MOCK-005 | No mocks in production exports | ✓ | — | — |

Legend: ✓ PASS · ✗ FAIL · ⚠ WARN · N/A not applicable

Rules:
- One row per checklist rule — no finding cards, no separate findings section
- `Finding`: one-line violation description; `—` if passing
- `Fix`: one-line action; `—` if passing
- Omit N/A rows (e.g. MOCK-* for stable, ORGANISM-* for atoms)
- A11Y specialist: use WCAG criterion IDs (e.g. WCAG-1.4.3) as Rule IDs

---

## A11Y Delegation

_(Omit if no a11y findings or a11y already ran)_

The following N findings are delegated to **a11y-specialist**.

| Rule | Severity | File | Issue |
|------|----------|------|-------|
| WCAG-1.4.3 | High | `file.tsx:42` | Contrast ratio 3.2:1 below threshold |

---

## Methodology

| | |
|--|--|
| **Docs Loaded** | `docs/index.json` — FEAT-N ({component}), CONV-N; or "None found" |
| **KB Layers** | L1 docs/ ({found/not found}), L2 RAG ({available/unavailable}), L4 Grep ({used/not needed}) |
| **Files Scanned** | {N} files read; {N}+ covered by grep |
| **Standards Source** | `audit/references/ui-workflow.md`, checklist applied |
| **Coverage Gaps** | {e.g. "RAG unavailable" or "None"} |

## Delegation Log

_(Omit if no delegation occurred)_

| Agent | Scope | Template | Verdict | Findings |
|-------|-------|----------|---------|----------|
| a11y-specialist | `{path/}` | Template B | block_pr: true/false | {N} |
| docs-manager | `{component}` | Template D | gap / up-to-date | {N} |
```

---

## POC Verdict — Phased Roadmap

Replace the binary verdict line when `maturityTier = poc` or `beta`:

```markdown
**POC Verdict: {N} blocking / {N} before-beta / {N} before-stable**

## Phased Roadmap

### Now (blocking)
| Rule | Severity | Finding | Fix |
|------|----------|---------|-----|
| ORGANISM-003 | critical | ... | ... |

### Before Beta
| Rule | Severity | Finding | Fix |
|------|----------|---------|-----|
| STATE-002 | medium | ... | ... |

### Before Stable
| Rule | Severity | Finding | Fix |
|------|----------|---------|-----|
| STATE-003 | low | ... | ... |
```

---

## Formatting Rules

| Rule | Detail |
|------|--------|
| Severity in summary | **Bold** for Critical and High; plain text for Medium and Low |
| Finding + Fix columns | One line each. `—` when rule passes. Never multi-sentence. |
| N/A rows | Omit entirely — don't include rows that don't apply |
| Code blocks | Inline backticks only inside table cells — no fenced blocks |
| A11Y rule IDs | WCAG-{criterion} format (e.g. WCAG-2.4.3) |
| Omit empty sections | A11Y Delegation, Delegation Log — omit entirely if unused |
