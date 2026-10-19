const FILLS = ["#a5d8ff", "#d0bfff", "#b2f2bb", "#ffd8a8", "#c3fae8", "#eebefa", "#fff3bf", "#ffc9c9"];
const STROKES = ["#1971c2", "#6741d9", "#2f9e44", "#e8590c", "#0c8599", "#9c36b5", "#f08c00", "#e03131"];
const DATASTORE = /\b(db|database|postgres|mysql|mongo|redis|cache|store|storage|bucket|queue|kafka|topic)\b/i;

const FONT = 16;
const CHAR_W = 9.5;
const NODE_H = 80;
const LANE_GAP = 58;
const FIRST_LANE = 56;
const BADGE = 26;
const MIN_GAP = 140;

const textWidth = (s, size = FONT) => s.length * CHAR_W * (size / FONT);

export function parseSequence(src) {
  const lines = src.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("%%"));
  if (!/^sequenceDiagram\b/.test(lines[0] ?? "")) throw new Error("architecture layout requires a sequenceDiagram input");
  const nodes = new Map();
  const addNode = (id, label, kind) => {
    if (!nodes.has(id)) nodes.set(id, { id, label: (label ?? id).trim(), kind: kind ?? "participant" });
  };
  const messages = [];
  const notes = [];
  const guards = [];
  const declRe = /^(participant|actor)\s+(\S+?)(?:\s+as\s+(.+))?$/;
  const msgRe = /^([^\s\-+]+?)\s*(-->>|->>|--x|-x|--\)|-\)|-->|->)\s*[+-]?\s*([^\s:]+)\s*:\s*(.*)$/;
  const blockRe = /^(alt|else|opt|loop|par|and|critical|option|break)\b\s*(.*)$/;
  const noteRe = /^note\s+(?:over|left of|right of)\s+[^:]+:\s*(.*)$/i;
  for (const line of lines.slice(1)) {
    let m;
    if ((m = declRe.exec(line))) addNode(m[2], m[3], m[1]);
    else if ((m = msgRe.exec(line))) {
      addNode(m[1]);
      addNode(m[3]);
      const guard = guards.filter(Boolean).at(-1);
      messages.push({ from: m[1], to: m[3], dashed: m[2].startsWith("--"), text: guard ? `[${guard}] ${m[4]}` : m[4] });
    } else if ((m = blockRe.exec(line))) {
      if (["else", "and", "option"].includes(m[1])) guards[guards.length - 1] = m[2];
      else guards.push(m[1] === "loop" ? `loop ${m[2]}`.trim() : m[2]);
    } else if (line === "end") guards.pop();
    else if ((m = noteRe.exec(line))) notes.push(m[1]);
  }
  return { nodes: [...nodes.values()], messages, notes };
}

