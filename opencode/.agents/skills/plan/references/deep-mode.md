---
name: plan-deep
description: "Deep plan with sequential research and comprehensive analysis"
user-invocable: false
disable-model-invocation: true
metadata:
  argument-hint: "[enhanced planning prompt from router]"
  connections:
    extends: [plan]
    conflicts: [plan-fast, plan-parallel]
---

# Plan Hard Variant

Comprehensive planning with sequential 2-researcher phase. Balances thoroughness with token efficiency.

## When to Use
- Moderate to complex features requiring research
- Tasks with unknowns needing API/library investigation
- Complexity score 2-4 (router auto-routes, default for most tasks)

## Execution Steps

### 1. Parse Enhanced Prompt
Extract from $ARGUMENTS: original_request, complexity_scores, planning_requirements, codebase_context_paths

### 1.5. Platform Skill Discovery + Agent Assignment

**Skill discovery** (if platform detected from arguments or changed files):
1. Read `.agents/skills/skill-index.json`
2. Filter skills where name contains platform prefix (`ios-`, `android-`, `web-`, `backend-`, `golang-`)
3. Read matching SKILL.md files for platform conventions, patterns, constraints
4. Use these patterns when generating phase files and research prompts

If no platform detected, skip skill scan.

**Agent assignment** (always required — run before generating any phase file):
Scan `.opencode/agents/*.md`, extract `name`, `description`, `skills` fields. Then assign:

| Phase type | Agent | Skills to activate |
|------------|-------|--------------------|
| Go / Node.js backend | `backend-developer` | `golang-pro`, `postgres-pro`, `api-designer` |
| React / TanStack UI | `frontend-developer` | `tanstack-start`, `react-expert`, `typescript-pro`, `web-frontend` |
| Auth / OAuth / JWT | `backend-developer` | `golang-pro`, `typescript-pro` |
| SSE / real-time backend | `backend-developer` | `golang-pro`, `websocket-engineer`, `postgres-pro` |
| Test / E2E | `tester` | `playwright-expert`, `web-testing`, `test` |
| CI/CD / Docker | `devops-engineer` | `infra-docker`, `terraform-engineer` |
| Security audit | `security-auditor` | `fullstack-guardian` |

Embed in every generated phase file (after Overview):
```markdown
## Agent & Skills
- **Agent**: `{agent-name}`
- **Skills**: `{skill-1}`, `{skill-2}`
- **Handoffs**:
  - After completion → `code-reviewer`
  - On security concern → `security-auditor`
```

### 2. Check Codebase Summary
```
CHECK docs/codebase-summary.md:
- Missing: Warn, ask to run /scout or continue
- Older than 3 days: Warn, ask to refresh or continue
- Fresh: Read and use
```

### 3. Create Plan Directory (Early)
```
plan_slug = sanitized original_request (lowercase, hyphens, 40 chars max)
plan_path = plans/YYMMDD-HHMM-{plan_slug}/
  ├── research/
  ├── reports/
CREATE directory
```

### 4. Sequential Research Phase

Follow dispatch patterns from `subagent-driven-development` skill.
Researcher subagents get fresh context per subagent-driven-development rules.

**Researcher 1: Best Practices**
```
Task(
  subagent_type: "researcher"
  prompt: """
Research: {original_request}

Focus: Best practices, technical approaches, patterns
Max 5 tool calls (WebSearch, WebFetch, Read, Grep, Glob, mcp__context7__resolve-library-id, mcp__context7__query-docs)
Output: {plan_path}/research/researcher-01-report.md (max 150 lines)

Library documentation (use FIRST when a specific library/framework is involved):
  1. mcp__context7__resolve-library-id { libraryName: "<package>" } → get libraryId
  2. mcp__context7__query-docs { context7CompatibleLibraryID: "<id>", topic: "<topic>" } → get docs
  Use for: accurate API signatures, migration guides, version-specific features.
  Counts as 2 tool calls — use only when package name is known and docs accuracy matters.

Sections:
1. Executive Summary (3-5 sentences)
2. Technical Approaches (2-3 options, pros/cons)
3. Recommended Libraries/Frameworks
4. Best Practices & Patterns
5. Security Considerations
6. Common Pitfalls
7. References (URLs)
"""
)
WAIT for completion
READ researcher-01-report.md
```

**Researcher 2: Codebase Analysis**
```
Task(
  subagent_type: "researcher"
  prompt: """
Research: {original_request}

Context: Can reference {plan_path}/research/researcher-01-report.md
Platform: {detected_platform} (if detected)
Platform skills loaded: {skill names from step 1.5} (if any)
Focus: Codebase analysis, existing patterns, dependencies
Use platform-specific patterns when analyzing codebase.
Max 5 tool calls (Read, Grep, Glob, WebFetch)
Output: {plan_path}/research/researcher-02-report.md (max 150 lines)

Sections:
1. Executive Summary (3-5 sentences)
2. Existing Patterns (similar implementations)
3. Affected Modules & Dependencies
4. File Organization & Conventions
5. Integration Points
6. Potential Conflicts/Blockers
7. Code Standards Compliance
8. Gap Analysis (if applicable: when R1 recommends patterns/libraries not found in codebase, document the gap and propose adaptation strategy)
"""
)
WAIT for completion
READ researcher-02-report.md
```

