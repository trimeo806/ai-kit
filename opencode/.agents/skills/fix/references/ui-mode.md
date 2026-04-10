---
name: fix-ui-mode
description: "Fix UI component findings from known-findings DB"
user-invocable: false
metadata:
  argument-hint: "<ComponentName> [--finding-id <id>] [--top <n>]"
---

# Fix UI Mode

Invoked when: `fix --ui <ComponentName> [--finding-id <id>] [--top <n>]`

Executes inline in main context — the main context dispatches muji via OpenCode subagent dispatch.

## Steps

1. Parse `$ARGUMENTS`:
   - If no component name provided: ask "Which component? (e.g. `tri-ai-kitButton`)" and wait for reply
2. Load `reports/known-findings/ui-components.json`
   - If file not found: report "no UI findings DB — run `/audit --ui <ComponentName>` first" and stop
3. Select finding(s):
   - `--finding-id <id>`: load that specific finding
   - `--top <n>`: load top N unresolved by severity (critical → high → medium → low)
   - No flag: load all unresolved findings for named component
4. Delegate to muji via OpenCode subagent dispatch with:
   - Finding objects from DB
   - Component name + `file_pattern`
   - Mode: **plan** (produce fix plan + diff preview — do NOT write files yet)
   - Boundaries: plan ONLY the flagged rule violation — no opportunistic improvements
5. Present fix plan to user. For each finding, show:
   ```
   Finding #7 — PROPS-001 (high)
   File: src/lib/components/smart-letter-composer/smart-letter-composer.tsx
   Issue: Props interface not exported
   Fix: Export ISmartLetterComposerProps + add JSDoc on 3 undocumented props
   Diff preview:
     - type SmartLetterComposerProps = { ... }
     + export interface ISmartLetterComposerProps { ... }
   Confidence: high
   ```
6. **Ask for confirmation**: "Apply these N fix(es)? (yes / skip #id / cancel)"
   - `yes` → proceed to step 7
   - `skip #id` → exclude that finding, apply the rest
   - `cancel` → stop, nothing written
7. Dispatch muji via OpenCode subagent dispatch with confirmed findings:
   - Mode: **apply** (write changes to source files)
8. Update `reports/known-findings/ui-components.json`: set `fix_applied: true`, `fix_applied_date: today` for each applied finding
9. Output: files changed, lines changed per finding
10. Suggest: "Run `/audit --close --ui <id>` to mark as fully resolved after verification"

## Boundaries

- Fix ONE rule violation per finding — no opportunistic improvements
- Do not run a full re-audit after fixing
- If fix requires structural change (STRUCT category) — report instead of fixing, suggest redesign

## Schema Reference

See `audit/references/ui-findings-schema.md` for field definitions and resolution state machine.
