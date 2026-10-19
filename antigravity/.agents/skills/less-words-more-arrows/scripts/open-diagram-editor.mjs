#!/usr/bin/env node
import { createServer } from "node:http";
import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { resolve, basename, extname } from "node:path";
import { exec } from "node:child_process";
import { excalidrawEditorPage } from "./editor/excalidraw-editor-page.mjs";
import { mermaidEditorPage } from "./editor/mermaid-editor-page.mjs";

const args = process.argv.slice(2);
const file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--port");
if (!file) {
  console.error("Usage: node open-diagram-editor.mjs <diagram.excalidraw|diagram.mmd> [--port 5199] [--open]");
  process.exit(2);
}
const path = resolve(file);
if (!existsSync(path)) {
  console.error(`File not found: ${path}`);
  process.exit(1);
}
const ext = extname(path).toLowerCase();
const kind = ext === ".excalidraw" ? "excalidraw" : [".mmd", ".mermaid"].includes(ext) ? "mermaid" : null;
if (!kind) {
  console.error("Supported: .excalidraw, .mmd, .mermaid");
  process.exit(1);
}
const portArg = args.indexOf("--port");
const port = portArg >= 0 ? Number(args[portArg + 1]) : 5199;
const pngPath = path.slice(0, -ext.length) + ".png";
const page = kind === "excalidraw" ? excalidrawEditorPage(basename(path)) : mermaidEditorPage(basename(path));
const MAX_BODY = 50 * 1024 * 1024;

const version = () => Math.round(statSync(path).mtimeMs);
const send = (res, code, body, type = "application/json") => {
  res.writeHead(code, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
};
const readBody = (req) =>
  new Promise((ok, fail) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        fail(new Error("body too large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => ok(Buffer.concat(chunks)));
    req.on("error", fail);
  });

const server = createServer(async (req, res) => {
  try {
    const route = `${req.method} ${new URL(req.url, "http://x").pathname}`;
    if (route === "GET /") return send(res, 200, page, "text/html; charset=utf-8");
    if (route === "GET /source") return send(res, 200, readFileSync(path), kind === "excalidraw" ? "application/json" : "text/plain; charset=utf-8");
    if (route === "GET /version") return send(res, 200, JSON.stringify({ version: version() }));
    if (route === "PUT /source") {
      const body = await readBody(req);
      if (kind === "excalidraw") JSON.parse(body.toString("utf8"));
      writeFileSync(path, body);
      return send(res, 200, JSON.stringify({ version: version() }));
    }
    if (route === "PUT /png" && kind === "excalidraw") {
      writeFileSync(pngPath, await readBody(req));
      return send(res, 200, JSON.stringify({ ok: true }));
    }
    send(res, 404, JSON.stringify({ error: "not found" }));
  } catch (e) {
    send(res, 500, JSON.stringify({ error: e.message }));
  }
});

server.listen(port, "127.0.0.1", () => {
  const url = `http://localhost:${port}/`;
  console.log(JSON.stringify({ url, file: path, kind, png: kind === "excalidraw" ? pngPath : null }));
  if (args.includes("--open")) {
    const cmd = process.platform === "win32" ? `start "" "${url}"` : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
    exec(cmd);
  }
});
