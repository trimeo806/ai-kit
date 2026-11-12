#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog, loadLibrary } from "./scene/library-items.mjs";

const [cmd, id, outArg] = process.argv.slice(2);
const usage = "Usage: node excalidraw-library.mjs list [library] | sheet <library> [outBase] [--theme light|dark]";

if (cmd === "list") {
  const libs = id ? [id] : Object.keys(loadCatalog().libraries);
  for (const key of libs) {
    const lib = loadLibrary(key);
    console.log(`${key} — ${lib.title} (${lib.items.length})`);
    if (id || libs.length === 1) {
      for (const it of lib.items) console.log(`  ${key}:${it.name || `#${it.index}`}`);
    } else {
      console.log(`  ${lib.items.map((it) => it.name || `#${it.index}`).join(", ")}`);
    }
  }
} else if (cmd === "sheet" && id) {
  const lib = loadLibrary(id);
  const cols = 6;
  const cell = 200;
  const nodes = lib.items.map((it, i) => ({
    id: `i${i}`,
    lib: `${id}:#${i}`,
    label: `#${i}${it.name ? `\n${it.name}` : ""}`,
    fontSize: 14,
    x: (i % cols) * cell + cell / 2,
    y: Math.floor(i / cols) * (cell + 40) + cell / 2,
    w: 120,
    h: 120,
  }));
  const ti = process.argv.indexOf("--theme");
  const spec = { preset: "whiteboard", font: "sans", theme: ti > 0 ? process.argv[ti + 1] : "light", title: `${id} — ${lib.title}`, nodes, edges: [] };
  const work = mkdtempSync(join(tmpdir(), "excalidraw-lib-"));
  const specPath = join(work, `${id}.wb.json`);
  writeFileSync(specPath, JSON.stringify(spec));
  const outBase = resolve(outArg && !outArg.startsWith("--") ? outArg : join(work, `${id}-sheet`));
  const renderer = join(dirname(fileURLToPath(import.meta.url)), "mmd-to-excalidraw.mjs");
  process.stdout.write(execFileSync(process.execPath, [renderer, specPath, outBase, "--scale", "1"], { encoding: "utf8" }));
} else {
  console.error(usage);
  process.exit(2);
}
