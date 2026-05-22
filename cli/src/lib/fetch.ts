import { createWriteStream, existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { x as tarExtract } from "tar";
import { debug, step } from "./logger";

const DEFAULT_REPO = "trimeo806/ai-kit";

export interface FetchedRepo {
  /** Filesystem path to the extracted repo root (contains README.md, claude/, codex/, …). */
  root: string;
  /** Commit SHA resolved from the GitHub API (or the literal ref when API lookup fails). */
  sha: string;
  /** The original ref the user asked for. */
  ref: string;
  /** Repo slug, e.g. easygds/ai-kit. */
  repo: string;
  /** Cleanup callback — removes the tmp staging dir. */
  cleanup(): Promise<void>;
}

export interface FetchOptions {
  repo?: string;
  ref?: string;
}

export async function fetchKit(opts: FetchOptions = {}): Promise<FetchedRepo> {
  const repo = opts.repo ?? DEFAULT_REPO;
  const ref = opts.ref ?? "master";

  step("fetch", `downloading ${repo}@${ref}`);

  const staging = await mkdtemp(path.join(tmpdir(), "ai-kit-"));
  const tarballPath = path.join(staging, "kit.tar.gz");

  // If user did not pass an explicit ref and `master` 404s, fall back to `main`.
  const explicitRef = opts.ref != null;
  const tryRefs = explicitRef ? [ref] : [ref, ref === "master" ? "main" : "master"];

  let res: Response | null = null;
  let usedRef = ref;
  for (const candidate of tryRefs) {
    const url = `https://codeload.github.com/${repo}/tar.gz/${candidate}`;
    debug(`GET ${url}`);
    const r = await fetch(url);
    if (r.ok && r.body) {
      res = r;
      usedRef = candidate;
      break;
    }
    debug(`  → ${r.status} ${r.statusText}`);
  }
  if (!res || !res.body) {
    await rm(staging, { recursive: true, force: true });
    throw new Error(`Failed to download ${repo}@${tryRefs.join("|")} (all candidates returned non-OK)`);
  }
  if (usedRef !== ref) {
    step("fetch", `ref ${ref} not found, using ${usedRef} instead`);
  }

  const sha = await resolveSha(repo, usedRef);
  debug(`resolved sha: ${sha}`);

  await pipeline(Readable.fromWeb(res.body as unknown as import("node:stream/web").ReadableStream), createWriteStream(tarballPath));

  const extractDir = path.join(staging, "extract");
  await mkdir(extractDir, { recursive: true });
  const extractRoot = path.resolve(extractDir) + path.sep;
  await tarExtract({
    file: tarballPath,
    cwd: extractDir,
    strip: 0,
    // Reject any entry that would resolve outside the extract dir: absolute paths,
    // `..` segments at any position (including trailing `foo/..` which normalizes
    // upward), Windows-style drive prefixes, etc. We compute the final resolved
    // path and require it to live under extractRoot.
    filter: (entryPath: string) => {
      if (typeof entryPath !== "string" || entryPath.length === 0) return false;
      if (path.isAbsolute(entryPath)) return false;
      // Normalize forward and back slashes to the platform separator before resolve.
      const portable = entryPath.split(/[\\/]/).join(path.sep);
      const resolved = path.resolve(extractDir, portable);
      if (resolved !== path.resolve(extractDir) && !resolved.startsWith(extractRoot)) {
        return false;
      }
      return true;
    },
  });

  const entries = await readdir(extractDir);
  if (entries.length !== 1) {
    await rm(staging, { recursive: true, force: true });
    throw new Error(`Unexpected tarball layout: ${entries.length} top-level entries`);
  }
  const root = path.join(extractDir, entries[0]);
  const rootStat = await stat(root);
  if (!rootStat.isDirectory()) {
    await rm(staging, { recursive: true, force: true });
    throw new Error(`Tarball root is not a directory: ${root}`);
  }

  return {
    root,
    sha,
    ref: usedRef,
    repo,
    async cleanup() {
      await rm(staging, { recursive: true, force: true });
    },
  };
}

async function resolveSha(repo: string, ref: string): Promise<string> {
  if (/^[0-9a-f]{40}$/i.test(ref)) return ref.toLowerCase();
  const url = `https://api.github.com/repos/${repo}/commits/${encodeURIComponent(ref)}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "ai-kit-cli",
      },
    });
    if (!res.ok) return ref;
    const body = (await res.json()) as { sha?: string };
    return typeof body.sha === "string" ? body.sha : ref;
  } catch {
    return ref;
  }
}

export async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

export function pathExistsSync(p: string): boolean {
  return existsSync(p);
}
