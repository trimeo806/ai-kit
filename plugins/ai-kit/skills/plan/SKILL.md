---
name: plan
description: Use when user says "plan", "design this", "architect", "spec out", "how should we build", or "create a roadmap" — spec-driven planning in the Spec Kit style, run as sequential steps that each work standalone - spec (write spec.md with the user, the source of truth) → clarify → design (plan.md, a test for every spec point) → tasks (test-first, traced) → analyze (coverage check + review gate). Bare "plan" resumes at the first missing step; "plan <step>" runs one step. Also when the request names a tracker ticket ("plan PROJ-123", "make a plan for <ticket link>", "break this story down") — a ticket without a spec gets one first, then the reuse-first ticket plan, asking before any tracker or wiki write.
user-invocable: true
metadata:
  argument-hint: "[spec|clarify|design|tasks|analyze|status] [TICKET-KEY | plan-dir | feature description]"
  agent-affinity:
    - planner
  keywords:
    - plan
    - planning
    - spec
    - specification
    - clarify
    - tasks
    - acceptance criteria
    - tdd
    - sdd
    - spec-kit
    - ticket
  platforms:
    - all
  connections:
    enhances: []
  triggers:
    - /plan
    - create plan
    - write spec
    - implementation plan
---

# Plan — Spec-Driven, Test-First, Step by Step

The spec is the source of truth. The plan says how it gets built. Tests prove each spec point. Tasks build only what the spec asks for. The flow follows GitHub Spec Kit with one difference: **tests are mandatory**.

```
[brainstormer] ──▸ spec ──▸ clarify ──▸ design ──▸ tasks ──▸ analyze ──▸ review gate ──▸ /tdd-dev-workflow
decision-log   spec.md   spec.md    plan.md    tasks.md   (read-only)  plan.md status
+ spec.md                                      (standard only)
```

`[brainstormer]` is `/ai-kit:brainstormer`: optional, for tickets without Given/When/Then ACs or with
vague scope. It writes `spec.md` itself (`clarified` when its exit check passes), so this skill resumes
at `clarify` or `design`. The `spec` step offers it when it fits.

Each step is a **standalone mode** with its own reference file. A step checks that its input exists, writes one artifact, then stops and offers the next step.

## Three rules

| Rule | Enforced by |
|------|-------------|
| **Every plan item traces, or it goes.** Each task, decision or file change traces to a spec point (`US*-AC*`, `FR-*`, `EC-*`, `SC-*`), a named risk (`RISK-*`) or a test. | `[Trace]` on tasks, Complexity tracking, `analyze` |
| **Decide in plan mode, before the code.** The decisions fit in ~10 lines, and someone else reads them before anything is built: a tech lead if high-risk, a teammate otherwise. | `## Decision summary` + `## Review gate` in `plan.md` |
| **Count plan-gap rework, not plan fidelity.** | `## Plan-gap log` in `plan.md` |

---

## 0. Load project rules

If not already in context, read `.ai-kit/workspace.json` and the `AGENTS.md` chain (workspace root down
to each target repo), per `${CLAUDE_PLUGIN_ROOT}/references/project-rules-contract.md`. Stack, commands,
architecture boundaries, conventions and testing rules come from there; the design and test plan obey
them. A fact the plan needs is missing → ask once and suggest saving it with `/ai-kit:setup-rules`.

## 1. Resolve the plan dir

`<docsDir>` is `docsDir` from `workspace.json` (default `docs`), at the workspace root.

| Input | Plan dir | Mode |
|-------|----------|------|
| a ticket key matching `tracker.keyPattern`, a ticket URL, or `--ticket` | the ticket folder `<docsDir>/<TICKET-KEY>/` | ticket |
| a path to a plan dir or a file in it | that dir | from its contents (`tasks.md` or `spec.md` without a ticket key → standard) |
| a feature description | a matching `<docsDir>/<intention-name>/` if one exists (ask if several match), else a new one — kebab-case goal, no date, not a project-docs name (`architecture`, `conventions`, `decisions`, `api`) | standard |
| nothing | the most recently changed `<docsDir>/*/` whose `plan.md` is not `approved`/`completed`; ask if several | from its contents |

## 2. Pick the step

An explicit step argument (`plan spec`, `plan design PROJ-123`, …) runs that step. The step's own input check still applies.

Otherwise run the **first row that matches**:

