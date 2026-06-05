import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathExists } from "./fetch";
import { dryNote, step } from "./logger";
import { Manifest, LOCK_FILE } from "./manifest";

const BEGIN = "# >>> ai-kit (managed) >>>";
const END = "# <<< ai-kit (managed) <<<";

/** Top-level kit paths that may be installed but are not tracked in the manifest. */
const EXTRA_PATHS = [".kit-data/", LOCK_FILE];

/** Reduce every installed file path to the top-level entry git should ignore. */
function topLevelEntries(manifest: Manifest): string[] {
  const set = new Set<string>();
  for (const target of Object.values(manifest.targets)) {
    for (const f of target.files) {
      const rel = f.path.split("\\").join("/").replace(/^\.\//, "");
      if (!rel) continue;
      const head = rel.split("/")[0];
      set.add(rel.includes("/") ? `${head}/` : head);
    }
  }
  for (const p of EXTRA_PATHS) set.add(p);
  return [...set].sort();
}

function buildBlock(entries: string[]): string {
  return [BEGIN, "# Installed by agentkit-cli — keep kit files local, do not commit.", ...entries, END].join("\n");
}

/** Write or refresh the ai-kit managed block in <cwd>/.gitignore (idempotent). */
export async function writeGitignoreBlock(cwd: string, manifest: Manifest, dryRun: boolean): Promise<void> {
  const entries = topLevelEntries(manifest);
  if (entries.length === 0) return;
  const block = buildBlock(entries);
  const gitignorePath = path.join(cwd, ".gitignore");

  let existing = (await pathExists(gitignorePath)) ? await readFile(gitignorePath, "utf8") : "";
  let next: string;
  const beginIdx = existing.indexOf(BEGIN);
  const endIdx = existing.indexOf(END);
  if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
    next = existing.slice(0, beginIdx) + block + existing.slice(endIdx + END.length);
  } else {
    const sep = existing.length === 0 || existing.endsWith("\n") ? "" : "\n";
    const lead = existing.length === 0 ? "" : "\n";
    next = existing + sep + lead + block + "\n";
  }

  if (dryRun) {
    dryNote(`write .gitignore (${entries.length} kit entries)`);
    return;
  }
  await writeFile(gitignorePath, next, "utf8");
  step("gitignore", `wrote ${entries.length} kit entries`);
}
