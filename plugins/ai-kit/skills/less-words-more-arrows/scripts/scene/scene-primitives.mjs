import { FONT_FAMILY } from "./theme-tokens.mjs";

const CHAR_RATIO = { [FONT_FAMILY.sans]: 0.56, [FONT_FAMILY.mono]: 0.61, [FONT_FAMILY.code]: 0.6 };

export const CIRCLED = (n) => (n >= 1 && n <= 20 ? String.fromCharCode(0x245f + n) : `(${n})`);

const UPPER = /[A-Z0-9_%@#&MW]/;

const lineUnits = (line, family) =>
  family === FONT_FAMILY.mono || family === FONT_FAMILY.code
    ? line.length
    : [...line].reduce((n, ch) => n + (UPPER.test(ch) ? 1.25 : 1), 0);

export const textW = (s, size, family) =>
  Math.max(...String(s).split("\n").map((l) => lineUnits(l, family))) * size * (CHAR_RATIO[family] ?? 0.62);

export const textH = (s, size) => String(s).split("\n").length * size * 1.3;

export function textBox(cx, y, text, { size = 16, family, color, align = "center", background } = {}) {
  const w = textW(text, size, family) + 16;
  const h = textH(text, size) + 4;
  return {
    type: "rectangle",
    x: align === "left" ? cx : cx - w / 2,
    y,
    width: w,
    height: h,
    strokeColor: "transparent",
    backgroundColor: background ?? "transparent",
    ...(background ? { fillStyle: "solid" } : {}),
    label: { text, fontSize: size, fontFamily: family, strokeColor: color, textAlign: align, verticalAlign: "middle" },
  };
}

export function drawCylinder(els, { x, y, w, h, fill, stroke, capH = 28 }) {
  els.push({ type: "ellipse", x, y: y + h - capH, width: w, height: capH, backgroundColor: fill, fillStyle: "solid", strokeColor: stroke, strokeWidth: 2 });
  els.push({ type: "rectangle", x, y: y + capH / 2, width: w, height: h - capH, backgroundColor: fill, fillStyle: "solid", strokeColor: "transparent", roundness: null });
  els.push({ type: "line", x, y: y + capH / 2, points: [[0, 0], [0, h - capH]], strokeColor: stroke, strokeWidth: 2 });
  els.push({ type: "line", x: x + w, y: y + capH / 2, points: [[0, 0], [0, h - capH]], strokeColor: stroke, strokeWidth: 2 });
  for (const t of [0.36, 0.62]) {
    els.push({ type: "line", x, y: y + h * t, points: [[0, 0], [w / 2, capH / 2], [w, 0]], strokeColor: stroke, strokeWidth: 2, roundness: { type: 2 } });
  }
  els.push({ type: "ellipse", x, y, width: w, height: capH, backgroundColor: fill, fillStyle: "solid", strokeColor: stroke, strokeWidth: 2 });
}
