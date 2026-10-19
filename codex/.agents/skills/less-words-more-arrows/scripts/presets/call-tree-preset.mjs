import { textW, textBox } from "../scene/scene-primitives.mjs";

const ROW_H = 58;
const BOX_H = 38;
const INDENT = 54;
const ASYNC = /^(async|pubsub|pub\/sub|queue|event)\b/i;

export function parseCallTree(src) {
  const lines = src.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"));
  const head = /^calltree\b\s*:?\s*(.*)$/i.exec(lines[0]?.trim() ?? "");
  if (!head) throw new Error('call tree input must start with "calltree: <title>"');
  const rows = [];
  const parents = [];
  for (const raw of lines.slice(1)) {
    const indent = raw.length - raw.trimStart().length;
    const depth = Math.floor(indent / 2);
    const [service = "", call = "", location = "", note = ""] = raw.trim().split("|").map((s) => s.trim());
    if (!call) throw new Error(`call tree line needs "service | call | location | note": ${raw.trim()}`);
    if (depth > parents.length) throw new Error(`indent jumps more than one level at: ${raw.trim()}`);
    parents.length = depth;
    const parent = parents.at(-1) ?? null;
    const row = { depth, call, location, note, parent, service: service || parent?.service || "" };
    rows.push(row);
    parents.push(row);
  }
  return { title: head[1], rows };
}

export function buildCallTreeSkeleton(src, theme, { title } = {}) {
  const T = theme;
  const MONO = T.font.mono;
  const SANS = T.font.secondary;
  const { title: specTitle, rows } = parseCallTree(src);
  const services = [...new Set(rows.map((r) => r.service))];
  const colorOf = (s) => {
    const i = services.indexOf(s);
    return { fill: T.series.fills[i % T.series.fills.length], stroke: T.series.strokes[i % T.series.strokes.length] };
  };

  const els = [];
  const heading = title ?? specTitle;
  let y0 = 0;
  if (heading) {
    els.push(textBox(0, 0, heading, { size: 28, family: T.font.primary, color: T.ink, align: "left" }));
    y0 = 56;
  }
  let lx = 0;
  for (const s of services) {
    const c = colorOf(s);
    els.push({ type: "rectangle", x: lx, y: y0, width: 22, height: 16, backgroundColor: c.fill, fillStyle: "solid", strokeColor: c.stroke, strokeWidth: 1, roundness: { type: 3 } });
    els.push(textBox(lx + 28, y0 - 3, s || "(service)", { size: 14, family: SANS, color: T.ink, align: "left" }));
    lx += 28 + textW(s || "(service)", 14, SANS) + 40;
  }
  const top = y0 + 44;

  rows.forEach((r, i) => {
    r.x = r.depth * INDENT;
    r.y = top + i * ROW_H;
    r.w = textW(r.call, 15, MONO) + 26;
  });

  for (const r of rows) {
    if (!r.parent) continue;
    const p = r.parent;
    const sx = p.x + 18;
    const sy = p.y + BOX_H;
    const ty = r.y + BOX_H / 2;
    const cross = r.service !== p.service;
    const async = ASYNC.test(r.note);
    els.push({ type: "arrow", x: sx, y: sy, points: [[0, 0], [0, ty - sy], [r.x - sx - 4, ty - sy]], strokeColor: cross ? colorOf(r.service).stroke : T.faint, strokeWidth: cross ? 2 : 1.5, strokeStyle: async ? "dashed" : "solid", endArrowhead: cross ? "triangle" : "arrow", roundness: null });
  }

  for (const r of rows) {
    const c = colorOf(r.service);
    const cross = r.parent && r.service !== r.parent.service;
    els.push({ type: "rectangle", x: r.x, y: r.y, width: r.w, height: BOX_H, backgroundColor: c.fill, fillStyle: "solid", strokeColor: c.stroke, strokeWidth: cross ? 3 : 2, roundness: { type: 3 }, label: { text: r.call, fontSize: 15, fontFamily: MONO, strokeColor: T.ink } });
    let tx = r.x + r.w + 12;
    if (cross) {
      const tag = `→ ${r.service}`;
      els.push({ type: "rectangle", x: tx, y: r.y + 7, width: textW(tag, 13, SANS) + 18, height: 24, backgroundColor: c.stroke, fillStyle: "solid", strokeColor: c.stroke, strokeWidth: 1, roundness: { type: 3 }, label: { text: tag, fontSize: 13, fontFamily: SANS, strokeColor: T.bg } });
      tx += textW(tag, 13, SANS) + 30;
    }
    const meta = [r.location, r.note].filter(Boolean).join("   ");
    if (meta) els.push(textBox(tx, r.y + 7, meta, { size: 13, family: MONO, color: T.muted, align: "left" }));
  }
  return els;
}
