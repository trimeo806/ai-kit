---
name: docs-update
description: "Update existing documentation or scan for staleness"
user-invocable: false
disable-model-invocation: true
metadata:
  argument-hint: "[topic | --scan | --verify]"
  keywords:
    - docs-update
    - documentation
    - stale-docs
    - refresh-docs
    - verify-docs
  agent-affinity:
    - docs-manager
  platforms:
    - all
  connections:
    requires: [knowledge-retrieval]
    enhances: [knowledge-retrieval]
---

# Docs Update

Update existing KB documentation, scan for staleness, or verify content accuracy.

## Usage

```
/docs-update --scan          # Scan freshness, suggest updates
/docs-update --verify        # Deep verification of all doc references
/docs-update {topic}         # Update docs matching topic (e.g., "auth", "routing")
/docs-update                 # Detect what changed, update relevant docs
```

## Mode Detection

- `$ARGUMENTS` contains `--reorganize` or intent signals: "reorganize", "restructure", "orphan", "inconsistent", "KB audit" → **Reorganize Mode**
- `$ARGUMENTS` contains `--scan` or `scan` or `status` → **Scan Mode**
- `$ARGUMENTS` contains `--verify` → **Verify Mode**
- `$ARGUMENTS` has a topic word → **Topic Mode**
- Otherwise → **Update Mode** (detect from git changes)

## Index Update Rule (applies to ALL modes)

After any mode completes:

| Index | When to update | What to update |
|-------|---------------|----------------|
| `docs/index.json` | Any doc file created, moved, renamed, deleted, or content updated | `entries[]` (add/remove/edit), `updatedAt` |
| `reports/index.json` | After writing a task report | Append entry per `core/references/index-protocol.md` |

**Never finish a docs task without updating `docs/index.json`.** If you added, moved, renamed, or deleted any doc file — the index must reflect it before you stop.

---

## Prerequisite Check

1. Check for `docs/index.json` — if missing:
   - Check for flat docs (`docs/*.md`) → suggest `/docs --migrate`
   - No docs at all → suggest `/docs --init`
   - Stop here — don't proceed without KB structure

## Reorganize Mode (`--reorganize`)

Audit the docs/ structure against KB standards, detect orphaned files, identify inconsistencies, and propose a concrete migration plan. **Propose only — do NOT move or delete files without user confirmation.**

### Step 1: Scan Filesystem vs Index

```
filesystem_files = Glob("docs/**/*.md")           # all .md files on disk
index_entries    = read docs/index.json entries   # all registered docs
```

Classify each file:

| Status | Condition | Action |
|--------|-----------|--------|
| **Orphaned** | In filesystem but NOT in index | Flag — needs registration or deletion |
| **Ghost** | In index but file NOT on disk | Flag — broken link, needs recovery or removal |
| **Registered** | In both | Check naming + category below |

### Step 2: Naming & Category Consistency

For each registered file, check against KB standards:

| Check | Rule | Flag if |
|-------|------|---------|
| Prefix | `{PREFIX}-NNNN-kebab-title.md` | Missing prefix or wrong prefix for category |
| Category folder | ADRs in `decisions/`, ARCHs in `architecture/`, etc. | File in wrong folder |
| Naming convention | kebab-case, descriptive, self-documenting | camelCase, vague names, abbreviations |
| Size | Under `docs.maxLoc` (800 LOC) | File exceeds limit |

### Step 3: Structure Pattern Analysis

Detect the current docs structure pattern and compare to KB standard:

| Pattern | Signal | Recommendation |
|---------|--------|----------------|
| **Flat** | All `.md` files at `docs/` root, no subdirs | Migrate to KB structure → `/docs --migrate` |
| **Partial KB** | Some subdirs + some flat | Classify flat files, move to correct subdir |
| **Non-standard KB** | Subdirs exist but names differ from standard | Rename subdirs + update index paths |
| **Standard KB** | `decisions/`, `architecture/`, `patterns/`, `conventions/`, `features/`, `findings/` | Audit content quality only |

### Step 4: Project Consistency Check

Scan codebase to detect patterns not yet captured in docs:

- New deps in `package.json` / `pom.xml` with no corresponding ADR
- New route groups / feature directories with no FEAT doc
- Recurring code patterns (≥3 occurrences) with no PATTERN doc
- Config/linting rules with no CONV doc

### Step 5: Propose Reorganization Plan

Output a concrete proposal:

