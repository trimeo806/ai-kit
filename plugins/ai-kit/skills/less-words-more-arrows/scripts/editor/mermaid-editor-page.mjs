const MERMAID_VERSION = "11.4.1";

export function mermaidEditorPage(fileName) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${fileName} — Mermaid</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
html,body{height:100%;margin:0;font:13px system-ui;background:#fafafa}
.wrap{display:flex;height:calc(100% - 34px)}
.src{width:38%;min-width:260px;border:0;border-right:1px solid #ddd;padding:12px;font:14px/1.5 ui-monospace,Consolas,monospace;resize:horizontal;outline:none}
.view{flex:1;overflow:auto;padding:16px;background:#fff}
.view svg{max-width:none}
.err{color:#c92a2a;white-space:pre-wrap;font-family:ui-monospace,Consolas,monospace}
.bar{height:34px;display:flex;align-items:center;gap:12px;padding:0 12px;border-top:1px solid #ddd;background:#f1f3f5}
button{font:13px system-ui;padding:4px 10px}
</style></head><body>
<div id="wrap" class="wrap"><textarea id="src" class="src" spellcheck="false"></textarea><div id="view" class="view"><div id="out"></div><div id="err" class="err"></div></div></div>
<div id="bar" class="bar"><button id="save">Save (Ctrl+S)</button><span id="status">loading…</span></div>
<script type="module">
import mermaid from "https://esm.sh/mermaid@${MERMAID_VERSION}";
mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "strict" });
const src = document.getElementById("src");
const out = document.getElementById("out");
const err = document.getElementById("err");
const statusEl = document.getElementById("status");
const status = (t) => (statusEl.textContent = t);
let version = 0;
let dirty = false;
let seq = 0;
let timer;

async function render() {
  const id = "m" + ++seq;
  try {
    const { svg } = await mermaid.render(id, src.value);
    out.innerHTML = svg;
    err.textContent = "";
  } catch (e) {
    err.textContent = String(e.message ?? e);
    document.getElementById("d" + id)?.remove();
  }
}

async function load() {
  src.value = await fetch("/source").then((r) => r.text());
  version = (await fetch("/version").then((r) => r.json())).version;
  dirty = false;
  await render();
}

async function save() {
  status("saving…");
  const res = await fetch("/source", { method: "PUT", body: src.value });
  version = (await res.json()).version;
  dirty = false;
  status("saved " + new Date().toLocaleTimeString());
}

src.addEventListener("input", () => {
  dirty = true;
  status("unsaved changes");
  clearTimeout(timer);
  timer = setTimeout(render, 300);
});
document.getElementById("save").onclick = () => save();
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    save().catch((x) => status("save failed: " + x.message));
  }
});
setInterval(async () => {
  const v = (await fetch("/version").then((r) => r.json())).version;
  if (v === version) return;
  if (dirty) return status("file changed on disk — save to overwrite, or reload to take it");
  await load();
  status("reloaded from disk " + new Date().toLocaleTimeString());
}, 1500);
await load();
status("edit left, preview right · Ctrl+S saves");
window.__diagramEditor = { save, isDirty: () => dirty };
</script></body></html>`;
}
