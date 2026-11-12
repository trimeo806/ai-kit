---
name: pr-evidence
description: Internal step of ai-kit:pr-submit — invoke it only from pr-submit's evidence step, never on a user request. Captures reviewer evidence for what the PR introduces and attaches it as one "Demo & evidence" comment - UI changes get a recorded demo (a GIF per new functionality, one GIF of all, or screenshots — the user picks) from a browser against the locally running app; API changes get a flow diagram of the new behaviour and API test results for the new endpoints and fields. When a user asks for a PR demo, screenshots, API test results or evidence, run ai-kit:pr-submit instead (it reuses an open PR and posts the evidence there).
user-invocable: false
---

# PR evidence — show what the PR does

Internal to `ai-kit:pr-submit`. Called any other way → stop and run `ai-kit:pr-submit` instead;
it reuses the open PR and posts the evidence through this skill.

A reviewer should see the new behaviour before reading the diff. This skill captures it — a demo
for UI, a flow diagram plus API test results for APIs — and attaches it to the PR as **one
comment**, rendered by a script so every PR's evidence reads the same way.

Evidence is **on by default**: only pr-submit's `--no-evidence` turns it off. Capture that looks
costly — a dev server to start, a sign-in, test data, a slow backend — is not a reason to skip:
tell the user what it needs and ask (go ahead · screenshots instead · no evidence), with
AskUserQuestion where available, otherwise in plain chat. `EVIDENCE=none` comes only from step
1's routing or the user's answer; `failed` only after a real attempt.

Evidence **never blocks** a PR. If the app won't start, a capture tool is missing or the upload
is refused, record why, keep what was captured, and carry on.

## Project rules

Already loaded by pr-submit. This skill uses the **Stack** section (which repos/modules are UI,
which are services), **Commands** (how to run the app or service locally), **Testing** (API test
tooling, test accounts and data rules) and **Security & data** (environments that must never be
touched). A fact it needs and the rules lack → ask once and suggest `/ai-kit:setup-rules`.

## Inputs

All handed over by `ai-kit:pr-submit`; never resolve them yourself.

| Input | From |
| :-- | :-- |
| `DIFF_FILE`, `CHANGED_FILES_LIST` | preflight |
| `SOLUTION_FILE` | `solution-doc` PR-body mode (`pr-solution.txt`) — the functionality list |
| `TICKET`, `DOCS_DIR` | pr-submit step 3a |
| `DEMO` | pr-submit's `--demo per-feature\|single\|screenshots\|none`, when given |
| `PR_ID` | only once the PR exists (step 3d); absent → capture and render a preview |

**Functionalities** = the behavioural bullets of `SOLUTION_FILE` (≤ 5), each one a unit of
evidence. No solution file → derive ≤ 5 behavioural bullets from the diff yourself.

**Evidence folder** `EV_DIR`: `DOCS_DIR/evidence/` when `DOCS_DIR` exists, else
`$(git rev-parse --absolute-git-dir)/pr-review/evidence/`. Never inside the repo's worktree — a
GIF must not get committed.

## Step 1 — Route

Classify the changed files with the **Stack** section (UI app vs service), falling back to file
types (components, pages, styles, translation files → UI; route handlers, controllers, DTOs,
schemas, migrations → API).

| Diff hits | Capture |
| :-- | :-- |
| UI files with a user-visible change (pages, components, styles, texts) | **UI demo** — step 2 |
| A new or changed endpoint, field, or flow | **API evidence** — step 3 |
| Both | both, one comment |
| Neither (refactor, config, tests only, build files) | nothing to show: say so and stop — `EVIDENCE=none (no user-visible or API change)` |

A UI change with no visible effect (types, a hook refactor) is not demo material: say which
bullets you skip and why.

## Step 2 — UI demo

**2a — Granularity — the user's choice, never yours.** `DEMO` from pr-submit is that choice made
up front: use it. Otherwise ask once, naming the functionalities, with no option marked
recommended:

- **One GIF per functionality** — a reviewer can jump to the part they care about.
- **One GIF of all functionalities** — a single walkthrough in the bullets' order.
- **Screenshots only** — before/after or key states, for changes a still shows fully.
- **No demo** — skip UI evidence.

With one functionality the two GIF options are the same: offer **GIF**, **Screenshots only**,
**No demo**.

