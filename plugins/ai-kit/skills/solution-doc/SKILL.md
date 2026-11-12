---
name: solution-doc
description: Use when the user wants a solution document, solution write-up, handover doc, or "update the solution" for a ticket (e.g. PROJ-123) or an intention whose working folder lives under <docsDir>/<KEY-or-intention>/ — including "document what we built for this ticket", "write business requirements + solution with diagrams", "which repos did we change and how do errors behave", or refreshing an existing solution.md after more implementation landed. Also has a read-only PR-body mode that ai-kit:pr-submit calls to fill the PR's Business requirement / Solution / Reviewer notes slots, and that a user can ask for directly ("write the PR description").
---

# Solution doc

Produce or refresh ONE consolidated `<docsDir>/<KEY>/solution.md` that a product owner, QA,
reviewer or third-party integrator can read without opening the plan files. The doc is written by
an `ai-kit:docs-manager` subagent; you (main session) gather inputs, dispatch, and gate the result.

**In Codex** (no named agents): spawn a subagent briefed with
`${CLAUDE_PLUGIN_ROOT}/agents/docs-manager.md` plus the prompt below, or write the doc inline
following the same structure. Ask questions in plain chat when AskUserQuestion is unavailable.

When the user asks only for a PR description, or `ai-kit:pr-submit` calls this skill, use
**PR-body mode** instead of the doc pipeline.

## Step 0 — Load project rules

If not already in context, read `.ai-kit/workspace.json` at the workspace root and the
`AGENTS.md` chain for each repo involved (contract:
`${CLAUDE_PLUGIN_ROOT}/references/project-rules-contract.md`). Take `docsDir` (default `docs`),
`tracker.type` / `tracker.access` (for reading the ticket), `repos[]` and the **Architecture &
boundaries** section (layer names for the error table and the repo table).

The work folder is `<workspace-root>/<docsDir>/<TICKET-KEY>/`, or
`<workspace-root>/<docsDir>/<intention-name>/` when there is no ticket.

## PR-body mode

Produces the slot files `pr-submit`'s `draft_pr.sh` renders as **Business requirement →
Solution → Reviewer notes**. Never write the PR body as free markdown — the script owns the meta
line and the budgets.

Read-only: no subagent, never create or edit `solution.md`, never commit.

**Inputs** (from pr-submit, or resolve yourself when the user asks directly): `TICKET` (may be
empty), `DOCS_DIR` (`<workspace>/<docsDir>/<KEY>/` or `none`), `REPO` (repo name), `DIFF_FILE`,
`CHANGED_FILES_LIST`, `OUT_DIR` (default `<git-dir>/pr-review/`).

**Sources, first that exists wins per slot; always cross-check against `DIFF_FILE`:**
1. `DOCS_DIR/solution.md` — §1 for requirement; §2.1 intention + this `REPO`'s §2.4 row for
   solution; §2.4 open items for notes.
2. `spec.md`, `decision-log.md`, `plan.md` in `DOCS_DIR`.
3. The ticket, read through the tracker named in `tracker.type` (see `ai-kit:ticket`'s adapter
   table): title, description, acceptance criteria.
4. The user's intention from the current conversation.
5. The diff alone — requirement slot left empty, caller falls back to `--why`.

**Write to `OUT_DIR`, one bullet per line, max 120 chars each:**

| File | Max | Content |
| :-- | :-- | :-- |
| `pr-requirement.txt` | 3 | Ticket-level business need, in user terms. No class names. |
| `pr-solution.txt` | 5 | Behavioural changes **in this repo's diff only** — one ticket can span several repos. Not per file, not per commit. |
| `pr-notes.txt` | 3 | Optional: risky part, migration, open item that touches this repo, doc-vs-code conflict. Empty if nothing. |

**`DOCS_DIR/decision-log.md` exists** (from `ai-kit:brainstormer`): it is local, so reviewers
only see what the body carries. Spend one `pr-notes.txt` bullet on the AC decisions a reviewer
would otherwise question — `Decided: <decision> (DEC-004, <decided by>)`, at most two, accepted
ones only.

Drop solution bullets the diff does not back. If the docs and the code disagree, the code wins;
put the conflict in notes.

**Return** as `KEY=value` lines: `REQUIREMENT_FILE=`, `SOLUTION_FILE=`, `NOTES_FILE=` (empty
value when the file is empty or not written), `BODY_SOURCE=solution.md|ticket-docs|tracker|conversation|diff`.

