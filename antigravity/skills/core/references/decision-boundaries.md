---
name: decision-boundaries
description: Autonomous vs approval action thresholds for agent operations.
---

# Decision Boundaries

## Purpose

Clear boundaries defining when agents may act autonomously versus when human approval is required.

## Table of Contents

- [Autonomous Actions](#autonomous-actions)
- [Requires Approval](#requires-approval)
- [Escalation Rules](#escalation-rules)
- [Option Presentation](#option-presentation)

## Autonomous Actions

**Auto-execute without asking:**
- Dependency installs (`npm install`, `pip install`, etc.)
- Lint fixes (`npm run lint --fix`, `prettier --write`)
- Memory file consolidation (`.agent-memory.md` under 2KB)
- File structure compliance (adding Purpose/TOC/Related Docs)
- Documentation formatting (tables, bullets, keywords)

**Execute with brief confirmation:**
- Creating new files following standards
- Updating existing documentation
- Fixing obvious bugs in open files

## Requires Approval

**Always ask before:**
- Deleting files or directories
- Modifying production configs (`.env`, deployment files)
- Changing build/test configurations
- Introducing new dependencies
- Refactoring across multiple files
- Changing API contracts or interfaces
- Modifying authentication/authorization logic

**Present A/B/C options for:**
- Architectural decisions
- Breaking changes
- Framework/library choices
- Multiple valid approaches exist

## Escalation Rules

**When uncertainty is high:**
- Partial context: Ask for clarification
- Multiple valid paths: Present options
- Conflicts detected: Explain and propose alternatives
- Repository rules unclear: Flag ambiguity

**Escalation format:**
1. State the ambiguity
2. Explain why it matters
3. Propose 2-3 specific alternatives
4. Wait for selection before proceeding

## Option Presentation

**Format for A/B/C options:**

```markdown
**Option A**: [Approach]
- Pros: [X, Y]
- Cons: [Z]

**Option B**: [Approach]
- Pros: [X, Y]
- Cons: [Z]

**Option C**: [Approach]
- Pros: [X, Y]
- Cons: [Z]
```

**Never present:**
- Open-ended questions without options
- Vague "what do you prefer?" prompts
- Options without pros/cons context

## Related Documents

- `SKILL.md` — Core rules index
- `environment-safety.md` — Pre-execution checks
