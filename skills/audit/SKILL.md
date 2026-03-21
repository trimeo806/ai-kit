---
name: audit
description: Use when user says "audit", "run an audit", "check quality", "review before merge", "a11y audit", or "code audit" — detects audit type (UI component, a11y, or code) and dispatches the right specialist
user-invocable: true
metadata:
  argument-hint: "[--ui <ComponentName> [--platform web|ios|android|all] [--poc|--beta|--stable] | --a11y [platform] | --code]"
  keywords: [audit, review, component, a11y, accessibility, code, quality, ui-lib, muji, tokens]
  triggers:
    - "audit"
    - "audit component"
    - "audit ui"
    - "audit a11y"
    - "audit code"
    - "code audit"
    - "component audit"
  platforms: [all]
  agent-affinity: [muji, code-reviewer, a11y-specialist]
  connections:
    enhances: [code-review, ui-lib-dev]
    requires: [knowledge-retrieval]
---

# Audit — Unified Audit Command

Auto-detect and execute the appropriate audit workflow.

## Methodology Tracking

Every audit report MUST include a `methodology` field (JSON) or **Methodology** section (Markdown) documenting:
- **Files Scanned** — every file actually read
- **Knowledge Tiers** — which levels (L1–L4) were activated and whether each was available
- **Standards Source** — the skill files, checklists, and external standards used as rule authority
- **Coverage Gaps** — anything unavailable (RAG down, checklist not found, no platform rules loaded)

Track these as you work. Never leave them empty or with placeholder values.

## Knowledge Retrieval (Pre-Audit)

Before executing any audit mode, activate `knowledge-retrieval` to load relevant context:
- L1 `docs/` — existing conventions, past findings, ADRs for the files under review
- L2 RAG — component implementations, token definitions, usage patterns
- L4 Grep/Glob — fallback if RAG unavailable (search `packages/`, `src/` directly)
- L5 Context7 — library API verification for external dependency usage

**RAG unavailable?** Skip L2, go directly to L4 Grep/Glob. Never block the audit waiting for RAG.

## Subagent Constraint

**Subagents cannot spawn further subagents** — neither Agent tool nor Task tool is available in subagent context. Therefore, this skill runs **inline in the main conversation** (no `context: fork`). The main conversation is the orchestrator — it dispatches specialist agents and merges their results.

## Step 0 — Flag Override + Mode Selection

If `$ARGUMENTS` contains `--poc`, `--beta`, or `--stable`: extract the maturity tier and pass it through to `references/ui-workflow.md` workflow (Step 0.6). These flags combine with `--ui` — they are not standalone modes.

If `$ARGUMENTS` starts with `--ui` and **no maturity tier flag** (`--poc`/`--beta`/`--stable`) is present:
**Ask the developer to confirm maturity tier before dispatching**:
> "What's the maturity stage of `{ComponentName}`?
> - `--poc` — prototype / proof-of-concept (relaxed rules, phased roadmap)
> - `--beta` — in active development (moderate strictness)
> - `--stable` — production-ready (full strictness)
>
> Reply with the flag or just `poc` / `beta` / `stable`."
Wait for reply, then set the maturity tier and proceed.

If `$ARGUMENTS` starts with `--ui`: **dispatch muji** via Agent tool. Pass component name + platform flags + maturity tier (if present) + `references/ui-workflow.md` workflow.
If `$ARGUMENTS` starts with `--a11y`: **dispatch a11y-specialist** via Agent tool. Pass `references/a11y-workflow.md` + platform hint.
If `$ARGUMENTS` starts with `--close --ui`: load `references/ui-close.md` and execute inline.
If `$ARGUMENTS` starts with `--close`: load `references/a11y-close.md` and execute inline.
If `$ARGUMENTS` starts with `--code`: **dispatch code-reviewer** via Agent tool.
If auto-detected as **hybrid** (see Hybrid Detection below): run Hybrid Orchestration.
Otherwise: continue to Auto-Detection.

## Hybrid Detection

Trigger hybrid mode when ALL conditions met:
- Target contains klara-theme files (path contains `libs/klara-theme/` or `libs/common/`)
- File count >= 20 OR multiple subdirectories in scope
- No explicit `--ui` or `--code` flag (those force single-agent mode)

## Hybrid Orchestration (main context)

**This runs in the main conversation, NOT in a subagent.** The main context has Agent tool available.

```
session_folder = reports/{YYMMDD-HHMM}-{slug}-audit/
```

1. **Create session folder**: `Bash("mkdir -p {session_folder}")`
2. **Dispatch muji** via Agent tool with Template A+ from `references/delegation-templates.md`:
   - Fill: Scope, Component(s), Mode: library, Platform, Output path: `{session_folder}/muji-ui-audit.md`
   - WAIT for muji to complete
3. **Read muji report** at `{session_folder}/muji-ui-audit.md`. Extract:
   - `finding_locations`: Set of file:line flagged by muji
   - `verdict`: muji's overall verdict
   - `a11y_findings`: contents of `## A11Y Findings` section (if present)
4. **If a11y findings exist AND maturity tier is NOT `poc`**: dispatch a11y-specialist via Agent tool (Template B):
   - Output path: `{session_folder}/a11y-audit.md`
   - WAIT for completion
   - **POC exception**: If `--poc`, skip a11y dispatch — A11Y findings are already advisory-only in muji's report (no dedicated a11y pass needed until beta)
5. **Dispatch code-reviewer** via Agent tool:
   - Pass: file list, `{session_folder}/muji-ui-audit.md` path (for dedup), SEC/PERF/TS/ARCH/STATE/LOGIC scope
   - Output path: `{session_folder}/code-review-findings.md`
   - WAIT for completion
