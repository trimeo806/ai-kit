# Cook Auto Fast Mode

No research. Scout → plan fast → implement. Skip code review.

## When to Use

`/cook --auto:fast [task description]`

Best for simple, well-scoped tasks where the pattern is already known in the codebase.

## Workflow

### 1. Scout

Use Explore agent to find related resources, documents, and code snippets:
- Grep for relevant keywords
- Glob for related files
- Read top 3-5 most relevant files

### 2. Plan Fast

Trigger `plan --fast <detailed-instruction>` with scout findings:
- No external research
- Codebase analysis only
- Max 5 searches, fast execution

### 3. Implement

Trigger `cook` with the plan:
- Skip code review step
- Implement directly from plan
- Run tests after implementation

## Constraints

- No WebSearch / WebFetch
- Max 10 file reads during scout
- Plan.md ≤ 80 lines
- Total execution < 10 minutes

## Principles

YAGNI · KISS · DRY — sacrifice grammar for concision in reports, list unresolved questions at end.
