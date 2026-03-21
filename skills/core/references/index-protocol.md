# Index Protocol

Defines how agents maintain the three project index files: `docs/index.json`, `plans/index.json`, and `reports/index.json`.

**Rule**: Every agent that produces a persistent artifact (plan, report, doc) MUST update the relevant index before finishing.

---

## 1. `docs/index.json` — Knowledge Base Registry

Maintained by: `docs-manager`, `developer`, `debugger`, `planner`

Schema defined in `knowledge-retrieval/references/knowledge-base.md`. Key fields:

```json
{
  "schemaVersion": "1.0.0",
  "updatedAt": "YYYY-MM-DD",
  "entries": [{
    "id": "ADR-0001",
    "title": "Short title",
    "category": "decision | architecture | pattern | convention | feature | finding",
    "status": "accepted | current",
    "audience": ["agent", "human"],
    "path": "docs/decisions/ADR-0001-title.md",
    "tags": ["tag1"],
    "agentHint": "check before choosing X or doing Y",
    "related": []
  }]
}
```

**Update rule**: Append entry after writing the doc file. Update `updatedAt`.

---

## 2. `plans/index.json` — Plans Registry

Maintained by: `planner`, `project-manager`

```json
{
  "version": "1.0.0",
  "updated": "YYYY-MM-DD",
  "counts": {
    "active": 0,
    "completed": 0,
    "archived": 0,
    "total": 0
  },
  "plans": [{
    "id": "PLAN-0001",
    "title": "Short plan title",
    "type": "implementation | report | research",
    "status": "draft | active | completed | archived",
    "created": "YYYY-MM-DD",
    "authors": ["planner"],
    "tags": ["tag1"],
    "file": "plans/260307-1409-slug/plan.md"
  }]
}
```

**Key names**: `"version"` (not `"schemaVersion"`), `"updated"` (not `"updatedAt"`), `"plans"` array (not `"entries"`), `"counts"` object for totals.

`plans/README.md` is the human-readable board — updated automatically by lifecycle scripts (`set-active-plan.cjs`, `complete-plan.cjs`, `archive-plan.cjs`). Do NOT manually edit it.

**Update rule**: Append entry to `plans[]` after creating a plan directory. Increment relevant `counts` field. Update `updated` + `status` on lifecycle changes.

---

## 3. `reports/index.json` — Reports Registry

Maintained by: `code-reviewer`, `muji`, `a11y-specialist`, `researcher`, `planner`, `tester`

```json
{
  "schemaVersion": "1.0.0",
  "updatedAt": "YYYY-MM-DD",
  "entries": [{
    "id": "260309-0521-smart-letter-composer-audit",
    "type": "hybrid-audit | ui-audit | a11y-audit | code-review | research | plan | test",
    "agent": "code-reviewer",
    "title": "SmartLetterComposer Full Audit",
    "verdict": "FIX-AND-RESUBMIT",
    "path": "reports/260309-0521-smart-letter-composer-audit/",
    "files": {
      "report": "reports/260309-0521-smart-letter-composer-audit/report.md",
      "session": "reports/260309-0521-smart-letter-composer-audit/session.json"
    },
    "created": "2026-03-09 05:21"
  }]
}
```

**Folder rule**: `path` points to the dated folder (trailing `/`) — this is the canonical field. `files.report` is the main Markdown report. `files.session` is the `session.json` metadata file (audit types only). Both live inside the folder.

**Migration note**: Legacy entries with `files.agent`/`files.human` remain valid. New entries must use `path` + `files.report`.

**Update rule**: Append one entry per session (not per sub-agent report). Update `updatedAt`. Create `reports/index.json` if absent.

---

## Agent Responsibility Matrix

| Agent | Updates docs/ | Updates plans/ | Updates reports/ |
|-------|--------------|----------------|-----------------|
| `planner` | — | `index.json` | `index.json` (plan report) |
| `researcher` | — | — | `index.json` |
| `code-reviewer` | — | — | `index.json` |
| `muji` | — | — | `index.json` |
| `a11y-specialist` | — | — | `index.json` |
| `tester` | — | — | `index.json` |
| `developer` | `index.json` (knowledge capture) | — | — |
| `debugger` | `index.json` (findings) | — | `index.json` |
| `docs-manager` | `index.json` | — | — |

---

## Bootstrap (First Run)

If `reports/index.json` does not exist, create it:

```json
{
  "schemaVersion": "1.0.0",
  "updatedAt": "YYYY-MM-DD",
  "entries": []
}
```

If `plans/index.json` does not exist, create it with the same shape (replace `entries` content).
