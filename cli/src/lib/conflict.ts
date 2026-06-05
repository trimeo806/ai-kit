import prompts from "prompts";
import { warn } from "./logger";

export type ConflictAction = "overwrite" | "skip" | "backup" | "abort";

export interface ConflictPolicy {
  yes: boolean;
  noTTY: boolean;
  globalChoice: "overwrite" | "skip" | null;
}

export function makePolicy(opts: { yes: boolean; skipExisting?: boolean }): ConflictPolicy {
  return {
    yes: opts.yes,
    noTTY: !process.stdin.isTTY || !process.stdout.isTTY,
    globalChoice: opts.skipExisting ? "skip" : opts.yes ? "overwrite" : null,
  };
}

export async function resolveConflict(
  policy: ConflictPolicy,
  tag: string,
  relativePath: string,
): Promise<ConflictAction> {
  if (policy.globalChoice === "overwrite") return "overwrite";
  if (policy.globalChoice === "skip") return "skip";
  if (policy.noTTY) {
    warn(`Non-TTY environment: cannot prompt for ${relativePath}. Use --yes to overwrite or --dry-run to preview.`);
    return "abort";
  }
  const res = await prompts({
    type: "select",
    name: "choice",
    message: `[${tag}] ${relativePath} exists`,
    choices: [
      { title: "overwrite", value: "overwrite" },
      { title: "skip", value: "skip" },
      { title: "backup → .bak then overwrite", value: "backup" },
      { title: "all overwrite (apply to rest)", value: "all-overwrite" },
      { title: "skip all (apply to rest)", value: "all-skip" },
      { title: "abort", value: "abort" },
    ],
    initial: 0,
  });
  switch (res.choice) {
    case "all-overwrite":
      policy.globalChoice = "overwrite";
      return "overwrite";
    case "all-skip":
      policy.globalChoice = "skip";
      return "skip";
    case "overwrite":
    case "skip":
    case "backup":
    case "abort":
      return res.choice;
    default:
      return "abort";
  }
}
