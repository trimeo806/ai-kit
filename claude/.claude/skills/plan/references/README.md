# Plan Skill Reference Files

This directory contains templates and guides for creating effective implementation plans.

## Quick Navigation

**New to planning?** Start here:
1. [planning-quick-reference.md](planning-quick-reference.md) — Overview and decision tree (5 min read)
2. [spec-template.md](spec-template.md) — How to write specifications (10 min read)
3. [task-breakdown-template.md](task-breakdown-template.md) — How to estimate and structure tasks (10 min read)
4. [verification-checklist.md](verification-checklist.md) — How to verify completion (15 min read)

---

## What Each File Does

### planning-quick-reference.md
- Decision tree: Which plan mode to use (--fast, --deep, --parallel)
- Step-by-step: How to create a plan using the templates
- Common mistakes and how to fix them
- Examples for simple, moderate, and complex features
- When to stop planning

**Use when**: Starting a new plan, unsure which template to use

---

### spec-template.md
- Complete template for writing specifications
- Explains each section: Feature/Goal, Requirements, Edge Cases, Success Criteria
- Refinement checklist: 5 questions to validate your spec
- Common anti-patterns and fixes
- How to link spec to tasks
- Example: Complete spec for a task filter feature

**Use when**: Writing the Specification section of a plan

**Output**: Your spec section (copy-paste template and fill in)

---

### task-breakdown-template.md
- Task component breakdown (description, acceptance, effort, dependencies, deliverable, success metric)
- Quick reference table format
- Detailed breakdown format for complex tasks
- Estimation checklist: Is this task the right size?
- Dependency graph example
- Tips for task decomposition

**Use when**: Breaking requirements into concrete tasks

**Output**: Your Tasks section with table + detailed breakdown (copy-paste template and fill in)

---

### verification-checklist.md
- 5-stage verification process
  1. Manual Testing (golden path + edge cases)
  2. Code Quality (linting, naming, organization)
  3. Testing Coverage (unit, integration, E2E coverage ≥80%)
  4. Performance (latency, memory, bundle impact)
  5. Security & Regression (no vulns, existing features work)
- Stage-by-stage checklists with examples
- Sign-off checklist for code review
- Common failures and remediation
- Tips for testing like a user, not an engineer

**Use when**: After completing a phase, verifying implementation is ready for merge

**Output**: Your Verification section (copy-paste checklist sections, mark pass/fail)

---

## Templates Are Copy-Paste

All templates are designed to be copy-pasted directly into your plan files:

```markdown
## Specification
[copy from spec-template.md, fill in your details]

## Tasks
[copy from task-breakdown-template.md, fill in your details]

## Verification
[copy from verification-checklist.md, adjust to your phase]
```

No need to reformat or redesign — just fill in the blanks.

---

## Integration with Plan Modes

### --fast mode
Uses: `planning-quick-reference.md` (decision tree) + `spec-template.md` + `task-breakdown-template.md`

Output: Simple 1-2 page plan with spec + tasks, minimal research

---

### --deep mode
Uses: All four templates above

Output: 3-5 page plan with spec + research findings + detailed tasks + verification

---

### --parallel mode
Uses: All four templates + dependency matrix

Output: Multi-phase plan with file ownership for parallel execution

---

### --feature mode
Uses: All four templates + feature analysis gates

Output: Gate-based plan (business reqs → UI/UX → solutions → architecture → phased implementation)

---

## How Verification Feeds Back to Planning

If verification uncovers issues:

1. **Issues in manual testing** → Task was incomplete, add fixes as new tasks
2. **Issues in code quality** → Lint/type check before claiming done
3. **Issues in coverage** → Add tests as new tasks
4. **Issues in performance** → Profile, identify bottleneck, add optimization task
5. **Issues in security** → Add security hardening as new task

Then:
- Update phase file with new tasks
- Re-run verification
- Mark phase complete once ALL checks pass

---

## Examples in Templates

Each template includes:
- Inline examples showing good/bad patterns
- Complete worked examples for a "task filter" feature
- Anti-pattern table explaining what NOT to do
- Tips section with practical advice

Read examples to understand the pattern, then adapt to your feature.

---

## Questions?

### "How do I know my spec is complete?"
Use the Refinement Checklist in `spec-template.md`:
- [ ] Can you write 3 user stories from this?
- [ ] Does every requirement have a success metric?
- [ ] Can someone estimate effort for each requirement?
- [ ] Are edge cases prioritized?

### "How do I estimate task effort?"
See Task Estimation Checklist in `task-breakdown-template.md`:
- [ ] Can this be completed in 1-4 hours?
- [ ] Does it have a clear deliverable?
- [ ] Can you write an acceptance test?
- [ ] Does someone know how to do this?

### "What if verification fails?"
See Verification Failures table in `verification-checklist.md` — it lists common failures and fixes.

### "Am I over-planning?"
See "When to Stop Planning" in `planning-quick-reference.md` — plans >20 pages are usually over-detailed.

---

## Files for Reference (Not Templates)

These are supporting docs, not templates to copy-paste:

- `fast-mode.md` — How to execute quick planning (referenced by planner agent)
- `deep-mode.md` — How to execute deep planning with research (referenced by planner agent)
- `parallel-mode.md` — How to execute parallel planning (referenced by planner agent)
- `validate-mode.md` — How to validate existing plans (referenced by planner agent)
- `feature-analysis-mode.md` — How to execute feature-gated planning (referenced by planner agent)
- `state-machine-guide.md` — State machine notation and patterns (for stateful features)
- `planning-flow.dot` — Graphviz diagram of planning flow

---

## Version & Updates

These templates are versioned in the skill. Check the plan/SKILL.md frontmatter for the version.

When templates change:
1. Update is announced in the skill description
2. Old plan files continue to work (backwards compatible)
3. New plans should use latest templates