## Why this shape

Work folders accumulate spec, design, decisions, plans, trackers and phase files, and the code
drifts from them during implementation. Readers need one place that says what the business
wanted, what was actually built, how it fails, and where the code is. Code is the source of truth
because late decisions (revised payload shapes, new error handling) often never make it back
into the plan.

## Step 1 — Locate inputs

1. Ticket key or intention name, and its folder. Ask only if neither the user nor the
   conversation names it.
2. List the folder. Typical sources: `spec.md`, `design.md`, `decision-log.md`, `plan.md`,
   `tracker.md`, `phase-*.md`, `manual-test-checklist.md`.
3. Changed repos: in a multi-repo workspace each repo is its own git repo (the root is not one).
   For each candidate in `repos[]`: `git -C <repo> branch --show-current`, `status --short`,
   `log --oneline -15`. Candidates = repos named in the plan + repos on a branch that carries the
   ticket key.
4. Collect from the CURRENT conversation anything decided but not yet in docs (revised
   decisions, new error handling, open items). Put these in the subagent prompt verbatim — the
   subagent has no conversation context.

## Step 2 — Dispatch `ai-kit:docs-manager`

Prompt must contain: environment (OS, shell, date, workspace root), file blocklist (env files and
secrets — never echo them), "do not modify code, do not commit", unrelated dirty files to ignore,
the source list and conversation-only facts from Step 1, and the structure below. If
`solution.md` exists, tell it to update in place, not duplicate. Run it in the background where
supported.

### Required structure (exact top-level sections)

```
# <KEY or intention> — <title>: Solution
## 1. Business requirements
   - Problem / goal, actors
   - User stories per actor, constraints (limits, retention, security), out of scope
## 2. Solution
### 2.1 Intention
   - Approach in a few paragraphs; key decisions citing IDs from decision-log.md (DEC-001 …)
### 2.2 Diagrams
   - Mermaid: lifecycle flowchart of the core entity + 2–4 sequence diagrams of key flows
   - Payload / API examples as JSON blocks (current shape, from code)
### 2.3 Error handling
   | Case | Where (layer/file) | Behaviour | User sees |
### 2.4 Changed repositories
   | Repo | Area | Key files/modules | Summary |
   - Status & open items (unverified in an environment, pending sign-offs, draft translations, follow-ups)
```

Tell the subagent: exactly these two top-level sections, nothing after §2 (status and open items
live inside §2.4, payload examples inside §2.2). Subagents tend to add a "## 3. Status" section.

Diagram selection: pick flows from what the user and conversation emphasised, not only from the
design doc's sequences. List the required diagrams by name in the prompt.

Mermaid rules for the subagent (broken diagrams are the most common defect): quote node/edge
labels containing `()`, `/`, `:`, `{}`, `<>`; no HTML in labels; one diagram per fenced
```mermaid block; short participant aliases.

Error-handling coverage checklist: client validation reject, storage/upload failure, cancel,
delete failure, reload with missing/expired data per HTTP status (404/410/401-403/5xx/network),
async delivery failure + retries (webhooks, jobs), consumer-side failures, retention/purge,
cross-origin/security rejections.

## Step 3 — Gate

When the subagent returns:
1. Read `solution.md` headings (`grep -nE '^#{1,3} |^```' <file>`): only §1 and §2, subsections
   2.1–2.4 in order, every requested diagram present, payload block inside 2.2. Don't trust the
   subagent's own "all sections present" claim — check.
2. Spot-check 2–3 facts against code (payload shape, a status → message mapping, one repo row).
3. Validate Mermaid: `mmdc -i <file> -o <scratch>/check.md` renders every block and reports
   errors per chart (or a Mermaid validation tool if one is connected). Send fixes back to the
   same subagent with the exact errors rather than starting a new one.
4. Surface conflicts it reported between docs and code to the user rather than silently picking.

## Step 4 — Report

Tell the user: path (as a link), line count, sections, conflicts found, items it could not
verify. Offer to render diagrams to PNG. Don't commit.

## Pitfalls

- Subagent prompt missing conversation-only facts → doc describes the stale plan. Always pass them.
- Listing repos only from plans misses incidental changes; listing every dirty file pulls in
  unrelated work. Use the ticket branch + ignore list.
- Keep under ~800 lines; link phase files for depth instead of copying them.