### 5. Aggregate Research
Synthesize from both researchers:
- technical_approaches (R1 options adapted to R2 codebase)
- recommended_libraries (R1 validated by R2 dependencies)
- existing_patterns (R2 matched to R1 best practices)
- integration_strategy (R1 approaches fit R2 modules)
- gap_analysis (R2 gaps identified: missing patterns, adaptation strategies)
- risks_and_mitigations (combined)

### 6. Read Documentation Context
Read (skip if missing):
- docs/system-architecture.md
- docs/code-standards.md
- docs/codebase-summary.md

### 7. Generate plan.md with Research
```yaml
---
title: "{feature}"
description: "{from research}"
status: pending
priority: P2
effort: {Xh from research}
tags: [keywords, from, research]
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# {Feature}

## Summary
{1-2 sentences informed by research}

## Research Summary

**Best Practices** (R1):
- {Key finding 1}
- {Key finding 2}

**Codebase Analysis** (R2):
- {Key finding 1}
- {Key finding 2}

**Recommended Approach**:
{Synthesized from both}

**References**:
- [Researcher 1](./research/researcher-01-report.md)
- [Researcher 2](./research/researcher-02-report.md)

## Key Dependencies
{From R2}

## Execution Strategy
{Sequential/phased from research}

## Phases
| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | {Name} | {Xh} | pending | [phase-01](./phase-01-{slug}.md) |

## Critical Constraints
{From code-standards + research}

## Success Criteria
- [ ] {Testable from research}
```
Max 110 lines (80 + 30 for research section).

### 8. Generate Phase Files
For each phase create phase-{XX}-{name}.md:
```
# Phase {XX}: {Name}

## Context Links
- [Plan](./plan.md)
- [R1 Report](./research/researcher-01-report.md)
- [R2 Report](./research/researcher-02-report.md)
- {Code files from R2}

## Overview
- Priority: P1/P2/P3
- Status: Pending
- Effort: {Xh}
- Description: {What this accomplishes}

## Key Insights
**From Research**:
- {R1 insight for this phase}
- {R2 insight for this phase}

**Critical Considerations**:
- {Decision points from research}

## Requirements
### Functional
- {Requirement}

### Non-Functional
- Files under 200 LOC
- {Constraints from research + code-standards}

## Architecture
{Design informed by R1 best practices, if applicable}

## Related Code Files
### Files to Modify
- `path/file.ext` - {changes from R2}

### Files to Create
- `path/new.ext` - {purpose, R2 org patterns}

### Files to Delete
- None

## Implementation Steps
1. **{Step from research}**
   - {Action from R1 approach}
   - {Adapted to R2 patterns}

## Todo List
- [ ] {Task 1}

## Success Criteria
- {How to verify, R1 best practices}

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| {From research} | Med | {Strategy from researchers} |

## Security Considerations
{From R1 security + R2 codebase audit}

## Next Steps
- {Dependencies}
```
Max 200 lines per phase.

### 9. Set Active Plan
```bash
```
If fails: warn with manual command.

### 10. Report Completion
```
✓ Hard Plan Created: {plan_path}

Research:
- R1: Best practices & approaches
  → {plan_path}/research/researcher-01-report.md
- R2: Codebase analysis & dependencies
  → {plan_path}/research/researcher-02-report.md

Summary:
- Phases: {N}
- Total effort: {Xh} (from research)
- Active plan: Set

Generated:
- plan.md ({X} lines, includes research)
- {N} phase files (with research insights)
- 2 research reports

Next Steps:
1. Review research: cat {plan_path}/research/researcher-*.md
2. Review plan: cat {plan_path}/plan.md
3. Start: /code {plan_path}

Note: HARD plan with research. For parallel tasks use /plan-parallel.
```

## Output Requirements
- **Always provide 2+ implementation approaches** with trade-offs (effort, risk, maintainability)
- Recommend one approach but justify why alternatives were considered
- Include trade-off matrix in plan.md under `## Recommended Approach`

## Constraints
- Execution: < 15 minutes (including research)
- 2 researchers, sequential only
- Max 5 tool calls per researcher
- Max 150 lines per research report
- Plan.md ≤ 110 lines (80 + 30 research)
- Phase files ≤ 200 lines

## Researcher Orchestration
1. R2 starts ONLY after R1 completes (sequential)
2. R2 receives R1 report path in prompt
3. R2 can supplement R1, overlap allowed
4. Each researcher: strict 5 tool call limit
5. Both use same markdown structure

## Error Handling
- R1 fails: Error, suggest /plan-fast or fix
- R2 fails: Warn, proceed with R1 only, mark plan "partial research"
- Missing codebase-summary: Proceed with warning
- plan activation step fails: Warn, continue

## Quality Standards
- Research findings in phase Key Insights section
- Specific file paths from R2 (not generic)
- Implementation steps from R1 best practices
- Security combines both researchers
- YAML frontmatter on all files
- Follow documentation management best practices
