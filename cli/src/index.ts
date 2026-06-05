#!/usr/bin/env node
import { Command } from "commander";
import { runInstall } from "./commands/install";
import { runUninstall } from "./commands/uninstall";
import { runUpdate } from "./commands/update";
import { runList } from "./commands/list";
import { error } from "./lib/logger";

const pkg = require("../package.json") as { version: string };

const program = new Command();

program
  .name("agentkit-cli")
  .description("Install the multi-agent ai-kit (Claude, Codex, OpenCode, Antigravity) into a project.")
  .version(pkg.version);

program
  .command("install [targets...]")
  .description("Fetch the kit from GitHub and install the selected targets (default: claude).")
  .option("--ref <ref>", "git ref (branch, tag, or commit; default: master with fallback to main)")
  .option("--repo <slug>", "GitHub repo slug to fetch from", "trimeo806/ai-kit")
  .option("-y, --yes", "overwrite all conflicts without prompting", false)
  .option("--force", "alias for --yes", false)
  .option("--skip-existing", "skip files that already exist (add new files only)", false)
  .option("--dry-run", "preview without writing", false)
  .action(async (targets: string[], opts) => {
    try {
      await runInstall(targets, {
        ref: opts.ref,
        repo: opts.repo,
        yes: Boolean(opts.yes || opts.force),
        skipExisting: Boolean(opts.skipExisting),
        dryRun: opts.dryRun,
        cwd: process.cwd(),
      });
    } catch (e) {
      error((e as Error).message);
      process.exit(1);
    }
  });

program
  .command("update [targets...]")
  .description("Re-fetch and reapply installed targets.")
  .option("--ref <ref>", "git ref to update to (default: master with fallback to main)")
  .option("--repo <slug>", "GitHub repo slug to fetch from", "trimeo806/ai-kit")
  .option("--dry-run", "preview without writing", false)
  .action(async (targets: string[], opts) => {
    try {
      await runUpdate(targets, {
        ref: opts.ref,
        repo: opts.repo,
        yes: true,
        dryRun: opts.dryRun,
        cwd: process.cwd(),
      });
    } catch (e) {
      error((e as Error).message);
      process.exit(1);
    }
  });

program
  .command("uninstall [targets...]")
  .description("Remove kit files for the given targets (default: all installed).")
  .option("--dry-run", "preview without writing", false)
  .action(async (targets: string[], opts) => {
    try {
      await runUninstall(targets, { cwd: process.cwd(), dryRun: opts.dryRun });
    } catch (e) {
      error((e as Error).message);
      process.exit(1);
    }
  });

program
  .command("list")
  .aliases(["status"])
  .description("Show installed targets, pinned SHA, and drift.")
  .action(async () => {
    try {
      await runList({ cwd: process.cwd() });
    } catch (e) {
      error((e as Error).message);
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
