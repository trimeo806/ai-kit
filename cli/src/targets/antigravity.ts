import path from "node:path";
import { pathExists } from "../lib/fetch";
import { copyOne, copyTree, isFile, logStep, CopyContext } from "../lib/fsutil";
import { ManifestFileEntry } from "../lib/manifest";
import { InstallContext, TargetResult } from "./index";

const TAG = "antigravity";

export async function installAntigravity(ctx: InstallContext): Promise<TargetResult> {
  const src = path.join(ctx.fetched.root, "antigravity");
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

  const antigravityMd = path.join(src, "ANTIGRAVITY.md");
  if (await isFile(antigravityMd)) {
    await copyOne(antigravityMd, path.join(ctx.cwd, "ANTIGRAVITY.md"), copyCtx);
  }

  const sourceWorkflow = path.join(src, "WORKFLOW.md");
  if (await isFile(sourceWorkflow)) {
    await copyOne(sourceWorkflow, path.join(ctx.cwd, "WORKFLOW.md"), copyCtx);
  }

  const dotAgents = path.join(src, ".agents");
  if (await pathExists(dotAgents)) {
    await copyTree(dotAgents, path.join(ctx.cwd, ".agents"), copyCtx);
  }

  const skillsDir = path.join(src, "skills");
  if (await pathExists(skillsDir)) {
    await copyTree(skillsDir, path.join(ctx.cwd, "skills"), copyCtx);
  }

  return { files };
}
