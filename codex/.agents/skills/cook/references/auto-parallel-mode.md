# Cook Auto Parallel Mode

Research → parallel plan → parallel implement → test → review → commit.

## When to Use

`/cook --auto:parallel [task description]`

Best for multi-module features with independent subsystems (DB + API + UI, frontend + backend, etc.).

## Workflow

### 1. Research (optional)

If tasks are complex, spawn up to 2 `researcher` agents in parallel:
- R1: Best practices and technical approaches
- R2: Codebase analysis and existing patterns
- Keep reports ≤ 150 lines each

Use scout (Explore agent + Grep/Glob) to search codebase.

### 2. Parallel Planning

Trigger `plan --parallel <detailed-instruction>`:
- Wait for plan with dependency graph, execution batches, file ownership matrix
- Validate: no circular dependencies, max 7 phases, no file ownership conflicts

### 3. Parallel Implementation

Read `plan.md` for dependency graph:
- Launch multiple `developer` agents in PARALLEL for independent phases (Batch 1)
- Pass each agent: phase file path + environment info + file ownership boundaries
- Wait for Batch 1 to complete before starting Batch 2
- Sequential phases: one agent at a time

### 4. Testing

Use `tester` agent for full test suite:
- No fake data, mocks, or skipped tests
- If fail: use `debugger`, fix, repeat until pass

### 5. Code Review

Use `code-reviewer` for all changes:
- Check security, performance, correctness
- If critical issues found: fix, retest, re-review

### 6. Project Management & Docs

If approved, in parallel:
- Update plan files (mark phases complete)
- Update relevant docs

### 7. Final Report + Commit

Summary of all parallel phases with guide to get started.
Ask user if they want to commit — if yes, trigger `git` skill.

## Constraints

- Max 7 phases (prevent over-decomposition)
- File ownership matrix must be respected (exclusive write per phase)
- Dependency graph must be a valid DAG (no cycles)
- Each researcher: max 5 tool calls
- Phase files ≤ 240 lines

## Agent Mapping

| ePost Agent | tri-ai-kit Agent |
|-------------|-----------------|
| epost-researcher | researcher |
| epost-implementer | developer |
| epost-tester | tester |
| epost-reviewer | code-reviewer |
| epost-git-manager | git-manager |
