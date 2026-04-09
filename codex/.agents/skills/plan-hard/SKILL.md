---
name: plan-hard
description: Deep plan with sequential research and comprehensive analysis — use for moderate to complex features requiring investigation
user-invocable: true
metadata:
  argument-hint: "[task description]"
  agent-affinity:
    - planner
    - researcher
  keywords:
    - plan
    - hard
    - deep
    - research
    - complex
  platforms:
    - all
  triggers:
    - plan deep
    - deep plan
    - plan hard
    - detailed plan
---

# Plan Hard (Deep)

Comprehensive planning with 2-researcher sequential phase.

## When to Use

- Moderate to complex features requiring research
- Tasks with unknowns needing API/library investigation
- Complexity score 2–4 (default for most real tasks)

## Execution

Load `plan/SKILL.md` aspect file `references/deep-mode.md` and execute with the given task.

**Research Phase:**
1. R1: Best practices, technical approaches, patterns
2. R2: Codebase analysis, existing patterns, dependencies (sequential after R1)

**Constraints:**
- 2 researchers, sequential only
- Max 5 tool calls per researcher
- Max 150 lines per research report
- Plan.md ≤ 110 lines
- Execution < 15 minutes

<request>--deep $ARGUMENTS</request>
