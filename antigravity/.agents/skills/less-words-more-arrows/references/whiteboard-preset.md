# `whiteboard` preset (`<name>.wb.json`)

Free-form system-design drawing: plain outlined shapes, containers, schema/note text blocks,
straight / elbow / curved labelled arrows. Use for system-design / interview-style pictures
("draw it like a whiteboard"), data-model + component overviews, anything where the user
gives or shows a layout. Reference: `<skill-dir>/examples/payment-system.wb.json`
(dark + code font, reproduces a payment system design) — read it before authoring.

```jsonc
{
  "preset": "whiteboard",          // required — selects this preset
  "theme": "dark",                 // light | dark   (CLI --theme overrides)
  "font": "code",                  // hand | code | sans (code = Excalidraw "Comic Shanns" mono)
  "title": "optional",
  "fontSize": 18, "edgeFontSize": 16,
  "grid": { "colWidth": 100, "rowHeight": 100 },   // optional: x/y become grid units
  "nodes": [
    { "id": "db", "shape": "circle", "label": "Database", "x": 1212, "y": 325, "w": 195 },
    { "id": "cust", "label": "Customer", "x": 60, "y": 395, "dashed": true },
    { "id": "merchant", "label": "Merchant", "h": 160 },                 // container: no x/y
    { "id": "iframe", "label": "iframe", "parent": "merchant", "x": 262, "y": 380 },
    { "id": "schema", "shape": "text", "align": "left", "x": 1080, "y": 100,
      "label": "PaymentIntent\n- id\n- amount" }
  ],
  "edges": [
    { "from": "cust", "to": "iframe" },
    { "from": "merchant", "to": "gw", "both": true },
    { "from": "db", "to": "kafka", "curve": "curved", "bend": -0.2, "label": "CDC" },
    { "from": "recon", "to": "ext", "curve": "elbow", "fromSide": "bottom", "toSide": "right",
      "label": "batch query", "labelAt": 0.45, "labelOffset": [0, -40] }
  ]
}
```

- **Coordinates:** `x`/`y` = node centre in px (or grid units with `grid`). For `text` with
  `align: "left"`, `x` is the left edge. Trace positions from a reference image when given one.
- **Shapes:** `box` (default, rounded rect), `circle`, `ellipse`, `cylinder`, `diamond`, `pill`,
  `text`, plus the icon kinds `queue`, `topic`, `stream`, `cache`, `bucket`, `function`,
  `cloud`, `clock`, `mobile` (label drawn below the icon; filled with the theme colour). Options: `w`, `h`, `dashed`, `fill` (default transparent), `color` (stroke+text),
  `fontSize`.
- **Containers:** any node referenced by a child's `parent` auto-fits its children; label sits at
  the top. `w`/`h` act as minimums. Nest as deep as needed.
- **Edges:** endpoints clip to the shape outline (circle-aware) unless `fromSide`/`toSide`
  (`left|right|top|bottom`) pin them. `curve`: `straight` (default) | `elbow` | `curved`;
  `bend` = curvature (fraction of length if |bend| ≤ 1, else px). Positive bulges to the
  right-hand side walking `from` → `to` (left→right edge: positive sags down; right→left
  edge: positive arcs up); negative mirrors it. `both`,
  `dashed`, `arrow: false`, `color`. Labels get a background-coloured plate so they read over
  lines; move with `labelAt` (0..1 along the edge) and `labelOffset: [dx, dy]`.
- **Fixing overlaps:** render, `Read` the PNG, then nudge `x/y`, `bend` sign/size, `labelAt`,
  or pin sides. Long cross-diagram arrows look best as `curved` with a small bend.
