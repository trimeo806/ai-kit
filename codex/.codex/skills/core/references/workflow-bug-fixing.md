# Workflow: Bug Fixing

Investigation-first workflow. Scout → Debug → Fix → Test → Review → Capture → Git.

## Steps

### 1. Scout
**Agent**: Explore subagent (via `/scout`)

- Search codebase for related files
- Map file relationships and dependencies
- Provide context snippets for debugger

### 2. Debug
**Agent**: debugger
**Trigger**: `/debug [issue]` or error detected

- Read logs, error traces, GitHub Actions output
- Identify failing test or crash site
- Trace to root cause (e.g., connection pool exhaustion, race condition)
- Suggest targeted fix with code examples
- Output: root cause analysis + recommended fix

**Example**: "CI pipeline failing?" → reads GitHub Actions logs → identifies failing test "Auth token validation timeout" → traces to database connection pool exhaustion → suggests fix: increase pool size + add retry logic

### 3. Fix
**Agent**: developer

- Apply the fix based on debugger's analysis
- Write regression test covering the root cause
- Keep changes minimal (surgical fix, not refactor)

### 4. Test
**Agent**: tester

- Run full test suite
- Validate regression test passes
- Confirm fix doesn't introduce new failures
- If fail → back to debugger (max 3 loops)

### 5. Review
**Agent**: code-reviewer

- Verify fix correctness
- Check for edge cases and side effects
- Validate test coverage of the root cause

### 6. Capture
**Agent**: journal-writer (auto-trigger on significant fix)

- Record root cause as FINDING in `docs/`
- Document prevention strategy
- Cross-reference related patterns
- Update knowledge base via `knowledge-capture` skill

### 7. Git
**Agent**: git-manager

- Commit with `fix:` prefix
- Reference issue number if available

## Bug Categories

| Complexity | Signal | Approach |
|---|---|---|
| Simple | Typo, missing import, config error | Skip scout, direct fix |
| Medium | Logic error, wrong API usage | Scout + debug + fix |
| Complex | Race condition, memory leak, perf | Full workflow with research |
| Critical | Security vulnerability, data loss | Full workflow + urgent flag |
