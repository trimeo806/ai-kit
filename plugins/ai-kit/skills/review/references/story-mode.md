# Story mode — post-implementation review of a finished story

The review stage of `/ai-kit:story`, and the standalone "review the story before its PR" pass. Once a
story's implementation is done, it:
- runs the project-rules, correctness, security, simplification, testing, a11y, readiness and i18n
  passes over the change;
- checks the acceptance criteria and the plan's test cases;
- reports one deduplicated, graded set of findings with a verdict;
- writes the hand-off that `/ai-kit:pr-submit` reuses.

It produces findings; it does not fix, and it never pushes, merges or checks out a branch.

## Ground rules

- **Project rules first.** Load `.ai-kit/workspace.json` and the target repo's `AGENTS.md` chain if
  not already in context. Conventions, Architecture & boundaries, Testing, Security & data and Do /
  Don't are the most specific citations this review has.
- **Order.** No pass shrinks the diff for the next, so order exists only where a pass consumes an
  earlier one's output, or filters against its citations.
- **Cost.** Three passes read the whole diff and reason about it: 3 (correctness), 4 (security) and
  5 (over-complexity). Keep them separate: one prompt holding two questions lets correctness crowd
  out simplification, and a security read asks what an attacker can reach, which correctness
  reasoning never arrives at. Before adding a fourth reasoning read, fold it into 3, 4 or 5.
- **Fresh eyes.** Passes 3 and 5 run in their own `ai-kit:code-reviewer` subagents, so the session
  that wrote the code doesn't grade it. Give each:
  - the repo path, the diff range, the changed-file list and that pass's question;
  - the acceptance criteria, for pass 3 (rarely pass 5);
  - **never the implementation narrative** — why a shape was chosen, what was tried first, which
    comment prompted a rewrite. It rebuilds the bias the subagent exists to escape.
- **Paste content, not paths.** A subagent runs in the product repo and can't resolve
  `${CLAUDE_PLUGIN_ROOT}` or `references/…`. Read the file here and paste what applies.
- **Findings shape.** Ask every subagent for one finding per line:
  `<proposed severity> · <file:line or -> · <what is wrong and when it bites> · <rule, convention or concrete failure> · <fix>`.
  The severity is a proposal; step 6 settles it after the pass-5 filter. Anything ambiguous comes
  back as a finding with the ambiguity named: the subagent can't ask.
- **Dispatch work, not decisions.** The plan gate, the citation filter and the grading stay in this
  session. Passes 3 and 5 can be dispatched together; pass 5 wants pass 1's hotspot list first when
  a static analyser ran.
- **Invoke other skills by name; never copy their rules.** One that doesn't resolve is
  `unavailable`, never an error.

## Targets

| Target | Asked as | Diff |
| :-- | :-- | :-- |
| **Branch** (default) | `story`, `story PROJ-123`, "review the story", "post-implementation review" | `<merge-base>...HEAD`, step 1 |
| **PR** | `story --pr <url>` | the PR's diff, per `pr-mode.md` steps 1–2 |
| **Files** | `story --files <paths>` | none: whole files. Passes 0, 1 and 9 don't apply; step 5 only if a ticket is named |

## Inputs from the caller

`/ai-kit:story` (stage 3) or the user may hand in, as arguments or in words:
- **the ticket key** (`PROJ-123`), else from the branch name via `tracker.keyPattern`, else ask in step 5;
- **the plan file and its `## Acceptance criteria` section** (`--plan <path>`): use it as given in
  step 5 instead of searching;
- **"a PR is coming"** (`--pr-coming`): turns on the step-6 hand-off. `/ai-kit:story` always says it,
  because stage 4 follows;
- **the areas fixes touched**, on a re-review: the plan narrows to them.

## `--focus`

Default `full`. Every other value **only narrows** the step-3 plan; the user can still add passes
back, and step 6 says which passes a narrowed run left out.

