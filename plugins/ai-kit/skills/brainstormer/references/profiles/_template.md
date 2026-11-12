---
name: <project-name>
---
# Brainstormer profile — <project name>

_Human-owned. Copy to `.ai-kit/brainstormer-profile.md` at the workspace root and commit it. Every section
names the brainstormer step that reads it; leave a section out and project rules apply, else the default
in brackets. Tracker and Convention sources usually live in project rules already — keep them here only
to override._

## Tracker
_Read by: step 1 Seed, step 6 Hand off._
- System: <Jira | Azure Boards | GitHub Issues | Linear | none>  [none → user pastes the ticket]
- Site / project key: <e.g. acme.atlassian.net · ACME>
- Ticket key pattern: <regex, e.g. `ACME-\d+`>
- Where ACs live in a ticket: <e.g. "### Acceptance criteria (Gherkin)" section of the description>
- Shipped-sibling habit: <e.g. "stories often clone a done sibling; read its ACs first">  [none]

## Convention sources
_Read by: step 0 — read before the first question; conventions are facts, not questions._
- <path or URL> — <what it governs>

## Actors
_Read by: step 4 Synthesize (AC wording) and the Actors & permissions axis._
- End user term: <e.g. "customer", "member">
- Roles: <role — what it may do>
- Tenancy / accounts: <e.g. "multi-tenant; data never crosses tenants">  [single tenant]
- System name in ACs: <e.g. "the portal">

## Domain axes
_Read by: step 2 Design tree — asked after the generic axes, never instead of them._
| Axis | Probe questions |
|---|---|
| <axis> | <question> |

## Constitution
_Read by: exit check pass 3 — 3 to 5 non-negotiable checks every story must pass._
_Source: human-specified | defaults_
1. Error states are user-visible and actionable, never a silent failure.  (default)
2. Every in-scope action has a refusal case for an unauthorized actor, enforced server-side.  (default)
3. Existing behavior next to the change is covered by at least one unchanged AC.  (default)

## AC conventions
_Read by: step 4 Synthesize._
- Format: <Given / When / Then | MUST / MUST NOT | other>  [Given / When / Then]
- Language of ACs: <e.g. English>  [English]
- User-visible text in ACs: <literal text | i18n message key>  [literal text]
- Extra rules: <e.g. "one AC per locale-independent behavior; locale coverage is its own AC">

## Decision owners
_Read by: step 3 (OQ owners) and the decision log's Decided by._
- scope / business: <role or name>  [product owner]
- ux: <role or name>  [product owner]
- technical-constraint: <role or name>  [tech lead]

## Question budget
_Read by: step 3 Rounds._
- Questions per round: <n>  [7]
- Rounds before a check-in ("keep going or stop here?"): <n>  [4]
