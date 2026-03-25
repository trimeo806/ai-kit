---
name: audit-session-json-schema
description: "Schema for session.json — per-audit-session metadata file written to every session folder"
user-invocable: false
disable-model-invocation: true
---

# session.json Schema

Machine-readable metadata for an audit session. Written by the orchestrating agent as the final step after all reports are complete. Lives at `{session_folder}/session.json`.

## Empty Template (bootstrap)

```json
{
  "schemaVersion": "1.0.0",
  "type": "hybrid-audit",
  "created": "YYYY-MM-DDTHH:MM",
  "branch": null,
  "scope": {},
  "agents": [],
  "summary": {}
}
```

## Full Schema

```json
{
  "schemaVersion": "1.0.0",
  "type": "hybrid-audit | ui-audit | a11y-audit | code-review",
  "created": "2026-03-08T22:49",
  "branch": "feature/smart-letter-composer",
  "scope": {
    "target": "SmartLetterComposer",
    "platform": "web",
    "mode": "library",
    "files": ["libs/klara-theme/src/lib/smart-letter-composer/"],
    "fileCount": 93
  },
  "agents": [
    {
      "name": "muji",
      "report": "muji-ui-audit.md",
      "verdict": "FIX-AND-REAUDIT",
      "findings": { "critical": 6, "high": 11, "medium": 10, "low": 6 }
    },
    {
      "name": "code-reviewer",
      "report": "report.md",
      "verdict": "FIX-AND-REAUDIT",
      "findings": { "critical": 1, "high": 4, "medium": 5, "low": 2 }
    },
    {
      "name": "a11y-specialist",
      "report": "a11y-audit.md",
      "verdict": null,
      "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 }
    }
  ],
  "summary": {
    "total": 45,
    "critical": 7,
    "high": 15,
    "medium": 15,
    "low": 8,
    "verdict": "FIX-AND-REAUDIT"
  }
}
```

## Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | `string` | Yes | Always `"1.0.0"` |
| `type` | `string` | Yes | `hybrid-audit`, `ui-audit`, `a11y-audit`, or `code-review` |
| `created` | `string` | Yes | ISO 8601 datetime `YYYY-MM-DDTHH:MM` |
| `branch` | `string \| null` | No | Git branch at time of audit; null if not determinable |
| `scope.target` | `string` | Yes | Component or module name |
| `scope.platform` | `string` | Yes | `web`, `ios`, `android`, or `all` |
| `scope.mode` | `string` | No | `library` or `consumer` (UI audits only) |
| `scope.files` | `string[]` | Yes | File paths or directories audited |
| `scope.fileCount` | `integer` | No | Total files scanned |
| `agents[]` | `array` | Yes | One entry per participating agent |
| `agents[].name` | `string` | Yes | Agent identifier (e.g. `muji`) |
| `agents[].report` | `string` | Yes | Filename of agent's report within session folder |
| `agents[].verdict` | `string \| null` | Yes | Agent's verdict; null if agent did not participate |
| `agents[].findings` | `object` | Yes | Finding counts by severity |
| `summary.total` | `integer` | Yes | Total findings across all agents (deduplicated) |
| `summary.critical` | `integer` | Yes | Total critical findings |
| `summary.high` | `integer` | Yes | Total high findings |
| `summary.medium` | `integer` | Yes | Total medium findings |
| `summary.low` | `integer` | Yes | Total low findings |
| `summary.verdict` | `string` | Yes | Overall session verdict (max of all agent verdicts) |

## Verdict Priority

`REDESIGN` > `FIX-AND-REAUDIT` > `APPROVE` (use the highest across all agents)

## Who Writes It

| Audit type | Written by |
|------------|-----------|
| `hybrid-audit` | `code-reviewer` (after merging all sub-agent reports) |
| `ui-audit` | `muji` (standalone, no code-reviewer) |
| `a11y-audit` | `a11y-specialist` (standalone) |
| `code-review` | `code-reviewer` (inline, no sub-agents) |
