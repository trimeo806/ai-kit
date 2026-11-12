# Ticket planning flow — ticket → reuse-first implementation plan

Read by `ai-kit:plan` (ticket mode) and `ai-kit:brainstormer`. Phase 1 seeds the spec; Phases 2–6
write the plan; Phases 7–8 are the outward-facing writes, always asked, never silent.

## Project facts — read them, don't assume them

Everything team-specific comes from the project rules (contract:
`${CLAUDE_PLUGIN_ROOT}/references/project-rules-contract.md`). Load `.ai-kit/workspace.json` and
the `AGENTS.md` chain if not already in context:

| Fact | Source |
|---|---|
| Tracker, how to reach it, key format, link base | `tracker.type`, `tracker.access`, `tracker.keyPattern`, `tracker.baseUrl` |
| Project key, sub-task issue type, standard sub-tasks to leave alone, definition of ready / done | **Tracker** section |
| Which repos exist and what each owns | `repos[]` plus each repo's **Overview** and **Architecture & boundaries** sections |
| Conventions the plan must respect (folder layout, UI library, transport, error handling) | **Conventions** and **Do / Don't** sections of every repo the plan touches |
| Typecheck / lint / test commands | **Commands** section |
| Where the plan goes | `<docsDir>/<TICKET-KEY>/plan.md` at the workspace root |
| Where plans are published for non-engineers, if anywhere | **Tracker** or **Overview** section (a wiki space, a docs site) |

A fact is missing → ask once, use the answer, suggest `/ai-kit:setup-rules` to save it. Never
invent a project key, issue type or parent page.

Read and write the ticket with the adapter for `tracker.type` (see `ai-kit:ticket`'s adapter
table). MCP tools may be deferred: load them by searching for the tracker's name first.

**Questions stay in the main conversation.** Phases 4, 7 and 8 ask the user (AskUserQuestion
where available, otherwise plain chat), which a subagent cannot do. Research (Phases 1–3) may be
delegated; the asks and the tracker / wiki writes run in the main conversation.

## Workflow

Work the phases in order. Don't write the plan before you've read the code.

**Spec first.** Under `ai-kit:plan`, the ticket folder's `spec.md` is the source of truth. If it
is missing, the plan skill's `spec` and `clarify` steps write it first (reusing Phase 1 as their
seed). Phases 2–6 then plan *from* that spec, and Phase 5 takes its acceptance criteria from it.

### Phase 1 — Read the ticket graph, not just the ticket

Fetch the target ticket with its description, status, type, labels, components, comments,
sub-tasks, links and parent.

Then **follow the graph** — this is where the real spec usually lives:

- **Links**: clones / is cloned by (the sibling this ticket copies), relates to (foundation or
  follow-up), blocks / is blocked by.
- **Parent**: the epic, for scope framing.
- **Sub-tasks**: what already exists. Standard sub-tasks named in the Tracker section stay alone.

Fetch the **done sibling and foundation tickets** too — a shipped sibling is the reference
implementation, and its sub-task list is the template for granularity. Read acceptance criteria,
decision tables and "out of scope" sections carefully; they define the boundaries.

Distil, before moving on: *what is genuinely new here vs. "the same as ticket X"?* Name X.

### Phase 2 — Explore the codebase (reuse-first)

**Which repo?** Match the ticket against `repos[]` and each repo's **Overview** (what it owns).
Prefer that over scanning; fall back to searching only when nothing fits, and open only the repos
it names. Repos with `status: skip` have no rules; say so if the plan touches one.

Launch **up to 3 exploration agents in parallel**, each with a distinct focus. For a typical
parity/sibling story:

1. **The reuse source** — the shipped sibling's implementation. "Map the existing X so I can reuse it."
2. **The target surface** — where this ticket's change lands, and what's already there vs. missing.
3. **The integration seam** — the adapter / service / interface layer that connects them.

Give each agent exact directories, the ticket context, and ask for **file paths + short
excerpts** and what already exists. Use fewer agents when scope is narrow. In Codex, spawn
generic subagents with the same briefs, or explore inline.

While agents run, read the **Conventions**, **Architecture & boundaries** and **Do / Don't**
sections of each repo involved, so the plan is contract-compliant.

