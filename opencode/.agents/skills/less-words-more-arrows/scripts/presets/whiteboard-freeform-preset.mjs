import { textW, textH, textBox, drawCylinder } from "../scene/scene-primitives.mjs";
import { ICON_SIZES, isIcon, drawIcon } from "../scene/component-icons.mjs";

const SIZES = {
  box: { w: 200, h: 110 },
  circle: { w: 190, h: 190 },
  ellipse: { w: 220, h: 130 },
  cylinder: { w: 140, h: 150 },
  diamond: { w: 180, h: 120 },
  pill: { w: 180, h: 56 },
  ...ICON_SIZES,
};
const SHAPES = new Set([...Object.keys(SIZES), "text"]);
const ROUND = new Set(["circle", "ellipse"]);
const CONTAINER_PAD = 22;
const CONTAINER_HEAD = 46;
const EDGE_GAP = 10;

function nodeFont(T, spec, n) {
  return { size: n.fontSize ?? spec.fontSize ?? 18, family: T.font.primary };
}

function layoutNodes(T, spec) {
  const unit = spec.grid ? [spec.grid.colWidth ?? 100, spec.grid.rowHeight ?? 100] : [1, 1];
  const raw = new Map(spec.nodes.map((n) => [n.id, { ...n, shape: n.shape ?? "box" }]));
  for (const n of raw.values()) {
    if (!SHAPES.has(n.shape)) throw new Error(`unknown shape "${n.shape}" (node ${n.id}); use ${[...SHAPES].join(", ")}`);
    if (n.parent && !raw.has(n.parent)) throw new Error(`node ${n.id}: unknown parent "${n.parent}"`);
  }
  const children = (id) => [...raw.values()].filter((c) => c.parent === id);
  const placed = new Map();
  const place = (n) => {
    if (placed.has(n.id)) return placed.get(n.id);
    const kids = children(n.id).map(place);
    let box;
    if (kids.length) {
      const x0 = Math.min(...kids.map((k) => k.x)) - CONTAINER_PAD;
      const x1 = Math.max(...kids.map((k) => k.x + k.w)) + CONTAINER_PAD;
      const y0 = Math.min(...kids.map((k) => k.y)) - CONTAINER_HEAD;
      const y1 = Math.max(...kids.map((k) => k.y + k.h)) + CONTAINER_PAD;
      const w = Math.max(x1 - x0, n.w ?? 0);
      const h = Math.max(y1 - y0, n.h ?? 0);
      box = { x: (x0 + x1) / 2 - w / 2, y: y0, w, h };
    } else if (n.shape === "text") {
      const { size, family } = nodeFont(T, spec, n);
      const w = textW(n.label ?? "", size, family) + 16;
      const h = textH(n.label ?? "", size) + 4;
      box = { x: n.x * unit[0] - (n.align === "left" ? 0 : w / 2), y: n.y * unit[1] - h / 2, w, h };
    } else {
      const { size, family } = nodeFont(T, spec, n);
      const base = SIZES[n.shape];
      const fitW = textW(n.label ?? "", size, family) + (ROUND.has(n.shape) ? 60 : 40);
      const w = n.w ?? (isIcon(n.shape) ? base.w : Math.max(base.w, fitW));
      const h = n.h ?? (n.shape === "circle" ? w : base.h);
      box = { x: n.x * unit[0] - w / 2, y: n.y * unit[1] - h / 2, w, h };
    }
    const out = { ...n, ...box, cx: box.x + box.w / 2, cy: box.y + box.h / 2, container: kids.length > 0 };
    placed.set(n.id, out);
    return out;
  };
  for (const n of raw.values()) {
    if (!n.parent && !children(n.id).length && (n.x == null || n.y == null)) throw new Error(`node ${n.id}: x and y are required`);
    place(n);
  }
  return placed;
}

function drawNode(T, spec, n, els) {
  const { size, family } = nodeFont(T, spec, n);
  const stroke = n.color ?? T.ink;
  const fill = n.fill ?? T.fills.shape;
  const base = {
    x: n.x,
    y: n.y,
    width: n.w,
    height: n.h,
    strokeColor: stroke,
    backgroundColor: fill,
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: n.dashed ? "dashed" : "solid",
  };
  const label = n.label ? { text: n.label, fontSize: size, fontFamily: family, strokeColor: stroke } : undefined;
  if (n.shape === "text") {
    els.push(textBox(n.align === "left" ? n.x : n.cx, n.y, n.label, { size, family, color: n.color ?? T.ink, align: n.align ?? "center" }));
    return;
  }
  if (n.container) {
    els.push({ type: n.shape === "circle" || n.shape === "ellipse" ? "ellipse" : "rectangle", ...base, roundness: { type: 3 } });
    if (n.label) els.push(textBox(n.cx, n.y + 10, n.label, { size, family, color: stroke }));
    return;
  }
  if (isIcon(n.shape)) {
    drawIcon(n.shape, els, { x: n.x, y: n.y, w: n.w, h: n.h }, T, n.fill);
    if (n.label) els.push(textBox(n.cx, n.y + n.h + 6, n.label, { size, family, color: stroke }));
    return;
  }
  if (n.shape === "cylinder") {
    drawCylinder(els, { x: n.x, y: n.y, w: n.w, h: n.h, fill, stroke });
    if (n.label) els.push(textBox(n.cx, n.cy - textH(n.label, size) / 2 + 8, n.label, { size, family, color: stroke }));
    return;
  }
  const type = ROUND.has(n.shape) ? "ellipse" : n.shape === "diamond" ? "diamond" : "rectangle";
  els.push({ type, ...base, roundness: type === "rectangle" ? { type: 3 } : null, ...(label ? { label } : {}) });
}

