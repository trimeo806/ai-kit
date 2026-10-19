import { CIRCLED, textW, textH, textBox, drawCylinder } from "../scene/scene-primitives.mjs";
import { ICON_SIZES, ICON_FILL_KEY, ICON_LEGEND, isIcon, drawIcon } from "../scene/component-icons.mjs";

const SIZES = {
  person: { w: 70, h: 92 },
  window: { w: 190, h: 112 },
  service: { w: 200, h: 92 },
  database: { w: 120, h: 120 },
  box: { w: 210, h: 62 },
  text: { w: 200, h: 30 },
  ...ICON_SIZES,
};

function drawNode(T, n, els) {
  const { primary: HAND, secondary: SANS } = T.font;
  const INK = T.ink;
  const tb = (cx, y, text, o = {}) => textBox(cx, y, text, { family: HAND, color: INK, ...o });
  const { x, y, w, h, cx } = n.box;
  const fill = n.fill;
  if (n.kind === "person") {
    els.push({ type: "ellipse", x: cx - 15, y, width: 30, height: 30, backgroundColor: fill ?? T.fills.person, fillStyle: "solid", strokeColor: INK, strokeWidth: 1 });
    els.push({ type: "rectangle", x, y: y + 34, width: w, height: h - 34, backgroundColor: fill ?? T.fills.person, fillStyle: "cross-hatch", strokeColor: INK, strokeWidth: 2, roundness: { type: 3 } });
  } else if (n.kind === "window") {
    const external = n.variant === "external";
    els.push({ type: "rectangle", x, y, width: w, height: h, backgroundColor: fill ?? (external ? T.fills.client : T.fills.window), fillStyle: "solid", strokeColor: INK, strokeWidth: 2, roundness: null });
    els.push({ type: "rectangle", x, y, width: w, height: 22, backgroundColor: external ? T.fills.externalBar : T.fills.bar, fillStyle: "solid", strokeColor: INK, strokeWidth: 1, roundness: null });
    if (!external) els.push({ type: "rectangle", x, y: y + 22, width: w, height: 5, backgroundColor: T.fills.stripe, fillStyle: "solid", strokeColor: "transparent", roundness: null });
    for (let i = 0; i < 3; i++) {
      els.push({ type: "ellipse", x: x + 8 + i * 13, y: y + 6, width: 9, height: 9, backgroundColor: external ? INK : T.fills.stripe, fillStyle: "solid", strokeColor: "transparent" });
    }
    els.push({ ...tb(cx, y + 27, n.label, { size: 22 }), y: y + 27, height: h - 27 });
  } else if (n.kind === "service") {
    const rowH = (h - 8) / 3;
    for (let i = 0; i < 3; i++) {
      const ry = y + i * (rowH + 4);
      els.push({ type: "rectangle", x, y: ry, width: w, height: rowH, backgroundColor: fill ?? T.fills.service, fillStyle: "solid", strokeColor: INK, strokeWidth: 2, roundness: { type: 3 } });
      els.push({ type: "ellipse", x: x + 12, y: ry + rowH / 2 - 5, width: 10, height: 10, backgroundColor: INK, fillStyle: "solid", strokeColor: INK });
      els.push({ type: "line", x: x + w * 0.45, y: ry + rowH / 2, points: [[0, 0], [w * 0.45, 0]], strokeColor: INK, strokeWidth: 1 });
    }
  } else if (n.kind === "database") {
    drawCylinder(els, { x, y, w, h, fill: fill ?? T.fills.database, stroke: INK });
  } else if (isIcon(n.kind)) {
    drawIcon(n.kind, els, { x, y, w, h }, T, fill);
  } else if (n.kind === "box") {
    els.push({ type: "rectangle", x, y, width: w, height: h, backgroundColor: fill ?? T.fills.client, fillStyle: "solid", strokeColor: INK, strokeWidth: 2, roundness: { type: 3 }, label: { text: n.label, fontSize: 18, fontFamily: HAND, strokeColor: INK } });
  }

  if (n.kind === "service") els.push(tb(cx, y - 30, n.label, { size: 18 }));
  if (n.kind === "text") els.push(tb(cx, y, n.label, { size: n.size ?? 16, family: n.font === "hand" ? HAND : SANS }));

  let cy = y + h + 6;
  for (const c of captionLines(T, n)) {
    els.push(tb(cx, cy, c.text, { size: c.size, family: c.family, color: c.family === HAND ? INK : T.muted }));
    cy += textH(c.text, c.size) + 4;
  }
}

