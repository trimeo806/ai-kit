# less-words-more-arrows

An ai-kit skill (Claude Code and Codex) that explains code and systems as diagrams instead of prose.
Default: an editable hand-drawn **whiteboard** Excalidraw file (`.excalidraw` + `.png`).
On request: ASCII in a terminal, a rendered Mermaid image, or another Excalidraw preset.

## Install

Ships with the ai-kit plugin. The renderer needs:

```bash
npm install -g @mermaid-js/mermaid-cli   # brings headless Chromium; needs internet (esm.sh)
```

Optional: install `mermaid-ascii` for terminal output.

## Use it

Just ask. Without a named style you get `whiteboard`; name another to switch.

| You want | Say something like | Format |
|---|---|---|
| Any diagram (default) | "Diagram how payments work" | `whiteboard` |
| Text only | "ASCII diagram of the login flow" | ASCII |
| Who calls whom, in order | "Draw the call chain of POST /orders in excalidraw" | `sequence` |
| The code path with file:line | "Show the call tree of `createDelivery`" | `calltree` |
| How a feature works end to end | "How-it-works diagram of delivery processing, with the calls" | `flow` |
| System design / whiteboard | "Whiteboard system design of payments, dark, code font" | `whiteboard` |
| Copy a picture you have | "Redraw this image in excalidraw" + attach image | `whiteboard` |
| Flowchart / class / state | "Excalidraw state diagram of DeliveryStatus" | `mermaid` |

Tips:
- Add **dark** / **light** and **code font** / **hand-drawn** to the ask.
- Ask for **two views** of one feature: `sequence` for service hops + `calltree` for the code.
- Say **"keep it"** to save the files in the work folder (`<docsDir>/<TICKET-KEY>/diagrams/` or `<docsDir>/<intention-name>/diagrams/`).
- Not happy? Say what's wrong ("labels overlap", "put the DB below") — the agent edits the
  spec and re-renders.

## Components

`service`, `database`, `queue`, `topic`, `stream`, `cache`, `bucket`, `function`,
`window`, `mobile`, `person`, `cloud`, `clock`, `box`, `text` — plus containers
(boxes inside boxes) in `whiteboard`.

`whiteboard` also draws hand-drawn components from vendored Excalidraw libraries (system design,
AWS, Azure, Kubernetes, C4, network, tech logos): `"lib": "system-design:Load Balancer"` on a
node. Ask for "use library icons" or name the component. List / preview them:

```bash
node "$CLAUDE_PLUGIN_ROOT/skills/less-words-more-arrows/scripts/excalidraw-library.mjs" list
node "$CLAUDE_PLUGIN_ROOT/skills/less-words-more-arrows/scripts/excalidraw-library.mjs" sheet aws ./aws-sheet
```

Details: `references/excalidraw-libraries.md`.

## Run it yourself

```bash
node "$CLAUDE_PLUGIN_ROOT/skills/less-words-more-arrows/scripts/mmd-to-excalidraw.mjs" <input> [outBase] \
  [--preset sequence|calltree|flow|whiteboard|mermaid] [--theme light|dark] [--font hand|code|sans] \
  [--check] [--preview] [--no-server]
```

- `--check`: whiteboard overlap lint only, no browser (~0.1 s).
- `--preview`: small PNG (scale 0.75) for review passes.
- Renders go through a background server that keeps Chromium warm (first ~5 s, then ~0.2–0.5 s;
  stops after 15 min idle, or `node scripts/render-server.mjs stop`). `--no-server` renders in-process.

Input: `.mmd` (`sequenceDiagram` → sequence), `.calltree.txt`, `.flow.json`, `.wb.json`
(JSON without `"preset"` → whiteboard).
Examples in `examples/`, spec details in `references/`.

## Edit the result

Ask **"open it so I can edit"** — the agent starts a local editor for the file and opens it in
whatever browser the session has (a built-in pane, or your default browser). Or run it yourself:

```bash
node "$CLAUDE_PLUGIN_ROOT/skills/less-words-more-arrows/scripts/open-diagram-editor.mjs" diagram.excalidraw --open
```

`.excalidraw` opens the full Excalidraw editor, `.mmd` opens code + live Mermaid preview.
**Ctrl+S** saves back to the file (Excalidraw also refreshes the `.png`). Changes the agent makes
to the file show up in the open editor automatically, so you can edit and ask the agent in turns.

Also works: [excalidraw.com](https://excalidraw.com) (File → Open) or the VS Code Excalidraw extension.