```markdown
## Docs Reorganization Proposal

### Orphaned Files (in filesystem, not in index)
| File | Suggested Action |
|------|-----------------|
| `docs/old-notes.md` | Register as FINDING-0005 or delete |

### Ghost Entries (in index, file missing)
| ID | Path | Action |
|----|------|--------|
| ADR-0003 | docs/decisions/ADR-0003-*.md | Recreate or remove from index |

### Naming Inconsistencies
| Current | Correct | Move |
|---------|---------|------|
| `docs/auth.md` | `docs/features/FEAT-0002-auth-flow.md` | Yes |

### Size Violations
| File | LOC | Action |
|------|-----|--------|
| `docs/architecture/ARCH-0001-overview.md` | 1240 | Split into 2 files |

### Gaps (undocumented patterns detected in codebase)
- No ADR for `drizzle-orm` (added in package.json)
- No FEAT for `app/(dashboard)/` route group

### Summary
- Orphaned: N | Ghost: N | Naming issues: N | Size violations: N | Gaps: N
- Estimated effort: N files to move, N to create, N to split

**Confirm to proceed?** (y/n)
```

### Step 6: Execute on Confirmation

After user confirms:
1. Rename/move files to correct paths
2. Register orphaned files in `docs/index.json` (or delete if confirmed)
3. Remove ghost entries from `docs/index.json`
4. Update all internal links in affected docs
5. Update `docs/index.json` — set `updatedAt`
6. Report: files moved, index updated, remaining manual tasks

## Scan Mode

Audit KB health using content verification (not git dates):

1. **Read `docs/index.json`** — parse all entries
2. **For each entry**, verify:
   - Doc file exists at `path`
   - Code references in doc still exist (Grep/Glob for mentioned files, functions, routes)
   - `agentHint` is still relevant
3. **Check for gaps** — scan codebase for undocumented areas:
   - New deps in package.json/pom.xml not covered by ADRs
   - New route files not covered by FEATs
   - New config patterns not covered by CONVs
4. **Report**:

```markdown
## KB Health Report

| ID | Title | Status | Issues |
|----|-------|--------|--------|
| ADR-0001 | Next.js App Router | OK | — |
| ARCH-0002 | API Layer | STALE | References removed endpoint /api/legacy |
| FEAT-0003 | Auth Flow | BROKEN | File auth-handler.ts no longer exists |

### Gaps
- **New dep**: `@tanstack/query` added but no ADR exists
- **New route group**: `app/(dashboard)/` has no FEAT doc

### Summary
- Total entries: N
- OK: N | STALE: N | BROKEN: N
- Gaps found: N
```

5. **Ask user** which issues to fix

## Verify Mode (`--verify`)

Deep content verification — reads every doc and validates all references:

1. **For each doc file**, read full content and check:
   - Every file path mentioned → verify file exists
   - Every function/class/component name → verify via Grep
   - Every code example → verify syntax matches current code
   - Every route/endpoint → verify route file exists
2. **Flag issues**:
   - `STALE` — doc references code that changed significantly (function signature different, moved file)
   - `BROKEN` — doc references code/files that no longer exist
   - `GAP` — significant code area with no doc coverage
   - `OUTDATED` — entry's code area had major changes since doc was written
3. **Report** using same format as Scan Mode but with deeper detail per issue

## Topic Mode

Update docs related to a specific topic:

1. **Search index.json** for entries matching topic:
   - Match against `tags`, `title`, `agentHint`
   - Example: `/docs-update auth` → finds ADR-0001 (OAuth), FEAT-0001 (auth-registry), PATTERN-0003 (auth-layout)
2. **For each matching entry**:
   - Read the doc file
   - Read the current code it references
   - Update doc content to match current code
   - Update `## Tags` if needed
3. **Update index.json**:
   - Set `updatedAt` to today's date on the root object
4. **Report** what was updated

## Update Mode

Detect changes and update relevant docs:

1. **Identify code changes** from `git diff` or `git log --since="7 days ago"`
2. **Match changed files to docs** — search index.json entries whose referenced code was modified
3. **Read changed code + corresponding docs** — understand the gap
4. **Update docs** to match current code
5. **Check for new gaps** — did the changes introduce undocumented areas?
6. **Update index.json** `updatedAt`
7. **Report** what was updated

## Rules

- Only update `docs/` files — never modify source code
- Preserve KB structure — don't flatten or reorganize without user consent
- Always update `docs/index.json` after any doc changes
- Keep files under 800 LOC (docs.maxLoc)
- **Evidence-based** — verify code references exist before writing them
- If KB structure doesn't exist, redirect to `/docs-init`
