---
name: code-known-findings-schema
description: "Schema for .kit-data/code/known-findings.json — code review findings persistence layer"
user-invocable: false
disable-model-invocation: true
---

# Code Known-Findings Schema

Schema for `.kit-data/code/known-findings.json` — persistence layer for SEC, PERF, TS, LOGIC, DEAD, ARCH, and STATE findings from code review and hybrid audit passes. Mirrors `.kit-data/ui/known-findings.json` with code-review-specific categories.

Rule IDs from `code-review-standards.md`: SEC-001..008, PERF-001..006, TS-001..006, LOGIC-001..006, DEAD-001..003, ARCH-001..005, STATE-001..004

## Empty Template (bootstrap)

```json
{
  "schemaVersion": "1.0.0",
  "lastUpdated": "YYYY-MM-DD",
  "findings": []
}
```

## Finding Object

```json
{
  "id": 1,
  "module": "smart-letter-composer",
  "rule_id": "SEC-001",
  "category": "SEC",
  "title": "API key stored in plain-text localStorage",
  "file_pattern": "_hooks/use-ai-settings.ts",
  "code_pattern": "localStorage.setItem('smartletter-ai-settings', JSON.stringify(...))",
  "fix_template": "Use sessionStorage minimum; prefer server-proxy pattern so key never leaves server",
  "priority": 1,
  "severity": "critical",
  "source": "hybrid-audit",
  "source_agent": "code-reviewer",
  "source_report": "reports/260308-2249-smart-letter-composer-audit/report.md",
  "first_detected_at": "2026-03-08T22:59",
  "resolved": false,
  "resolved_date": null,
  "fix_applied": false,
  "fix_applied_date": null
}
```

## Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `id` | `integer` | Auto-incrementing unique identifier — never reuse |
| `module` | `string` | Module or component name (e.g. `smart-letter-composer`) |
| `rule_id` | `string` | Rule identifier (e.g. `SEC-001`, `PERF-002`, `TS-003`) |
| `category` | `string` | See Category Enum below |
| `title` | `string` | Short description of the violation |
| `file_pattern` | `string` | File path where the violation was found |
| `code_pattern` | `string` | The problematic code pattern (short snippet) |
| `fix_template` | `string` | How to fix it — template string or prose description |
| `priority` | `integer` | Fix priority: 1 = highest, 5 = lowest |
| `severity` | `string` | See Severity Enum below |
| `source` | `string` | See Source Enum below |
| `source_agent` | `string` | Agent that detected this finding (e.g. `code-reviewer`) |
| `source_report` | `string \| null` | Relative path to the report file that recorded this finding |
| `first_detected_at` | `string` | ISO 8601 datetime when finding was first recorded (`YYYY-MM-DDTHH:MM`) |
| `resolved` | `boolean` | True when finding is fully resolved and verified |
| `resolved_date` | `string \| null` | ISO date when resolved; null if open |
| `fix_applied` | `boolean` | True when a fix has been applied (not yet verified) |
| `fix_applied_date` | `string \| null` | ISO date when fix was applied; null if not yet fixed |

## Enum Values

### category
- `"SEC"` — security vulnerability (OWASP Top 10, credential exposure, injection, XSS)
- `"PERF"` — performance issue (N+1, unnecessary renders, unguarded expensive ops)
- `"TS"` — TypeScript safety (unsafe `any`, unvalidated casts, missing type guards)
- `"LOGIC"` — logic correctness (wrong algorithm, silent failure, incorrect comparison)
- `"DEAD"` — dead code (unreachable code, unused exports, orphaned utilities)
- `"ARCH"` — architecture violation (module boundaries, circular deps, layer violations)
- `"STATE"` — state management issue (incomplete state machines, missing exit states, concurrent mutations)

### severity
- `"critical"` — security risk, data loss, or breaking behaviour
- `"high"` — type safety violation, significant logic error, high performance impact
- `"medium"` — code smell, maintainability concern, minor logic gap
- `"low"` — style inconsistency, minor optimization opportunity

### source
- `"hybrid-audit"` — detected during hybrid code pass (after muji UI pass)
- `"code-review"` — detected by standalone code review
- `"manual"` — manually added by developer

## ID Assignment Rule

- IDs are auto-incrementing integers: `max(existing_ids) + 1`
- Never reuse an ID, even after resolution
- IDs must be unique across the entire `findings` array
- Start at `1` for a new database

## Deduplication Rule

When appending findings, skip if an entry with the same `rule_id` AND `file_pattern` already exists with `resolved: false`. Prevents duplicate open findings for the same issue across audit runs.

## Persistence Rule

The database is **append-only** — never delete finding entries. Resolved findings remain in the array with `resolved: true` for audit trail and regression detection.

## Regression Detection

When starting a new review pass, cross-reference current findings against this database:
- Same `rule_id` + `file_pattern` with `resolved: true` → flag as `regression: true` in the report
- Same `rule_id` + `file_pattern` with `resolved: false` → existing open finding, do not duplicate; reference its `id` in the report
