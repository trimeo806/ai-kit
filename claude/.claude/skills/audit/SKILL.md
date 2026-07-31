---
name: audit
description: Use when user says "audit", "run an audit", "check quality", "review before merge", "a11y audit", or "code audit" — detects audit type (UI component, a11y, or code) and dispatches the right specialist
user-invocable: true
metadata:
  argument-hint: "[--ui <ComponentName> [--platform web|ios|android|all] [--poc|--beta|--stable] | --a11y [platform] | --code | --architecture [module]]"
  keywords: [audit, review, component, a11y, accessibility, code, quality, ui-lib, tokens, architecture, deepening, module-depth, seam, refactor]
  triggers:
    - "audit"
    - "audit component"
    - "audit ui"
    - "audit a11y"
    - "audit code"
    - "code audit"
    - "component audit"
    - "architecture audit"
    - "improve codebase architecture"
  platforms: [all]
  agent-affinity: [code-reviewer, a11y-specialist]
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

If `$ARGUMENTS` starts with `--ui`: load `references/ui-workflow.md` and execute inline. Pass component name + platform flags + maturity tier.
If `$ARGUMENTS` starts with `--a11y`: **dispatch a11y-specialist** via Agent tool. Pass `references/a11y-workflow.md` + platform hint.
If `$ARGUMENTS` starts with `--close --ui`: load `references/ui-close.md` and execute inline.
If `$ARGUMENTS` starts with `--close`: load `references/a11y-close.md` and execute inline.
If `$ARGUMENTS` starts with `--code`: **dispatch code-reviewer** via Agent tool.
If `$ARGUMENTS` starts with `--architecture`: load `references/architecture-workflow.md` and execute inline. Pass the module/subsystem scope if given.
Otherwise: continue to Auto-Detection.

## Single-Agent Delegation Protocol

For non-hybrid dispatches (`--ui`, `--code`, `--a11y`):

1. Create session folder per `references/output-contract.md`
2. Select template from `references/delegation-templates.md`
3. Fill all `{placeholders}` — include `Output path: {session_folder}/{filename}`
4. Dispatch via **Agent tool** to the specialist agent
5. **Wait** for specialist report
6. Run build verification: `node .claude/hooks/lib/build-gate.cjs` — append `## Build Verification` to report (advisory)
7. Write `session.json` and update `reports/index.json`
8. **(`--code` only)** Run plan phase update — see **Plan Phase Update** section below

**Output contract**: `references/output-contract.md` is the single source of truth for paths and responsibilities.

| Template | Specialist | When |
|----------|-----------|------|
| B — A11y Audit | a11y-specialist | `--a11y` flag or A11y findings from UI audit |
| C — Code Escalation | code-reviewer | Critical findings needing deeper pass |
| D — Docs Gap Detection | docs-manager | Post-audit, new feature, or refactor |
| E — MCP/RAG Query | mcp-manager | Component catalog lookup, pattern search |

## Aspect Files

| File | Purpose |
|------|---------|
| `references/output-contract.md` | **Single source of truth** — all output paths, session folders, file names, agent responsibilities |
| `references/ui-workflow.md` | Audit UI component |
| `references/a11y-workflow.md` | Audit staged changes for WCAG 2.1 AA violations |
| `references/a11y-close.md` | Mark an accessibility finding as resolved |
| `references/ui-close.md` | Close/resolve a UI finding in known-findings DB |
| `references/ui-findings-schema.md` | Schema for `reports/known-findings/ui-components.json` |
| `references/session-json-schema.md` | Schema for `session.json` — per-session metadata written to every session folder |
| `references/delegation-templates.md` | Structured handoff templates for specialist delegation |
| `references/architecture-workflow.md` | Scan for module **deepening opportunities**, then grill the chosen candidate |
| `references/architecture-html-report.md` | HTML scaffold, diagram patterns, and tone for the architecture report |

## Plan Phase Update

**Triggered automatically after `--code` audit completes.** Closes the plan → cook → audit loop by writing findings back to the active phase file.

### Steps

1. Run: `node .claude/scripts/get-active-plan.cjs`
2. **If result = `none`**: skip this section entirely. No plan to update.
3. **If plan found**: read `plan.md` → identify the active phase row (`status: in_progress` or most recently `done`)
4. Read the phase file (e.g. `phase-2-api-layer.md`)
5. Find the **Validation Criteria** block in the phase file
6. For each criterion, check audit findings:
   - No critical/high finding touching that criterion → mark `✅ passed`
   - Critical or high finding against that criterion → mark `❌ failed — see audit report`
   - Not covered by audit → mark `⚪ not verified`
