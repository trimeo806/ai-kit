#!/usr/bin/env node
import { createServer } from "node:http";
import { openRenderer } from "./render/browser-renderer.mjs";
import { RENDER_PAGE_ID } from "./render/render-page.mjs";
import { RENDER_PORT, stopRenderServer } from "./render/render-client.mjs";

const IDLE_MS = Number(process.env.LWMA_RENDER_IDLE_MS ?? 15 * 60 * 1000);
const MAX_BODY = 64 * 1024 * 1024;

if (process.argv[2] === "stop") {
  console.log(JSON.stringify({ stopped: await stopRenderServer() }));
  process.exit(0);
}

let renderer = null;
let startError = null;
let idle = null;
const shutdown = async () => {
  await renderer?.close().catch(() => {});
  process.exit(0);
};
const touch = () => {
  clearTimeout(idle);
  idle = setTimeout(shutdown, IDLE_MS);
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
    req.on("end", () => ok(Buffer.concat(chunks).toString("utf8")));
    req.on("error", fail);
  });

const send = (res, code, body) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

const server = createServer(async (req, res) => {
  touch();
  try {
    const route = `${req.method} ${req.url}`;
    if (route === "GET /health") return send(res, 200, { id: RENDER_PAGE_ID, ready: Boolean(renderer), error: startError, pid: process.pid });
    if (route === "POST /shutdown") {
      send(res, 200, { ok: true });
      return setTimeout(shutdown, 50);
    }
    if (route === "POST /render") {
      if (!renderer) return send(res, 503, { error: startError ?? "starting" });
      return send(res, 200, await renderer.render(JSON.parse(await readBody(req))));
    }
    send(res, 404, { error: "not found" });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") process.exit(0);
  throw e;
});
server.listen(RENDER_PORT, "127.0.0.1", async () => {
  touch();
  try {
    renderer = await openRenderer();
  } catch (e) {
    startError = e.message;
    setTimeout(shutdown, 5000);
  }
});
