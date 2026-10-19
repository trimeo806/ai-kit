---
name: sequence-diagram
description: Render a Mermaid sequence/flow/class/state diagram — ASCII in a OpenCode terminal session, a real rendered image sent inline in OpenCode desktop (Code tab), or a hand-drawn Excalidraw scene (.excalidraw file + PNG preview) on request. Use when user asks to "draw a sequence diagram", "show a diagram", "ascii diagram", "excalidraw", "hand-drawn", "sketch diagram", "how it works diagram", "architecture flow", "communication diagram", "numbered flow", or wants a Mermaid diagram visualized. Also use proactively (without being asked for a diagram by name) whenever explaining a call chain, request/response flow, code execution flow, multi-step architecture interaction, or "what calls what" during code review, debugging, or architecture explanation — visualize the flow via this skill instead of prose only.
version: 0.1.0
---

# Sequence Diagram

Renders Mermaid diagrams. Output format depends on where the session is running —
check environment FIRST, before picking a render path.

## 0. Environment detection (always do this first)

- If the user asks for **Excalidraw / hand-drawn / sketch** style (or an editable
  `.excalidraw` file) → **Excalidraw mode** (§3), in either environment.

- If the system prompt / environment reminders say the session is running inside
  **"the Claude desktop app (Code tab)"** → **desktop mode** (§2, image render).
- Otherwise (plain OpenCode CLI/terminal session, no such reminder) → **terminal
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

Same Mermaid source, rendered as native Excalidraw elements (shapes, arrows, text —
not an embedded image) in the headless Chromium that ships with `mmdc` (§2
prerequisite). Libraries load from esm.sh (pinned versions), so network access is
required.

Layouts (`--layout`, default `auto`):
- **`arch`** (auto for `sequenceDiagram`) — whiteboard architecture view, NOT a UML
  sequence diagram. Participants become colored component boxes in one row (actors
  → ellipse, names like db/redis/queue/kafka → cylinder). Each message becomes an
  arrow with a numbered badge (1, 2, 3… in call order): calls route above the row
  (solid), returns below (dashed), each on its own lane so labels never collide.
  `alt/else/opt/loop` conditions are prefixed to the label (`[stock ok] 201 Created`);
  `Note` lines are collected into a yellow note box. Add `--title "…"` for a heading.
- **`mermaid`** (auto for everything else) — `@excalidraw/mermaid-to-excalidraw`
  conversion. Use for `flowchart`/`graph`/`classDiagram`, or pass `--layout mermaid`
  on a sequence diagram only when the user explicitly wants UML lifelines.
  Unsupported types fall back to a single embedded image — the script reports
  `imageFallback: true`; tell the user and offer §1/§2 instead.

- **`flow`** (auto for a `.flow.json` spec) — "how it works" architecture flow /
  UML communication diagram: components placed freely on a 2-D grid, step-numbered
  arrows ①②③, dashed system boundary, colour key. Use when the user wants a
  hand-drawn system overview, "how it works" picture, communication diagram, or
  numbered flow across people → apps → services → stores → external systems.
  See §3a for the spec.

Author the flow as a `sequenceDiagram` for call chains / request flows even in
Excalidraw mode — the `arch` layout turns it into the numbered component view.
Use `flow` instead when components must sit in a 2-D layout (fan-out to several
recipients, results returning to a different place, stores below services).

Steps:
1. Write the Mermaid source to `<scratchpad>/diagram.mmd`.
2. Run:
   ```bash
   node <skill-dir>/scripts/mmd-to-excalidraw.mjs <scratchpad>/diagram.mmd
   ```
   `<skill-dir>` = the folder containing this SKILL.md (e.g. `~/.agents/skills/sequence-diagram`
   for a user install, `.agents/skills/sequence-diagram` for a project install).
   Options: `[outBase]` (path without extension), `--layout auto|arch|mermaid`,
   `--title "…"` (arch only), `--no-png`, `--no-calls` (flow: hide the call table),
   `--scale N` (default 2).
   Writes `diagram.excalidraw` + `diagram.png` (white background) and prints JSON
   with paths and element-type counts.
3. Deliver:
   - **Desktop mode:** `SendUserFile` the PNG with `display: "render"`, and the
     `.excalidraw` file with `display: "attach"` (opens in excalidraw.com via
     File → Open, or the VS Code Excalidraw extension).
   - **Terminal mode:** print both file paths; ASCII cannot show the sketch.
   - If the user wants the file kept, copy it into the project (e.g. `docs/diagrams/`).
