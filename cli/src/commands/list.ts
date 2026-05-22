import path from "node:path";
import kleur from "kleur";
import { hashFile, readManifest } from "../lib/manifest";
import { info, warn } from "../lib/logger";

export interface ListOptions {
  cwd: string;
}

export async function runList(opts: ListOptions): Promise<void> {
  const manifest = await readManifest(opts.cwd);
  if (!manifest) {
    warn("No .ai-kit.lock found in " + opts.cwd);
    return;
  }
  info(`ai-kit @ ${manifest.ref} (${manifest.sha || "unknown sha"})`);
  info(`installed: ${manifest.installedAt}`);
  for (const [name, entry] of Object.entries(manifest.targets)) {
    info("");
    info(kleur.bold(`▸ ${name}`));
    info(`  sha:   ${entry.sha}`);
    info(`  ref:   ${entry.ref}`);
    info(`  files: ${entry.files.length}`);
    let drifted = 0;
    let missing = 0;
    for (const f of entry.files) {
      if (f.managed && f.managed !== "file") continue;
      const abs = path.join(opts.cwd, ...f.path.split("/"));
      const cur = await hashFile(abs);
      if (cur === null) missing++;
      else if (f.hash && cur !== f.hash) drifted++;
    }
    if (missing > 0) info(kleur.yellow(`  missing: ${missing}`));
    if (drifted > 0) info(kleur.yellow(`  drifted: ${drifted}`));
    if (missing === 0 && drifted === 0) info(kleur.green("  clean"));
  }
}
