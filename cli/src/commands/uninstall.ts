import { lstat, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathExists } from "../lib/fetch";
import { removeIfExists, rmEmptyParents } from "../lib/fsutil";
import { ok, step, warn } from "../lib/logger";
import { readManifest, writeManifest, LOCK_FILE } from "../lib/manifest";
import { stripSentinelBlock } from "../lib/merge";
import { TARGET_NAMES, isKnownTarget } from "../targets";

export interface UninstallOptions {
  cwd: string;
  dryRun: boolean;
}

export async function runUninstall(rawTargets: string[], opts: UninstallOptions): Promise<void> {
  const manifest = await readManifest(opts.cwd);
  if (!manifest) {
    warn("No .ai-kit.lock found — nothing to uninstall");
    return;
  }

  let targets: string[];
  if (rawTargets.length === 0 || rawTargets.includes("all")) {
    targets = Object.keys(manifest.targets);
  } else {
    for (const t of rawTargets) {
      if (!isKnownTarget(t)) throw new Error(`Unknown target: ${t}`);
    }
    targets = rawTargets;
  }

  const cwdResolved = path.resolve(opts.cwd);

  for (const t of targets) {
    const entry = manifest.targets[t];
    if (!entry) {
      warn(`${t}: not installed`);
      continue;
    }
    step(t, `removing ${entry.files.length} file(s)`);
    for (const f of entry.files) {
      const abs = path.resolve(opts.cwd, ...f.path.split("/"));
      const rel = path.relative(cwdResolved, abs);
      if (rel.startsWith("..") || path.isAbsolute(rel)) {
        warn(`refusing to touch path outside cwd: ${f.path}`);
        continue;
      }
      // Reject symlinks anywhere along the path. This defends against a hostile
      // file being swapped for a symlink to an out-of-tree target between install
      // and uninstall (symlink race). We do not create symlinks ourselves.
      try {
        let cur = cwdResolved;
        const parts = rel.split(path.sep).filter(Boolean);
        let bailed = false;
        for (const segment of parts) {
          cur = path.join(cur, segment);
          const st = await lstat(cur);
          if (st.isSymbolicLink()) {
            warn(`refusing to follow symlink at: ${f.path}`);
            bailed = true;
            break;
          }
        }
        if (bailed) continue;
      } catch {
        // Path does not exist along the way — nothing to remove.
        continue;
      }
      if (f.managed === "sentinel") {
        if (await pathExists(abs)) {
          const cur = await readFile(abs, "utf8");
          const stripped = stripSentinelBlock(cur);
          if (stripped.replace(/\s+/g, "").length === 0) {
            await removeIfExists(abs, opts.dryRun);
          } else if (!opts.dryRun) {
            await writeFile(abs, stripped, "utf8");
          }
        }
      } else {
        await removeIfExists(abs, opts.dryRun);
        await rmEmptyParents(abs, opts.cwd, opts.dryRun);
      }
    }
    delete manifest.targets[t];
  }

  if (Object.keys(manifest.targets).length === 0) {
    if (!opts.dryRun) await removeIfExists(path.join(opts.cwd, LOCK_FILE), false);
  } else {
    if (!opts.dryRun) await writeManifest(opts.cwd, manifest);
  }
  ok("uninstall complete");
}

export const ALL_TARGETS = TARGET_NAMES;