6. **Merge reports** into `{session_folder}/report.md`:
   - Executive Summary with overall verdict
   - `## UI Audit` — muji verdict, finding count, link to `muji-ui-audit.md`
   - `## A11Y Audit` (if ran) — link to `a11y-audit.md`
   - `## Code Review` — code-reviewer findings inline
   - Methodology section
6.5. **Run build verification**:
   ```bash
   node .claude/hooks/lib/build-gate.cjs
   ```
   Append `## Build Verification` section to `{session_folder}/report.md`:
   - Exit 0: `Build verification: ✓ PASS ({platform}, {duration_ms}ms)`
   - Exit 1: `Build verification: ✗ FAIL — {error excerpt}` (advisory — does not block report)
   - Exit 0 (no command): `Build verification: skipped (no build command detected)`
7. **Write session.json** per `references/session-json-schema.md`
8. **Update reports/index.json** per `core/references/index-protocol.md`

Verdict = `max(muji, a11y, code-reviewer)` where REDESIGN > FIX-AND-REAUDIT > APPROVE.

## Single-Agent Delegation Protocol

For non-hybrid dispatches (`--ui`, `--code`, `--a11y`):

1. Create session folder per `references/output-contract.md`
2. Select template from `references/delegation-templates.md`
3. Fill all `{placeholders}` — include `Output path: {session_folder}/{filename}`
4. Dispatch via **Agent tool** to the specialist agent
5. **Wait** for specialist report
6. Run build verification: `node .claude/hooks/lib/build-gate.cjs` — append `## Build Verification` to report (advisory)
7. Write `session.json` and update `reports/index.json`

**Output contract**: `references/output-contract.md` is the single source of truth for paths and responsibilities.

| Template | Specialist | When |
|----------|-----------|------|
| A — UI Component Audit | muji | `--ui` flag or UI component signals |
| A+ — Feature Module UI Standards | muji | Hybrid mode, multi-file library audit |
| A++ — POC Organism Audit | muji | `--ui` + organism classification + `--poc`/`--beta` |
| B — A11y Audit | a11y-specialist | `--a11y` flag or A11y findings from UI audit |
| C — Code Escalation | code-reviewer | Critical findings needing deeper pass |
| D — Docs Gap Detection | docs-manager | Post-audit, new feature, or refactor |
| E — MCP/RAG Query | mcp-manager | Component catalog lookup, pattern search |

## Aspect Files

| File | Purpose |
|------|---------|
| `references/output-contract.md` | **Single source of truth** — all output paths, session folders, file names, agent responsibilities |
| `references/ui-workflow.md` | Audit UI component (Senior Muji Reviewer) |
| `references/a11y-workflow.md` | Audit staged changes for WCAG 2.1 AA violations |
| `references/a11y-close.md` | Mark an accessibility finding as resolved |
| `references/ui-close.md` | Close/resolve a UI finding in known-findings DB |
| `references/ui-findings-schema.md` | Schema for `reports/known-findings/ui-components.json` |
| `references/session-json-schema.md` | Schema for `session.json` — per-session metadata written to every session folder |
| `references/delegation-templates.md` | Structured handoff templates for specialist delegation |

## Auto-Detection

Analyze `$ARGUMENTS` keywords and context:

| Signal | Dispatch |
|--------|----------|
| Component name (`tri-ai-kit*`, UI keyword), "component", "ui-lib", "design system", "token", "klara", "muji" | `--ui` → `references/ui-workflow.md` via **muji** |
| "a11y", "accessibility", "wcag", "voiceover", "talkback" | `--a11y` → `references/a11y-workflow.md` |
| "close" + "ui" signals | `--close --ui` → `references/ui-close.md` |
| "close", "resolve", "finding" | `--close` → `references/a11y-close.md` |
| "code", "security", "performance", staged changes without component signal | `--code` → `code-review` |
| Ambiguous | Ask: UI component audit, a11y audit, or code audit? |

## Platform Detection (--ui mode)

When delegating to muji, detect target platforms:
- Explicit `--platform web|ios|android|all` in args → pass through
- `.swift` context → `--platform ios`
- `.kt`/`.kts` context → `--platform android`
- `.tsx`/`.jsx`/`.ts` context → `--platform web`
- No context → `--platform all`

## Variant Summary

| Flag | Agent | Reference | Scope |
|------|-------|-----------|-------|
| `--ui` | muji | `references/ui-workflow.md` | Design system components (web/iOS/Android) |
| `--a11y` | a11y-specialist | `references/a11y-workflow.md` | WCAG 2.1 AA violations |
| `--close` | a11y-specialist | `references/a11y-close.md` | Mark a11y finding as resolved |
| `--close --ui <id>` | muji | `references/ui-close.md` | Mark UI finding resolved |
| `--code` | code-reviewer | `code-review` | General code quality, security, performance |

## Examples

- `/audit --ui tri-ai-kitButton` → muji audits tri-ai-kitButton across all platforms
- `/audit --ui tri-ai-kitCard --platform web` → muji audits web-only
- `/audit --ui SmartLetterComposer --poc` → organism audit with poc maturity tier, phased roadmap verdict
- `/audit --ui SmartLetterComposer --platform web --beta` → organism audit with beta maturity tier
- `/audit --a11y` → a11y specialist audits staged changes
- `/audit --code` → reviewer audits staged code changes
- `/audit --close --ui 3` → mark UI finding ID 3 as resolved
- `/audit tri-ai-kitInput` → auto-detected as UI audit → delegates to muji
