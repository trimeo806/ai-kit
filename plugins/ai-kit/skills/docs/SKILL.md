---
name: docs
description: Use when user says "write docs", "update docs", "document this", "init docs", "migrate docs", "reorganize documentation", "scan docs for staleness", "write an RCA / post-mortem / ADR" — detects docs intent (init, migrate, update, reorganize, scan, verify, problem analysis) and runs the right workflow on the project's knowledge base
user-invocable: true
metadata:
  argument-hint: "[--init | --migrate | --reorganize | --scan | --verify | --problem]"
---

# Docs — Unified Documentation Command

**When documentation intent is detected:**
1. Load project rules if not already in context: `.ai-kit/workspace.json` and the `AGENTS.md` chain,
   per `${CLAUDE_PLUGIN_ROOT}/references/project-rules-contract.md`. `docs/` in the references means
   `<docsDir>` from `workspace.json` (default `docs`) at the workspace root, or the docs location
   the project rules name. Missing → ask once and suggest saving it with `/ai-kit:setup-rules`.
2. Spawn `ai-kit:docs-manager` (`subagent_type: ai-kit:docs-manager`) with the full user request,
   the detected mode, the reference file's contents (subagents can't read `${CLAUDE_PLUGIN_ROOT}`),
   and the active context (CWD, docs index path).
3. Do NOT execute documentation steps inline in the main conversation.

> **Codex:** there are no named role agents — spawn a subagent briefed with `${CLAUDE_PLUGIN_ROOT}/agents/docs-manager.md`, or do the steps inline. Without AskUserQuestion, ask in plain chat.

---

Auto-detect and execute the appropriate documentation workflow on the knowledge-base (KB) layout
defined in `references/init.md`. Work artifacts under `<docsDir>/<TICKET-KEY>/` or
`<docsDir>/<intention-name>/` are not KB docs: never index, move or reorganize them.

## Before You Begin — Purpose Clarification

Before proceeding, if not already stated in the request, ask:

> "What is this documentation for? What are its goals and who is the target audience?"

Use the answers to calibrate depth, tone, and structure of all generated content.

---

## Step 0 — Flag Override

If `$ARGUMENTS` starts with `--init`: load `references/init.md`, execute in generation mode.
If `$ARGUMENTS` starts with `--migrate`: load `references/init.md`, execute in migrate mode.
If `$ARGUMENTS` starts with `--reorganize`: load `references/update.md`, execute in reorganize mode.
If `$ARGUMENTS` starts with `--scan`: load `references/update.md`, execute in scan mode.
If `$ARGUMENTS` starts with `--verify`: load `references/update.md`, execute in verify mode.
If `$ARGUMENTS` starts with `--problem`: load `references/problem.md`, execute in problem-analysis mode.
Otherwise: continue to Auto-Detection.

## Aspect Files

| File | Purpose |
|------|---------|
| `references/init.md` | Scan codebase and generate or migrate KB documentation |
| `references/update.md` | Update, scan, verify, or reorganize existing documentation |
| `references/problem.md` | Write a problem-analysis doc (RCA, incident report, post-mortem, ADR) |

## Auto-Detection

1. Check if `docs/index.json` exists in the project root
2. Check intent signals in `$ARGUMENTS` or user message
3. Check the Stack and Architecture sections for what to document

### Decision Matrix

| Condition | Load Reference | Mode |
|-----------|---------------|------|
| `docs/index.json` absent, flat docs present | `references/init.md` | migrate |
| `docs/index.json` absent, no docs | `references/init.md` | generation |
| Intent: reorganize, structure, orphan, inconsistent, KB audit | `references/update.md` | reorganize |
| Intent: migrate, convert flat docs, restructure | `references/init.md` | migrate |
| Intent: scan, staleness, health, gaps | `references/update.md` | scan |
| `docs/index.json` present (default) | `references/update.md` | update |
| Intent: RCA, incident, post-mortem, root cause, ADR | `references/problem.md` | problem-analysis |

## Execution

Load the reference file and execute its workflow.
