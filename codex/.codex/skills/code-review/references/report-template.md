# Code Review Report Template

**One report per review session.** If multiple scopes are covered in the same task, group findings by scope in one report — do NOT create separate report files per scope.

**Human-facing file** (`{date}-{slug}-code-review.md`). Pair with a JSON agent file (`{date}-{slug}-code-review.json`) for machine-readable findings.

---

```markdown
# code-reviewer: {Scope}

**Date**: {YYYY-MM-DD HH:mm}
**Agent**: code-reviewer
**Plan**: `plans/{dir}/plan.md`     <- omit if standalone review
**Status**: COMPLETE

---

## Executive Summary

{2-3 sentences: what was reviewed, main issue, overall quality signal}

---

## Methodology

> Format per `core/references/report-standard.md` Methodology section.

| | |
|--|--|
| **Docs Loaded** | `{path/to/docs/index.json}` — FEAT-{N} ({component name}), CONV-{N} ({convention name}); or "None found" |
| **KB Layers** | L1 docs/ ({found/not found}), L2 RAG ({available/unavailable}), L3 Skills ({skill names}), L4 Grep ({used/not needed}) |
| **Tools Used** | {e.g. Grep (pattern matching), Glob (file discovery), Read (source analysis), Task (delegation)} |
| **Files Scanned** | `{path/to/file.ts}` ({N} lines) — {what was checked} |
| **Standards Source** | `code-review/SKILL.md`, `docs/conventions/{CONV-NNNN}.md` |
| **Coverage Gaps** | {e.g. "RAG unavailable — Grep fallback used" or "None"} |

## Delegation Log

> Format per `core/references/report-standard.md` Delegation Log section.

| Agent | Scope | Template | Verdict | Findings |
|-------|-------|----------|---------|----------|
| muji | `{path/}` | Template A / A+ | pass / fix-and-reaudit / redesign | {N} |
| a11y-specialist | `{path/}` | Template B | block_pr: true/false | {N} |

_(Omit section if no delegation occurred)_

## Score

**{X.X}/10** — {category breakdown: correctness, security, performance, tests, style}

## Findings

| ID | Severity | File:Line | Issue | Fix |
|----|----------|-----------|-------|-----|
| CR-001 | Critical | `path/file.ts:42` | {issue} | {fix} |
| CR-002 | High | | | |
| CR-003 | Medium | | | |
| CR-004 | Low | | | |

## Severity Summary

| Critical | High | Medium | Low |
|----------|------|--------|-----|
| {N} | {N} | {N} | {N} |

## Files to Fix

| File | Action | Owner |
|------|--------|-------|
| `{path/to/file.ts}` | Modify | self / developer |

---

## Verdict

**{APPROVE | FIX-AND-RESUBMIT | REDESIGN}** — {one-line reason}

---

*Unresolved questions:*
- {question or "None"}
```
