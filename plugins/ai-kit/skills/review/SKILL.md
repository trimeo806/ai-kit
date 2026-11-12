---
name: review
description: Code review and security audit of existing code - graded findings with file:line. Modes - local (default; your uncommitted work, branch diff or named files), pr (a PR / merge-request URL on any host; drafts line comments, posts only on your yes), security (OWASP audit of frontend and backend web code), story (post-implementation review of a finished story against its acceptance criteria before the PR), checklist (requirements-quality checklists for a plan's spec.md — unit tests for the spec, before code), converge (spec vs code: every unbuilt or partial spec point becomes a new traced task in tasks.md). Use for "review", "code review", "look over my changes", "check my diff/branch before I commit", "anything blocking?", "review this PR <url>", "draft comments on this PR", "is this safe / secure / exploitable", "OWASP audit", "check auth / JWT / middleware", bugs or N+1 in named files, and XSS, CSRF, injection, CORS, CSP, secrets, IDOR or tenant-isolation worries even without the word "security"; also "post-implementation review of PROJ-123", "checklist the spec", "is the spec ready", "security checklist for this plan", "converge", "what's left of the spec", "does the code match the spec". Not for opening a PR (pr-submit), posting findings you already have (pr-comment), fixing findings, debugging a failing test (debug), writing tests (test) or judging a ticket's wording.
user-invocable: true
argument-hint: "[local [files…] | pr <pr-url> | security [path] [--frontend | --backend | --full] | story [TICKET] [--plan <path>] [--pr-coming] [--pr <url> | --files <paths>] [--focus full|quick|backend|security|fullstack|ux] | checklist [plan-dir] [requirements|ux|a11y|api|security|data|perf…] | converge [plan-dir] [--diff <base>]]"
---

# Review

Arguments this run was invoked with: `$ARGUMENTS`

## Load project rules first

If not already in context, read `.ai-kit/workspace.json` and the `AGENTS.md` chain (workspace root
down to the reviewed repo), per `${CLAUDE_PLUGIN_ROOT}/references/project-rules-contract.md`. Stack,
Conventions, Architecture & boundaries, Testing, Security & data and Do / Don't are the most specific
rules a review cites; `vcs` and `tracker` drive pr and story mode. A fact a mode needs is missing →
ask once and suggest saving it with `/ai-kit:setup-rules`. Static review by default: run no tests and
no build unless the user asks.

## Pick the mode

| Mode | When | Reference |
| :-- | :-- | :-- |
| **local** (default) | no PR URL and no security or story ask: your working tree, your branch, or files you name | `references/local-mode.md` |
| **pr** | `pr <url>`, or the arguments or request contain a PR / merge-request link | `references/pr-mode.md` |
| **security** | `security …`, or the request is a security review / audit / "is this secure" / OWASP check | `references/security-mode.md` |
| **story** | `story …`; "review the story", "post-implementation review", "review PROJ-123 implementation"; `/ai-kit:story` stage 3 | `references/story-mode.md` |
| **checklist** | `checklist …`; "checklist the spec", "is the spec ready", "<domain> checklist for this plan". Reviews `spec.md`, not code — before implementation | `references/checklist-mode.md` |
| **converge** | `converge …`; "what's left of the spec", "does the code match the spec", after a spec change or drift. Spec vs code; appends gap tasks to `tasks.md` on a yes | `references/converge-mode.md` |

Read the mode's reference and follow it. All modes use the same rules, the same `ai-kit:code-reviewer`
agent and the same report shape; they differ in what is reviewed and where the result goes. A PR
URL plus a security ask → pr mode, with the security lens on every changed file. `story --pr <url>`
is story mode's full pass set over that PR; a bare PR URL stays pr mode.

## The rules every mode applies

Read them from this plugin. Never review from memory.

| Rules | File | Applies |
| :-- | :-- | :-- |
| Project rules | the `AGENTS.md` chain of the reviewed repo, and any review guide it names | always, first |
| Review checklist | `${CLAUDE_PLUGIN_ROOT}/references/shared/code-review-guidelines.md` | § 1, § 2, § 5 and Security always; § 3 for backend and data-access code; § 4 for UI code |
| Language lens | `references/language-lens.md` | the section for each language in scope |
| Severity guide | `${CLAUDE_PLUGIN_ROOT}/references/shared/severity-guide.md` | grades every finding: `security` · `blocking` · `should-fix` · `nit` |
| Code-review standards | `references/code-review-standards.md` | SEC / PERF / TS / LOGIC / DEAD / ARCH / STATE rule IDs |
| Security lens | `references/security-frontend.md`, `references/security-backend.md` | always in security mode; in local and pr mode, and story mode's pass 4, for security-sensitive files (auth, sessions/tokens, input handling, DB queries, API routes, templates rendering user data, config/secrets). Findings carry OWASP + confidence |
| Review checklist, common issues | `references/review-checklist.md`, `references/common-issues.md` | the reviewer's walk through context → structure → details → tests |
| Spec compliance | `references/spec-compliance-review.md` | when a plan, ticket or acceptance criteria exist |
| Plan boundaries | the plan's `## Boundaries` + the spec's `OOS-*` (paste them) | when a plan has them. A changed file outside the Change surface is `should-fix`. A change inside Do not touch, or code implementing an `OOS-*`, is `blocking` |
| Feedback style | `references/feedback-examples.md` | wording of every finding and PR comment |
| Report | `references/report-template.md` | the final report, every mode |
| Lenses by file type | `references/a11y.md`, `references/ui-mode.md` | web UI files: a11y and UI checks folded into the same pass |

**Precedence.** The repo's project rules (and any `CODE_REVIEW.md` or review guide they name) are read
first and cited. The checklist and standards fill the gaps. Where they disagree, the project rule wins.

**Subagents can't resolve `${CLAUDE_PLUGIN_ROOT}` or `references/…`.** Read the files here and paste
the sections that apply into each `ai-kit:code-reviewer` prompt. Give a reviewer subagent the code, the
diff range, the spec and its question, never the implementation narrative (why a shape was chosen,
what was tried first): that rebuilds the author's bias the subagent exists to escape.

> **Codex:** there are no named role agents — spawn a subagent briefed with `${CLAUDE_PLUGIN_ROOT}/agents/<agent>.md` (`code-reviewer`, `secure-code-review`, `debugger`), or do the step inline. Without AskUserQuestion, ask in plain chat.

## Hard rules

- Checklist mode writes only `checklists/<domain>.md` and never marks an item `[x]`. Converge mode
  writes only an appended task block in `tasks.md` and Plan-gap log rows, after a yes. Neither
  edits code or `spec.md`.
- The review never edits code without a yes (local mode's fix step), and never pushes, merges or
  checks out a branch. Security mode never edits code at all, and never writes working exploit code.
- PR comments are never posted without the user's yes on the shown drafts. The PR is never approved
  or declined from here; that stays a human's click.
- A finding names `file:line`, what breaks and when, and the rule. Grade with the severity guide,
  never by feel.
- A pass that didn't run is reported as skipped, unavailable or failed, never as clean.
