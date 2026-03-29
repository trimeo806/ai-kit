---
name: docs
description: Use when user says "write docs", "update docs", "document this", "init docs", "reorganize documentation", or "add component docs" — detects docs intent (init, update, migrate, component) and runs the right workflow
user-invocable: true
metadata:
  argument-hint: "[--init | --migrate | --reorganize | --scan | --verify | --batch [category]]"
  connections:
    enhances: []
    requires: [knowledge-retrieval]
---

# Docs — Unified Documentation Command

**When documentation intent is detected:**
1. Use the **Agent tool** to spawn `docs-manager`
2. Pass the full user request + detected mode flag + active context (CWD, docs/index.json path)
3. Do NOT execute documentation steps inline in the main conversation

---

Auto-detect and execute the appropriate documentation workflow following `knowledge-retrieval/references/knowledge-base.md` structure.

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
If `$ARGUMENTS` starts with `--batch`: load `references/component.md`, execute in batch mode. Pass remaining args as category filter.
If `$ARGUMENTS` starts with `--problem`: load `references/problem.md`, execute in problem-analysis mode.
Otherwise: continue to Auto-Detection.

## Aspect Files

| File | Purpose |
|------|---------|
| `references/init.md` | Scan codebase and generate or migrate KB documentation |
| `references/update.md` | Update, scan, verify, or reorganize existing documentation |
| `references/component.md` | Document a klara-theme component (Figma data + prop mapping) |
| `references/problem.md` | Write a problem-analysis doc (RCA, incident report, post-mortem, ADR) |

## Auto-Detection

1. Check if `docs/index.json` exists in the project root
2. Check intent signals in `$ARGUMENTS` or user message
3. Check if args reference a specific component or library key
4. Check platform-specific paths (web: `packages/`, iOS: `Sources/`, Android: `app/`)

### Decision Matrix

| Condition | Load Reference | Mode |
|-----------|---------------|------|
| `docs/index.json` absent, flat docs present | `references/init.md` | migrate |
| `docs/index.json` absent, no docs | `references/init.md` | generation |
| Intent: reorganize, structure, orphan, inconsistent, KB audit | `references/update.md` | reorganize |
| Intent: migrate, convert flat docs, restructure | `references/init.md` | migrate |
| Intent: scan, staleness, health, gaps | `references/update.md` | scan |
| Args match a component/library key AND component source exists | `references/component.md` | — |
| `docs/index.json` present (default) | `references/update.md` | update |
| Intent: RCA, incident, post-mortem, root cause, ADR | `references/problem.md` | problem-analysis |

## Execution

Load the reference file and execute its workflow.
