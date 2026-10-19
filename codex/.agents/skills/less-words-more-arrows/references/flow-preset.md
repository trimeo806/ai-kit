# `flow` preset (`<name>.flow.json`)


Reference example (a survey app "how it works" overview):
`<skill-dir>/examples/survey-app.flow.json` — read it before authoring a new spec.

```jsonc
{
  "title": "…", "subtitle": "…",
  "grid": { "colWidth": 300, "rowHeight": 200 },   // px per col/row unit
  "nodes": [
    { "id": "u", "kind": "person", "label": "sender", "col": 0, "row": 1.4 },
    { "id": "app", "kind": "window", "label": "Studio", "caption": "create & send", "col": 0.75, "row": 0.6 },
    { "id": "api", "kind": "window", "variant": "external", "label": "Public API", "col": 0.75, "row": 1.5 },
    { "id": "svc", "kind": "service", "label": "survey-service", "caption": "what it does", "col": 2, "row": 1 },
    { "id": "db", "kind": "database", "label": "survey-db", "caption": "what it stores", "col": 2.5, "row": 4.8 },
    { "id": "ext", "kind": "box", "label": "3rd-party system", "caption": "Slack · HubSpot", "col": 0.75, "row": 4.5 }
  ],
  "groups": [{ "label": "One API", "nodes": ["svc", "db"] }],
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
  (grey rounded external system), `text` (free label). Icons (label below, purple =
  messaging): `queue` (pipe with messages), `topic` (pub/sub fan-out), `stream`
  (Kafka-style partition log), `cache` (chip + bolt), `bucket` (object storage: GCS/S3),
  `function` (λ hexagon), `cloud` (3rd-party / internet), `clock`
  (scheduler / cron), `mobile`. The default legend adds a row per icon colour used.
  Optional `w`, `h`, `fill`, `captionFont: "hand"|"sans"`. `caption` supports `\n`.
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

Run: `node <skill-dir>/scripts/mmd-to-excalidraw.mjs <scratchpad>/<name>.flow.json` (add `--theme dark` for a dark version)
(layout auto-detected). Always `Read` the PNG after rendering and fix overlaps by
nudging `col`/`row`, `via`, or sides — then re-render.

Known limits: `flow` labels sit on the longest horizontal segment and can touch a
group border — move the node or set `via`. With `--preset mermaid`, arrow labels sit on
the line and `alt/else` labels after the first may be dropped.

