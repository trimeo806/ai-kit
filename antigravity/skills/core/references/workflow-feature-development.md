# Workflow: Feature Development

6-step canonical workflow for building features. Agents follow this sequence by default.

## Steps

### 1. Plan
**Agent**: planner
**Trigger**: `/plan [feature]` or detected from context

- Spawn parallel researchers (2-3) for: implementation patterns, codebase analysis, dependencies
- Create `plans/{date}-{slug}/plan.md` with YAML frontmatter
- Define phase files with **exclusive file ownership** per phase
- Include success criteria, risk assessment, conflict prevention

**Example**: "Add OAuth login" → planner creates plan with DB changes, API endpoints, frontend components, test requirements, deployment checklist

### 2. Implement
**Agent**: developer
**Trigger**: `/cook` or plan approved

**Execution mode** (smart-detected):
- **Sequential** (default): phases executed in order, each waits for previous
- **Parallel** (auto-detected): when phases have non-overlapping file ownership, spawn one subagent per phase
- **Force**: `--parallel` or `--sequential` overrides smart detection

**Parallel detection heuristic**:
1. Read phase files, extract "File Ownership" glob patterns
2. If NO overlap between any two phases → parallel-safe
3. If overlap exists → sequential (or ask user to resolve ownership)

Per-phase implementation follows `subagent-driven-development` skill when 3+ independent tasks exist.

### 3. Test
**Agent**: tester
**Trigger**: `/test` or implementation complete

- Unit tests for new logic
- Integration tests for API/data flow
- E2E tests for user journeys
- Edge case tests (expired tokens, invalid input, race conditions)
- Security tests (CSRF, injection, session hijacking)

### 4. Review
**Agent**: code-reviewer
**Trigger**: `/review` or tests pass

- **Scout first**: edge-case detection across codebase
- **Quality audit**: code standards, security, performance, N+1 queries
- **Plan compliance**: verify all success criteria met

If issues found → fullstack-developer fixes → re-test → re-review (max 3 loops).

### 5. Docs
**Agent**: docs-manager
**Trigger**: auto after review pass

- Update API documentation with new endpoints
- Add architecture diagrams for new components
- Update onboarding guide if developer workflow changed
- Generate changelog entry with migration notes

### 6. Git
**Agent**: git-manager
**Trigger**: `/git` or explicit user request

- Review changes via `git diff`
- Create meaningful conventional commit (`feat:` prefix)
- No "Generated with Claude Code" attribution nonsense
- Create PR with proper description and checklist
- Link related issues automatically

## Failure Loops

```
Test failure → debugger (root cause) → fix → re-test (max 3)
Review rejection → fix specific issues → re-review (max 3)
3 failures → escalate to user with findings
```

## File Ownership Example

```yaml
Phase 1 (Backend API):
  ownership: ["src/api/auth/*", "src/models/user*", "src/middleware/auth*"]

Phase 2 (Frontend):
  ownership: ["src/components/auth/*", "src/hooks/useAuth*", "src/pages/login*"]

Phase 3 (Tests):
  ownership: ["tests/auth/*", "tests/e2e/login*"]
```

No overlap → parallel-safe. Reviewer checks for violations post-implementation.
