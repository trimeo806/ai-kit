import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RENDER_PAGE_ID } from "./render-page.mjs";

export const RENDER_PORT = Number(process.env.LWMA_RENDER_PORT ?? 5317);
const BASE = `http://127.0.0.1:${RENDER_PORT}`;
const SERVER_SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "..", "render-server.mjs");
const START_TIMEOUT_MS = 150000;

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function health() {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(1500) });
    return await res.json();
  } catch {
    return null;
  }
}

export async function stopRenderServer() {
  try {
    await fetch(`${BASE}/shutdown`, { method: "POST", signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

async function waitGone() {
  for (let i = 0; i < 40 && (await health()); i++) await pause(100);
}

async function ensureServer() {
  let h = await health();
  if (h && h.id !== RENDER_PAGE_ID) {
    await stopRenderServer();
    await waitGone();
    h = null;
  }
  if (!h) spawn(process.execPath, [SERVER_SCRIPT], { detached: true, stdio: "ignore" }).unref();
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    h = await health();
    if (h?.error) throw new Error(h.error);
    if (h?.ready && h.id === RENDER_PAGE_ID) return;
    await pause(200);
  }
  throw new Error("render server did not start in time");
}

export async function renderWithServer(payload) {
  await ensureServer();
  const res = await fetch(`${BASE}/render`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const body = await res.json();
  if (!res.ok) throw Object.assign(new Error(body.error ?? `render server returned ${res.status}`), { renderFailed: res.status === 500 });
  return body;
}
