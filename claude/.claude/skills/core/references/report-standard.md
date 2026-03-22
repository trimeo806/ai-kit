# Report Standard

Common output format for all tri-ai-kit agent reports.

---

## Anatomy

```markdown
# {AgentType}: {Title}

**Date**: YYYY-MM-DD HH:mm
**Agent**: {agent-name}
**Plan**: `plans/{dir}/plan.md`     <- omit if no active plan
**Status**: COMPLETE | PARTIAL | FAILED | IN PROGRESS

---

## Executive Summary

2-3 sentences. What was done, what was found, what the outcome is.
<200 words.

---

## Methodology

| | |
|--|--|
| **Files Scanned** | `path/to/file.ts` (N lines), `path/to/other.ts` |
| **Knowledge Tiers** | L1 docs/ (conventions loaded), L2 RAG (available / unavailable), L4 Grep (fallback used / not needed) |
| **Standards Source** | `skill/references/file.md`, WCAG 2.1 AA, OWASP Top 10, `docs/conventions/CONV-NNNN.md` |
| **Coverage Gaps** | RAG unavailable — fell back to Grep; no platform rules loaded; checklist X not found |

---

## Delegation Log

Required when audit/review delegates to specialist agents. Omit section if no delegation.

| Agent | Scope | Template | Verdict | Findings |
|-------|-------|----------|---------|----------|
| {agent-name} | `{path/}` | Template {A/B/C/D/E} | {verdict} | {N} |

- Column "Findings" (not "Finding Count") — use integer count
- One row per delegation, chronological order
- Verdict uses the specialist's own verdict vocabulary (see Verdict Word table above)

---

## Executive Summary Specification

All reports: 2-3 sentences, <200 words. Structure:
1. What was reviewed/audited (scope + mode)
2. Key finding or quality signal
3. Outcome (verdict preview)

For audit reports that include JSON: the `summary` object provides machine-readable counts. The Markdown Executive Summary provides the human narrative. Both must be present; they complement, not replace each other.

---

## Score Specification

| Report Type | Format | Source |
|-------------|--------|--------|
| Code review | `X.X/10` — breakdown: correctness, security, performance, tests, style | Reviewer judgment |
| UI audit (library) | `{PASS_COUNT}/{TOTAL_RULES}` | `audit-standards.md` rule count |
| UI audit (consumer) | Per-section 0-10 scores | `audit-standards.md` consumer formulas |
| A11y audit | WCAG level: A / AA / AAA conformance | Platform a11y rules |

---

{Body — agent-specific sections}

---

## Verdict

**{WORD}** — one-line justification.

---

*Unresolved questions:*
- Question (or "None")
```

---

## Status Values

| Status | Meaning | When |
|--------|---------|------|
| COMPLETE | All work done, no blockers | Default success |
| PARTIAL | Done with caveats or skipped items | Partial execution |
| FAILED | Could not complete, blocker hit | Hard failure |
| IN PROGRESS | Mid-execution report | Phase checkpoints |

---

## Verdict Word — Per Agent Type

| Agent | Valid verdicts |
|-------|---------------|
| planner | `READY` `NEEDS-RESEARCH` `BLOCKED` |
| researcher | `ACTIONABLE` `INCONCLUSIVE` `NEEDS-MORE` |
| code-reviewer | `APPROVE` `FIX-AND-RESUBMIT` `REDESIGN` |
| muji | `APPROVE` `FIX-AND-RESUBMIT` `BLOCKED` |
| a11y-specialist | `PASS` `FAIL` `FIX-AND-RESUBMIT` |
| tester | `PASS` `FAIL` `PARTIAL` |

---

## Per-Agent Templates

| Agent | Human template | Agent schema |
|-------|---------------|--------------|
| planner | `plan/references/report-template.md` | — |
| researcher | `research/references/report-template.md` | — |
| code-reviewer | `code-review/references/report-template.md` | inline JSON findings |
| muji | `audit/references/finding-schema.md` (human section) | `audit/references/finding-schema.md` |
| a11y-specialist | a11y platform mode schema (human section) | a11y platform mode schema |
| tester | `test/references/report-template.md` | — |

---

## Output Location

All reports go into a dated folder:

```
reports/{YYMMDD-HHMM}-{slug}/
  report.md          — main deliverable
  session.json       — (audit types only)
  {sub-reports}      — (hybrid audits only)
```

Plan-scoped reports: `plans/{plan-dir}/reports/{YYMMDD-HHMM}-{slug}/`

**Before writing any file**: `mkdir -p reports/{YYMMDD-HHMM}-{slug}/`

Flat files in `reports/` root are **deprecated**. New reports always use the folder pattern.

Note: audit session folders follow `audit/references/output-contract.md` which extends this base pattern with additional sub-agent files and `session.json`.

---

## Index Maintenance

After saving any report file, update `reports/index.json`.
After saving a plan, update `plans/index.json`.
After saving a doc, update `docs/index.json`.

See `core/references/index-protocol.md` for schemas, field definitions, and agent responsibility matrix.

---

## Rules

- Header block always comes first (Date, Agent, Plan, Status)
- Executive Summary always the first body section
- Verdict always the last section before unresolved questions
- Unresolved questions footer always present (write "None" if empty)
- No freeform status variants — use the 4 values above only
- Every report produces two files: agent JSON + human Markdown (see index-protocol.md dual-file rule)
- Methodology section is **required** for: audit, review, plan, research, test reports — omit for journal/brainstormer
- Methodology must be filled with actual values — never leave template placeholders
