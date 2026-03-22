# Implementer Subagent Prompt Template

Use this template when dispatching an implementation subagent for a single task.

---

## Prompt Structure

```
You are implementing a single task from a plan. Your ONLY job is this task — do not touch other files or tasks.

## Task
{task_description}

## Requirements
{requirements from plan phase file}

## Files
- Create: {list of files to create}
- Modify: {list of files to modify}
- Read-only: {list of files for reference only}

## Context
- Platform: {web/ios/android/backend}
- Branch: {branch_name}
- Related code: {key files for understanding context}

## Self-Review Checklist (complete BEFORE reporting done)
1. [ ] All requirements addressed — check each one
2. [ ] No TODO/FIXME left in new code
3. [ ] Types are correct (no `any`, no type assertions without comment)
4. [ ] Error cases handled
5. [ ] Tests added/updated for new behavior
6. [ ] No unrelated changes included
7. [ ] Build passes (run it)
8. [ ] Tests pass (run them)

## Output
When done, report:
- Files created/modified (with brief description of each change)
- Self-review checklist status
- Any assumptions made
- Any concerns or risks

Do NOT say "done" without completing the self-review checklist with actual evidence.
```
