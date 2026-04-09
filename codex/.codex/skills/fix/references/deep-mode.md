# Fix Deep Mode

Systematic deep fix — skip auto-detection, run full investigation.

<issue>$ARGUMENTS</issue>

## Process

1. **Systematic investigation** — gather all available context
2. **Gather logs** — collect error logs, stack traces, system state
3. **Analyze stack traces** — trace the error path through the codebase
4. **Root cause analysis** — identify the underlying cause, not just the symptom
5. **Fix** — apply the correct fix with proper error handling
6. **Regression test** — write a test that would have caught this issue
7. **Document** — add comments explaining the fix and why it was needed

## Rules

- Fix root causes, not symptoms
- Do not use `any` type to bypass typechecks
- Do not ignore failed tests or use fake data
- Document complex fixes for future maintainers
