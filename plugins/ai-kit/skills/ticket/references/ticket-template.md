# Ticket template — Story / Change / Bug

> Lines starting with `>` are guidance: delete them when you fill in the ticket.
> Leave out any section, bullet or table column you have nothing for. Don't write "none" or "None recorded yet".
> Story (or Bug report), Scope and Acceptance criteria are always needed.

---

## Title

`[Area tag] <What changes, as an action> in <product / area> – <segment>`

> Examples: "Pin a folder to the top of the file tree", "[Inbox] Show the saved metadata after a message is edited", "Delete account in the web app – business".
> Name the segment (e.g. business / private) when sibling or cloned stories exist.

---

## Story

**As a** <specific user type, e.g. workspace admin in the web app>,
**I want** <one capability, stated as an action>,
**so that** <the outcome or value for the user or business>.

> **Bug:** replace this section with the **Bug report** block below.

**Links:**

- Design: <link to the exact frame>

> Set the epic as the ticket's parent instead of linking it here. Add specs or API docs only if they're needed to build the story.

---

## Context / Problem

> Why this matters now: the trigger (backend change, incident, customer request) and what already exists that this builds on (existing menu, endpoint, pattern).
> At most one or two short paragraphs: how it works today, and what this story changes.

<text>

---

## Bug report _(bugs only — delete for stories)_

- **Actual:** what happens.
- **Expected:** what should happen.
- **Steps to reproduce:**
  1. ...
  2. ...
- **Environment:** env (dev / test / prod), account or tenant, user, browser / app version, date & time.
- **Evidence:** logs, screenshots, trace IDs, request/response.
- **Frequency / impact:** always / sometimes; how many users or tenants affected.

---

## Scope

> If the story has several workstreams (e.g. onboarding + backfill + UI messages), list each one as an in-scope item and link its subtask, instead of adding a separate Tasks section. The subtask holds the implementation detail.

**In scope**

- ... → PROJ-xxx (subtask, if any)

**Out of scope** (link the follow-up ticket if one exists)

- ... → PROJ-xxx

---

## Acceptance criteria

> Testable, observable outcomes only — no "investigate" or "clarify" (settle those before the ticket is Ready, or make a spike).
> Cover: happy path, **unchanged** (what stays as it is today), **error**, **limits / edge cases**, **permissions**, and **per-user / per-tenant** isolation where relevant.

**AC-1: <short name>**

- **Given** <precondition>
- **When** <action>
- **Then** <observable result>

**AC-2 (unchanged): <short name>**

- **Given** ...
- **When** ...
- **Then** <behaviour is exactly as today / X does not change>

**AC-3 (error): <short name>**

- **Given** ...
- **When** ...
- **Then** ...

---

## Dependencies & references

> Only related stories and bugs that block, are blocked by, or explain this one. Don't list the epic (it's the parent) or routine subtasks.
> Link every ticket as `[PROJ-xxx – title](<ticket URL>)`, not just its number. Anywhere else in the ticket, link it as `[PROJ-xxx](<ticket URL>)`. Use the tracker's link form from the project rules.

| Ticket / item | Relation (blocks / blocked by / relates) | Owner | Status |
| ------------- | ---------------------------------------- | ----- | ------ |
| [PROJ-xxx – title](<ticket URL>) |  |       | To Do / Done |

---

## Notes

- **Constraints:** supported languages, permissions, segment, accessibility, performance, anything the project rules forbid.
- **Technical:** affected apps / services / repos, endpoints (method + path), data model or migration, feature flag, config per environment. Name modules, **not file paths** — the plan and subtasks name files after analysis. Date any "as of today" code observation.
- **Verification:** test account and data needed, states to check (empty / one / limit), views and locales to cover.
- **Additional information:** risks, technical debt, prototype branch, code already investigated.
