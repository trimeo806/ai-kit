# Architecture Report — HTML Format

> Adapted from [`mattpocock/skills`](https://github.com/mattpocock/skills) → `skills/engineering/improve-codebase-architecture/HTML-REPORT.md` (MIT, © 2026 Matt Pocock).

Used by [architecture-workflow.md](./architecture-workflow.md) Step 2. One self-contained HTML file written to the session folder as `report.html`. Tailwind and Mermaid from CDN. Mermaid handles graph-shaped diagrams; hand-built divs and inline SVG handle editorial visuals (mass diagrams, cross-sections). Mix the two — leaning on Mermaid for everything looks generic.

## Scaffold

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Architecture audit — {{repo name}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      /* small custom layer for what Tailwind doesn't cover cleanly:
         dashed seam lines, hand-drawn-feeling arrow heads, etc. */
      .seam { stroke-dasharray: 4 4; }
      .leak { stroke: #dc2626; }
      .deep { background: linear-gradient(135deg, #0f172a, #1e293b); }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header>...</header>
      <section id="candidates" class="space-y-10">...</section>
      <section id="top-recommendation">...</section>
    </main>
  </body>
</html>
```

## Header

Repo name, date, compact legend: solid box = module, dashed line = seam, red arrow = leakage, thick dark box = deep module. No introduction paragraph — straight into the candidates.

## Candidate card

Diagrams carry the weight. Prose is sparse and uses the glossary terms without ceremony. Each candidate is one `<article>`:

| Element | Detail |
|---------|--------|
| **Title** | Short, names the deepening — "Collapse the Order intake pipeline" |
| **Badge row** | Strength (`Strong` = emerald, `Worth exploring` = amber, `Speculative` = slate) + dependency tag (`in-process`, `local-substitutable`, `ports & adapters`, `mock`) |
| **Files** | Monospaced list, `font-mono text-sm` |
| **Before / After diagram** | The centrepiece. Two columns, side by side |
| **Problem** | One sentence. What hurts |
| **Solution** | One sentence. What changes |
| **Wins** | Bullets, ≤6 words each — "Tests hit one interface", "Pricing stops leaking", "Delete 4 shallow wrappers" |
| **ADR callout** | If applicable — one line, amber-tinted box |

No paragraphs of explanation. If a diagram needs a paragraph to be understood, redraw the diagram.

## Diagram patterns

Pick what fits the candidate. Mix them — variety is part of the point.

**Mermaid graph** — the workhorse for dependencies and call flow. Use when the point is "X calls Y calls Z, and look at the mess". Wrap in a Tailwind card so it doesn't feel parachuted in. `classDef` to colour leakage edges red and the deep module dark. Sequence diagrams work well for "before: 6 round-trips; after: 1".

```html
<div class="rounded-lg border border-slate-200 bg-white p-4">
  <pre class="mermaid">
    flowchart LR
      A[OrderHandler] --> B[OrderValidator]
      B --> C[OrderRepo]
      C -.leak.-> D[PricingClient]
      classDef leak stroke:#dc2626,stroke-width:2px;
      class C,D leak
  </pre>
</div>
```

**Hand-built boxes-and-arrows** — when Mermaid's layout fights you. Modules as bordered `<div>`s, arrows as inline SVG `<line>`/`<path>` positioned over a relative container. Reach for it when "after" should read as one thick-bordered deep module with greyed-out internals — Mermaid won't render that with the right weight.

**Cross-section** — good for layered shallowness. Stack horizontal bands (`h-12 border-l-4`) for the layers a call passes through. Before: 6 thin layers doing nothing. After: 1 thick band with the consolidated responsibility.

**Mass diagram** — good for "interface as wide as implementation". Two rectangles per module (interface surface, implementation). Before: interface nearly as tall as implementation. After: short interface, tall implementation.

**Call-graph collapse** — before: a tree of calls as nested boxes. After: the same tree collapsed into one box, now-internal calls faded inside.

## Style

- Editorial, not corporate-dashboard. Generous whitespace. `font-serif` headings work well with stone/slate.
- Colour sparingly: one accent (emerald or indigo) + red for leakage + amber for warnings.
- Diagrams ~320px tall so before/after sits side by side without scrolling.
- `text-xs uppercase tracking-wider` for module labels inside diagrams — schematic, not UI.
- Only scripts are the Tailwind CDN and the Mermaid ESM import. Otherwise static — no app code.

## Top recommendation

One larger card: candidate name, one sentence on why, anchor link to its card. That's it.

## Tone

Plain English, concise — architectural nouns and verbs straight from the vocabulary table in [architecture-workflow.md](./architecture-workflow.md). Concision is not an excuse to drift.

Phrasings that fit:

- "Order intake module is shallow — interface nearly matches the implementation."
- "Pricing leaks across the seam."
- "Deepen: one interface, one place to test."
- "Two adapters justify the seam: HTTP in prod, in-memory in tests."

**Wins** bullets name the gain in glossary terms — *"locality: bugs concentrate in one module"*, *"leverage: one interface, N call sites"*. Not *"easier to maintain"* or *"cleaner code"*.

No hedging, no throat-clearing, no "it's worth noting that…". If a sentence could be a bullet, make it a bullet. If a bullet could be cut, cut it.
