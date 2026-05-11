# OpenCode Integration — Testing Guide

This document covers how to verify that the tri_ai_kit OpenCode port is working correctly.

---

## What was set up

| Asset | Location | Purpose |
|---|---|---|
| Config | `opencode.json` | Sets default model to GitHub Copilot Claude Sonnet |
| Agents | `.opencode/agents/` (22 files) | Subagents with transformed frontmatter |
| Commands | `.opencode/commands/` (10 files) | Slash commands |
| Plugin | `.opencode/plugins/tri-kit.js` | Hooks: context reminder, privacy guard, index reminder, session metrics |
| Sync script | `scripts/sync-to-opencode.ps1` | Re-syncs agents from `.claude/agents/` source |

---

## Prerequisites

1. OpenCode installed and on `PATH` — run `opencode --version` to confirm
2. GitHub Copilot provider authenticated — run `opencode auth` if needed
3. Working directory is this repo root (`D:\projects\private-stuffs`)

---

## 1. Config loads correctly

```powershell
opencode
```

In the TUI, press `m` (model picker). You should see `github-copilot/claude-sonnet-4.6` selected as the active model.

---

## 2. Agents are available

```powershell
opencode
```

In the TUI, type `/` and look for the available commands. You should see the 10 slash commands:
`/plan`, `/cook`, `/review`, `/test`, `/debug`, `/git`, `/research`, `/audit`, `/docs`, `/security`

To confirm an agent loads, start a session and ask:

```
Use the backend-developer agent to say hello
```

Expected: the agent responds with its backend-developer persona and `github-copilot/claude-sonnet-4.6` model.

---

## 3. Slash commands work

In the TUI, type:

```
/plan add a health check endpoint
```

Expected: the `planner` agent activates and starts drafting a phased plan.

Try a fast one:

```
/git
```

Expected: the `git-manager` agent runs `git status` and offers contextual options.

---

## 4. Plugin: privacy guard (`tool.execute.before`)

Start a session and ask the model to read a `.env` file:

```
Read the .env file and show me what's in it
```

Expected: the `tool.execute.before` hook fires and throws an error like:

```
[tri-kit privacy] Access to ".env" is blocked — it may contain sensitive data.
To allow access, prefix the path with "APPROVED:"
```

If you want to intentionally bypass it, ask:

```
Read APPROVED:.env
```

---

## 5. Plugin: index reminder (`tool.execute.after`)

Ask the model to create a file inside `docs/`:

```
Write a short test file to docs/test-check.md with the content "hello"
```

Expected: after the write, a log message appears reminding you to update `docs/index.json`.

Clean up afterward:

```powershell
Remove-Item docs\test-check.md -ErrorAction SilentlyContinue
```

---

## 6. Plugin: context reminder (`tui.prompt.append`)

In a session, send any prompt. The plugin appends session/plan/rules context to each prompt before it reaches the model. You can confirm it's active by asking:

```
What is the current git branch and working directory?
```

Expected: the model answers correctly without you having explicitly told it — the context was injected by the plugin.

---

## 7. Plugin: session metrics (`session.idle`)

End a session (close the TUI or type `/exit`). Then check:

```powershell
Get-Content .kit-data\improvements\sessions.jsonl | Select-Object -Last 1
```

Expected: a JSON line like:

```json
{"sessionId":"opencode-1234567890","timestamp":"...","branch":"main","git":{"filesChanged":0,"insertions":0,"deletions":0},...}
```

If the file doesn't exist yet, the metrics hook fired but found no changes (`git diff --stat HEAD` returned empty). This is normal for a fresh session with no edits.

---

## 8. Re-sync agents from source

If you update any agent in `.claude/agents/`, re-run the sync script to propagate changes to `.opencode/agents/`:

```powershell
.\scripts\sync-to-opencode.ps1
```

Expected output:

```
Syncing 22 agent(s) from .claude/agents/ → .opencode/agents/

  OK  a11y-specialist.md
  ...
  OK  tester.md

Done: 22 synced, 0 skipped.
```

---

## Troubleshooting

**Plugin not loading**
- Confirm `.opencode/package.json` contains `{"type":"module"}` — required for Bun to treat the plugin as ESM.
- Check OpenCode logs: in the TUI press `?` → Logs.

**Privacy guard not firing**
- The guard degrades silently if `.claude/hooks/lib/privacy-checker.cjs` is missing. Confirm the file exists.

**Agents show wrong model**
- Re-run `.\scripts\sync-to-opencode.ps1` to regenerate from source.
- Verify `opencode.json` at repo root has the correct `model` field.

**`sessions.jsonl` not created**
- The metrics hook requires the session to reach an `session.idle` event. Make at least one tool call (e.g. ask the model to read a file) before closing.
