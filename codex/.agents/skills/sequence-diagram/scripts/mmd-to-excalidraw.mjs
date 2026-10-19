#!/usr/bin/env node
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname, basename, extname } from "node:path";
import { buildArchitectureSkeleton } from "./sequence-to-architecture-layout.mjs";
import { buildFlowSkeleton } from "./flow-spec-to-architecture-layout.mjs";

const M2E_VERSION = "2.2.2";
const EXCALIDRAW_VERSION = "0.18.1";
const REACT_VERSION = "19.1.0";

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: node mmd-to-excalidraw.mjs <input.mmd|input.flow.json> [outBase] [--layout auto|arch|mermaid|flow] [--title TEXT] [--no-png] [--no-calls] [--scale N]");
  process.exit(2);
}
const valueFlags = ["--scale", "--layout", "--title"];
const flagValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const input = resolve(args[0]);
const positional = args.filter((a, i) => i > 0 && !a.startsWith("--") && !valueFlags.includes(args[i - 1]));
const outBase = resolve(positional[0] ?? join(dirname(input), basename(input, extname(input)).replace(/\.flow$/, "")));
const wantPng = !args.includes("--no-png");
const scale = Number(flagValue("--scale", 2));
const layoutFlag = flagValue("--layout", "auto");
const title = flagValue("--title", undefined);

function loadPuppeteer() {
  const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
  const candidates = [
    join(globalRoot, "@mermaid-js", "mermaid-cli", "package.json"),
    join(globalRoot, "puppeteer", "package.json"),
  ];
  for (const c of candidates) {
    try {
      return createRequire(c)("puppeteer");
    } catch {}
  }
  throw new Error("puppeteer not found. Install: npm install -g @mermaid-js/mermaid-cli");
}

const source = readFileSync(input, "utf8");
const firstLine = source.split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith("%%")) ?? "";
const isSequence = firstLine.startsWith("sequenceDiagram");
const isFlowSpec = firstLine.startsWith("{");
const layout = layoutFlag === "auto" ? (isFlowSpec ? "flow" : isSequence ? "arch" : "mermaid") : layoutFlag;
const skeleton =
  layout === "flow"
    ? buildFlowSkeleton({ ...JSON.parse(source), ...(title ? { title } : {}) }, { calls: !args.includes("--no-calls") })
    : layout === "arch"
      ? buildArchitectureSkeleton(source, { title })
      : null;
const puppeteer = loadPuppeteer();

const importMap = {
  imports: {
    react: `https://esm.sh/react@${REACT_VERSION}`,
    "react/": `https://esm.sh/react@${REACT_VERSION}/`,
    "react-dom": `https://esm.sh/react-dom@${REACT_VERSION}`,
    "react-dom/": `https://esm.sh/react-dom@${REACT_VERSION}/`,
    "@excalidraw/excalidraw": `https://esm.sh/@excalidraw/excalidraw@${EXCALIDRAW_VERSION}?external=react,react-dom`,
    "@excalidraw/mermaid-to-excalidraw": `https://esm.sh/@excalidraw/mermaid-to-excalidraw@${M2E_VERSION}`,
  },
};

const html = `<!doctype html><html><head><meta charset="utf-8">
<script>window.EXCALIDRAW_ASSET_PATH="https://esm.sh/@excalidraw/excalidraw@${EXCALIDRAW_VERSION}/dist/prod/";</script>
<script type="importmap">${JSON.stringify(importMap)}</script>
<script type="module">
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { convertToExcalidrawElements, exportToBlob } from "@excalidraw/excalidraw";
window.__convert = async (src, prebuilt, wantPng, scale) => {
  let skeleton = prebuilt;
  let files = {};
  if (!skeleton) {
    const parsed = await parseMermaidToExcalidraw(src, { themeVariables: { fontSize: "16px" } });
    skeleton = parsed.elements;
    files = parsed.files ?? {};
  }
  const elements = convertToExcalidrawElements(skeleton, { regenerateIds: true });
  const appState = { viewBackgroundColor: "#ffffff", exportBackground: true, exportWithDarkMode: false, exportPadding: 24 };
  let png = null;
  if (wantPng) {
    await document.fonts.ready;
    const blob = await exportToBlob({ elements, files, appState, mimeType: "image/png", exportPadding: 24, getDimensions: (w, h) => ({ width: w * scale, height: h * scale, scale }) });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    png = btoa(bin);
  }
  const types = {};
  for (const el of elements) types[el.type] = (types[el.type] ?? 0) + 1;
  return { elements, files, png, types };
};
window.__ready = true;
</script></head><body></body></html>`;

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  await page.goto("about:blank");
  await page.setContent(html, { waitUntil: "networkidle0", timeout: 120000 });
  await page.waitForFunction("window.__ready === true", { timeout: 120000 }).catch(() => {
    throw new Error("Libraries failed to load from esm.sh: " + pageErrors.join("; "));
  });
  const result = await page.evaluate((s, sk, p, sc) => window.__convert(s, sk, p, sc), source, skeleton, wantPng, scale);

  const scene = {
    type: "excalidraw",
    version: 2,
    source: "https://excalidraw.com",
    elements: result.elements,
    appState: { viewBackgroundColor: "#ffffff", gridSize: null },
    files: result.files,
  };
  writeFileSync(`${outBase}.excalidraw`, JSON.stringify(scene, null, 2));
  if (result.png) writeFileSync(`${outBase}.png`, Buffer.from(result.png, "base64"));

  const fallback = result.types.image && Object.keys(result.types).length === 1;
  console.log(JSON.stringify({
    layout,
    excalidraw: `${outBase}.excalidraw`,
    png: result.png ? `${outBase}.png` : null,
    elementTypes: result.types,
    imageFallback: Boolean(fallback),
  }, null, 2));
  if (fallback) {
    console.error("WARN: diagram type not natively supported; output is a single embedded image.");
  }
} finally {
  await browser.close();
}
