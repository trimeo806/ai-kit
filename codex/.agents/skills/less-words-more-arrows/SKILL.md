---
name: less-words-more-arrows
description: Render a Mermaid sequence/flow/class/state diagram — ASCII in a Claude Code terminal session, a real rendered image sent inline in Claude Code desktop (Code tab), or a hand-drawn Excalidraw scene (.excalidraw file + PNG preview) on request. Use when user asks to "draw a sequence diagram", "show a diagram", "ascii diagram", "excalidraw", "hand-drawn", "sketch diagram", "how it works diagram", "call tree", "system design diagram", "whiteboard diagram", "dark theme diagram", "redraw this diagram image", "edit the diagram", "open diagram in browser", "architecture flow", "communication diagram", "numbered flow", or wants a Mermaid diagram visualized. Also use proactively (without being asked for a diagram by name) whenever explaining a call chain, request/response flow, code execution flow, multi-step architecture interaction, or "what calls what" during code review, debugging, or architecture explanation — visualize the flow via this skill instead of prose only.
---

# Less Words, More Arrows

Renders Mermaid diagrams and JSON diagram specs. Output format depends on where the session is running —
check environment FIRST, before picking a render path.

## 0. Environment detection (always do this first)

- If the user asks for **Excalidraw / hand-drawn / sketch** style (or an editable
  `.excalidraw` file) → **Excalidraw mode** (§3), in either environment.

- If the system prompt / environment reminders say the session is running inside
  **"the Claude desktop app (Code tab)"** → **desktop mode** (§2, image render).
- Otherwise (plain Claude Code CLI/terminal session, no such reminder) → **terminal
  mode** (§1, ASCII render).
- If genuinely ambiguous, prefer terminal mode (ASCII) — it is the cheaper, safer default.

## 1. Terminal mode — ASCII render

Uses the `mermaid-ascii` Go CLI (github.com/AlexanderGrooff/mermaid-ascii — same
renderer Oh My Pi vendors for its TUI).

**Prerequisite:** binary `mermaid-ascii` on PATH (`go install
github.com/AlexanderGrooff/mermaid-ascii@latest` if missing, then retry).

Steps:
1. Write the Mermaid source (sequenceDiagram / graph / classDiagram / stateDiagram)
   to a temp file in the scratchpad dir, e.g. `diagram.mmd`.
2. Run: `mermaid-ascii -f <path-to-diagram.mmd>`
   - Add `--max-width auto` if the diagram is wide and risks wrapping.
   - Add `-a` for plain ASCII (no Unicode box-drawing) if terminal charset is limited.
3. Paste raw stdout verbatim into the chat reply inside a fenced code block (no
   language tag, so box-drawing characters render unmodified).
4. Do not save the rendered ASCII to a file unless asked — it belongs in the reply.

If `mermaid-ascii` errors on the input, check the first line matches an expected
Mermaid diagram declaration (`sequenceDiagram`, `graph TD`, `classDiagram`, etc.) —
this tool's parser is stricter than the full Mermaid.js grammar.

## 2. Desktop mode — real image render

The Code tab chat pane has no live Mermaid parser and defaults to a dark panel
background — a transparent-background export renders with default dark Mermaid
text on a dark pane and is unreadable. Do not just dump the raw ASCII output here
as a substitute; render an actual image.

Steps:
1. Write the Mermaid source to `<scratchpad>/diagram.mmd`.
2. Check `mmdc --version`. If not found: `npm install -g @mermaid-js/mermaid-cli`
   (global install, one-time per machine).
3. Render with an explicit opaque light background — this is the part that matters:
   ```bash
   mmdc -i diagram.mmd -o diagram.png -w 2048 --backgroundColor white --theme neutral
   ```
   `--backgroundColor white` is required — without it the export is transparent and
   disappears against the pane's dark theme.
4. If `mmdc` install/render fails (no network for npm, etc.), fall back to Kroki:
   ```bash
   curl -s -X POST -H "Content-Type: text/plain" --data-binary @diagram.mmd \
     https://kroki.io/mermaid/png -o diagram.png -w "%{http_code}"
   ```
   Kroki's public instance is flaky (intermittent 500s unrelated to diagram syntax)
   — retry up to 5x with a short sleep before giving up. Kroki output is also
   transparent-background; if it's the only path available, mention to the user
   that legibility on dark panels isn't guaranteed.
5. Send the PNG with the SendUserFile tool, `display: "render"`, so it shows inline
   in the side panel — do not use the Artifact tool for this (that publishes to
   claude.ai with a URL, which is a different, heavier deliverable).

## 3. Excalidraw mode — hand-drawn, editable

Rendered as native Excalidraw elements (shapes, arrows, text — not an embedded image)
in the headless Chromium that ships with `mmdc` (§2 prerequisite). Libraries load
from esm.sh (pinned), so network access is required.

### Pick the preset from what the picture must show

| User wants / you are explaining | Preset | Input |
|---|---|---|
| Call chain across services / request-response, ordered in time, with `alt`/`loop`, returns, notes | `sequence` (default) | `sequenceDiagram` `.mmd` |
| Call path inside the code: class.method nesting with file:line, service hops, async boundaries | `calltree` | `.calltree.txt` — format below |
| "How it works" overview: people → apps → services → stores, step numbers ①②③, call table | `flow` | `.flow.json` — read `references/flow-preset.md` |
| System design / whiteboard / interview style; containers (A ⊃ B), circles, dashed externals, schema/note text blocks, curved arrows; reproducing a reference image; any dark-theme request | `whiteboard` | `.wb.json` — read `references/whiteboard-preset.md` |
| `flowchart` / `classDiagram` / `stateDiagram` | `mermaid` | `.mmd` |

