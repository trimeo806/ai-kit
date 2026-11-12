# Question axes — generic, any project

Walk every axis for every in-scope user action. Each axis ends in the log's **Axis coverage** table as
decided (DEC IDs), assumed (A IDs) or `n/a — <why>`. The profile's **Domain axes** come after these and
add project-specific ones; they never remove one of these.

Each axis lists the probe questions to turn into a node when the material doesn't settle them.
Ask only what's open. Example Mapping order: **rule → concrete example → question**. When a rule is
abstract, ask for (or propose) one concrete example; the example becomes the Given/When/Then.

| # | Axis | Probe questions |
|---|---|---|
| 1 | **Scope & outcome** | Which user problem, and how do we know it's solved? Which actions are in (create, edit, delete, move, export…)? What is the MVP slice (P1) vs later? What is explicitly out (→ `OOS-*`)? |
| 2 | **Actors & permissions** | Who can do each action? Who must be refused, and what do they see (hidden, disabled, error)? Does the server enforce it too? Ownership: own items only, or others'? |
| 3 | **Entry points & context** | From where is it triggered (page, menu, deep link, API, job)? Any context where it must not be available? |
| 4 | **Happy path, as an example** | One concrete walk-through with real-looking data. What exactly does the user see after success (message, highlight, redirect, list order)? Does it persist after reload? |
| 5 | **Input & validation** | Required fields, formats, min/max length, allowed characters, duplicates, trimming, case sensitivity. Where is the message shown and what does it say? |
| 6 | **States of the data** | Empty state, one item, many items, archived/deleted/locked/read-only items, items created by someone else, legacy data. |
| 7 | **Errors & failures** | Backend error, timeout, offline, partial success. What does the user see, can they retry, is input kept? Is anything left half-done? |
| 8 | **Limits & volume** | Max count/size, pagination, long names, slow lists. What happens at and beyond the limit? |
| 9 | **Concurrency** | Two users or two tabs act on the same item. Last write wins, conflict message, or lock? Stale views? |
| 10 | **Unchanged behavior** | What must keep working exactly as today (→ `FR-U-*`, `AC (unchanged)`)? Which neighbouring flows could regress? |
| 11 | **Notifications & side effects** | Emails, events, audit log, counters, caches, other screens that must update. |
| 12 | **Undo & recovery** | Can it be undone or restored? Confirmation dialog for destructive actions? |
| 13 | **Text & locales** | New user-visible strings, in which languages, who provides translations? Date/number formats. |
| 14 | **Accessibility** | Keyboard path, focus after the action, screen-reader announcement of success/error. |
| 15 | **Security & privacy** | Personal data shown or logged? Tenant/account isolation? Anything an attacker could abuse (enumeration, mass action)? |
| 16 | **Measures of success** | Any measurable outcome (`SC-*`): time, count, error rate? If none, say so. |

## Altitude test (per candidate question)

Ask it only if a product owner or tech lead could answer it in about 2 minutes without reading code.
Otherwise it is a fact (research it) or a design choice (leave it to `ai-kit:plan design`).

## Good vs weak AC (what the synthesis aims for)

| Weak | Good |
|---|---|
| "Rename works" | Given a folder "Invoices" I own, When I rename it to "Invoices 2026" and reload, Then the list shows "Invoices 2026" in its sorted position |
| "Show an error if it fails" | Given the rename request fails, When the error returns, Then the dialog stays open with my input, and shows "<message key>" |
| "Fast" | Given 1,000 folders, When I open the list, Then the first page renders within 1 s (p95) |
| "Only admins" | Given I am a member without the admin role, When I open the folder menu, Then "Rename" is not shown, And a direct API call returns 403 |
