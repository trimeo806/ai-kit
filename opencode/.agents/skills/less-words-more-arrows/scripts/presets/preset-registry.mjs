import { resolveTheme } from "../scene/theme-tokens.mjs";
import { buildFlowSkeleton } from "./flow-grid-preset.mjs";
import { buildWhiteboardSkeleton } from "./whiteboard-freeform-preset.mjs";
import { buildSequenceSkeleton } from "./sequence-lifeline-preset.mjs";
import { buildCallTreeSkeleton } from "./call-tree-preset.mjs";

const TEXT_PRESETS = {
  sequence: (src, theme, opts) => buildSequenceSkeleton(src, theme, opts),
  calltree: (src, theme, opts) => buildCallTreeSkeleton(src, theme, opts),
};

const JSON_PRESETS = {
  flow: (spec, theme, opts) => buildFlowSkeleton(spec, theme, { calls: opts.calls }),
  whiteboard: (spec, theme) => buildWhiteboardSkeleton(spec, theme),
};

export const PRESET_NAMES = [...Object.keys(TEXT_PRESETS), "mermaid", ...Object.keys(JSON_PRESETS)];

export function detectPreset(source) {
  const first = source.split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith("%%")) ?? "";
  if (first.startsWith("{")) return JSON.parse(source).preset ?? "flow";
  if (/^calltree\b/i.test(first)) return "calltree";
  return first.startsWith("sequenceDiagram") ? "sequence" : "mermaid";
}

export function buildSkeleton(source, { preset = "auto", title, theme, font, calls = true } = {}) {
  const name = preset === "auto" ? detectPreset(source) : preset;
  if (!PRESET_NAMES.includes(name)) throw new Error(`unknown preset "${name}" (use: ${PRESET_NAMES.join(", ")})`);
  if (name === "mermaid") return { preset: name, skeleton: null, theme: resolveTheme("light") };
  if (TEXT_PRESETS[name]) {
    const t = resolveTheme(theme ?? "light", font ?? "hand");
    return { preset: name, skeleton: TEXT_PRESETS[name](source, t, { title }), theme: t };
  }
  const spec = { ...JSON.parse(source), ...(title ? { title } : {}) };
  const t = resolveTheme(theme ?? spec.theme ?? "light", font ?? spec.font ?? "hand");
  return { preset: name, skeleton: JSON_PRESETS[name](spec, t, { calls }), theme: t };
}
