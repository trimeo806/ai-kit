#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname, basename, extname } from "node:path";
import { buildSkeleton } from "./presets/preset-registry.mjs";
import { openRenderer } from "./render/browser-renderer.mjs";
import { renderWithServer } from "./render/render-client.mjs";

const PREVIEW_SCALE = 0.75;

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: node mmd-to-excalidraw.mjs <input.mmd|input.json> [outBase] [--preset auto|sequence|calltree|mermaid|flow|whiteboard] [--theme light|dark] [--font hand|code|sans] [--title TEXT] [--check] [--preview] [--no-png] [--no-calls] [--scale N] [--no-server]");
  process.exit(2);
}
const valueFlags = ["--scale", "--layout", "--preset", "--title", "--theme", "--font"];
const flagValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const input = resolve(args[0]);
const positional = args.filter((a, i) => i > 0 && !a.startsWith("--") && !valueFlags.includes(args[i - 1]));
const outBase = resolve(positional[0] ?? join(dirname(input), basename(input, extname(input)).replace(/\.(flow|wb|calltree)$/, "")));
const wantPng = !args.includes("--no-png");
const scale = Number(flagValue("--scale", args.includes("--preview") ? PREVIEW_SCALE : 2));

const source = readFileSync(input, "utf8");
const { preset, skeleton, theme, warnings } = buildSkeleton(source, {
  preset: flagValue("--preset", flagValue("--layout", "auto")),
  title: flagValue("--title", undefined),
  theme: flagValue("--theme", undefined),
  font: flagValue("--font", undefined),
  calls: !args.includes("--no-calls"),
});

if (args.includes("--check")) {
  console.log(JSON.stringify({ preset, warnings }, null, 2));
  process.exit(0);
}

const payload = { source, skeleton, wantPng, scale, background: theme.bg };

async function renderInProcess() {
  const renderer = await openRenderer();
  try {
    return await renderer.render(payload);
  } finally {
    await renderer.close();
  }
}

async function render() {
  if (args.includes("--no-server") || process.env.LWMA_NO_SERVER) return renderInProcess();
  try {
    return await renderWithServer(payload);
  } catch (e) {
    if (e.renderFailed) throw e;
    console.error(`WARN: render server unavailable (${e.message}); rendering in-process.`);
    return renderInProcess();
  }
}

const result = await render().catch((e) => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});
const scene = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements: result.elements,
  appState: { viewBackgroundColor: theme.bg, gridSize: null },
  files: result.files,
};
writeFileSync(`${outBase}.excalidraw`, JSON.stringify(scene, null, 2));
if (result.png) writeFileSync(`${outBase}.png`, Buffer.from(result.png, "base64"));

const fallback = result.types.image && Object.keys(result.types).length === 1;
console.log(JSON.stringify({
  preset,
  theme: theme.name,
  excalidraw: `${outBase}.excalidraw`,
  png: result.png ? `${outBase}.png` : null,
  scale,
  elementTypes: result.types,
  warnings,
  imageFallback: Boolean(fallback),
}, null, 2));
if (fallback) {
  console.error("WARN: diagram type not natively supported; output is a single embedded image.");
}
