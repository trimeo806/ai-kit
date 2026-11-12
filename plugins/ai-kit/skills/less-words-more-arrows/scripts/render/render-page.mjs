import { createHash } from "node:crypto";
import { LIBRARY_MARKER } from "../scene/library-items.mjs";

const M2E_VERSION = "2.2.2";
const EXCALIDRAW_VERSION = "0.18.1";
const REACT_VERSION = "19.1.0";

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

export const RENDER_PAGE_HTML = `<!doctype html><html><head><meta charset="utf-8">
<script>window.EXCALIDRAW_ASSET_PATH="https://esm.sh/@excalidraw/excalidraw@${EXCALIDRAW_VERSION}/dist/prod/";</script>
<script type="importmap">${JSON.stringify(importMap)}</script>
<script type="module">
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { convertToExcalidrawElements, exportToBlob, restoreElements } from "@excalidraw/excalidraw";
const toElements = (skeleton) => {
  const out = [];
  let run = [];
  const flush = () => {
    if (run.length) out.push(...convertToExcalidrawElements(run, { regenerateIds: true }));
    run = [];
  };
  for (const el of skeleton) {
    if (el.type !== ${JSON.stringify(LIBRARY_MARKER)}) { run.push(el); continue; }
    flush();
    out.push(...restoreElements(el.elements, null));
  }
  flush();
  return out;
};
window.__convert = async (src, prebuilt, wantPng, scale, bg) => {
  let skeleton = prebuilt;
  let files = {};
  if (!skeleton) {
    const parsed = await parseMermaidToExcalidraw(src, { themeVariables: { fontSize: "16px" } });
    skeleton = parsed.elements;
    files = parsed.files ?? {};
  }
  const elements = toElements(skeleton);
  const appState = { viewBackgroundColor: bg, exportBackground: true, exportWithDarkMode: false, exportPadding: 24 };
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

export const RENDER_PAGE_ID = createHash("sha1").update(RENDER_PAGE_HTML).digest("hex").slice(0, 12);