### Phase 3 — Read the critical files yourself

Read the handful of files the exploration flagged as the change surface and the reuse reference.
Ground every "change file Y to do Z" claim in something you've read. Cite `path:line`.

### Phase 4 — Clarify only genuine decisions

Ask about decisions that change scope and that you cannot resolve from the ticket, the code, or a
sensible default — a backend dependency whose status you can't verify, which of two surfaces is in
scope. Recommend an option. **Don't over-ask**: pick obvious defaults and state them in the plan.
If the user doesn't answer, proceed with the safest, fail-closed default and write it down so they
can override. This is for *design* decisions only — the Phase 7 question is separate and always
asked.

### Phase 5 — Define acceptance criteria (and stage the ticket sync)

Every plan needs testable acceptance criteria — they're what "done" means. Many tickets ship
without an explicit AC section, so **you often have to write them**.

- **A `spec.md` exists in the ticket folder?** Its `US*-AC*` scenarios *are* the acceptance
  criteria: copy them into the plan with their IDs, and add only what exploration proved missing
  (written back into `spec.md` first, via the plan skill's `spec` step).
- **Otherwise derive them from three sources**, in order: the ticket's own decisions / solution
  spec / out-of-scope, the shipped sibling's ACs (mirror its format — default **Given / When /
  Then**), and what exploration proved is in vs. out of scope.
- **Cover the whole surface**, one scenario each: every in-scope action, the negative / guard
  cases, and the cross-cutting constraints (all locales, permissions, limits). A scenario a tester
  can't objectively check is too vague — make it observable.
- **Write them into the plan file** under `## Acceptance criteria`.
- **Stage the ticket sync** when the ticket lacks an AC section: re-fetch the current description
  and build the full replacement — the existing description with an `### Acceptance criteria`
  section appended, **preserving all existing content**. Confirm the ticket's in-scope set hasn't
  grown since you read it. **Don't write yet** — hold it for the Phase 7 gate.
- **The ticket folder has a `decision-log.md`** (from `ai-kit:brainstormer`): it is local, so the
  ticket is the copy others can reach. In the staged text, strip the `— DEC-nnn` citation
  suffixes from each AC and append a `### Key decisions` table — `DEC · Decision · Decided by` —
  accepted decisions only. Same Phase 7 gate.

### Phase 6 — Write the plan file

Write **`<docsDir>/<TICKET-KEY>/plan.md`** at the workspace root (create the folder if needed,
leave any `solution.md` beside it untouched). Every other file for the ticket goes in the same
folder. Structure:

```markdown
# <TICKET-KEY> — <short title>

> Ticket: <url>. Sibling (shipped): <KEY>. Foundation (done): <KEY>. Already done: <what>.

## Context
Why this change exists, the problem, the intended outcome, and the ONE key fact that shapes
the approach (usually: "the pattern already exists in <sibling>; only <small gap> is missing").

## Architecture
A short diagram / bullet trace of how the pieces connect and where the change surface is.

## Acceptance criteria
Given/When/Then scenarios, one per in-scope action + guard/negative cases + cross-cutting
constraints. Keep each observable. Note whether they've been synced into the ticket (Phase 7).

## Decisions (defaults — confirm/override)
Each genuine decision, the chosen default, and why. Flag the single biggest risk.

## Files to change
Per file: exact path, what to add/change, and the sibling reference to mirror (path:line).
New files follow the folder layout in the repo's Conventions section. For a pattern repeated
across files, describe it once + a few representative paths.

## Boundaries
Change surface: the modules/paths this plan may edit (= Files to change, at module level).
Do not touch: paths, public APIs, schemas, dependencies, other teams' modules the change could
drift into, each with its reason (out-of-scope item `OOS-*`, unchanged behaviour, risk). A step
that would edit outside the surface must first widen it here, with its reason.

## Steps
Ordered, each independently verifiable. Put any verification/unblock step first if the rest
depends on it. Each step cites the AC it serves and ends with
`Done when: <the test(s) that go green, or what is confirmed>`.

## Reuse map (do not re-implement)
Table: need → existing thing to reuse (path). The anti-invention guardrail.

## Verification
Typecheck / lint / test commands from the repo's Commands section, the unit tests to add or
mirror, and a manual E2E checklist.
```