**2b — Capture** with whatever browser automation is available. Follow
`references/fe-capture.md`: start the dev server, open it in the browser, script each
functionality as short steps, record or screenshot, move every file into `EV_DIR` with a
kebab-case name (`01-filter-by-status.gif`).

**2c — Check every capture yourself** before it goes anywhere: it shows the functionality
working (not a spinner, error toast or login page), and it shows **no real personal data,
credentials or tokens**. A bad capture is re-recorded, not posted.

## Step 3 — API evidence

**3a — Flow diagram.** One diagram per new or changed flow a reviewer must understand (≤ 3):
invoke `ai-kit:less-words-more-arrows` scoped to this repo's diff — entry point → service →
persistence / outbound call → response, error branches included. Export a PNG into `EV_DIR`
(`flow-create-order.png`). Not every host renders Mermaid in PR comments, so the evidence is
always the PNG. When `DOCS_DIR/solution.md` already has the flow, redraw it from there and the
diff — same flow, not a second interpretation.

**3b — API test results.** Follow `references/be-api-tests.md`: list the new / changed requests and
fields from the diff, build (or extend) a collection whose tests assert them, run it against the
locally running service, and write `api-tests.tsv` — one row per request:

```
<METHOD path>	<HTTP status>	<passed>/<total>	<what it proves, ≤120 chars>
```

Attach the collection and the run report as `file` items. **Redact first**: no `Authorization`
header, token, cookie, password or env secret in anything attached.

No running service (and the user doesn't want it started) → no rows; say so in the report. Never
fake a row or copy expected values as actual ones.

## Step 4 — Manifest and render

Write `EV_DIR/evidence.tsv`, one line per file, TAB-separated:

```
demo	<EV_DIR>/01-filter-by-status.gif	User filters the order list by status
diagram	<EV_DIR>/flow-create-order.png	Create order: API → service → DB → event
file	<EV_DIR>/api-report.json	API test run report
```

`demo` ≤ 8, `diagram` ≤ 3, `file` ≤ 5, captions ≤ 120 chars in the reviewer's terms. Write paths
with forward slashes. Then preview:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/render_evidence.sh" \
  --manifest "$EV_DIR/evidence.tsv" [--api-tests "$EV_DIR/api-tests.tsv"] --out "$EV_DIR/evidence-comment.md"
```

Without `--base-url` it renders `MODE=manual` (each file named for hand-attaching) — the preview
to show the user. Never hand-edit the rendered file; fix the TSVs and re-render.

## Step 5 — Confirm, upload, post

Uploading and commenting are visible to everyone with access to the repo. **Show the user** the
file list (name, size), the rendered preview and where it goes, and get a yes. Inside
`pr-submit` this rides on the step 3c confirmation; no second question.

**Bitbucket Cloud** — files can go to the repo's Downloads and be linked from the comment:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/pr.sh" upload <every file in evidence.tsv>
bash "${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/render_evidence.sh" --manifest "$EV_DIR/evidence.tsv" \
  [--api-tests "$EV_DIR/api-tests.tsv"] --base-url "$DOWNLOADS_BASE" --prefix "$UPLOAD_PREFIX" \
  --out "$EV_DIR/evidence-comment.md"
bash "${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/pr.sh" comment <PR_ID> --file "$EV_DIR/evidence-comment.md"
```

**GitHub, GitLab, Azure DevOps** (and Bitbucket when `upload` exits 9) — the hosts have no
scripted upload for comment attachments, so post the **manual** render with `pr.sh comment` and
tell the user to edit that comment on the host and drag in the `ATTACH_FILES` from `EV_DIR` (path
as a link). The placeholders show where each file goes.

- No `PR_ID` yet → stop after the preview; `pr-submit` posts it once the PR exists.
- Re-running on a PR that already has an evidence comment: post a new one and say the old one can
  be deleted on the host; don't delete it yourself.

## Report

Return to `pr-submit`:

- `EVIDENCE=` `posted` · `manual` (posted, files to attach by hand) · `preview` (no PR yet) ·
  `none` (nothing to show, or the user chose no evidence) · `failed`, with the reason;
- per functionality: captured as GIF / screenshot / skipped and why;
- diagrams drawn; API tests `passed/total` and failing requests;
- `EV_DIR` as a link, and the comment URL when posted.

Failing API assertions are **evidence, not findings**: report them; `pr-submit`'s review decides
whether they are a blocker.