function sidePoint(n, side) {
  if (side === "left") return { x: n.x, y: n.cy };
  if (side === "right") return { x: n.x + n.w, y: n.cy };
  if (side === "top") return { x: n.cx, y: n.y };
  return { x: n.cx, y: n.y + n.h };
}

function boundaryPoint(n, toward) {
  const dx = toward.x - n.cx;
  const dy = toward.y - n.cy;
  if (!dx && !dy) return { x: n.cx, y: n.cy };
  const t = ROUND.has(n.shape)
    ? 1 / Math.sqrt((dx / (n.w / 2)) ** 2 + (dy / (n.h / 2)) ** 2)
    : Math.min(dx ? n.w / 2 / Math.abs(dx) : Infinity, dy ? n.h / 2 / Math.abs(dy) : Infinity);
  return { x: n.cx + dx * t, y: n.cy + dy * t };
}

function pushOut(p, from) {
  const dx = p.x - from.x;
  const dy = p.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: p.x + (dx / len) * EDGE_GAP, y: p.y + (dy / len) * EDGE_GAP };
}

function endpoint(n, side, toward) {
  const p = side ? sidePoint(n, side) : boundaryPoint(n, toward);
  return pushOut(p, { x: n.cx, y: n.cy });
}

function routeEdge(e, a, b) {
  const aim = (n, side) => (side ? sidePoint(n, side) : { x: n.cx, y: n.cy });
  const p0 = endpoint(a, e.fromSide, aim(b, e.toSide));
  const p1 = endpoint(b, e.toSide, aim(a, e.fromSide));
  const curve = e.curve ?? "straight";
  if (curve === "straight") return { pts: [p0, p1], smooth: false };
  if (curve === "elbow") {
    const horizFirst = e.fromSide ? e.fromSide === "left" || e.fromSide === "right" : Math.abs(p1.x - p0.x) >= Math.abs(p1.y - p0.y);
    return { pts: horizFirst ? [p0, { x: p1.x, y: p0.y }, p1] : [p0, { x: p0.x, y: p1.y }, p1], smooth: false };
  }
  if (curve !== "curved") throw new Error(`edge ${e.from}->${e.to}: unknown curve "${curve}"`);
  const mx = (p0.x + p1.x) / 2;
  const my = (p0.y + p1.y) / 2;
  const len = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
  const bend = e.bend ?? 0.25;
  const off = Math.abs(bend) <= 1 ? bend * len : bend;
  const nx = -(p1.y - p0.y) / len;
  const ny = (p1.x - p0.x) / len;
  return { pts: [p0, { x: mx + nx * off, y: my + ny * off }, p1], smooth: true };
}

function pointAt(pts, t, smooth) {
  if (smooth && pts.length === 3) {
    const [a, m, b] = pts;
    const c = { x: 2 * m.x - (a.x + b.x) / 2, y: 2 * m.y - (a.y + b.y) / 2 };
    const u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
  }
  const segs = pts.slice(1).map((p, i) => ({ a: pts[i], b: p, len: Math.hypot(p.x - pts[i].x, p.y - pts[i].y) }));
  let d = segs.reduce((s, x) => s + x.len, 0) * t;
  for (const s of segs) {
    if (d <= s.len || s === segs.at(-1)) {
      const k = s.len ? Math.min(1, d / s.len) : 0;
      return { x: s.a.x + (s.b.x - s.a.x) * k, y: s.a.y + (s.b.y - s.a.y) * k };
    }
    d -= s.len;
  }
  return pts[0];
}

function drawEdge(T, spec, e, nodes, els) {
  const a = nodes.get(e.from);
  const b = nodes.get(e.to);
  if (!a || !b) throw new Error(`edge references unknown node: ${e.from} -> ${e.to}`);
  const { pts, smooth } = routeEdge(e, a, b);
  const o = pts[0];
  const color = e.color ?? T.ink;
  els.push({
    type: "arrow",
    x: o.x,
    y: o.y,
    points: pts.map((p) => [p.x - o.x, p.y - o.y]),
    strokeColor: color,
    strokeWidth: 2,
    strokeStyle: e.dashed ? "dashed" : "solid",
    startArrowhead: e.both ? "arrow" : null,
    endArrowhead: e.arrow === false ? null : "arrow",
    roundness: smooth ? { type: 2 } : null,
  });
  if (!e.label) return;
  const size = e.fontSize ?? spec.edgeFontSize ?? 16;
  const at = pointAt(pts, e.labelAt ?? 0.5, smooth);
  const [ox, oy] = e.labelOffset ?? [0, 0];
  const h = textH(e.label, size) + 4;
  els.push(textBox(at.x + ox, at.y + oy - h / 2, e.label, { size, family: T.font.primary, color, background: T.bg }));
}

export function buildWhiteboardSkeleton(spec, theme) {
  const T = theme;
  if (!Array.isArray(spec.nodes) || !spec.nodes.length) throw new Error("whiteboard spec needs a non-empty nodes array");
  const nodes = layoutNodes(T, spec);
  const depth = (n) => (n.parent ? 1 + depth(nodes.get(n.parent)) : 0);
  const ordered = [...nodes.values()].sort((p, q) => depth(p) - depth(q));
  const els = [];
  for (const n of ordered) drawNode(T, spec, n, els);
  for (const e of spec.edges ?? []) drawEdge(T, spec, e, nodes, els);
  if (spec.title) {
    const x0 = Math.min(...ordered.map((n) => n.x));
    const y0 = Math.min(...ordered.map((n) => n.y));
    els.push(textBox(x0, y0 - 80, spec.title, { size: 30, family: T.font.primary, color: T.ink, align: "left" }));
  }
  return els;
}
