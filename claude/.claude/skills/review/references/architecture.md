# Review — Architecture Mode

Lightweight, read-only pass for architectural friction. Same lens as `/audit --architecture`, none of the ceremony: no session folder, no HTML report, no `session.json`, no known-findings persistence.

> Vocabulary, principles, and the deletion test live in `audit/references/architecture-workflow.md` → **Vocabulary — Use Exactly**. Read that section first and use those terms exactly. Do not restate them here.

## When to use which

| Signal | Mode |
|--------|------|
| "quick look", "any structural smells?", scoped to a diff or one module | `/review --architecture` (this file) |
| "full architecture audit", whole subsystem, want the visual report, want to decide and act | `/audit --architecture` |

## Process

1. **Scope.** User-named module or subsystem wins. Otherwise scope to the working diff (`git diff --stat`, then `git log --oneline -30` for hot spots). Never scan the whole repo in this mode.
2. **Read** `CONTEXT.md` (if present) and any ADRs in the touched area.
3. **Read the scoped files directly.** No `Explore` fan-out — that's the audit mode's job.
4. **Apply the deletion test** to anything that looks shallow.
5. **Report inline** — max 3 candidates, markdown only:

```markdown
### {Candidate title}
**Files:** path/a.ts, path/b.ts
**Problem:** {one sentence — what hurts}
**Solution:** {one sentence — what changes}
**Wins:** locality: … · leverage: …
**Strength:** Strong | Worth exploring | Speculative
```

6. **Stop there.** Do not propose interfaces, do not start the grilling loop, do not write files.

## Escalation

If the user wants to act on a candidate:

> "Run `/audit --architecture {module}` — that produces the before/after visual report and grills the chosen candidate to a decision."

That path runs the grilling loop (`prompt-refinement/references/grilling.md`) and persists findings. This mode is deliberately terminal.

## Boundaries

- Line-level defects → `references/code.md`
- New system architecture / ADR authoring → `/plan --arch`
- Applying a refactor → `/cook`, `/fix-deep`
