import { makePolicy } from "../lib/conflict";
import { fetchKit } from "../lib/fetch";
import { error, info, ok, step } from "../lib/logger";
import { emptyManifest, readManifest, writeManifest, ManifestTargetEntry } from "../lib/manifest";
import { expandTargets, HANDLERS, TargetName } from "../targets";

export interface InstallOptions {
  ref: string;
  yes: boolean;
  dryRun: boolean;
  repo?: string;
  cwd: string;
}

export async function runInstall(rawTargets: string[], opts: InstallOptions): Promise<void> {
  const targets = expandTargets(rawTargets);
  info(`Targets: ${targets.join(", ")}`);

  const fetched = await fetchKit({ repo: opts.repo, ref: opts.ref });
  try {
    const policy = makePolicy({ yes: opts.yes });
    const manifest = (await readManifest(opts.cwd)) ?? emptyManifest();
    manifest.ref = fetched.ref;
    manifest.sha = fetched.sha;
    manifest.installedAt = new Date().toISOString();

    for (const t of targets) {
      step(t, "begin");
      const handler = HANDLERS[t];
      const result = await handler({ fetched, cwd: opts.cwd, policy, dryRun: opts.dryRun });
      const entry: ManifestTargetEntry = {
        sha: fetched.sha,
        ref: fetched.ref,
        installedAt: new Date().toISOString(),
        files: result.files,
      };
      manifest.targets[t] = entry;
      ok(`${t}: wrote ${result.files.length} file(s)`);
    }

    if (!opts.dryRun) {
      await writeManifest(opts.cwd, manifest);
    }
    ok("install complete");
  } catch (e) {
    error((e as Error).message);
    throw e;
  } finally {
    await fetched.cleanup();
  }
}

export function defaultTargets(): TargetName[] {
  return ["claude"];
}