| Focus | Passes | Use for |
| :-- | :-- | :-- |
| `full` | all that apply (step 4) | finished story, PR review before approving |
| `quick` | 0, 3 | fast correctness read while implementing |
| `backend` | 0, 2, 3 with the language lens for the backend stack, 8 | a service, API or data-layer change |
| `security` | 4 only, with every security skill that resolves | auth / input / secrets changes |
| `fullstack` | 2, 3 per platform plus a contract pass, 4 | a diff whose backend and web sides call each other |
| `ux` | 7 | new screens, copy, visual standards |

## Who owns each pass

| Pass | First choice | Fallbacks, in order |
| :-- | :-- | :-- |
| 2 project rules | the review guide or review skill the project rules name | the `AGENTS.md` sections, checked inline |
| 3 correctness | a `code-review` skill in an `ai-kit:code-reviewer` subagent | the agent with `local-mode.md`'s prompt → inline |
| 3 language lens | `references/language-lens.md`, the section for each language in the diff | — |
| 3 cross-platform | platform-scoped pass-3 subagents plus one contract pass (request/response shapes, errors, auth) | — |
| 4 security | the security lens (`security-mode.md` checklists), then `/security-review` and the `ai-kit:secure-code-review` agent | inline from the security-sensitive bucket |
| 7 UX | a UX / design-review skill if installed | `references/a11y.md` + `references/ui-mode.md` inline |

## PR target: what changes

The same passes run over the PR's diff; four things differ:
- **Strictly read-only on git and the remote**, as in `pr-mode.md`: never check out, merge into,
  push or reset the author's branch.
- **The diff comes from the PR** (step 1).
- **No hand-off** (step 6): no submit run will reuse it.
- **Step 7 runs**: findings are drafted as inline comments and posted only after a yes.

## Step 1 — Establish the diff