7. Append or update a `## Audit Verification` block at the bottom of the phase file:

```markdown
## Audit Verification

Audit: `reports/sessions/{session_id}/code-audit.md`
Date: YYYY-MM-DD

| Criterion | Result | Finding |
|-----------|--------|---------|
| No SQL injection in query layer | ✅ passed | — |
| Auth middleware applied to all routes | ❌ failed | Critical: route /api/admin missing auth guard |
| Error responses do not leak stack traces | ✅ passed | — |
```

8. If any criteria failed: update phase frontmatter `status: needs-rework`. If all passed: leave status as-is (phase owner decides when to mark `done`).
9. Report the update to the user: "Phase N validation updated — X passed, Y failed, Z not verified."

### Rules

- Never mark a criterion as `passed` if a critical or high finding touches the same file or function
- Medium/low findings do not cause a fail — note them in the Finding column with severity prefix
- If the phase file has no Validation Criteria block, skip steps 6-8 and note "No validation criteria found in phase file"
- Do NOT rewrite the full phase file — only append/update the `## Audit Verification` block

## Auto-Detection

Analyze `$ARGUMENTS` keywords and context:

| Signal | Dispatch |
|--------|----------|
| Component name, "component", "ui-lib", "design system", "token" | `--ui` → `references/ui-workflow.md` (inline) |
| "a11y", "accessibility", "wcag", "voiceover", "talkback" | `--a11y` → `references/a11y-workflow.md` |
| "close" + "ui" signals | `--close --ui` → `references/ui-close.md` |
| "close", "resolve", "finding" | `--close` → `references/a11y-close.md` |
| "code", "security", "performance", staged changes without component signal | `--code` → `code-review` |
| "architecture", "shallow", "coupling", "hard to test", "structure", "deepen", "too many small files" | `--architecture` → `references/architecture-workflow.md` (inline) |
| Ambiguous | Ask: UI component audit, a11y audit, code audit, or architecture audit? |

## Platform Detection (--ui mode)

Detect target platforms for --ui mode:
- Explicit `--platform web|ios|android|all` in args → pass through
- `.swift` context → `--platform ios`
- `.kt`/`.kts` context → `--platform android`
- `.tsx`/`.jsx`/`.ts` context → `--platform web`
- No context → `--platform all`

## Variant Summary

| Flag | Agent | Reference | Scope |
|------|-------|-----------|-------|
| `--ui` | inline | `references/ui-workflow.md` | Design system components (web/iOS/Android) |
| `--a11y` | a11y-specialist | `references/a11y-workflow.md` | WCAG 2.1 AA violations |
| `--close` | a11y-specialist | `references/a11y-close.md` | Mark a11y finding as resolved |
| `--close --ui <id>` | inline | `references/ui-close.md` | Mark UI finding resolved |
| `--code` | code-reviewer | `code-review` | General code quality, security, performance |
| `--architecture` | inline (+ `Explore` subagents) | `references/architecture-workflow.md` | Module depth, seams, testability — structural, not line-level |

### `--code` vs `--architecture`

| | `--code` | `--architecture` |
|---|---|---|
| Unit of finding | Defect at `file:line` | Deepening opportunity across modules |
| Question asked | "Is this code wrong?" | "Is this the right shape?" |
| Output | Findings table + verdict | Candidate cards + before/after diagrams + a grilled decision |
| Ends with | Fix list | One chosen candidate, ADR/CONTEXT.md updated |

Run both when reviewing a large feature: `--code` catches what's broken, `--architecture` catches why it keeps breaking.

## Examples

- `/audit --ui Button` → audits Button across all platforms (inline)
- `/audit --ui Card --platform web` → audits web-only
- `/audit --ui SmartLetterComposer --poc` → organism audit with poc maturity tier, phased roadmap verdict
- `/audit --ui SmartLetterComposer --platform web --beta` → organism audit with beta maturity tier
- `/audit --a11y` → a11y specialist audits staged changes
- `/audit --code` → reviewer audits staged code changes
- `/audit --close --ui 3` → mark UI finding ID 3 as resolved
- `/audit --architecture` → scope from git hot spots, propose deepenings, open the HTML report
- `/audit --architecture booking-flow` → scope to the booking-flow module
- `/audit Input` → auto-detected as UI audit → executes inline via references/ui-workflow.md
