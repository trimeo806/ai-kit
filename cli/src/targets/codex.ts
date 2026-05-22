import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathExists } from "../lib/fetch";
import { copyOne, copyTree, isFile, logStep, writeManaged, CopyContext } from "../lib/fsutil";
import { ensureCodexHooksEnabled, mergeAgentsDocument, mergeHooksJson } from "../lib/merge";
import { ManifestFileEntry } from "../lib/manifest";
import { InstallContext, TargetResult } from "./index";

const TAG = "codex";

export async function installCodex(ctx: InstallContext): Promise<TargetResult> {
  const src = path.join(ctx.fetched.root, "codex");
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

  const srcAgentsDir = path.join(src, ".agents");
  const dstAgentsDir = path.join(ctx.cwd, ".agents");
  if (await pathExists(path.join(srcAgentsDir, "skills"))) {
    await copyTree(path.join(srcAgentsDir, "skills"), path.join(dstAgentsDir, "skills"), copyCtx);
  }

  const srcCodexDir = path.join(src, ".codex");
  const dstCodexDir = path.join(ctx.cwd, ".codex");

  await copyTree(srcCodexDir, dstCodexDir, copyCtx, {
    excludeRelPaths: ["config.toml", "hooks.json"],
  });

  const srcConfig = path.join(srcCodexDir, "config.toml");
  if (await isFile(srcConfig)) {
    const dstConfig = path.join(dstCodexDir, "config.toml");
    const srcContent = await readFile(srcConfig, "utf8");
    if (await pathExists(dstConfig)) {
      const existing = await readFile(dstConfig, "utf8");
      const merged = ensureCodexHooksEnabled(existing);
      await writeManaged(dstConfig, merged, "toml-merge", copyCtx);
    } else {
      await copyOne(srcConfig, dstConfig, copyCtx);
    }
  }

  const srcHooks = path.join(srcCodexDir, "hooks.json");
  if (await isFile(srcHooks)) {
    const dstHooks = path.join(dstCodexDir, "hooks.json");
    const srcContent = await readFile(srcHooks, "utf8");
    const existing = (await pathExists(dstHooks)) ? await readFile(dstHooks, "utf8") : null;
    const merged = mergeHooksJson(existing, srcContent);
    await writeManaged(dstHooks, merged, "json-merge", copyCtx);
  }

  const srcKitData = path.join(src, ".kit-data");
  const dstKitData = path.join(ctx.cwd, ".kit-data");
  if (await pathExists(path.join(srcKitData, "improvements"))) {
    await copyTree(
      path.join(srcKitData, "improvements"),
      path.join(dstKitData, "improvements"),
      copyCtx,
      { skipIfExists: true, untracked: true },
    );
  }

  return { files };
}