Explaining one feature end to end often reads best as two pictures: `sequence` for the
service hops, `calltree` for the code path inside them. Use `flow` instead of `sequence`
only when components must sit in 2-D (fan-out, results returning elsewhere, stores below).

`sequence` header shapes come from participant names: `actor` → person; names with
db/database/postgres/alloydb/mongo/sql → cylinder; topic/queue/kafka/pubsub/stream/bus →
topic icon; everything else → coloured box. `-->>` = dashed return (closes the callee's
activation bar), `-)` = async (triangle head).

`calltree` input — first line `calltree: <title>`, then one call per line, 2 spaces per
nesting level, fields split by `|`: `service | Class.method | path/File.java:line | note`.
Leave `service` empty to inherit the parent's; a different service marks a hop (bold
arrow + `→ service` tag); a note starting with `async`/`pubsub`/`queue`/`event` makes the
connector dashed. Keep it to the calls that matter (≤ ~15 rows).

Component kinds (`flow` `kind`, `whiteboard` `shape`): `service`, `database`, `queue`,
`topic`, `stream`, `cache`, `bucket` (object storage), `function` (serverless),
`window`, `mobile`, `person`, `cloud` (3rd-party / internet), `clock` (scheduler),
`box`, `text` — pick the kind that matches the role, never `database` for a topic or queue.

Auto-detect: `sequenceDiagram` → `sequence`; first line `calltree` → `calltree`; JSON →
its `"preset"` field (default `flow`); other Mermaid → `mermaid`. `mermaid` output stays
light-themed. Unsupported Mermaid types fall back to one embedded image
(`imageFallback: true`) — tell the user, offer §1/§2.

**Theme and font** apply to every preset except `mermaid`: spec fields `"theme"`
(`light` | `dark`) and `"font"` (`hand` | `code` | `sans`), or CLI `--theme` / `--font`
(CLI wins). Match the user's reference image: dark background → `dark`; monospace /
code-looking text → `code`.

### Steps

1. Write the source to `<scratchpad>/<name>.mmd | .calltree.txt | .flow.json | .wb.json`.
2. Run:
   ```bash
   node <skill-dir>/scripts/mmd-to-excalidraw.mjs <scratchpad>/<name>.wb.json
   ```
   `<skill-dir>` = folder containing this SKILL.md (`~/.claude/skills/less-words-more-arrows`).
   Options: `[outBase]`, `--preset auto|sequence|calltree|flow|whiteboard|mermaid`, `--theme`, `--font`,
   `--title "…"`, `--no-png`, `--no-calls` (flow), `--scale N` (default 2).
   Writes `<name>.excalidraw` + `<name>.png` (theme background) and prints JSON with
   preset, theme, paths, element counts.
3. `Read` the PNG. Fix overlaps (nudge positions / bends / label offsets per the preset
   reference) and re-render — usually 1–2 passes.
4. Deliver:
   - **Desktop mode:** `SendUserFile` the PNG with `display: "render"`, and the
     `.excalidraw` with `display: "attach"` (excalidraw.com → File → Open, or the VS Code
     Excalidraw extension).
   - **Terminal mode:** print both file paths.
   - Keep in the project only if asked (e.g. `docs/diagrams/`).
5. When the user wants to edit (or "open it in the browser"): see **Edit in place** below.

### Edit in place (Excalidraw or Mermaid)

`scripts/open-diagram-editor.mjs <file.excalidraw|file.mmd> [--port 5199] [--open]` serves a
local editor on `127.0.0.1` for that one file:
- `.excalidraw` → full Excalidraw editor; Ctrl+S writes the `.excalidraw` and re-exports the `.png`.
- `.mmd` → source on the left, live Mermaid preview on the right; Ctrl+S writes the `.mmd`.
- Two-way: when you change the file on disk, the page reloads it within ~2 s (unless the user
  has unsaved edits). After the user saves, `Read` the file before changing it further.

Claude desktop: add an entry to `<cwd>/.claude/launch.json`
(`"runtimeExecutable": "node"`, `"runtimeArgs": ["<skill-dir>/scripts/open-diagram-editor.mjs",
"<abs file>", "--port", "<port>"]`, `"port": <port>`), then `preview_start` it by name — the
editor opens in the Browser pane. Use a different port per file.
Real browser: run it in the background with `--open` (opens the default browser), or give
the user the printed URL. Stop the server when editing is done.

An Excalidraw connector with `create_view` can also stream a diagram inline, but in the
Code tab it is view-only.

Do not hand-write Excalidraw JSON or a separate render script to get a style — every
style above is a spec field; if one is truly missing, say so and extend the preset.

Known limits: `mermaid` labels sit on the line; `alt/else` labels after the
first may be dropped.

## When to auto-trigger (no explicit "diagram" ask needed)

Visualize as a diagram, don't just describe in prose, when the task is:
- Explaining a call chain ("what calls X", "trace this request")
- Explaining code execution flow / control flow across functions or services
- Architecture/design explanation involving 2+ components interacting
- Code review commentary describing how a change alters an interaction flow
- Any "how does X flow through the system" question

Skip auto-trigger for single-function, single-file, or no-interaction explanations.
