# Cook Fast Mode

Direct implementation — skip "Should I create a plan first?" question, implement immediately.

<feature>$ARGUMENTS</feature>

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task.

## Step 1: Intent Classification

Classify the feature before writing any code:

| Dimension | Value |
|-----------|-------|
| **Type** | feature / fix / refactor / docs |
| **Scope** | single-file / multi-file / multi-module |
| **Risk** | low / medium / high (schema changes, auth, public APIs) |

**Guard rail**: If scope is multi-module (>5 files likely), pause and suggest `/cook --parallel` instead.

## Step 2: Implement

Create/modify files directly (no plan creation).

- Report progress per file as you go
- Follow YAGNI, KISS, DRY principles
- Respect file ownership — don't modify files outside the feature scope

## Step 3: Review Gate

After implementation, run all checks before testing:

1. **Type Check** — No compilation errors
2. **Lint** — No lint violations

If any check fails → fix immediately before proceeding.

## Step 4: Test

Write and run tests for new code.

- Unit tests for new functions/methods
- Integration test if touching external boundaries (API, DB, auth)
- All relevant tests must pass

**Auto-escalation**: If tests fail twice with different fixes attempted → escalate to `debugger` with the failing test output and relevant files. Do not attempt a third guess.

## Step 5: Finalize

1. **Docs update** — Update relevant docs if public API or behavior changed
2. **Change summary** — Output a concise summary:
   ```
   Files changed: N
   Tests added: N
   Behavior change: [yes/no + 1 line description]
   Follow-up tasks: [any new issues discovered]
   ```
3. **Commit offer** — Ask: "Commit? [Y/n]" → use `git-manager` if yes

## Rules

- Always write tests for new code
- Never skip the Review Gate (Step 3)
- Never attempt the same fix more than twice — escalate instead
