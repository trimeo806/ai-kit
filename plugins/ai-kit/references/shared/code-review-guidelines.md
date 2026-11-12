# General code-review guidelines

The default checklist. `ai-kit:pr-submit` applies it when a repo has no review guidelines of its own.
`/ai-kit:review` applies it in every mode, on top of the repo's project rules.

**Project rules come first.** Read the target repo's `AGENTS.md` chain (Conventions, Architecture &
boundaries, Testing, Security & data, Do / Don't) and any review guide it points to. Where a project
rule and this checklist disagree, the project rule wins.

Apply every section under **Clean code**, **Pull request**, **Project conventions** and **Security**.
Apply **Performance & data** to backend and data-access code, and **Frontend** to UI code.

**Every item here has a default severity in `severity-guide.md`** (next to this file). When you add,
remove or reword an item, update the matching table there too.

**This checklist is the lens, not the report.** It is what you look for; it is not a list of
things to say. An item that passes is not a finding, and a comment with one line per checklist
item is a comment nobody reads to the end. Report only what would change a reviewer's
behaviour — something they should refuse, fix, or at least go and look at — in one line, with a
location and one sentence saying what breaks and when.

## 1. Clean code

- Error handling (null/missing values, try/catch scope, meaningful error types).
- Remove unnecessary comments and console/debug logs.
- Unit tests cover the new code.
- No unintended side effects from the changes.
- No duplicated code.
- No "magic numbers" or hardcoded strings — use constants/enums.

## 2. Pull request

- All tests pass.
- The PR has a concise summary of the changes.
- Screenshots of the work are attached where relevant (UI changes).
- Large features are broken into smaller pieces.

## 3. Performance & data

- No N+1 query problems.
- Critical query columns are indexed.
- Transaction boundaries are correct (multi-step writes are atomic; read-only paths are marked so
  where the framework supports it).
- Lazy loading, asynchronous, and parallel processing used appropriately.
- Caching has an invalidation or TTL story.
- Pagination implemented for list endpoints (never fetch thousands of rows at once).
- DB migrations are backward compatible and re-runnable, and follow the repo's migration rules
  (e.g. add nullable column → backfill → add constraint; no destructive change without a rollout plan).

## 4. Frontend

Shown for React / Next.js; apply the equivalent rule for the framework the Stack section names.

- Images are optimized and sized (e.g. `next/image` with width/height).
- Default to server rendering where the framework supports it; client code only for interactivity.
- Fetch data on the server where possible; run independent fetches in parallel (`Promise.all`).
- Avoid effects without a dependency list.
- Lists: `key` is unique and not an array index.
- Memoization only for a proven expensive calculation.
- Lazy-load heavy components where required.
- Avoid direct DOM access (`document.getElementById`).
- Accessibility: `alt` text, accessible names, keyboard reachability.
- Type safety: no `any`.
- Secrets are never exposed through a public env prefix (`NEXT_PUBLIC_`, `VITE_`, …).

## 5. Project conventions

Check only what the diff adds or edits against the repo's Conventions and Architecture sections:
folder structure and file placement, naming, layering and import boundaries, the UI library and
design tokens it mandates, error-handling and logging style.

- **Scope:** new files and edited lines. Never flag untouched legacy code for predating a rule.
- **One finding per file** for a placement problem, at its first changed line.
- A rule the project rules mark as hard (Do / Don't) keeps the severity they give it.

## Security (always)

- No injection (SQL/command/template), unsafe deserialization, or unvalidated input.
- No secrets, tokens, or credentials committed in the diff.
- Authorization/authentication checks are present where needed.