Run git inside the repo that owns the change (`git -C <repo>` from a workspace root that isn't a repo).

**PR.** Follow `pr-mode.md` steps 1–2. Use `$mb...<SOURCE_COMMIT>` wherever this file says
`<merge-base>...HEAD`, read files with `git show <SOURCE_COMMIT>:<path>` and tell subagents the
same. A PR that isn't open: say so and ask whether to review it anyway, without step 7. Ticket key
from the branch or title.

**Files.** The named files, read whole at `HEAD`, plus what they import that a pass needs. Classify
them in step 2 as if changed.

**Branch.** Read-only.
1. Resolve the base the way `/ai-kit:pr-submit` will: `vcs.defaultBranch` in `workspace.json` →
   the Git & PR section → `origin/HEAD` → `main` → `master`. If several exist and nothing names a
   default, ask.
2. **Record the base you used.** Different bases give different diff shas over identical code, and
   the hand-off then silently buys nothing.
3. `git merge-base HEAD origin/<base>`; the changed files from `git diff --name-only
   <merge-base>...HEAD`, the size from `--stat`.

## Step 2 — Classify what changed

A file can land in several buckets.

- **Per language** — one bucket per language in the diff (`.ts/.tsx/.js/.jsx`, `.java/.kt`, `.py`,
  `.go`, `.cs`, …), plus its build manifest (`package.json`, `pom.xml`, `go.mod`, `pyproject.toml`)
- **UI** — files with markup (JSX/TSX, templates), page/component directories, style files
- **Infra / release** — Kubernetes manifests and overlays, Helm charts, Dockerfiles, CI configs,
  Terraform, DB migrations, feature-flag definitions, encrypted secret files
- **Security-sensitive** — auth or session handling, tenant/permission checks, file upload or
  download, request parsing and validation, crypto, outbound HTTP, query construction
- **i18n bundles** — locale message files (`messages/*.json`, `locales/**`, `*.properties`, `.po`)
- **Tests** — whether the change adds or modifies test files at all

## Step 3 — Propose the plan

Start from the passes `--focus` allows and show a table, one row per pass:

| Pass | Skill (or `unavailable`) | Applies? | Triggered by | Cost | Subagent? |

- **Cost** lets the user prune before a ten-pass run: most passes are one reasoning read of the
  diff; a static analyser is cheap; anything that builds is expensive and runs only on an explicit yes.
- **Declare every side effect**: the hand-off writes to the git dir; nothing else writes.
- **Mark the subagent passes**, so the split is approved, not discovered mid-run.

Then wait for confirmation. Accept "skip X" and "add Y". A re-review after fixes (step 6) narrows
the plan to the areas the fixes touched.

## Step 4 — Run the passes

Passes 0–5 are the code-quality chain and deduplicate against each other; 6–9 are separate axes in
any order.

Passes from outside this plugin may not exist. An absent pass is expected: mark it `unavailable`
in the plan and again in step 6. **Record every pass that doesn't run**: skipped by the plan,
unavailable (missing skill, missing login, a tool error), or returned nothing. Never fill the gap
with what it would probably have said. An invented clean bill is worse than an admitted hole.

0. **Doc and comment hygiene** — first, straight from the diff, because stale or narrating comments
   mislead every pass after it. The repo's comment policy is the primary control; this is the net.
   - `git diff <merge-base>...HEAD | grep -E '^\+\s*(//|/\*|\*|#)'`: does an added comment restate
     the line below, narrate steps, or describe an earlier iteration? Flag it for deletion. Keep the
     *why* comments: workarounds and their reason, non-obvious invariants, deliberate deviations.
   - Added doc comments (`/**`, `///`, `"""` docstrings): flag for deletion unless project rules
     require them; names and types carry it.
   - `git diff <merge-base>...HEAD | grep -E '^\+.*\b((US[0-9]+-)?AC-?[0-9]+|[ST][0-9]+-AC[0-9]+|FR-(U-)?[0-9]+|EC-[0-9]+|SC-[0-9]+|RISK-[0-9]+)\b'`
     plus the tracker's `keyPattern`, on code and test files: a plan, spec or ticket ID in code, a
     comment, a test name or a log message. Flag it; the test or code is renamed by behavior, the
     mapping stays in the tracker.
   - `git status --porcelain` and the changed files: flag any `.md` that is a plan, summary, notes or
     hand-off file rather than project documentation.
   - **Expected, not findings** — the review's own working materials:
     - `<docsDir>/<TICKET-KEY>/plan.md`, `solution.md`, `tracker.md` and `reports/`;
     - `<TICKET-KEY>.md` at the repo root (the older plan location, normally in `.git/info/exclude`).
   - Existing docs touched by the change: still accurate? Don't expand them; a doc that grew without
     the change requiring it is a finding.

1. **Static analysis** (if the Commands section or the session offers one: complexity, dead code,
   unused exports, duplication, circular dependencies, boundary violations). Its hotspot list is
   pass 5's target.

2. **Project rules.** The review guide or skill the project rules name, else the Conventions,
   Architecture & boundaries, Testing and Do / Don't sections checked against the diff by
   `code-review-guidelines.md` § 5. **Keep its rule citations**: passes 3 and 5 are filtered against
   them.

3. **Correctness — always.** A rules checklist catches the bugs the team already had; it can't catch
   the new one.
   - Run `local-mode.md` steps 3 and 5 on the diff: list the edge cases, then verify them in
     `ai-kit:code-reviewer` subagents — error handling, edge cases, off-by-one and boundaries,
     performance, N+1.
   - **Paste the checklist** from `code-review-guidelines.md`: § 1, § 2 and Security always; § 3
     for backend and data-access code; § 4 for UI code; and the `references/language-lens.md`
     section for each language bucket.
   - Backend and web files that call each other → platform-scoped passes plus a contract pass.
   - Pass 3 gets the acceptance criteria; it never gets the implementation narrative.
   - **No security lens here**: pass 4 owns security.
   - A rule cited by pass 2 wins over a checklist item that says the opposite.
   - **Stay on correctness.** Over-complexity is pass 5's; raising it here blurs both.
   - **No acceptable skipped state.** If no code-review skill resolves, run it inline from the diff
     and say so in the status table.

4. **Security.**
   - **This skill's security lens** first, when the security-sensitive bucket hit:
     `security-mode.md`'s checklists (`security-frontend.md`, `security-backend.md`) pasted into a
     `code-reviewer` subagent over those files.
   - **`/security-review`** when that bucket hit. Pass 2 checks that the right helpers are called;
     it doesn't ask whether the check is *correct*. A wrong tenant id inside a correct auth wrapper
     passes every convention.
   - **The `ai-kit:secure-code-review` agent whenever a code bucket hit**. Aim it at the
     security-sensitive bucket when there is one, else the whole diff. Locale bundles, docs or
     overlays alone aren't code.
   - Deduplicate. On a shared finding keep the most specific citation (CWE/CVSS mapping) and note
     every pass that raised it.

5. **Simplify** — last in the chain, in its own subagent (the `simplify` skill where available).
   Aim it at pass 1's hotspots; with none, run it over the full diff. **Drop any of its findings that
   contradicts a pass-2 citation**: it doesn't know the project rules and will collapse mandated
   structure. The filter stays in this session, where the citations are.

6. **Test coverage** — are the new edge cases and every acceptance-criterion branch tested? Test
   conventions (location, naming, mocking) are pass 2's via the Testing section; don't repeat them.

7. **Accessibility and UX copy** — when the UI bucket hit. Aim at new screens, error messages, empty
   states and CTA wording. A UX / accessibility review skill if installed; otherwise check against
   `references/a11y.md` (labels and roles, focus order, contrast, an error message per failure
   state) and `references/ui-mode.md`, and mark the pass inline.

8. **Deploy readiness** — when the infra/release bucket hit: migrations (backward compatible,
   re-runnable, follow the repo's migration rules), feature flags, config or secret values per
   environment, rollback trigger.

9. **i18n consistency** — when the i18n bucket hit: every key added in one locale exists in all of
   them, no key deleted that a screen still uses, and the project's translation workflow (Conventions
   section) was followed rather than keys hand-added. If the project syncs translations from an
   external source, a key edited on both sides is a conflict the sync will revert.

## Step 5 — Acceptance criteria and test cases

No skill covers this; do it here.

**Read the criteria from the plan, not the ticket.** The plan's numbered list is what every stage
quoted; re-deriving from the ticket is how a misread criterion survives. Use the plan the caller
handed in; otherwise look, in order, for:
1. `<docsDir>/<TICKET-KEY>/plan.md` (the ticket folder may sit above the repo);
2. `<repo-root>/<TICKET-KEY>.md`;
3. `<docsDir>/<TICKET-KEY>/tracker.md` from `/ai-kit:tdd-dev-workflow`.

Use its `## Acceptance criteria` section. With no plan, read the ticket, and ask for the key if none
was given.

- Map each criterion to code and tests in the diff, per `spec-compliance-review.md`: ✅ met at
  `file:line`, or ❌ expected X, found Y. List any with no implementation or no test.
- **Cross-check `## Test cases` against the criteria** when the plan has it. A case for behaviour no
  criterion covers, or a criterion no case exercises, means one side moved without the other.
- Self-check only: never produce a cross-test page; a teammate owns that.

## Step 6 — Consolidate, grade, verdict

Report in the session (`report-template.md`). The review writes no document; the only files a run
can leave are the hand-off below.

1. **Open with the pass-status table** from the plan: ran, skipped (reason), unavailable, or failed
   (what broke). Without it an errored pass reads like a clean one.
2. **Caller findings** (e.g. pr-submit's own) are already raised: drop your duplicates and keep them
   out of the drafts.
3. **Deduplicate.** Passes 1–5 overlap by design. Report each issue once with its most specific
   citation (a project-rules section beats a generic description) and the passes that raised it;
   agreement across passes is signal. Drop any simplify finding that contradicts a cited rule.
4. **Grade** every finding with `${CLAUDE_PLUGIN_ROOT}/references/shared/severity-guide.md`, the same
   guide pr-submit uses, so a finding keeps its severity on reuse. Its story-level table covers
   missing criteria, i18n conflicts, plan/test-case drift and scratch files.
5. **A narrowed `--focus`** names the passes it left out.
6. **Verdict** — one line, first reason named:

| Verdict | When | Next |
| :-- | :-- | :-- |
| **Ready for PR** | no `security` / `blocking`; every criterion met | `/ai-kit:pr-submit` (it reuses the hand-off) |
| **Fix, then re-review** | `security` / `blocking` findings, or an untested criterion the user won't accept | fix, then `/ai-kit:review story` again |
| **Back to implement** | a criterion is unimplemented or misread, or a finding invalidates the plan | `/ai-kit:tdd-dev-workflow` on the plan; `/ai-kit:plan` if the plan itself is wrong |

End by asking which findings to fix. Fixes go through `/ai-kit:tdd-dev-workflow` (or `local-mode.md`
step 7 for a small list), never silently from here.

**Fixing changes the reviewed diff.** Re-run `/ai-kit:review story`, naming the areas the fixes
touched, so the plan narrows itself. The re-run rewrites `handoff.env` over the fixed diff; until
then that file describes pre-fix code, and a resume should read it as "back to review", not "on to PR".

### Hand-off to `/ai-kit:pr-submit`

When a PR is coming from this branch (`--pr-coming`, the caller or the user said so), hand
pr-submit what you have so it doesn't review twice. **Skip this on a PR target or when no PR is in
prospect**; when unsure on a standalone run, ask.

`findings.tsv` — one finding per line, three TAB-separated fields:

```
<severity>	<file:line>	<one sentence, max 140 chars>
```

Severity is the step-6 grade (`security`, `blocking`, `should-fix`, `nit`). `-` is the location for
a finding about the change as a whole. An empty file is a valid, complete review.

It lives inside the git dir, never the worktree, so it never shows in `git status`. The PR may go up
days later in another session, so everything that proves the findings still describe this diff
lands on disk beside them. Set `repo` to the repo that owns the change, `base` to the branch step 1
recorded, without `origin/`, and `source` to the project-rules review skill used, or `bundled
passes`. Write `findings.tsv` completely first, then `handoff.env` in one block:

```bash
d="$(git -C "$repo" rev-parse --absolute-git-dir)/story-review"
mkdir -p "$d"
{
  echo "SCHEMA=1"
  echo "BASE_BRANCH=$base"
  echo "MERGE_BASE=$(git -C "$repo" merge-base HEAD "origin/$base")"
  echo "HEAD_SHA=$(git -C "$repo" rev-parse HEAD)"
  echo "DIFF_SHA=$(git -C "$repo" diff --merge-base "origin/$base" HEAD | git -C "$repo" hash-object --stdin)"
  echo "REVIEWED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "REVIEW_SOURCE=$source"
} > "$d/handoff.env"
```

- **`handoff.env` last** is the contract: its presence proves the review finished, so an empty
  `findings.tsv` means "found nothing", not "stopped halfway".
- **`DIFF_SHA`** is the safety condition: pr-submit reuses the findings only when its own sha
  matches, since its preflight can merge the target and move the diff.
- **`BASE_BRANCH`** makes a base mismatch one sentence naming both branches instead of a silently
  lost reuse.
- **`MERGE_BASE` / `HEAD_SHA`** say which side moved when the shas differ.
- **`REVIEWED_AT` / `REVIEW_SOURCE`** are reporting only. `SCHEMA` stays `1`.

Print the directory and the `DIFF_SHA` in the session too. The directory name `story-review/` is
the contract pr-submit and the story workflow read; keep it.

## Step 7 — Comment on the PR

Runs on a PR target, and on a branch whose open PR the user wants the findings on. Otherwise skip.

Follow `pr-mode.md` steps 5–7 with the step-6 findings: drafts per
`${CLAUDE_PLUGIN_ROOT}/references/shared/inline-comments.md` (one comment per finding per place,
anchored on a changed line, `**[label]** Change: … Why: …`, the rest in `general`), with `commit`
set to the PR's source commit; validate; show the table; **post only on a yes**, own PR or not.
These carry the fix; `findings.tsv` doesn't — both come from the same findings. The approve or
request-changes verdict on the host stays the reviewer's click.