| State of the plan dir | Step | Reference |
|-----------------------|------|-----------|
| `decision-log.md` with `status: in-progress` (ACs not yet confirmed, even if `spec.md` exists) | resume `ai-kit:brainstormer`; stop | `${CLAUDE_PLUGIN_ROOT}/skills/brainstormer/SKILL.md` |
| no `spec.md` (a ticket with only an old-style `plan.md`: see the note below) | `spec` | `references/step-spec.md` |
| `spec.md` has `status: draft` or a `[NEEDS CLARIFICATION]` marker | `clarify` | `references/step-clarify.md` |
| no `plan.md` | `design` | `references/step-design.md` |
| standard mode and no `tasks.md` | `tasks` | `references/step-tasks.md` |
| `plan.md` has `status: draft` | `analyze` | `references/step-analyze.md` |
| `plan.md` has `status: awaiting-review` | report the review gate (who, what); stop | `references/step-analyze.md` § Review gate |
| `plan.md` has `status: approved` | report that it is ready; offer `/ai-kit:tdd-dev-workflow` | — |

`plan status` only prints this table for the plan dir, marking the current row. It writes nothing.

**A ticket planned before this flow** has a `plan.md` but no `spec.md`. Offer two options:
- `spec`, which writes `spec.md` from the plan's `## Acceptance criteria` and keeps their numbers;
- continue with the existing plan as is.

Never overwrite that `plan.md`.

**Spec changed downstream.** When `spec.md` is newer than `plan.md` or `tasks.md`, say which spec IDs changed and offer to run `design` and then `tasks` for them. Re-running a step updates its artifact in place, keeps existing IDs, and adds a Plan-gap log row when the change came from a gap.

## 3. Run it, then hand over

Read the step's reference and follow it. After writing its artifact:
1. Summarize what was written in 3–5 lines, with the path.
2. Ask one question (`AskUserQuestion`, or plain chat where it is unavailable): **"Continue to `<next step>`?"**, with the options *Continue* (recommended), *Stop here* and *Redo this step*.
3. On *Continue*, run the next step in the same turn. On *Stop here*, end the turn; a later bare `plan` resumes from the table above.

The user can run any later step on its own (`plan tasks`), and any earlier step to revise (`plan spec`).

---

## Where it runs

The skill runs in the **main conversation**: `spec` and `clarify` are a dialogue with the user, and every step ends with a question. Heavy reading goes to subagents, and their results come back here:
- `Explore` agents for reuse, target surface and integration seam;
- `ai-kit:backend-architect` / `ai-kit:frontend-architect` for fullstack design;
- `ai-kit:researcher` for library unknowns;
- the `ai-kit:planner` agent to run `design`, `tasks` or `analyze` for a clarified spec (it follows the same step references and returns open questions instead of asking).

Give each subagent the plan dir, the step to run and its question, and never ask it to talk to the user. Questions it returns are asked here, and the step then re-runs or continues. `spec` and `clarify` are never delegated.

> **Codex:** there are no named role agents — spawn a subagent briefed with `${CLAUDE_PLUGIN_ROOT}/agents/<agent>.md`, or do the step inline. Without AskUserQuestion, ask in plain chat.

## Principles (every step)

- **Reuse before invention.** Find a shipped sibling or an existing hook/service/adapter and plan to reuse it. Record it in a **Reuse map** (need → existing thing → `path:line`).
- **Read the code before designing.** Cite evidence as `path:line`. The `spec` step stays technology-agnostic.
- **Ask only genuine decisions.** Recommend an option. Anything else becomes an assumption.
- **Fail closed on unknowns.** An unconfirmed backend, permission or dependency becomes a `RISK-*`, and its first task verifies it.
- **Read-only except plan files.** Tracker and wiki writes happen only at the ticket flow's own approval gates (Phases 7–8).
- **Placement follows project rules.** File paths follow the Architecture and Conventions sections of the repo's `AGENTS.md`.

## Artifacts

```
<docsDir>/<intention-name>/       <docsDir>/<TICKET-KEY>/   (ticket mode)
  spec.md       source of truth      spec.md
  plan.md       HOW + test plan      plan.md   (ticket-flow template; its Steps are the tasks)
  diagrams/     design.wb.json →     diagrams/  (Excalidraw whiteboard, from the design step)
                .excalidraw + .png
  contracts/    only for interfaces
  tasks.md      test-first, traced
  checklists/   from /review checklist
  reports/      agent reports (tester, reviewer, researcher, …)
```

One folder per work item. Nothing goes to `plans/` or a root `reports/`.

## During and after implementation

- **Spec changes go to `spec.md` first.** Then re-run `design` and `tasks`; never edit downstream files first.
- **Rework caused by a gap** (a missing spec point, risk or test) gets a Plan-gap log row, and the spec/plan is fixed.
- `/ai-kit:review checklist` checks requirements quality before the gate. `/ai-kit:review converge` checks spec vs code afterwards and appends gap tasks.

<request>$ARGUMENTS</request>