Anchor the plan in reuse: the *Reuse map* and sibling `path:line` references are what stop the
next engineer from rewriting code that already exists.

**New frontend files** go where the repo's **Conventions** section says (component, hook, type
and util folders). When it says nothing, ask once; an example of such a section is
`${CLAUDE_PLUGIN_ROOT}/templates/project-rules/examples/frontend-conventions.md`.
`ai-kit:tdd-dev-workflow` then follows the paths the plan gives.

### Phase 7 — Ask before the tracker writes (always ask)

The plan file is written; two outward-facing writes are pending — syncing the ACs into the ticket
and creating sub-tasks. **Always put this question.** Skipping is a perfectly good answer.
`tracker.type: none` → skip this phase and say the plan file is the only record.

**1. Present the proposal:**

- The sub-tasks you'd create, as a numbered table — **title**, one-line scope, dependency (if any)
  on the gating sub-task.
- Work you're deliberately **not** creating a sub-task for, with the reason.
- The standard sub-tasks you're leaving untouched (from the Tracker section).
- Whether the Phase 5 AC sync is on the table, and how many scenarios it would append.

**2. Ask — once,** both questions in one message:

- *Sync the acceptance criteria into the ticket?* → **Sync them** / **Skip**.
- *Create these N sub-tasks on `<TICKET-KEY>`?* → **Create them** / **Adjust the list first** / **Skip**.

Omit the AC question when the ticket already has its own AC section. "Adjust the list first"
means revise and re-present — never create first and fix after.

**3. Act on the answer** with the tracker adapter:

- **Sync AC** → update the ticket with the full staged description. Note in the plan file that
  the ACs are now on the ticket.
- **Create sub-tasks** → one per slice, using the sub-task type and required fields from the
  Tracker section, parent = the ticket. Mirror the shipped sibling's granularity; put the
  risk/unblock work first; skip work already done; give each a self-contained description (files,
  sibling reference, rule notes, dependency). Report the keys + links as a table and remind the
  user these are live items.
- **Skip either** → say the plan file is now the only record of that breakdown; re-running will
  re-offer it.

### Phase 8 — Ask before publishing the plan (only when the rules name a place)

When the project rules name a place where plans are published for product owners, reviewers and
testers (a wiki space and parent page, a docs site), **ask** whether to publish an
audience-friendly version there. No such place in the rules → skip this phase silently.

**Write for the audience, not the engineer.** The plan file is the executable spec, dense with
`path:line` refs and commands. The published page is for people who decide, review or test.
Rebuild the body:

- **Summary card** — ticket (linked), status, sibling (linked), target repo, author, last updated.
- **Context** — 3–6 sentences of what and why, in product language.
- **Acceptance criteria** — a table: *#*, *Scenario*, *Given / When / Then*; grouped by area when
  there are more than ~8 rows.
- **Decisions** — *Decision*, *Chosen default*, *Why*, *Reversible?*, plus the biggest risk.
- **Steps** — outcomes, not commands.
- **Out of scope** — short bullets.
- **For engineers** — links only: the plan file path, the sibling ticket, the repo rule files.
- **Footer** — generated from the plan file, which stays the source of truth.

Check whether a page with the same title already exists so the user chooses *update* or *create*
knowingly; never create a duplicate. Publish only on a yes, and report the URL.

## Guardrails

- **Read-only on the codebase.** The only file you write is the plan. No code edits, no commits.
- **Reuse before invention.** If a shipped sibling already does it, the plan reuses it and says where.
- **Respect the repo contract.** The plan must not propose anything a repo's **Conventions** or
  **Do / Don't** section forbids.
- **Fail closed on unknowns.** If a backend / permission / dependency can't be confirmed, the plan
  gates on verifying it and defaults to not shipping the unconfirmed piece.
- **Cite evidence.** Every file claim ties to something read (`path:line`).
- **Always put the tracker question** (Phase 7) when there is a tracker. You may finish with no
  writes at all — never without having asked.