function captionLines(T, n) {
  const { primary: HAND, secondary: SANS } = T.font;
  const lines = [];
  if (n.kind === "person" || n.kind === "database" || isIcon(n.kind)) lines.push({ text: n.label, size: 16, family: HAND });
  if (n.caption) {
    const hand = (n.captionFont ?? (n.kind === "window" ? "hand" : "sans")) === "hand";
    lines.push({ text: n.caption, size: hand ? 16 : 13, family: hand ? HAND : SANS });
  }
  return lines;
}

function layoutNodes(T, spec) {
  const colW = spec.grid?.colWidth ?? 330;
  const rowH = spec.grid?.rowHeight ?? 230;
  const nodes = new Map();
  for (const raw of spec.nodes) {
    const kind = raw.kind ?? "box";
    if (!SIZES[kind]) throw new Error(`unknown node kind "${kind}" (node ${raw.id})`);
    const w = raw.w ?? (kind === "box" ? Math.max(SIZES.box.w, textW(raw.label ?? "", 18, T.font.primary) + 40) : SIZES[kind].w);
    const h = raw.h ?? SIZES[kind].h;
    const cx = raw.col * colW;
    const cyMid = raw.row * rowH;
    const box = { x: cx - w / 2, y: cyMid - h / 2, w, h, cx, cy: cyMid };
    const below = captionLines(T, { ...raw, kind }).reduce((acc, c) => acc + textH(c.text, c.size) + 8, 0);
    const above = kind === "service" ? 34 : 0;
    nodes.set(raw.id, { ...raw, kind, box, outer: { top: box.y - above - 8, bottom: box.y + h + below + 8 } });
  }
  return nodes;
}

const SIDE_DIR = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] };

