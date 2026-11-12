const INSET = 3;
const STEP = 4;

const rectOf = (el) => ({ x: el.x, y: el.y, w: el.width, h: el.height });

const overlaps = (a, b) =>
  a.x + INSET < b.x + b.w - INSET && b.x + INSET < a.x + a.w - INSET && a.y + INSET < b.y + b.h - INSET && b.y + INSET < a.y + a.h - INSET;

const inside = (p, r) => p.x > r.x + INSET && p.x < r.x + r.w - INSET && p.y > r.y + INSET && p.y < r.y + r.h - INSET;

function samplePath(pts, smooth) {
  if (smooth && pts.length === 3) {
    const [a, m, b] = pts;
    const c = { x: 2 * m.x - (a.x + b.x) / 2, y: 2 * m.y - (a.y + b.y) / 2 };
    return Array.from({ length: 41 }, (_, i) => {
      const t = i / 40;
      const u = 1 - t;
      return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
    });
  }
  const out = [];
  pts.slice(1).forEach((b, i) => {
    const a = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / STEP));
    for (let k = 0; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  });
  return out;
}

const fmtEdge = (e) => `edge ${e.from}->${e.to}${e.label ? ` "${e.label.split("\n")[0]}"` : ""}`;

export function lintWhiteboard(nodes, drawn) {
  const ancestors = (id) => {
    const out = new Set();
    for (let n = nodes.get(id); n?.parent; n = nodes.get(n.parent)) out.add(n.parent);
    return out;
  };
  const items = [];
  for (const n of nodes.values()) {
    if (n.container) continue;
    items.push({ kind: "node", owner: n.id, rect: { x: n.x, y: n.y, w: n.w, h: n.h }, name: `node ${n.id}` });
    const label = drawn.nodeLabels.get(n.id);
    if (label) items.push({ kind: "label", owner: n.id, rect: rectOf(label), name: `label of node ${n.id}` });
  }
  drawn.edges.forEach((d, i) => {
    if (d.labelBox) items.push({ kind: "edgeLabel", owner: `edge${i}`, rect: rectOf(d.labelBox), name: `label of ${fmtEdge(d.edge)}` });
  });

  const warnings = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (a.owner === b.owner) continue;
      if (a.kind === "node" && b.kind === "node" && (ancestors(a.owner).has(b.owner) || ancestors(b.owner).has(a.owner))) continue;
      if (overlaps(a.rect, b.rect)) warnings.push(`${a.name} overlaps ${b.name}`);
    }
  }
  drawn.edges.forEach((d, i) => {
    const path = samplePath(d.pts, d.smooth);
    const ends = new Set([d.edge.from, d.edge.to]);
    for (const it of items) {
      if (it.owner === `edge${i}`) continue;
      if (it.kind === "node" && ends.has(it.owner)) continue;
      if (path.some((p) => inside(p, it.rect))) warnings.push(`${fmtEdge(d.edge)} crosses ${it.name}`);
    }
  });
  return warnings;
}
