import { copyFile, mkdir, readdir, readFile, rm, rmdir, stat, writeFile } from "node:fs/promises";
import { Dirent } from "node:fs";
import path from "node:path";
import { resolveConflict, ConflictPolicy } from "./conflict";
import { pathExists } from "./fetch";
import { debug, dryNote, step } from "./logger";
import { hashContent, ManifestFileEntry } from "./manifest";

export interface CopyContext {
  tag: string;
  policy: ConflictPolicy;
  dryRun: boolean;
  /** Mutated as files are written. */
  files: ManifestFileEntry[];
  /** Absolute target root (cwd). Used to build manifest paths relative to project. */
  targetRoot: string;
}

export interface CopyDirOptions {
  /** If true, existing files are kept untouched (used for kit-data/improvements). */
  skipIfExists?: boolean;
  /** If true, fresh-copied files are NOT recorded in the manifest (treated as user data). */
  untracked?: boolean;
  /** Relative paths (within the source tree) to skip. */
  excludeRelPaths?: string[];
}

export async function ensureDir(dir: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    dryNote(`mkdir -p ${dir}`);
    return;
  }
  await mkdir(dir, { recursive: true });
}

const JUNK_BASENAMES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  const stack: string[] = [dir];
  while (stack.length) {
    const cur = stack.pop()!;
    const entries = await readdir(cur, { withFileTypes: true });
    for (const e of entries as Dirent[]) {
      if (JUNK_BASENAMES.has(e.name)) continue;
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile()) out.push(full);
    }
  }
  return out;
}

export async function copyTree(
  src: string,
  dest: string,
  ctx: CopyContext,
  opts: CopyDirOptions = {},
): Promise<void> {
  if (!(await pathExists(src))) {
    debug(`skip missing source dir: ${src}`);
    return;
  }
  const files = await walk(src);
  const excludes = new Set((opts.excludeRelPaths ?? []).map((r) => r.split(/[\\/]/).join(path.sep)));
  for (const file of files) {
    const rel = path.relative(src, file);
    if (excludes.has(rel)) continue;
    const target = path.join(dest, rel);
    await copyOne(file, target, ctx, opts);
  }
}

export async function copyOne(
  srcFile: string,
  destFile: string,
  ctx: CopyContext,
  opts: CopyDirOptions = {},
): Promise<void> {
  const exists = await pathExists(destFile);
  if (exists && opts.skipIfExists) {
    debug(`skip-if-exists: ${destFile}`);
    return;
  }
  if (exists) {
    const action = await resolveConflict(ctx.policy, ctx.tag, path.relative(ctx.targetRoot, destFile));
    if (action === "abort") throw new Error(`Aborted by user at: ${destFile}`);
    if (action === "skip") return;
    if (action === "backup") {
      const bak = destFile + ".bak";
      if (ctx.dryRun) dryNote(`backup ${destFile} → ${bak}`);
      else await copyFile(destFile, bak);
    }
  }
  await ensureDir(path.dirname(destFile), ctx.dryRun);
  let buf: Buffer;
  if (ctx.dryRun) {
    dryNote(`write ${path.relative(ctx.targetRoot, destFile)}`);
    buf = await readFile(srcFile);
  } else {
    await copyFile(srcFile, destFile);
    buf = await readFile(destFile);
  }
  if (!opts.untracked) {
    ctx.files.push({
      path: toPosixRelative(ctx.targetRoot, destFile),
      hash: hashContent(buf),
      managed: "file",
    });
  }
}

export async function writeManaged(
  destFile: string,
  content: string,
  managed: "sentinel" | "json-merge" | "toml-merge",
  ctx: CopyContext,
): Promise<void> {
  await ensureDir(path.dirname(destFile), ctx.dryRun);
  if (ctx.dryRun) {
    dryNote(`write[${managed}] ${path.relative(ctx.targetRoot, destFile)}`);
  } else {
    await writeFile(destFile, content, "utf8");
  }
  ctx.files.push({
    path: toPosixRelative(ctx.targetRoot, destFile),
    hash: hashContent(content),
    managed,
  });
}

export async function removeIfExists(p: string, dryRun: boolean): Promise<void> {
  if (!(await pathExists(p))) return;
  if (dryRun) {
    dryNote(`rm ${p}`);
    return;
  }
  await rm(p, { force: true, recursive: false });
}

export async function rmEmptyParents(start: string, stopAt: string, dryRun: boolean): Promise<void> {
  let cur = path.dirname(start);
  while (cur.startsWith(stopAt) && cur !== stopAt) {
    try {
      const entries = await readdir(cur);
      if (entries.length > 0) return;
      if (dryRun) dryNote(`rmdir ${cur}`);
      else await rmdir(cur);
    } catch {
      return;
    }
    cur = path.dirname(cur);
  }
}

export function toPosixRelative(root: string, abs: string): string {
  return path.relative(root, abs).split(path.sep).join("/");
}

export async function isFile(p: string): Promise<boolean> {
  try {
    const s = await stat(p);
    return s.isFile();
  } catch {
    return false;
  }
}

export function logStep(tag: string, msg: string): void {
  step(tag, msg);
}
