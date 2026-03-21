# Audit Output Contract

Single source of truth for ALL audit output paths, file names, and agent responsibilities. Every agent and workflow file references this — do NOT define output paths elsewhere.

## Session Folder (all audit types)

Every audit — hybrid, standalone, or inline — writes to a session folder. **No flat files in `reports/`.**

| Audit Type | Folder Pattern | Orchestrator |
|------------|----------------|-------------|
| Hybrid (code-reviewer + muji) | `reports/{YYMMDD-HHMM}-{slug}-audit/` | code-reviewer |
| Standalone UI audit | `reports/{YYMMDD-HHMM}-{slug}-ui-audit/` | muji |
| Standalone a11y audit | `reports/{YYMMDD-HHMM}-{slug}-a11y-audit/` | a11y-specialist |
| Inline code review | `reports/{YYMMDD-HHMM}-{slug}-code-review/` | code-reviewer |

Where:
- `{YYMMDD-HHMM}` = today's date and time (e.g. `260309-0521`)
- `{slug}` = kebab-case target name, max 40 chars (e.g. `smart-letter-composer`)

## How to Create (Tool-Level)

The orchestrating agent MUST run this **before writing any file or dispatching any sub-agent**:

```
Bash("mkdir -p reports/{YYMMDD-HHMM}-{slug}-{type}/")
```

Sub-agents do NOT create folders. They write to `output_path` provided by the caller.

## Files in Session Folder

| File | Written By | Required | Content |
|------|-----------|----------|---------|
| `report.md` | Orchestrator | Always | Main deliverable — merged findings, methodology, verdict |
| `muji-ui-audit.md` | muji | Hybrid only | Muji's UI audit pass |
| `a11y-audit.md` | a11y-specialist | When delegated | A11Y audit pass |
| `session.json` | Orchestrator | Always | Machine-readable metadata (schema below) |

**"Orchestrator"** = the agent that owns the session. In hybrid: code-reviewer. In standalone: whichever agent was invoked.

## Responsibility Matrix — Hybrid Audit

**Orchestrator**: Main conversation (via `audit/SKILL.md`), NOT code-reviewer. Subagents cannot spawn further subagents.

| Responsibility | Main context | code-reviewer (sub-agent) | muji (sub-agent) | a11y (sub-agent) |
|---------------|:---:|:---:|:---:|:---:|
| Create session folder (`mkdir -p`) | **YES** | no | no | no |
| Dispatch sub-agents | **YES** | no | no | no |
| Write merged `report.md` | **YES** | no | no | no |
| Write own sub-report | — | `code-review-findings.md` | `muji-ui-audit.md` | `a11y-audit.md` |
| Write `session.json` | **YES** | no | no | no |
| Persist findings to `reports/known-findings/` | — | `code.json` | `ui-components.json` | `a11y.json` |
| Update `reports/index.json` | **YES** | no | no | no |

**Rule**: In hybrid audit, sub-agents write ONLY their own report file + their own known-findings DB. The main context handles session folder, merging, session.json, and index.json.

## Responsibility Matrix — Standalone Audit

| Responsibility | Orchestrating agent |
|---------------|:---:|
| Create session folder (`mkdir -p`) | **YES** |
| Write `report.md` | **YES** |
| Write `session.json` | **YES** |
| Persist findings to `reports/known-findings/` | **YES** (own domain) |
| Update `reports/index.json` | **YES** |

## session.json Schema

Written by the orchestrator as the LAST step (after all reports are merged).

```json
{
  "schemaVersion": "1.0.0",
  "type": "hybrid-audit",
  "created": "2026-03-09T05:21",
  "branch": "feature/smart-letter-composer",
  "scope": {
    "target": "SmartLetterComposer",
    "platform": "web",
    "mode": "library",
    "files": ["libs/klara-theme/src/lib/smart-letter-composer/"],
    "fileCount": 93
  },
  "agents": [
    { "name": "muji", "report": "muji-ui-audit.md", "verdict": "FIX-AND-REAUDIT", "findings": { "critical": 6, "high": 11, "medium": 10, "low": 6 } },
    { "name": "code-reviewer", "report": "report.md", "verdict": "FIX-AND-REAUDIT", "findings": { "critical": 1, "high": 4, "medium": 5, "low": 2 } }
  ],
  "summary": { "total": 45, "critical": 7, "high": 15, "medium": 15, "low": 8, "verdict": "FIX-AND-REAUDIT" }
}
```

Verdict priority: `REDESIGN` > `FIX-AND-REAUDIT` > `APPROVE` (use highest across all agents).

## reports/index.json Entry

One entry per session (not per sub-agent):

```json
{
  "id": "260309-0521-smart-letter-composer-audit",
  "type": "hybrid-audit",
  "agent": "code-reviewer",
  "title": "SmartLetterComposer Full Audit",
  "verdict": "FIX-AND-REAUDIT",
  "path": "reports/260309-0521-smart-letter-composer-audit/",
  "files": {
    "report": "reports/260309-0521-smart-letter-composer-audit/report.md",
    "session": "reports/260309-0521-smart-letter-composer-audit/session.json"
  },
  "created": "2026-03-09 05:21"
}
```

## A11Y Findings Escalation Format

When muji collects A11Y findings for code-reviewer to escalate, use this EXACT format in the report:

```markdown
## A11Y Findings (for escalation)

| ID | Rule | File | Issue |
|----|------|------|-------|
| A-01 | A11Y-001 | path/file.tsx:42 | Missing aria-label on button |
| A-02 | A11Y-003 | path/other.tsx:88 | Raw opacity for disabled state |
```

- **ID**: `A-{NNN}` — sequential within this report
- **Rule**: rule ID from audit-standards.md
- **File**: `path:line`
- **Issue**: one-line description

Code-reviewer reads this table, extracts files + issues, fills Template B for a11y-specialist.

## Known-Findings Persistence

Each agent persists findings to its own topic file inside `reports/known-findings/` (version-controlled, accumulates across audits):

```
reports/known-findings/
  a11y.json           ← a11y-specialist
  ui-components.json  ← muji
  code.json           ← code-reviewer
```

| Agent | DB Path | Schema |
|-------|---------|--------|
| muji | `reports/known-findings/ui-components.json` | `audit/references/ui-findings-schema.md` |
| code-reviewer | `reports/known-findings/code.json` | `code-review/references/code-known-findings-schema.md` |
| a11y-specialist | `reports/known-findings/a11y.json` | `a11y/assets/known-findings-schema.json` |

**Rule**: Never write to another agent's DB. Muji writes UI findings. Code-reviewer writes SEC/PERF/TS/LOGIC/DEAD/ARCH/STATE. A11Y writes WCAG violations.

Each finding MUST include: `source_agent`, `source_report` (relative path), `first_detected_at` (ISO 8601 datetime).

See `core/references/report-standard.md` for general report anatomy and folder pattern.

## Standards Files Reference

| Standards File | Used By | Scope |
|---------------|---------|-------|
| `ui-lib-dev/references/audit-standards.md` | muji | UI library + consumer code (STRUCT, PROPS, TOKEN, BIZ, A11Y, TEST, EMBED, LDRY, INT, PLACE, REUSE, TW, DRY, REACT, POC) |
| `code-review/references/code-review-standards.md` | code-reviewer | General code (SEC, PERF, TS, LOGIC, DEAD, ARCH, STATE) |
| WCAG 2.1 AA (external) | a11y-specialist | Accessibility |

In hybrid audit, both standards files apply — muji uses audit-standards.md, code-reviewer uses code-review-standards.md, with deduplication on overlapping file:line locations.
