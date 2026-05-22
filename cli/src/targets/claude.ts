import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathExists } from "../lib/fetch";
import { copyTree, copyOne, writeManaged, logStep, CopyContext, isFile } from "../lib/fsutil";
import { mergeAgentsDocument, deepMergeJson } from "../lib/merge";
import { ManifestFileEntry } from "../lib/manifest";
import { InstallContext, TargetResult } from "./index";

const TAG = "claude";

export async function installClaude(ctx: InstallContext): Promise<TargetResult> {
  const src = path.join(ctx.fetched.root, "claude");
  if (!(await pathExists(src))) {
    throw new Error(`Source directory missing in fetched kit: ${src}`);
  }
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

  const sourceClaudeMd = path.join(src, "CLAUDE.md");
  if (await isFile(sourceClaudeMd)) {
    await copyOne(sourceClaudeMd, path.join(ctx.cwd, "CLAUDE.md"), copyCtx);
  }

  const srcDotClaude = path.join(src, ".claude");
  const dstDotClaude = path.join(ctx.cwd, ".claude");
  if (await pathExists(srcDotClaude)) {
    await copyTree(srcDotClaude, dstDotClaude, copyCtx, {
      excludeRelPaths: ["settings.json", "settings.local.json"],
    });
    const srcSettings = path.join(srcDotClaude, "settings.json");
    if (await isFile(srcSettings)) {
      const dstSettings = path.join(dstDotClaude, "settings.json");
      const srcContent = await readFile(srcSettings, "utf8");
      const existing = (await pathExists(dstSettings)) ? await readFile(dstSettings, "utf8") : null;
      const merged = deepMergeJson(existing, srcContent);
      await writeManaged(dstSettings, merged, "json-merge", copyCtx);
    }
  }

  return { files };
}
