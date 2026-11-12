import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const LIBRARY_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "assets", "excalidraw-libraries");
export const LIBRARY_MARKER = "__library";
const DEFAULT_MAX_SIDE = 110;
const NEAR_BLACK = new Set(["#000", "#000000", "#1e1e1e", "#212529", "#343a40", "black"]);
const NEAR_WHITE = new Set(["#fff", "#ffffff", "#f8f9fa", "white"]);

let catalogCache = null;
const libCache = new Map();

export function loadCatalog() {
  catalogCache ??= JSON.parse(readFileSync(join(LIBRARY_DIR, "catalog.json"), "utf8"));
  return catalogCache;
}

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

export function loadLibrary(id) {
  if (libCache.has(id)) return libCache.get(id);
  const meta = loadCatalog().libraries[id];
  if (!meta) throw new Error(`unknown library "${id}" (use: ${Object.keys(loadCatalog().libraries).join(", ")})`);
  const raw = JSON.parse(readFileSync(join(LIBRARY_DIR, meta.file), "utf8"));
  const list = raw.libraryItems ?? (raw.library ?? []).map((elements) => ({ elements }));
  const items = list.map((it, i) => ({
    index: i,
    name: meta.names?.[i] ?? it.name ?? "",
    elements: it.elements.filter((e) => !e.isDeleted),
  }));
  const lib = { id, ...meta, items };
  libCache.set(id, lib);
  return lib;
}

export function resolveLibraryItem(ref) {
  const at = String(ref).indexOf(":");
  if (at < 0) throw new Error(`library ref "${ref}" must be "<library>:<item name>" or "<library>:#<index>"`);
  const lib = loadLibrary(ref.slice(0, at).trim());
  const key = ref.slice(at + 1).trim();
  const byIndex = /^#(\d+)$/.exec(key);
  const item = byIndex
    ? lib.items[Number(byIndex[1])]
    : lib.items.find((it) => norm(it.name) === norm(key)) ?? lib.items.find((it) => it.name && norm(it.name).includes(norm(key)));
  if (!item) {
    const names = lib.items.map((it) => it.name || `#${it.index}`).join(", ");
    throw new Error(`library "${lib.id}" has no item "${key}". Items: ${names}`);
  }
  return item;
}

function bounds(elements) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of elements) {
    if (Array.isArray(e.points) && e.points.length) {
      for (const [px, py] of e.points) {
        x0 = Math.min(x0, e.x + px); y0 = Math.min(y0, e.y + py);
        x1 = Math.max(x1, e.x + px); y1 = Math.max(y1, e.y + py);
      }
    } else {
      x0 = Math.min(x0, e.x); y0 = Math.min(y0, e.y);
      x1 = Math.max(x1, e.x + (e.width ?? 0)); y1 = Math.max(y1, e.y + (e.height ?? 0));
    }
  }
  return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
}

export function librarySize(ref, { w, h } = {}) {
  const b = bounds(resolveLibraryItem(ref).elements);
  if (w && h) return { w, h };
  if (w) return { w, h: (w * b.h) / b.w };
  if (h) return { w: (h * b.w) / b.h, h };
  const s = DEFAULT_MAX_SIDE / Math.max(b.w, b.h);
  return { w: b.w * s, h: b.h * s };
}

function toneOf(color) {
  const c = color.toLowerCase();
  if (NEAR_BLACK.has(c)) return { lum: 0, sat: 0 };
  if (NEAR_WHITE.has(c)) return { lum: 1, sat: 0 };
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(c);
  if (!m) return null;
  const hex = m[1].length === 3 ? [...m[1]].map((ch) => ch + ch).join("") : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return { lum: 0.2126 * r + 0.7152 * g + 0.0722 * b, sat: max ? (max - min) / max : 0 };
}

function recolor(color, theme, kind) {
  if (theme.name !== "dark" || typeof color !== "string") return color;
  const tone = toneOf(color);
  if (!tone || tone.sat > 0.2) return color;
  if (kind === "bg") return tone.lum > 0.55 ? theme.fills.client : color;
  return tone.lum < 0.35 ? theme.ink : color;
}

let placement = 0;

export function placeLibraryItem(ref, box, theme, { colors = "theme" } = {}) {
  const item = resolveLibraryItem(ref);
  const b = bounds(item.elements);
  const s = Math.min(box.w / b.w, box.h / b.h);
  const ox = box.x + (box.w - b.w * s) / 2;
  const oy = box.y + (box.h - b.h * s) / 2;
  const tag = `lib${++placement}`;
  const ids = new Map(item.elements.map((e, i) => [e.id, `${tag}-${i}`]));
  const groups = new Map();
  const gid = (g) => (groups.has(g) ? groups.get(g) : (groups.set(g, `${tag}-g${groups.size}`), groups.get(g)));
  const paint = colors === "theme" ? (c, k) => recolor(c, theme, k) : (c) => c;
  const elements = item.elements.map((e) => {
    const out = {
      ...e,
      id: ids.get(e.id),
      x: ox + (e.x - b.x) * s,
      y: oy + (e.y - b.y) * s,
      width: (e.width ?? 0) * s,
      height: (e.height ?? 0) * s,
      groupIds: [...(e.groupIds ?? []).map(gid), `${tag}-item`],
      frameId: null,
      strokeColor: paint(e.strokeColor, e.strokeColor === e.backgroundColor ? "bg" : "stroke"),
      backgroundColor: paint(e.backgroundColor, "bg"),
      seed: Math.floor(Math.random() * 2 ** 31),
    };
    if (Array.isArray(e.points)) out.points = e.points.map(([px, py]) => [px * s, py * s]);
    if (e.fontSize) out.fontSize = e.fontSize * s;
    if (e.containerId) out.containerId = ids.get(e.containerId) ?? null;
    if (e.boundElements) out.boundElements = e.boundElements.filter((x) => ids.has(x.id)).map((x) => ({ ...x, id: ids.get(x.id) }));
    for (const k of ["startBinding", "endBinding"]) {
      if (e[k]) out[k] = ids.has(e[k].elementId) ? { ...e[k], elementId: ids.get(e[k].elementId) } : null;
    }
    return out;
  });
  return { type: LIBRARY_MARKER, elements };
}

export function allLibraryItems() {
  return Object.keys(loadCatalog().libraries).flatMap((id) =>
    loadLibrary(id).items.map((it) => ({
      id: `${id}-${it.index}`,
      status: "published",
      created: 1,
      name: `${id}: ${it.name || `#${it.index}`}`,
      elements: it.elements,
    })),
  );
}
