# less-words-more-arrows

A Claude Code skill that explains code and systems as diagrams instead of prose:
ASCII in a terminal, a rendered image in Claude desktop, or an editable hand-drawn
**Excalidraw** file (`.excalidraw` + `.png`).

## Install

```bash
cp -r less-words-more-arrows ~/.claude/skills/
npm install -g @mermaid-js/mermaid-cli   # brings headless Chromium; needs internet (esm.sh)
```

Optional: install `mermaid-ascii` for terminal output.

## Use it

Just ask. Name the style you want; Claude picks the format.

| You want | Say something like | Format |
|---|---|---|
| Who calls whom, in order | "Draw the call chain of POST /orders in excalidraw" | `sequence` |
| The code path with file:line | "Show the call tree of `createOrder`" | `calltree` |
| How a feature works end to end | "How-it-works diagram of order processing, with the calls" | `flow` |
| System design / whiteboard | "Whiteboard system design of payments, dark, code font" | `whiteboard` |
| Copy a picture you have | "Redraw this image in excalidraw" + attach image | `whiteboard` |
| Flowchart / class / state | "Excalidraw state diagram of DeliveryStatus" | `mermaid` |

Tips:
- Add **dark** / **light** and **code font** / **hand-drawn** to the ask.
- Ask for **two views** of one feature: `sequence` for service hops + `calltree` for the code.
- Say **"keep it in docs/diagrams/"** to save the files in your repo.
- Not happy? Say what's wrong ("labels overlap", "put the DB below") — Claude edits the
  spec and re-renders.

## Components

`service`, `database`, `queue`, `topic`, `stream`, `cache`, `bucket`, `function`,
`window`, `mobile`, `person`, `cloud`, `clock`, `box`, `text` — plus containers
(boxes inside boxes) in `whiteboard`.

## Run it yourself

```bash
node ~/.claude/skills/less-words-more-arrows/scripts/mmd-to-excalidraw.mjs <input> [outBase] \
  [--preset sequence|calltree|flow|whiteboard|mermaid] [--theme light|dark] [--font hand|code|sans]
```

Input: `.mmd` (`sequenceDiagram` → sequence), `.calltree.txt`, `.flow.json`, `.wb.json`.
Examples in `examples/`, spec details in `references/`.

## Edit the result

Ask **"open it so I can edit"** — Claude starts a local editor for the file:

- **Inside Claude desktop:** it opens in the Browser pane.
- **In your browser:** ask "open it in my browser", or run it yourself:

```bash
node ~/.claude/skills/less-words-more-arrows/scripts/open-diagram-editor.mjs diagram.excalidraw --open
```

`.excalidraw` opens the full Excalidraw editor, `.mmd` opens code + live Mermaid preview.
**Ctrl+S** saves back to the file (Excalidraw also refreshes the `.png`). Changes Claude makes
to the file show up in the open editor automatically, so you can edit and ask Claude in turns.

Also works: [excalidraw.com](https://excalidraw.com) (File → Open) or the VS Code Excalidraw extension.