export function buildArchitectureSkeleton(src, { title } = {}) {
  const { nodes, messages, notes } = parseSequence(src);
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const edges = messages.map((m, i) => ({ ...m, n: i + 1, a: index.get(m.from), b: index.get(m.to) }));
  const labelW = (e) => BADGE + 8 + textWidth(e.text);

  nodes.forEach((n) => (n.w = Math.max(150, textWidth(n.label) + 48)));
  const gaps = nodes.slice(1).map((_, i) => {
    const adjacent = edges.filter((e) => Math.min(e.a, e.b) === i && Math.max(e.a, e.b) === i + 1);
    const selfLoops = edges.filter((e) => e.a === i && e.b === i);
    return Math.max(
      MIN_GAP,
      ...adjacent.map((e) => labelW(e) + 40 - (nodes[i].w + nodes[i + 1].w) / 2 + 40),
      ...selfLoops.map((e) => 48 + labelW(e) + 30),
    );
  });
  let x = 0;
  nodes.forEach((n, i) => {
    n.x = x;
    n.cx = x + n.w / 2;
    x += n.w + (gaps[i] ?? 0);
  });

  const assignLanes = (group) => {
    const lanes = [];
    const sorted = [...group].sort((p, q) => Math.abs(p.a - p.b) - Math.abs(q.a - q.b) || p.n - q.n);
    for (const e of sorted) {
      const mid = (nodes[e.a].cx + nodes[e.b].cx) / 2;
      const half = Math.max(Math.abs(nodes[e.a].cx - nodes[e.b].cx), labelW(e)) / 2 + 12;
      e.span = [mid - half, mid + half];
      let k = 0;
      while (lanes[k]?.some(([l, r]) => !(e.span[1] < l || e.span[0] > r))) k++;
      (lanes[k] ??= []).push(e.span);
      e.lane = k + 1;
    }
    return lanes.length;
  };
  const above = edges.filter((e) => e.b > e.a);
  const below = edges.filter((e) => e.b < e.a);
  const selfs = edges.filter((e) => e.a === e.b);
  const topLanes = assignLanes(above);
  const bottomLanes = assignLanes(below);

  const top = FIRST_LANE + (topLanes - 1) * LANE_GAP + 70;
  const bottom = top + NODE_H;

  const attach = (side) => {
    const map = new Map(nodes.map((_, i) => [i, []]));
    for (const e of side === "top" ? above : below) {
      map.get(e.a).push({ e, end: "start", other: e.b });
      map.get(e.b).push({ e, end: "end", other: e.a });
    }
    for (const [i, list] of map) {
      const left = list.filter((p) => p.other < i).sort((p, q) => p.e.lane - q.e.lane || q.other - p.other);
      const right = list.filter((p) => p.other > i).sort((p, q) => q.e.lane - p.e.lane || q.other - p.other);
      const ordered = [...left, ...right];
      const usable = nodes[i].w * 0.7;
      ordered.forEach((p, k) => {
        const px = nodes[i].cx - usable / 2 + (usable * (k + 1)) / (ordered.length + 1);
        p.e[p.end === "start" ? "sx" : "ex"] = px;
      });
    }
  };
  attach("top");
  attach("bottom");

  const els = [];
  if (title) els.push({ type: "text", x: 0, y: -10, text: title, fontSize: 28 });

  nodes.forEach((n, i) => {
    const isStore = DATASTORE.test(n.label) || DATASTORE.test(n.id);
    els.push({
      type: n.kind === "actor" ? "ellipse" : "rectangle",
      id: `node-${i}`,
      x: n.x,
      y: top,
      width: n.w,
      height: NODE_H,
      backgroundColor: isStore ? "#c3fae8" : FILLS[i % FILLS.length],
      strokeColor: isStore ? "#0c8599" : STROKES[i % STROKES.length],
      fillStyle: "solid",
      strokeWidth: 2,
      roundness: n.kind === "actor" ? null : { type: 3 },
      label: { text: n.label, fontSize: 18, strokeColor: "#1e1e1e" },
    });
    if (isStore) {
      els.push({ type: "ellipse", x: n.x, y: top - 10, width: n.w, height: 20, backgroundColor: "#c3fae8", strokeColor: "#0c8599", fillStyle: "solid", strokeWidth: 2 });
    }
  });

  const pushEdge = (e, y0, laneY) => {
    const color = e.dashed ? "#495057" : "#1e1e1e";
    els.push({
      type: "arrow",
      x: e.sx,
      y: y0,
      width: Math.abs(e.ex - e.sx),
      height: Math.abs(laneY - y0),
      points: [[0, 0], [0, laneY - y0], [e.ex - e.sx, laneY - y0], [e.ex - e.sx, 0]],
      strokeColor: color,
      strokeWidth: 2,
      strokeStyle: e.dashed ? "dashed" : "solid",
      endArrowhead: "arrow",
      roundness: null,
    });
    const w = labelW(e);
    const lx = (e.sx + e.ex) / 2 - w / 2;
    const ly = laneY - BADGE - 10;
    els.push({ type: "ellipse", x: lx, y: ly, width: BADGE, height: BADGE, backgroundColor: e.dashed ? "#e9ecef" : "#ffec99", strokeColor: color, fillStyle: "solid", strokeWidth: 1, label: { text: String(e.n), fontSize: 14 } });
    els.push({ type: "text", x: lx + BADGE + 8, y: ly + 2, text: e.text, fontSize: FONT, strokeColor: "#1e1e1e" });
  };
  for (const e of above) pushEdge(e, top, top - FIRST_LANE - (e.lane - 1) * LANE_GAP);
  for (const e of below) pushEdge(e, bottom, bottom + FIRST_LANE + (e.lane - 1) * LANE_GAP);

  for (const e of selfs) {
    const n = nodes[e.a];
    const sx = n.x + n.w;
    const y0 = top + NODE_H * 0.3;
    els.push({ type: "arrow", x: sx, y: y0, width: 40, height: 30, points: [[0, 0], [40, 0], [40, 30], [0, 30]], strokeColor: "#1e1e1e", strokeWidth: 2, endArrowhead: "arrow" });
    els.push({ type: "ellipse", x: sx + 48, y: y0 + 2, width: BADGE, height: BADGE, backgroundColor: "#ffec99", fillStyle: "solid", strokeWidth: 1, label: { text: String(e.n), fontSize: 14 } });
    els.push({ type: "text", x: sx + 48 + BADGE + 6, y: y0 + 4, text: e.text, fontSize: FONT });
  }

  if (notes.length) {
    const ny = bottom + FIRST_LANE + Math.max(0, bottomLanes - 1) * LANE_GAP + 50;
    const text = notes.map((t) => `• ${t}`).join("\n");
    const w = Math.max(...notes.map((t) => textWidth(t) + 40)) + 20;
    els.push({ type: "rectangle", x: 0, y: ny, width: w, height: notes.length * 24 + 24, backgroundColor: "#fff3bf", strokeColor: "#f08c00", fillStyle: "solid", strokeWidth: 1, roundness: { type: 3 }, label: { text, fontSize: FONT, textAlign: "left", strokeColor: "#1e1e1e" } });
  }

  return els;
}
