import { CIRCLED, textW, textH, textBox, drawCylinder } from "../scene/scene-primitives.mjs";
import { drawIcon } from "../scene/component-icons.mjs";

const STORE = /\b(db|database|postgres|alloydb|alloy|mysql|mongo|sql)\b/i;
const MESSAGING = /\b(topic|queue|kafka|pub\/?sub|stream|bus)\b/i;
const HEAD_H = 64;
const ROW = 54;
const BAR_W = 12;
const FRAME_PAD = 26;

export function parseSequenceEvents(src) {
  const lines = src.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("%%"));
  if (!/^sequenceDiagram\b/.test(lines[0] ?? "")) throw new Error("sequence preset requires a sequenceDiagram input");
  const parts = new Map();
  const add = (id, label, kind) => {
    if (!parts.has(id)) parts.set(id, { id, label: (label ?? id).trim(), kind: kind ?? "participant" });
  };
  const events = [];
  const declRe = /^(participant|actor)\s+(\S+?)(?:\s+as\s+(.+))?$/;
  const msgRe = /^([^\s\-+]+?)\s*(-->>|->>|--x|-x|--\)|-\)|-->|->)\s*[+-]?\s*([^\s:]+)\s*:\s*(.*)$/;
  const openRe = /^(alt|opt|loop|par|critical|break|rect)\b\s*(.*)$/;
  const elseRe = /^(else|and|option)\b\s*(.*)$/;
  const noteRe = /^note\s+(over|left of|right of)\s+([^:]+):\s*(.*)$/i;
  let n = 0;
  for (const line of lines.slice(1)) {
    let m;
    if ((m = declRe.exec(line))) add(m[2], m[3], m[1]);
    else if ((m = msgRe.exec(line))) {
      add(m[1]);
      add(m[3]);
      events.push({ type: "msg", from: m[1], to: m[3], dashed: m[2].startsWith("--"), async: m[2].endsWith(")"), text: m[4], n: ++n });
    } else if ((m = openRe.exec(line))) events.push({ type: "open", kind: m[1], label: m[2] });
    else if ((m = elseRe.exec(line))) events.push({ type: "else", kind: m[1], label: m[2] });
    else if (line === "end") events.push({ type: "end" });
    else if ((m = noteRe.exec(line))) {
      const ids = m[2].split(",").map((s) => s.trim());
      ids.forEach((id) => add(id));
      events.push({ type: "note", ids, text: m[3].replace(/<br\s*\/?>/gi, "\n") });
    }
  }
  return { participants: [...parts.values()], events };
}

function headerKind(p) {
  if (p.kind === "actor") return "person";
  if (MESSAGING.test(p.label) || MESSAGING.test(p.id)) return "messaging";
  if (STORE.test(p.label) || STORE.test(p.id)) return "store";
  return "box";
}

function drawHeader(T, p, i, y, els) {
  const { x, w, cx } = p;
  const label = textBox(cx, y + HEAD_H + 4, p.label, { size: 16, family: T.font.primary, color: T.ink });
  if (p.head === "person") {
    els.push({ type: "ellipse", x: cx - 13, y, width: 26, height: 26, backgroundColor: T.fills.person, fillStyle: "solid", strokeColor: T.ink, strokeWidth: 2 });
    els.push({ type: "rectangle", x: cx - 26, y: y + 30, width: 52, height: HEAD_H - 30, backgroundColor: T.fills.person, fillStyle: "solid", strokeColor: T.ink, strokeWidth: 2, roundness: { type: 3 } });
    els.push(label);
  } else if (p.head === "store") {
    drawCylinder(els, { x: cx - 45, y, w: 90, h: HEAD_H, fill: T.fills.database, stroke: T.ink, capH: 18 });
    els.push(label);
  } else if (p.head === "messaging") {
    drawIcon("topic", els, { x: cx - 40, y: y + 2, w: 80, h: HEAD_H - 4 }, T);
    els.push(label);
  } else {
    els.push({ type: "rectangle", x, y, width: w, height: HEAD_H, backgroundColor: T.series.fills[i % T.series.fills.length], fillStyle: "solid", strokeColor: T.series.strokes[i % T.series.strokes.length], strokeWidth: 2, roundness: { type: 3 }, label: { text: p.label, fontSize: 17, fontFamily: T.font.primary, strokeColor: T.ink } });
  }
}

