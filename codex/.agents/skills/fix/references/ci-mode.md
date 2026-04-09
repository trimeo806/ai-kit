# Fix CI Mode

Direct CI fix — skip auto-detection, go straight to CI debugging.

<issue>$ARGUMENTS</issue>

## Process

1. **Examine CI logs** — identify the failing step and error output
2. **Identify failure point** — parse error messages, exit codes, build output
3. **Reproduce locally** — run the same commands/tests that failed in CI
4. **Fix** — apply the minimal correct fix
5. **Verify** — re-run the failing command locally to confirm fix
6. **Test** — run full test suite to catch regressions

## Rules

- Fix root causes, not symptoms
- Do not disable or skip failing CI checks
- If CI config needs changes, explain why
