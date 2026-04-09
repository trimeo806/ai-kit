# Audit Report Schema v2.0

**This is a field reference** — it defines the structure of findings and methodology within `report.md`. You do NOT produce a separate JSON file. Findings are written inline as Markdown tables. Machine-readable tracking lives in `known-findings.json` (per-domain) and `session.json` (per-session summary).

For output paths and file naming: see `output-contract.md`.

## Finding Object (inline Markdown structure)

```json
{
  "id": "WEB-TOKEN-001",
  "ruleId": "TOKEN-003",
  "severity": "critical",
  "category": "token",
  "location": "button.tsx:42",
  "issue": "Raw hex color #FF0000 used instead of semantic token",
  "expected": "bg-signal-error or text-signal-on-error",
  "actual": "style={{ color: '#FF0000' }}",
  "fix": "Replace with className='text-signal-error' in button-styles.ts",
  "mentoring": "Semantic tokens auto-adapt to brand and dark mode. Hardcoded colors break theming.",
  "reuseOpportunity": "klara Button component covers this use case"
}
```

**Finding ID format:** `{PLATFORM}-{CATEGORY}-{NNN}`
- Platform: `WEB`, `IOS`, `ANDROID`
- Category: `INTEGRITY`, `PLACE`, `REUSE`, `TW`, `DRY`, `REACT`, `POC`, `STRUCT`, `PROPS`, `TOKEN`, `BIZ`, `A11Y`, `TEST`
- NNN: zero-padded sequence within that category for this audit (e.g., `001`, `002`)

## Report Envelope (conceptual — rendered as Markdown sections, not JSON)

```json
{
  "component": "ComponentName",
  "platform": "web",
  "auditor": "muji",
  "date": "YYYY-MM-DD",
  "version": "2.0",
  "auditMode": "consumer",
  "block": false,
  "summary": {
    "total": 5,
    "critical": 1,
    "high": 2,
    "medium": 1,
    "low": 1,
    "score": "28/35",
    "verdict": "fix-and-reaudit"
  },
  "integrityViolations": [],
  "findings": [],
  "sectionRatings": {
    "PLACE": {
      "score": 8.5,
      "insight": "Component is well-placed within its feature directory. PL-7 (barrel export) missing."
    },
    "REUSE": {
      "score": 6.0,
      "insight": "Two raw <input> elements found where klara Input would apply. Button adoption is correct."
    },
    "TW": {
      "score": 9.0,
      "insight": "One arbitrary value [18px] found; theme scale has p-4.5 equivalent."
    },
    "REACT": {
      "score": 7.5,
      "insight": "useEffect missing deps on line 42. Inline object in JSX prop on line 88."
    },
    "POC": {
      "score": 5.0,
      "insight": "Hardcoded staging URL and 3 console.log statements detected."
    }
  },
  "pocIndicators": [
    "console.log at feature/dashboard/Chart.tsx:34",
    "Hardcoded URL 'https://api.staging.tri-ai-kit.app' at feature/dashboard/api.ts:12"
  ],
  "reuseOpportunities": [
    "Raw <input type='text'> at form/SearchBar.tsx:18 — use klara Input",
    "Custom spinner div at feature/loading/Spinner.tsx — use klara Spinner"
  ],
  "patternObservations": [
    "Custom button style used in 3 files — treated as feature convention, REUSE flag suppressed"
  ],
  "mentoringPoints": [
    "Top teaching point 1",
    "Top teaching point 2",
    "Top teaching point 3"
  ],
  "methodology": {
    "filesScanned": ["feature/dashboard/Chart.tsx", "feature/dashboard/api.ts"],
    "knowledgeTiersUsed": ["L1-docs-conventions", "L2-RAG", "L4-grep-fallback"],
    "standardsSource": ["audit/references/audit-standards.md", "ui-lib-dev/references/audit-standards.md", "docs/conventions/CONV-0001.md"],
    "coverageGaps": ["RAG unavailable — Grep fallback used for token catalog", "No prior audit report found for this component"]
  }
}
```

> JSON methodology fields map to `core/references/report-standard.md` Methodology table. Use identical field semantics.

### Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `auditMode` | `"library" \| "consumer"` | Detected audit mode |
| `block` | `boolean` | True if INTEGRITY violation found — no further rules run |
| `integrityViolations` | `Finding[]` | CRITICAL findings from INT-1/INT-2 checks |
| `sectionRatings` | `Record<string, { score: number, insight: string }>` | Per-section score (0–10) with narrative |
| `pocIndicators` | `string[]` | List of POC signals found with locations |
| `reuseOpportunities` | `string[]` | Components that could use klara equivalents |
| `patternObservations` | `string[]` | DRY patterns detected and recognized as conventions |
| `findings[].reuseOpportunity` | `string?` | Optional: klara component that covers this case |
| `findings[].insight` | `string?` | Optional: mentoring note for this specific finding |
| `methodology.filesScanned` | `string[]` | All files actually read during audit |
| `methodology.knowledgeTiersUsed` | `string[]` | Which retrieval levels were activated (L1–L5) and their availability |
| `methodology.standardsSource` | `string[]` | Skill files, checklists, external standards (WCAG, OWASP) used as rules source |
| `methodology.coverageGaps` | `string[]` | What was NOT available: RAG down, missing checklist, no platform rules |

## Severity Definitions

| Severity | Meaning | Examples |
|----------|---------|---------|
| critical | Breaks library contract, theming, or isolation | Domain types in component, raw colors, missing styles file, hardcoded API URL, unguarded async |
| high | Convention violation affecting consistency | Wrong prop naming, missing tests, no `use client`, missing klara component adoption |
| medium | Quality gap, maintainability concern | Missing JSDoc, no displayName, TODO comments, large components |
| low | Style preference, minor improvement | Boolean typing, Map vs object for simple cases |
| warning | Non-blocking concern | Non-composable style override (INT-3) |
| info | Informational — convention observed | DRY pattern recognized, REUSE flag suppressed |

## Verdict Logic

```
verdict =
  if (block == true) => "blocked"
  else if (critical >= 2) => "redesign"
  else if (high >= 1 || medium >= 3) => "fix-and-reaudit"
  else => "pass"
```

## Score Calculation

### Library Mode
- Score = `{PASS_COUNT}/35`
- Count only the 35 rules from `ui-checklist-web-atoms.md`
- N/A rules do not count toward total (adjust denominator)
- Example: 32 applicable rules, 28 pass → score = `28/32`

### Consumer Mode
- Per-section scores (0–10) calculated via formulas in `audit-standards.md`
- Overall score = weighted average of section scores
- Report `sectionRatings` for each applicable section
- Blocked reports: no score calculated