export function buildSequenceSkeleton(src, theme, { title } = {}) {
  const T = theme;
  const SANS = T.font.secondary;
  const { participants, events } = parseSequenceEvents(src);
  const idx = new Map(participants.map((p, i) => [p.id, i]));
  const labelW = (e) => textW(`${CIRCLED(e.n)} ${e.text}`, 14, SANS) + 30;

  participants.forEach((p) => {
    p.head = headerKind(p);
    p.w = p.head === "box" ? Math.max(140, textW(p.label, 17, T.font.primary) + 36) : Math.max(110, textW(p.label, 16, T.font.primary) + 16);
  });
  const need = participants.slice(1).map(() => 0);
  for (const e of events) {
    if (e.type !== "msg" || e.from === e.to) continue;
    const a = Math.min(idx.get(e.from), idx.get(e.to));
    const b = Math.max(idx.get(e.from), idx.get(e.to));
    const per = labelW(e) / (b - a);
    for (let k = a; k < b; k++) need[k] = Math.max(need[k], per);
  }
  let cx = 0;
  participants.forEach((p, i) => {
    if (i > 0) cx += Math.max(200, (participants[i - 1].w + p.w) / 2 + 50, need[i - 1]);
    p.cx = cx;
    p.x = cx - p.w / 2;
  });

  const top = title ? 70 : 0;
  const els = [];
  const late = [];
  const bars = [];
  const arrows = [];
  const frames = [];
  const stack = [];
  const callStack = [];
  let y = top + HEAD_H + 34 + 30;

  const touch = (...cols) => stack.forEach((f) => cols.forEach((c) => { f.min = Math.min(f.min, c); f.max = Math.max(f.max, c); }));

  for (const e of events) {
    if (e.type === "open") {
      stack.push({ kind: e.kind, label: e.label, y0: y - 4, min: Infinity, max: -Infinity, dividers: [], depth: stack.length });
      y += 34;
    } else if (e.type === "else") {
      const f = stack.at(-1);
      if (f) f.dividers.push({ y: y - 4, label: e.label });
      y += 34;
    } else if (e.type === "end") {
      const f = stack.pop();
      if (f) {
        f.y1 = y - 6;
        frames.push(f);
        if (stack.length) touch(f.min, f.max);
        y += 18;
      }
    } else if (e.type === "note") {
      const cols = e.ids.map((id) => idx.get(id));
      touch(...cols);
      const lo = participants[Math.min(...cols)];
      const hi = participants[Math.max(...cols)];
      const w = Math.max(hi.cx - lo.cx + 120, textW(e.text, 14, SANS) + 30);
      const h = textH(e.text, 14) + 16;
      const mid = (lo.cx + hi.cx) / 2;
      els.push({ type: "rectangle", x: mid - w / 2, y, width: w, height: h, backgroundColor: T.fills.note, fillStyle: "solid", strokeColor: T.fills.noteStroke, strokeWidth: 1, roundness: { type: 3 }, label: { text: e.text, fontSize: 14, fontFamily: SANS, strokeColor: T.ink } });
      y += h + 22;
    } else {
      const a = idx.get(e.from);
      const b = idx.get(e.to);
      touch(a, b);
      const text = `${CIRCLED(e.n)} ${e.text}`;
      if (a === b) {
        arrows.push({ self: true, x: participants[a].cx + BAR_W / 2, y, text, dashed: e.dashed });
        y += ROW + 16;
        continue;
      }
      if (e.dashed) {
        const k = callStack.findLastIndex((c) => c.from === e.to && c.to === e.from);
        if (k >= 0) {
          const c = callStack.splice(k, 1)[0];
          bars.push({ col: a, y0: c.y - 8, y1: y + 8 });
        }
      } else {
        callStack.push({ from: e.from, to: e.to, y });
      }
      arrows.push({ a, b, y, text, dashed: e.dashed, async: e.async });
      y += ROW;
    }
  }
  for (const c of callStack) bars.push({ col: idx.get(c.to), y0: c.y - 8, y1: c.y + 30 });

  const bottom = y + 10;
  participants.forEach((p, i) => {
    drawHeader(T, p, i, top, els);
    const ly = top + HEAD_H + (p.head === "box" ? 0 : 26);
    els.push({ type: "line", x: p.cx, y: ly, points: [[0, 0], [0, bottom - ly]], strokeColor: T.faint, strokeWidth: 1, strokeStyle: "dashed" });
  });

  for (const f of frames.sort((p, q) => p.depth - q.depth)) {
    if (!isFinite(f.min)) continue;
    const inset = f.depth * 10;
    const x0 = participants[f.min].cx - 120 + inset;
    const x1 = participants[f.max].cx + 120 - inset;
    els.push({ type: "rectangle", x: x0, y: f.y0, width: x1 - x0, height: f.y1 - f.y0, backgroundColor: "transparent", strokeColor: T.faint, strokeWidth: 1, roundness: null });
    const tag = f.kind;
    const tw = textW(tag, 14, SANS) + 18;
    late.push({ type: "rectangle", x: x0, y: f.y0, width: tw, height: 24, backgroundColor: T.panel, fillStyle: "solid", strokeColor: T.faint, strokeWidth: 1, roundness: null, label: { text: tag, fontSize: 14, fontFamily: SANS, strokeColor: T.ink } });
    if (f.label) late.push(textBox(x0 + tw + 6, f.y0 + 2, `[${f.label}]`, { size: 14, family: SANS, color: T.muted, align: "left", background: T.bg }));
    for (const d of f.dividers) {
      els.push({ type: "line", x: x0, y: d.y, points: [[0, 0], [x1 - x0, 0]], strokeColor: T.faint, strokeWidth: 1, strokeStyle: "dashed" });
      if (d.label) late.push(textBox(x0 + 8, d.y + 4, `[${d.label}]`, { size: 14, family: SANS, color: T.muted, align: "left", background: T.bg }));
    }
  }

  for (const b of bars) {
    const p = participants[b.col];
    els.push({ type: "rectangle", x: p.cx - BAR_W / 2, y: b.y0, width: BAR_W, height: b.y1 - b.y0, backgroundColor: T.panel, fillStyle: "solid", strokeColor: T.ink, strokeWidth: 1, roundness: null });
  }

  for (const r of arrows) {
    const color = r.dashed ? T.muted : T.ink;
    if (r.self) {
      els.push({ type: "arrow", x: r.x, y: r.y, points: [[0, 0], [44, 0], [44, 26], [0, 26]], strokeColor: color, strokeWidth: 2, strokeStyle: r.dashed ? "dashed" : "solid", endArrowhead: "arrow", roundness: null });
      els.push(textBox(r.x + 52, r.y + 2, r.text, { size: 14, family: SANS, color: T.ink, align: "left" }));
      continue;
    }
    const dir = Math.sign(participants[r.b].cx - participants[r.a].cx);
    const x0 = participants[r.a].cx + (dir * BAR_W) / 2;
    const x1 = participants[r.b].cx - (dir * BAR_W) / 2;
    els.push({ type: "arrow", x: x0, y: r.y, points: [[0, 0], [x1 - x0, 0]], strokeColor: color, strokeWidth: 2, strokeStyle: r.dashed ? "dashed" : "solid", endArrowhead: r.async ? "triangle" : "arrow", startArrowhead: null, roundness: null });
    const h = textH(r.text, 14) + 14;
    late.push(textBox((x0 + x1) / 2, r.y - h - 3, r.text, { size: 14, family: SANS, color: T.ink, background: T.bg }));
  }
  els.push(...late);

  if (title) els.push(textBox(participants[0].x, 0, title, { size: 28, family: T.font.primary, color: T.ink, align: "left" }));
  return els;
}
