import { textBox } from "./scene-primitives.mjs";

export const ICON_SIZES = {
  queue: { w: 160, h: 80 },
  topic: { w: 130, h: 110 },
  stream: { w: 190, h: 84 },
  cache: { w: 120, h: 92 },
  bucket: { w: 120, h: 116 },
  function: { w: 112, h: 100 },
  cloud: { w: 180, h: 106 },
  clock: { w: 100, h: 100 },
  mobile: { w: 74, h: 124 },
};

export const ICON_FILL_KEY = {
  queue: "messaging",
  topic: "messaging",
  stream: "messaging",
  cache: "cache",
  bucket: "bucket",
  function: "function",
  cloud: "client",
  clock: "note",
  mobile: "window",
};

export const ICON_LEGEND = {
  messaging: "queue / topic / stream",
  cache: "cache",
  bucket: "object storage",
  function: "serverless function",
};

export const isIcon = (kind) => kind in ICON_SIZES;

const loop = (x, y, pts) => ({ x, y, points: [...pts, pts[0]] });

function queue(els, { x, y, w, h, fill, ink, paper }) {
  const capW = h * 0.42;
  els.push({ type: "ellipse", x, y, width: capW, height: h, backgroundColor: fill, fillStyle: "solid", strokeColor: ink, strokeWidth: 2 });
  els.push({ type: "rectangle", x: x + capW / 2, y, width: w - capW, height: h, backgroundColor: fill, fillStyle: "solid", strokeColor: "transparent", roundness: null });
  els.push({ type: "line", x: x + capW / 2, y, points: [[0, 0], [w - capW, 0]], strokeColor: ink, strokeWidth: 2 });
  els.push({ type: "line", x: x + capW / 2, y: y + h, points: [[0, 0], [w - capW, 0]], strokeColor: ink, strokeWidth: 2 });
  els.push({ type: "ellipse", x: x + w - capW, y, width: capW, height: h, backgroundColor: fill, fillStyle: "solid", strokeColor: ink, strokeWidth: 2 });
  const n = 3;
  const gap = 6;
  const span = w - capW * 1.6;
  const mw = (span - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    els.push({ type: "rectangle", x: x + capW * 0.55 + i * (mw + gap), y: y + h * 0.3, width: mw, height: h * 0.4, backgroundColor: paper, fillStyle: "solid", strokeColor: ink, strokeWidth: 1, roundness: { type: 3 } });
  }
}

function topic(els, { x, y, w, h, fill, ink }) {
  const r = Math.min(h * 0.32, w * 0.3);
  const hub = { x: x + r + 4, y: y + h / 2 };
  const sr = h * 0.12;
  const sats = [0.14, 0.5, 0.86].map((t) => ({ x: x + w - sr - 2, y: y + h * t }));
  for (const s of sats) els.push({ type: "line", x: hub.x, y: hub.y, points: [[0, 0], [s.x - hub.x, s.y - hub.y]], strokeColor: ink, strokeWidth: 2 });
  els.push({ type: "ellipse", x: hub.x - r, y: hub.y - r, width: r * 2, height: r * 2, backgroundColor: fill, fillStyle: "solid", strokeColor: ink, strokeWidth: 2 });
  for (const s of sats) els.push({ type: "ellipse", x: s.x - sr, y: s.y - sr, width: sr * 2, height: sr * 2, backgroundColor: fill, fillStyle: "solid", strokeColor: ink, strokeWidth: 2 });
}

function stream(els, { x, y, w, h, fill, ink }) {
  const cells = 6;
  const arrowW = 22;
  const rowH = (h - 10) / 2;
  const cw = (w - arrowW) / cells;
  [0, 1].forEach((row) => {
    const ry = y + row * (rowH + 10);
    for (let i = 0; i < cells; i++) {
      const filled = i < cells - 1 - row;
      els.push({ type: "rectangle", x: x + i * cw, y: ry, width: cw, height: rowH, backgroundColor: filled ? fill : "transparent", fillStyle: "solid", strokeColor: ink, strokeWidth: filled ? 2 : 1, strokeStyle: filled ? "solid" : "dashed", roundness: null });
    }
    els.push({ type: "arrow", x: x + cells * cw + 4, y: ry + rowH / 2, points: [[0, 0], [arrowW - 4, 0]], strokeColor: ink, strokeWidth: 2, endArrowhead: "arrow", startArrowhead: null });
  });
}

