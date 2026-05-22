import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathExists } from "./fetch";

export type ManagedKind = "file" | "sentinel" | "json-merge" | "toml-merge";

export interface ManifestFileEntry {
  path: string;
  hash?: string;
  managed?: ManagedKind;
}

export interface ManifestTargetEntry {
  sha: string;
  ref: string;
  installedAt: string;
  files: ManifestFileEntry[];
}

export interface Manifest {
  version: 1;
  ref: string;
  sha: string;
  installedAt: string;
  targets: Record<string, ManifestTargetEntry>;
}

export const LOCK_FILE = ".ai-kit.lock";

export function emptyManifest(): Manifest {
  return {
    version: 1,
    ref: "master",
    sha: "",
    installedAt: new Date().toISOString(),
    targets: {},
  };
}

export async function readManifest(cwd: string): Promise<Manifest | null> {
  const p = path.join(cwd, LOCK_FILE);
  if (!(await pathExists(p))) return null;
  const raw = await readFile(p, "utf8");
  try {
    const parsed = JSON.parse(raw) as Manifest;
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeManifest(cwd: string, manifest: Manifest): Promise<void> {
  const p = path.join(cwd, LOCK_FILE);
  await writeFile(p, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

export function hashContent(content: Buffer | string): string {
  return "sha256:" + createHash("sha256").update(content).digest("hex");
}

export async function hashFile(absPath: string): Promise<string | null> {
  if (!(await pathExists(absPath))) return null;
  const buf = await readFile(absPath);
  return hashContent(buf);
}
