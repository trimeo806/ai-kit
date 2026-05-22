import { readManifest } from "../lib/manifest";
import { warn } from "../lib/logger";
import { runInstall, InstallOptions } from "./install";

export async function runUpdate(rawTargets: string[], opts: InstallOptions): Promise<void> {
  const manifest = await readManifest(opts.cwd);
  if (!manifest) {
    warn("No .ai-kit.lock found — running install instead");
    await runInstall(rawTargets, opts);
    return;
  }
  const installed = Object.keys(manifest.targets);
  const targets = rawTargets.length > 0 ? rawTargets : installed;
  // Pass --yes so existing kit-owned files re-apply without per-file prompts on update.
  await runInstall(targets, { ...opts, yes: true });
}
