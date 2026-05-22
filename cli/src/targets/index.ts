import { ConflictPolicy } from "../lib/conflict";
import { FetchedRepo } from "../lib/fetch";
import { ManifestFileEntry } from "../lib/manifest";

export interface InstallContext {
  fetched: FetchedRepo;
  cwd: string;
  policy: ConflictPolicy;
  dryRun: boolean;
}

export interface TargetResult {
  files: ManifestFileEntry[];
}

export type TargetHandler = (ctx: InstallContext) => Promise<TargetResult>;

export const TARGET_NAMES = ["claude", "codex", "opencode", "antigravity"] as const;
export type TargetName = (typeof TARGET_NAMES)[number];

export function isKnownTarget(name: string): name is TargetName {
  return (TARGET_NAMES as readonly string[]).includes(name);
}

import { installClaude } from "./claude";
import { installCodex } from "./codex";
import { installOpencode } from "./opencode";
import { installAntigravity } from "./antigravity";

export const HANDLERS: Record<TargetName, TargetHandler> = {
  claude: installClaude,
  codex: installCodex,
  opencode: installOpencode,
  antigravity: installAntigravity,
};

export function expandTargets(raw: string[]): TargetName[] {
  if (raw.length === 0) return ["claude"];
  if (raw.includes("all")) return [...TARGET_NAMES];
  const out: TargetName[] = [];
  for (const r of raw) {
    if (!isKnownTarget(r)) throw new Error(`Unknown target: ${r}`);
    if (!out.includes(r)) out.push(r);
  }
  return out;
}