function cache(els, { x, y, w, h, fill, ink }) {
  const px = 10;
  const py = 14;
  for (let i = 0; i < 4; i++) {
    const lx = x + px + ((w - px * 2) * (i + 0.5)) / 4;
    els.push({ type: "line", x: lx, y, points: [[0, 0], [0, py]], strokeColor: ink, strokeWidth: 2 });
    els.push({ type: "line", x: lx, y: y + h - py, points: [[0, 0], [0, py]], strokeColor: ink, strokeWidth: 2 });
  }
  els.push({ type: "rectangle", x: x + px, y: y + py, width: w - px * 2, height: h - py * 2, backgroundColor: fill, fillStyle: "solid", strokeColor: ink, strokeWidth: 2, roundness: { type: 3 } });
  const cx = x + w / 2;
  const cy = y + h / 2;
  const s = (h - py * 2) * 0.36;
  els.push({ type: "line", ...loop(cx + s * 0.25, cy - s, [[0, 0], [-s * 0.75, s * 1.1], [-s * 0.1, s * 1.1], [-s * 0.45, s * 2], [s * 0.5, s * 0.75], [-s * 0.1, s * 0.75]]), backgroundColor: ink, fillStyle: "solid", strokeColor: ink, strokeWidth: 1 });
}

function bucket(els, { x, y, w, h, fill, ink, paper }) {
  const rim = 26;
  els.push({ type: "line", ...loop(x, y + rim / 2, [[0, 0], [w, 0], [w * 0.84, h - rim / 2], [w * 0.16, h - rim / 2]]), backgroundColor: fill, fillStyle: "solid", strokeColor: ink, strokeWidth: 2 });
  els.push({ type: "ellipse", x, y, width: w, height: rim, backgroundColor: paper, fillStyle: "solid", strokeColor: ink, strokeWidth: 2 });
}

function fn(els, { x, y, w, h, fill, ink, family }) {
  const cx = w / 2;
  const pts = [[w * 0.25, 0], [w * 0.75, 0], [w, h / 2], [w * 0.75, h], [w * 0.25, h], [0, h / 2]];
  els.push({ type: "line", ...loop(x, y, pts), backgroundColor: fill, fillStyle: "solid", strokeColor: ink, strokeWidth: 2 });
  els.push(textBox(x + cx, y + h / 2 - 26, "λ", { size: 36, family, color: ink }));
}

function cloud(els, { x, y, w, h, fill, ink }) {
  const lobes = [
    [0.02, 0.36, 0.42, 0.6],
    [0.22, 0.06, 0.5, 0.74],
    [0.52, 0.22, 0.46, 0.66],
    [0.2, 0.46, 0.62, 0.52],
  ].map(([lx, ly, lw, lh]) => ({ x: x + lx * w, y: y + ly * h, width: lw * w, height: lh * h }));
  for (const l of lobes) els.push({ type: "ellipse", ...l, backgroundColor: fill, fillStyle: "solid", strokeColor: ink, strokeWidth: 2 });
  const inset = 4;
  for (const l of lobes) els.push({ type: "ellipse", x: l.x + inset, y: l.y + inset, width: l.width - inset * 2, height: l.height - inset * 2, backgroundColor: fill, fillStyle: "solid", strokeColor: "transparent", strokeWidth: 0 });
}

function clock(els, { x, y, w, h, fill, ink }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  els.push({ type: "ellipse", x, y, width: w, height: h, backgroundColor: fill, fillStyle: "solid", strokeColor: ink, strokeWidth: 2 });
  els.push({ type: "line", x: cx, y: cy, points: [[0, 0], [0, -h * 0.32]], strokeColor: ink, strokeWidth: 3 });
  els.push({ type: "line", x: cx, y: cy, points: [[0, 0], [w * 0.22, h * 0.08]], strokeColor: ink, strokeWidth: 3 });
  els.push({ type: "ellipse", x: cx - 4, y: cy - 4, width: 8, height: 8, backgroundColor: ink, fillStyle: "solid", strokeColor: ink });
}

function mobile(els, { x, y, w, h, fill, ink, screen }) {
  els.push({ type: "rectangle", x, y, width: w, height: h, backgroundColor: fill, fillStyle: "solid", strokeColor: ink, strokeWidth: 2, roundness: { type: 3 } });
  els.push({ type: "rectangle", x: x + 7, y: y + 16, width: w - 14, height: h - 38, backgroundColor: screen, fillStyle: "solid", strokeColor: ink, strokeWidth: 1, roundness: null });
  els.push({ type: "ellipse", x: x + w / 2 - 6, y: y + h - 17, width: 12, height: 12, backgroundColor: "transparent", strokeColor: ink, strokeWidth: 1 });
}

const DRAW = { queue, topic, stream, cache, bucket, function: fn, cloud, clock, mobile };

export function drawIcon(kind, els, box, theme, fillOverride) {
  DRAW[kind](els, {
    ...box,
    fill: fillOverride ?? theme.fills[ICON_FILL_KEY[kind]],
    ink: theme.ink,
    paper: theme.fills.window,
    screen: theme.fills.client,
    family: theme.font.primary,
  });
}
