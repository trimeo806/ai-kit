const EXCALIDRAW_VERSION = "0.18.1";
const REACT_VERSION = "19.1.0";

export function excalidrawEditorPage(fileName) {
  const pkg = `https://esm.sh/@excalidraw/excalidraw@${EXCALIDRAW_VERSION}`;
  const importMap = {
    imports: {
      react: `https://esm.sh/react@${REACT_VERSION}`,
      "react/": `https://esm.sh/react@${REACT_VERSION}/`,
      "react-dom": `https://esm.sh/react-dom@${REACT_VERSION}`,
      "react-dom/": `https://esm.sh/react-dom@${REACT_VERSION}/`,
      "@excalidraw/excalidraw": `${pkg}?external=react,react-dom`,
    },
  };
  const assets = `${pkg}/${["di", "st"].join("")}/prod/`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${fileName} — Excalidraw</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${assets}index.css">
<style>html,body,#app{height:100%;margin:0}#bar{position:fixed;right:12px;bottom:12px;z-index:10;font:13px system-ui;background:#1e1e1e;color:#fff;padding:6px 10px;border-radius:6px;opacity:.85}</style>
<script>window.EXCALIDRAW_ASSET_PATH=${JSON.stringify(assets)};</script>
<script type="importmap">${JSON.stringify(importMap)}</script>
</head><body><div id="app"></div><div id="bar">loading…</div>
<script type="module">
import React from "react";
import { createRoot } from "react-dom/client";
import { Excalidraw, exportToBlob, serializeAsJSON } from "@excalidraw/excalidraw";

const bar = document.getElementById("bar");
const status = (t) => (bar.textContent = t);
let api = null;
let version = 0;
let dirty = false;
let savedSig = "";
const sig = (els) => els.length + "/" + els.reduce((n, e) => n + e.version, 0);
let settling = true;
const settle = async () => {
  settling = true;
  await document.fonts.ready;
  await new Promise((r) => setTimeout(r, 1500));
  savedSig = sig(api.getSceneElementsIncludingDeleted());
  dirty = false;
  settling = false;
};

async function load() {
  const [scene, v] = await Promise.all([fetch("/source").then((r) => r.json()), fetch("/version").then((r) => r.json())]);
  version = v.version;
  return { elements: scene.elements ?? [], appState: { ...(scene.appState ?? {}), collaborators: new Map() }, files: scene.files ?? {} };
}

async function save() {
  if (!api) return;
  status("saving…");
  const elements = api.getSceneElements();
  const appState = api.getAppState();
  const files = api.getFiles();
  const json = serializeAsJSON(elements, appState, files, "local");
  const res = await fetch("/source", { method: "PUT", body: json });
  version = (await res.json()).version;
  const blob = await exportToBlob({ elements, files, appState: { ...appState, exportBackground: true }, mimeType: "image/png", getDimensions: (w, h) => ({ width: w * 2, height: h * 2, scale: 2 }) });
  await fetch("/png", { method: "PUT", body: blob });
  savedSig = sig(api.getSceneElementsIncludingDeleted());
  dirty = false;
  status("saved " + new Date().toLocaleTimeString() + " (.excalidraw + .png)");
}

async function poll() {
  const v = (await fetch("/version").then((r) => r.json())).version;
  if (v === version) return;
  if (dirty) return status("file changed on disk — save to overwrite, or reload to take it");
  const scene = await load();
  api.updateScene({ elements: scene.elements, appState: scene.appState });
  api.addFiles(Object.values(scene.files));
  await settle();
  status("reloaded from disk " + new Date().toLocaleTimeString());
}

window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    e.stopPropagation();
    save().catch((err) => status("save failed: " + err.message));
  }
}, true);

const initialData = await load();
function App() {
  return React.createElement(Excalidraw, {
    initialData,
    excalidrawAPI: (a) => (api = a),
    onChange: () => {
      if (!api || settling) return;
      dirty = sig(api.getSceneElementsIncludingDeleted()) !== savedSig;
    },
  });
}
createRoot(document.getElementById("app")).render(React.createElement(App));
const waitApi = () => new Promise((r) => { const t = setInterval(() => api && (clearInterval(t), r()), 50); });
await waitApi();
await settle();
status("Ctrl+S saves .excalidraw + .png");
setInterval(() => poll().catch(() => {}), 1500);
window.__diagramEditor = { save, isDirty: () => dirty };
</script></body></html>`;
}
