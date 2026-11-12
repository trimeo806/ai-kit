import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { RENDER_PAGE_HTML } from "./render-page.mjs";

const CACHE_DIR = process.env.LWMA_CACHE_DIR ?? join(homedir(), ".cache", "less-words-more-arrows", "esm");
const CACHED_HOST = "https://esm.sh/";

function loadPuppeteer() {
  const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
  for (const pkg of [join(globalRoot, "@mermaid-js", "mermaid-cli", "package.json"), join(globalRoot, "puppeteer", "package.json")]) {
    try {
      return createRequire(pkg)("puppeteer");
    } catch {}
  }
  throw new Error("puppeteer not found. Install: npm install -g @mermaid-js/mermaid-cli");
}

const cacheKey = (url) => join(CACHE_DIR, createHash("sha1").update(url).digest("hex"));

async function serveEsmFromDisk(page) {
  mkdirSync(CACHE_DIR, { recursive: true });
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    const key = cacheKey(url);
    if (url.startsWith(CACHED_HOST) && req.method() === "GET" && existsSync(`${key}.json`)) {
      const meta = JSON.parse(readFileSync(`${key}.json`, "utf8"));
      return req.respond({ status: 200, contentType: meta.contentType, headers: { "access-control-allow-origin": "*" }, body: readFileSync(`${key}.body`) });
    }
    req.continue();
  });
  page.on("response", async (res) => {
    const url = res.url();
    if (!url.startsWith(CACHED_HOST) || res.status() !== 200 || res.fromCache() || existsSync(`${cacheKey(url)}.json`)) return;
    try {
      const body = await res.buffer();
      writeFileSync(`${cacheKey(url)}.body`, body);
      writeFileSync(`${cacheKey(url)}.json`, JSON.stringify({ url, contentType: res.headers()["content-type"] ?? "application/javascript" }));
    } catch {}
  });
}

export async function openRenderer() {
  const puppeteer = loadPuppeteer();
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(String(e)));
    await serveEsmFromDisk(page);
    await page.goto("about:blank");
    await page.setContent(RENDER_PAGE_HTML, { waitUntil: "networkidle0", timeout: 120000 });
    await page.waitForFunction("window.__ready === true", { timeout: 120000 }).catch(() => {
      throw new Error("Libraries failed to load from esm.sh: " + pageErrors.join("; "));
    });
    let queue = Promise.resolve();
    const render = ({ source, skeleton, wantPng, scale, background }) => {
      const run = queue.then(() => page.evaluate((s, sk, p, sc, bg) => window.__convert(s, sk, p, sc, bg), source, skeleton, wantPng, scale, background));
      queue = run.catch(() => {});
      return run;
    };
    return { render, close: () => browser.close() };
  } catch (e) {
    await browser.close();
    throw e;
  }
}