function pickSides(a, b) {
  const dx = b.box.cx - a.box.cx;
  const dy = b.box.cy - a.box.cy;
  if (Math.abs(dy) < 1 || Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? ["right", "left"] : ["left", "right"];
  return dy >= 0 ? ["bottom", "top"] : ["top", "bottom"];
}

function anchorBase(n, side) {
  const { x, y, w, h } = n.box;
  if (side === "left") return { x, y: y + h / 2, span: [y + h * 0.15, y + h * 0.85], axis: "y" };
  if (side === "right") return { x: x + w, y: y + h / 2, span: [y + h * 0.15, y + h * 0.85], axis: "y" };
  if (side === "top") return { x: x + w / 2, y: n.outer.top, span: [x + w * 0.2, x + w * 0.8], axis: "x" };
  return { x: x + w / 2, y: n.outer.bottom, span: [x + w * 0.2, x + w * 0.8], axis: "x" };
}

function assignAnchors(edges, nodes) {
  const groups = new Map();
  edges.forEach((e) => {
    for (const end of ["from", "to"]) {
      const key = `${e[end]}|${e[end + "Side"]}`;
      (groups.get(key) ?? groups.set(key, []).get(key)).push({ e, end });
    }
  });
  for (const [key, list] of groups) {
    const [id, side] = key.split("|");
    const n = nodes.get(id);
    const base = anchorBase(n, side);
    const otherCoord = ({ e, end }) => {
      const o = nodes.get(end === "from" ? e.to : e.from).box;
      return base.axis === "y" ? o.cy : o.cx;
    };
    list.sort((p, q) => otherCoord(p) - otherCoord(q));
    list.forEach((p, k) => {
      const pos = list.length === 1 ? (base.span[0] + base.span[1]) / 2 : base.span[0] + ((base.span[1] - base.span[0]) * k) / (list.length - 1);
      const pt = base.axis === "y" ? { x: base.x, y: pos } : { x: pos, y: base.y };
      const gap = 6;
      const [dx, dy] = SIDE_DIR[side];
      p.e[p.end + "Pt"] = { x: pt.x + dx * gap, y: pt.y + dy * gap };
    });
  }
}

function route(e) {
  const a = e.fromPt;
  const b = e.toPt;
  const hA = e.fromSide === "left" || e.fromSide === "right";
  const hB = e.toSide === "left" || e.toSide === "right";
  if (hA && hB) {
    if (Math.abs(a.y - b.y) < 2) return [a, b];
    const mx = e.via ?? (a.x + b.x) / 2;
    return [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b];
  }
  if (!hA && !hB) {
    if (Math.abs(a.x - b.x) < 2) return [a, b];
    const my = e.via ?? (a.y + b.y) / 2;
    return [a, { x: a.x, y: my }, { x: b.x, y: my }, b];
  }
  return hA ? [a, { x: b.x, y: a.y }, b] : [a, { x: a.x, y: b.y }, b];
}

function drawEdge(T, e, els) {
  const SANS = T.font.secondary;
  const pts = route(e);
  const o = pts[0];
  els.push({
    type: "arrow",
    x: o.x,
    y: o.y,
    points: pts.map((p) => [p.x - o.x, p.y - o.y]),
    strokeColor: T.ink,
    strokeWidth: 2,
    strokeStyle: e.dashed ? "dashed" : "solid",
    endArrowhead: "arrow",
    startArrowhead: e.both ? "arrow" : null,
    roundness: null,
  });
  if (!e.label && e.n == null) return;
  const text = `${e.n != null ? CIRCLED(e.n) + " " : ""}${e.label ?? ""}`.trim();
  const segs = pts.slice(1).map((p, i) => ({ a: pts[i], b: p, len: Math.hypot(p.x - pts[i].x, p.y - pts[i].y), horiz: Math.abs(p.y - pts[i].y) < 1 }));
  const horiz = segs.filter((s) => s.horiz).sort((p, q) => q.len - p.len)[0];
  const seg = horiz && horiz.len >= 80 ? horiz : segs.sort((p, q) => q.len - p.len)[0];
  const mx = (seg.a.x + seg.b.x) / 2;
  const my = (seg.a.y + seg.b.y) / 2;
  const h = textH(text, 14) + 4;
  if (seg.horiz) els.push(textBox(mx, my - h - 6, text, { size: 14, family: SANS, color: T.ink }));
  else els.push(textBox(mx + 12, my - h / 2, text, { size: 14, family: SANS, color: T.ink, align: "left" }));
}

function drawGroup(T, g, nodes, els) {
  const members = g.nodes.map((id) => nodes.get(id)).filter(Boolean);
  if (!members.length) return;
  const pad = g.padding ?? 50;
  const x0 = Math.min(...members.map((n) => n.box.x)) - pad;
  const x1 = Math.max(...members.map((n) => n.box.x + n.box.w)) + pad;
  const y0 = Math.min(...members.map((n) => n.outer.top)) - pad;
  const y1 = Math.max(...members.map((n) => n.outer.bottom)) + pad * 0.6;
  els.push({ type: "rectangle", x: x0, y: y0, width: x1 - x0, height: y1 - y0, strokeColor: T.faint, backgroundColor: "transparent", strokeStyle: "dashed", strokeWidth: 2, roundness: { type: 3 } });
  if (g.label) els.push(textBox(x0 + 10, y0 + 6, g.label, { size: 18, family: T.font.primary, color: T.faint, align: "left" }));
}

function drawLegend(T, spec, bounds, els) {
  const { primary: HAND, secondary: SANS } = T.font;
  const items = spec.legend === true
    ? [
        { color: T.fills.service, label: "service / consumer" },
        { color: T.fills.database, label: "database / storage" },
        { color: T.fills.client, label: "client / external system" },
        { color: T.fills.person, label: "end user / recipient" },
        ...[...new Set(spec.nodes.map((n) => ICON_FILL_KEY[n.kind]).filter((k) => ICON_LEGEND[k]))].map((k) => ({ color: T.fills[k], label: ICON_LEGEND[k] })),
      ]
    : spec.legend;
  if (!items?.length && !spec.legendNote) return;
  const x = spec.legendAt?.x ?? bounds.x1 - 230;
  let y = spec.legendAt?.y ?? bounds.y1 - (items?.length ?? 0) * 31 - 90;
  els.push(textBox(x, y, "Colour key", { size: 18, family: HAND, color: T.ink, align: "left" }));
  y += 36;
  for (const it of items ?? []) {
    els.push({ type: "rectangle", x, y, width: 30, height: 20, backgroundColor: it.color, fillStyle: "solid", strokeColor: T.ink, strokeWidth: 1, roundness: { type: 3 } });
    els.push(textBox(x + 38, y - 3, it.label, { size: 14, family: SANS, color: T.ink, align: "left" }));
    y += 31;
  }
  if (spec.legendNote) els.push(textBox(x, y + 4, spec.legendNote, { size: 13, family: SANS, color: T.muted, align: "left" }));
}

function collectCallRows(edges, nodes) {
  const byStep = new Map();
  for (const e of edges) {
    const calls = [].concat(e.calls ?? []).filter(Boolean);
    if (!calls.length) continue;
    const key = e.n ?? "·";
    (byStep.get(key) ?? byStep.set(key, []).get(key)).push({ e, calls });
  }
  return [...byStep.entries()]
    .sort(([p], [q]) => (typeof p === "number" ? p : Infinity) - (typeof q === "number" ? q : Infinity))
    .map(([n, list]) => ({
      badge: typeof n === "number" ? CIRCLED(n) : n,
      lines: list.flatMap(({ e, calls }) =>
        list.length > 1 ? [`→ ${nodes.get(e.to).label}`, ...calls.map((c) => `   ${c}`)] : calls,
      ),
    }));
}

function drawCallTable(T, spec, rows, bounds, els) {
  if (!rows.length) return;
  const { primary: HAND, secondary: SANS, mono: MONO } = T.font;
  const size = 13;
  const lineH = size * 1.3;
  const badgeW = 34;
  const padX = 16;
  const header = spec.callsTitle ?? "Calls by step";
  const bodyW = Math.max(...rows.flatMap((r) => r.lines.map((l) => textW(l, size, MONO))));
  const w = Math.max(badgeW + bodyW + padX * 2 + 16, textW(header, 18, HAND) + padX * 2);
  const rowHs = rows.map((r) => r.lines.length * lineH + 10);
  const h = 44 + rowHs.reduce((a, b) => a + b, 0) + 8;
  const x = spec.callsAt?.x ?? bounds.x1 + 80;
  let y = spec.callsAt?.y ?? bounds.y0;
  els.push({ type: "rectangle", x, y, width: w, height: h, backgroundColor: T.panel, fillStyle: "solid", strokeColor: T.panelStroke, strokeWidth: 1, roundness: { type: 3 } });
  els.push(textBox(x + padX - 8, y + 8, header, { size: 18, family: HAND, color: T.ink, align: "left" }));
  y += 44;
  rows.forEach((r, i) => {
    if (i > 0) els.push({ type: "line", x: x + padX, y: y - 4, points: [[0, 0], [w - padX * 2, 0]], strokeColor: T.divider, strokeWidth: 1 });
    els.push(textBox(x + padX - 8, y, r.badge, { size: 16, family: SANS, color: T.ink, align: "left" }));
    els.push(textBox(x + padX + badgeW - 8, y, r.lines.join("\n"), { size, family: MONO, color: T.ink, align: "left" }));
    y += rowHs[i];
  });
  bounds.x1 = Math.max(bounds.x1, x + w);
}

export function buildFlowSkeleton(spec, theme, { calls = true } = {}) {
  const T = theme;
  const nodes = layoutNodes(T, spec);
  let auto = 0;
  const edges = (spec.edges ?? []).map((raw) => {
    const a = nodes.get(raw.from);
    const b = nodes.get(raw.to);
    if (!a || !b) throw new Error(`edge references unknown node: ${raw.from} -> ${raw.to}`);
    const [fs, ts] = pickSides(a, b);
    const n = raw.n === null ? null : raw.n ?? ++auto;
    if (typeof raw.n === "number") auto = Math.max(auto, raw.n);
    return { ...raw, n, fromSide: raw.fromSide ?? fs, toSide: raw.toSide ?? ts };
  });
  assignAnchors(edges, nodes);

  const els = [];
  for (const g of spec.groups ?? []) drawGroup(T, g, nodes, els);
  for (const n of nodes.values()) drawNode(T, n, els);
  for (const e of edges) drawEdge(T, e, els);

  const all = [...nodes.values()];
  const bounds = {
    x0: Math.min(...all.map((n) => n.box.x)),
    x1: Math.max(...all.map((n) => n.box.x + n.box.w)),
    y0: Math.min(...all.map((n) => n.outer.top)),
    y1: Math.max(...all.map((n) => n.outer.bottom)),
  };
  for (const g of spec.groups ?? []) bounds.y0 = Math.min(bounds.y0, ...g.nodes.map((id) => nodes.get(id)?.outer.top ?? Infinity).map((v) => v - (g.padding ?? 50)));
  if (calls && spec.callTable !== false) drawCallTable(T, spec, collectCallRows(edges, nodes), bounds, els);
  drawLegend(T, spec, bounds, els);

  let ty = bounds.y0 - 40;
  if (spec.subtitle) {
    ty -= 26;
    els.push(textBox(bounds.x0, ty + 34, spec.subtitle, { size: 14, family: T.font.secondary, color: T.ink, align: "left" }));
  }
  if (spec.title) els.push(textBox(bounds.x0, ty - 18, spec.title, { size: 34, family: T.font.primary, color: T.ink, align: "left" }));
  return els.filter(Boolean);
}