4. Optional live view: if an Excalidraw connector exposing a `create_view` tool
   (hand-drawn streaming canvas) is available in the session, it can render the
   diagram inline and interactively. Read its `read_me` first, then hand-author the
   elements (camera 4:3, fontSize ≥ 16). Use it as an extra view only — the script
   output stays the durable deliverable.

### 3a. `flow` spec (`<name>.flow.json`)

Reference example (a survey-app "how it works" overview):
`<skill-dir>/examples/survey-app.flow.json` — read it before authoring a new spec.

```jsonc
{
  "title": "…", "subtitle": "…",
  "grid": { "colWidth": 300, "rowHeight": 200 },   // px per col/row unit
  "nodes": [
    { "id": "u", "kind": "person", "label": "sender", "col": 0, "row": 1.4 },
    { "id": "app", "kind": "window", "label": "Web App", "caption": "create & send", "col": 0.75, "row": 0.6 },
    { "id": "api", "kind": "window", "variant": "external", "label": "Public API", "col": 0.75, "row": 1.5 },
    { "id": "svc", "kind": "service", "label": "order-service", "caption": "what it does", "col": 2, "row": 1 },
    { "id": "db", "kind": "database", "label": "doc-store", "caption": "what it stores", "col": 2.5, "row": 4.8 },
    { "id": "ext", "kind": "box", "label": "3rd-party system", "caption": "Slack · CRM", "col": 0.75, "row": 4.5 }
  ],
  "groups": [{ "label": "Platform", "nodes": ["svc", "db"] }],
  "edges": [
    { "from": "app", "to": "svc", "n": 1, "label": "send", "calls": ["sendAction()", "POST /v2/deliveries"] },
    { "from": "svc", "to": "db", "fromSide": "bottom", "toSide": "top", "dashed": true, "n": null }
  ],
  "legend": true, "legendNote": "dashed = data write / read"
}
```

- **Node kinds:** `person` (pink hatched user), `window` (app/UI with black title
  bar + yellow stripe; `variant: "external"` = grey client window), `service`
  (orange 3-row server stack, label above), `database` (yellow cylinder), `box`
  (grey rounded external system), `text` (free label). Optional `w`, `h`, `fill`,
  `captionFont: "hand"|"sans"`. `caption` supports `\n`.
- **Placement:** `col`/`row` = node centre in grid units; fractions allowed. Lay out
  left→right in flow order: actors, entry points, core services (inside the
  group), outputs/recipients; stores and external sinks on lower rows.
- **Edges:** numbered ①…⑳ automatically in order; set `n` to repeat a step number
  (two entry paths both ①) or `n: null` for an unnumbered connector. Sides are
  chosen automatically (horizontal unless mostly vertical); override with
  `fromSide`/`toSide` (`left|right|top|bottom`) to get L-shaped routes, `via` to
  move the bend coordinate, `dashed` for data read/write, `both` for two-way.
  Multiple edges on one side are spread out automatically.
- **legend:** `true` = default 4-colour key; or an array of `{ color, label }`;
  optional `legendAt: { x, y }`.
- **Call table (function/method names):** keep arrow labels short and put code
  names in `calls` (string or array) on the edge. They render in a "Calls by step"
  table keyed by step number (monospace), right of the diagram — never on the
  arrow. Edges sharing a step number merge into one row, each prefixed `→ <target>`.
  `callsAt: { x, y }` moves the table, `callsTitle` renames it, `callTable: false`
  or `--no-calls` hides it (same spec → clean overview + detailed version). List
  2–3 calls per edge in call order, entry point first; skip trivial helpers.

Run: `node <skill-dir>/scripts/mmd-to-excalidraw.mjs <scratchpad>/<name>.flow.json`
(layout auto-detected). Always `Read` the PNG after rendering and fix overlaps by
nudging `col`/`row`, `via`, or sides — then re-render.

Known limits: `flow` labels sit on the longest horizontal segment and can touch a
group border — move the node or set `via`. `arch` keeps all components in one row, so arrows spanning
non-adjacent components can cross — order `participant` declarations so the most
talkative pairs sit next to each other. With `--layout mermaid`, arrow labels sit on
the line and `alt/else` labels after the first may be dropped.

## When to auto-trigger (no explicit "diagram" ask needed)

Visualize as a diagram, don't just describe in prose, when the task is:
- Explaining a call chain ("what calls X", "trace this request")
- Explaining code execution flow / control flow across functions or services
- Architecture/design explanation involving 2+ components interacting
- Code review commentary describing how a change alters an interaction flow
- Any "how does X flow through the system" question

Skip auto-trigger for single-function, single-file, or no-interaction explanations.
