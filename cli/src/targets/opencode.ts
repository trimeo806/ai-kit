import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathExists } from "../lib/fetch";
import { copyOne, copyTree, isFile, logStep, writeManaged, CopyContext } from "../lib/fsutil";
import { deepMergeJson, mergeAgentsDocument } from "../lib/merge";
import { ManifestFileEntry } from "../lib/manifest";
import { InstallContext, TargetResult } from "./index";

const TAG = "opencode";

export async function installOpencode(ctx: InstallContext): Promise<TargetResult> {
  const src = path.join(ctx.fetched.root, "opencode");
  if (!(await pathExists(src))) throw new Error(`Source directory missing: ${src}`);
  logStep(TAG, `installing into ${ctx.cwd}`);

  const files: ManifestFileEntry[] = [];
  const copyCtx: CopyContext = {
    tag: TAG,
    policy: ctx.policy,
    dryRun: ctx.dryRun,
    files,
    targetRoot: ctx.cwd,
  };

  const sourceAgents = path.join(src, "AGENTS.md");
  if (await isFile(sourceAgents)) {
    const targetAgents = path.join(ctx.cwd, "AGENTS.md");
    const sourceBody = await readFile(sourceAgents, "utf8");
    const existing = (await pathExists(targetAgents)) ? await readFile(targetAgents, "utf8") : null;
    const merged = mergeAgentsDocument(existing, sourceBody);
    await writeManaged(targetAgents, merged, "sentinel", copyCtx);
  }

  const sourceWorkflow = path.join(src, "WORKFLOW.md");
  if (await isFile(sourceWorkflow)) {
    await copyOne(sourceWorkflow, path.join(ctx.cwd, "WORKFLOW.md"), copyCtx);
  }

  const sourceConfig = path.join(src, "opencode.json");
  if (await isFile(sourceConfig)) {
    const targetConfig = path.join(ctx.cwd, "opencode.json");
    const srcContent = await readFile(sourceConfig, "utf8");
    if (await pathExists(targetConfig)) {
      const existing = await readFile(targetConfig, "utf8");
      const merged = deepMergeJson(existing, srcContent);
      await writeManaged(targetConfig, merged, "json-merge", copyCtx);
    } else {
      await copyOne(sourceConfig, targetConfig, copyCtx);
    }
  }

  const srcAgentsSkills = path.join(src, ".agents", "skills");
  if (await pathExists(srcAgentsSkills)) {
    await copyTree(srcAgentsSkills, path.join(ctx.cwd, ".agents", "skills"), copyCtx);
  }

  const dotOpencodeSrc = path.join(src, ".opencode");
  const dotOpencodeDst = path.join(ctx.cwd, ".opencode");
  for (const sub of ["agents", "commands", "plugins"]) {
    const ssrc = path.join(dotOpencodeSrc, sub);
    if (await pathExists(ssrc)) {
      await copyTree(ssrc, path.join(dotOpencodeDst, sub), copyCtx);
    }
  }

  return { files };
}
