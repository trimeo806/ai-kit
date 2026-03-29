# Audit Delegation Templates

Structured handoff templates for dispatching audit work to specialist agents.

**Usage:** These templates are dispatched by the **main conversation** (via `audit/SKILL.md`), NOT by subagents. Subagents cannot spawn further subagents — neither Agent tool nor Task tool is available in subagent context.

Select the matching template, fill all `{placeholders}`, dispatch via **Agent tool**, wait for specialist report, then merge findings.

**Session folder rule**: The calling agent (code-reviewer) creates the session folder via `mkdir -p reports/{date}-{slug}-audit/` BEFORE dispatching any sub-agent. Sub-agents write to the `Output path:` provided — they do NOT create the folder themselves.

---

## Template A: UI Component Audit (→ muji)

```
## Delegated UI Audit

Scope: {file_list}
Component(s): {component_names}
Mode: {library | consumer}
Platform: {web | ios | android | all}

Expectations:
- Run full audit workflow per audit/references/ui-workflow.md
- Apply audit-standards.md rules for detected mode
- Write report per `audit/references/report-template.md`

Boundaries:
- Analyze and report only — do not modify source files
- If A11y findings emerge, collect them and note for a11y-specialist delegation

Report back to: {calling_agent}
Output path: {session_folder}/muji-ui-audit.md
```

---

## Template A+: Feature Module UI Standards Delegation (→ muji)

```
## Delegated UI Standards Audit
Scope: {file_list}
Component(s): {component_names}
Mode: library
Platform: web
Audit focus: STRUCT, PROPS, TOKEN, BIZ, A11Y, TEST only
Out of scope: Security (SEC), Performance (PERF), TypeScript depth — handled by caller

Expectations:
- Run Library mode steps per audit/references/ui-workflow.md
- Apply audit-standards.md rules for Library mode only
- Write report per `audit/references/report-template.md`
- Include `## Component Catalog` section: list of all discovered klara components
- Include `## Docs Gaps` section: any missing/stale docs/index.json entries found

Boundaries:
- Analyze and report only — do not modify source files
- Do not run SEC, PERF, or architecture checks — caller handles those
- If A11Y findings emerge, collect and note for a11y-specialist delegation

Report back to: {calling_agent}
Output path: {session_folder}/muji-ui-audit.md
```

---

## Template A++: POC Organism Audit (→ muji)

```
## Delegated POC Organism Audit

Scope: {file_list}
Component(s): {component_names}
Mode: library
Platform: {web | ios | android | all}
Component Class: organism
Maturity Tier: {poc | beta | stable}
Audit focus: ORGANISM, STATE, MOCK, TEST (DIALOG advisory-only)
A11Y: collect findings only — all A11Y rules are advisory-only for POC (do NOT escalate; no a11y-specialist dispatch at this tier)
Out of scope: STRUCT-002, TOKEN-001, BIZ-001/002/003, STRUCT-005, TEST-004 (suppressed per maturity tier)

Expectations:
- Classify component per Step 0.5 (confirm organism classification)
- Apply maturity tier per Step 0.6 — modulate blocking vs advisory
- Load ui-checklist-web-organisms.md (NOT ui-checklist-web-atoms.md)
- Include mock boundary scan: verify MOCK_* naming, API contract mapping, export isolation
- Write report per `audit/references/report-template.md`
- Use phased roadmap verdict (Now / Before Beta / Before Stable) for POC/beta
- Include ## Component Catalog and ## Docs Gaps sections

Boundaries:
- Analyze and report only — do not modify source files
- Do not run SEC, PERF, or architecture checks — caller handles those
- If A11Y findings emerge: collect as advisory notes only (no escalation — POC tier skips a11y-specialist dispatch)

Report back to: {calling_agent}
Output path: {session_folder}/muji-ui-audit.md
```

---

## Template B: A11y Audit (→ a11y-specialist)

```
## Delegated A11y Audit

Scope: {file_list}
Platform: {web | ios | android}
Context: {from_ui_audit | from_code_review | direct}
Prior findings: {finding_ids if any, else "none"}

Expectations:
- Run audit per audit/references/a11y-workflow.md + platform mode file
- Check against known-findings database for regressions
- Write report per `audit/references/report-template.md` (use WCAG rule IDs instead of ORGANISM/STATE/MOCK IDs)

Boundaries:
- Fix ONLY accessibility attributes if in fix mode
- Do not refactor logic, rename variables, or reorganize code

Report back to: {calling_agent}
Output path: {session_folder}/a11y-audit.md
```

---

## Template C: Code Audit Escalation (→ code-reviewer, deeper pass)

```
## Escalated Code Audit

Scope: {file_list}
Trigger: {critical_finding_summary}
Original review: {review_report_path}

Expectations:
- Activate knowledge-retrieval for deeper context (L1 docs/, L4 grep)
- Focus on: {security | performance | architecture} per trigger
- Cross-reference with docs/ conventions and prior findings

Boundaries:
- Report only — no code modifications
- Do not re-review areas already covered in original review

Report back to: {calling_agent}
```

---

## Template D: Documentation Audit Delegation (→ docs-manager)

```
## Delegated Docs Audit

Scope: {component_name} — {file_list}
Mode: {library | consumer}
Trigger: {missing_docs | stale_docs | undocumented_api}
Existing registry: {docs/index.json path if found, or "not found"}

Expectations:
- Check if component has a docs/index.json entry (FEAT-* or CONV-*)
- If entry exists, verify it matches current API surface (props, variants, exports)
- If entry missing, draft a new FEAT-* entry for the component
- Flag stale docs with specific field-level mismatches

Boundaries:
- Do not modify source code
- Do not create full documentation from scratch — flag gaps and draft entry stubs only
- Report which docs paths you checked

Report back to: {calling_agent}
Output path: {reports_path}
```

---

## Template E: MCP/RAG Knowledge Query (→ mcp-manager)

```
## MCP Knowledge Query

Query: {query_string}
Scope: {component_name | token_name | pattern_name}
Platform: {web | ios | android}
Purpose: {reuse_check | token_lookup | component_catalog | prior_findings}

Expectations:
- Discover available MCP/RAG tools for the given platform
- Execute query against the best available tool
- Return: matched component names, file paths, relevant excerpts

Boundaries:
- Query only — no writes, no code changes
- If no relevant tool is available, return "no RAG available" so caller can fall back to Glob/Grep
- Single-shot: one query per delegation

Report back to: {calling_agent}
```

**Scope**: Use Template E for **non-RAG MCP queries only** (resource listing, Figma tool discovery, service-level MCP capabilities).

**Do NOT use Template E for RAG queries** (catalog, pattern search, prior findings). RAG queries bypass mcp-manager — call `mcp__web-rag-system__*` tools directly via `ToolSearch("web-rag")`. Reason: subagents cannot spawn further subagents via Task tool.
