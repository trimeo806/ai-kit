# Cook Auto Mode

Trust-based full pipeline: plan → implement → commit.

## When to Use

`/cook --auto [task description]`

No manual approval gates. Best for well-defined tasks where the plan is straightforward.

## Workflow

### 1. Plan

Trigger the `plan` skill with the task description:
- Complexity auto-detected → routes to fast, deep, or parallel mode
- Plan files created in `plans/YYMMDD-HHMM-{slug}/`

### 2. Implement

Trigger the `cook` skill with the generated plan file:
- Follows plan precisely
- Writes tests for new code
- Updates relevant docs

### 3. Commit (ask user)

Use `AskUserQuestion` to ask if user wants to commit.
- If yes: trigger `git` skill to commit
- If no: stop and report what was implemented

## Rules

- Follow plan exactly — no improvisation
- Always write tests for new code
- Report progress per phase
- Token efficiency: concise status updates only
