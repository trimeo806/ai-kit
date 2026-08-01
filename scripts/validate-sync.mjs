#!/usr/bin/env node
/**
 * validate-sync.mjs — drift guardrail for the ai-kit one-way sync model.
 *
 * The kit follows a one-way sync model: `claude/.claude/skills/` is the source
 * of truth, and the platform packages (codex/, opencode/, antigravity/) are
 * generated copies. This script verifies that generated trees don't drift
 * *further* from source, and that each skill-index.json stays consistent.
 *
 * It is a REGRESSION GATE, not an absolute checker: the current level of drift
 * is recorded in `scripts/sync-baseline.json` and accepted; the script fails
 * only when drift is NEW or WORSE than baseline. This keeps CI green today
 * while catching future regressions the moment they're introduced.
 *
 * Usage:
 *   node scripts/validate-sync.mjs                        # gate (CI-friendly)
 *   node scripts/validate-sync.mjs --update-baseline      # re-baseline after an
 *                                                         #   intentional sync/reconcile
 *   node scripts/validate-sync.mjs --raw                  # show ALL drift (ignore baseline)
 *   node scripts/validate-sync.mjs --json                 # machine-readable summary
 *   SKIP=codex,opencode node scripts/validate-sync.mjs    # skip trees
 *
 * Exit codes:
 *   0 — gate passes (drift unchanged or reduced vs baseline; or baseline updated)
 *   1 — new/worsened drift found, or baseline missing/invalid
 */

import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE = join(ROOT, "claude", ".claude", "skills");
const BASELINE_PATH = join(__dirname, "sync-baseline.json");

const GENERATED = [
  { label: "codex/.agents", dir: join(ROOT, "codex", ".agents", "skills") },
  { label: "opencode/.agents", dir: join(ROOT, "opencode", ".agents", "skills") },
  { label: "antigravity/skills", dir: join(ROOT, "antigravity", "skills") },
  { label: "antigravity/.agents", dir: join(ROOT, "antigravity", ".agents", "skills") },
];

const ARGS = new Set(process.argv.slice(2));
const UPDATE = ARGS.has("--update-baseline");
const RAW = ARGS.has("--raw");
const JSON_OUT = ARGS.has("--json");
const skip = new Set((process.env.SKIP || "").split(",").map((s) => s.trim()).filter(Boolean));

function skillDirs(treeDir) {
  if (!existsSync(treeDir)) return { names: new Set(), missingSkillMd: [] };
  const names = new Set();
  const missingSkillMd = [];
  for (const entry of readdirSync(treeDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (existsSync(join(treeDir, entry.name, "SKILL.md"))) names.add(entry.name);
    else missingSkillMd.push(entry.name);
  }
  return { names, missingSkillMd };
}

function validateIndex(treeDir, label) {
  const indexPath = join(treeDir, "skill-index.json");
  if (!existsSync(indexPath)) return [];
  const problems = [];
  let data;
  try {
    data = JSON.parse(readFileSync(indexPath, "utf8"));
  } catch (e) {
    return [{ type: "index-invalid", message: `${label}/skill-index.json is not valid JSON` }];
  }
  const onDisk = new Set(
    readdirSync(treeDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name),
  );
  const skills = Array.isArray(data.skills) ? data.skills : [];
  const indexNames = new Set(skills.map((s) => s && s.name).filter(Boolean));

  if (typeof data.count === "number" && data.count !== skills.length) {
    problems.push({ type: "count-mismatch", message: `${label}: skill-index.json "count" is ${data.count} but has ${skills.length} entries` });
  }
  for (const name of indexNames) {
    if (!onDisk.has(name)) {
      problems.push({ type: "orphan-index", message: `${label}: index lists "${name}" but ${name}/ doesn't exist on disk` });
    }
  }
  for (const name of onDisk) {
    if (!indexNames.has(name)) {
      problems.push({ type: "unindexed-skill", message: `${label}: "${name}" exists on disk but is missing from skill-index.json` });
    }
  }
  return problems;
}

if (!existsSync(SOURCE)) {
  console.error(`FATAL: source of truth missing: ${SOURCE}`);
  process.exit(1);
}
const sourceSkills = skillDirs(SOURCE);

// ── Compute current drift per tree ─────────────────────────────────────────
const current = {};
for (const tree of GENERATED) {
  if (skip.has(tree.label)) continue;
  const t = skillDirs(tree.dir);
  const missing = [...sourceSkills.names].filter((n) => !t.names.has(n)).sort();
  const extra = [...t.names].filter((n) => !sourceSkills.names.has(n)).sort();
  const idx = validateIndex(tree.dir, tree.label);
  current[tree.label] = {
    total: t.names.size,
    missingFromSource: missing,
    extraVsSource: extra,
    dirsWithoutSkillMd: t.missingSkillMd.sort(),
    indexProblems: idx.map((p) => p.message).sort(),
  };
}

// ── Raw dump / diagnostics ─────────────────────────────────────────────────
if (RAW) {
  const rawIssues = (() => {
    let n = 0;
    for (const label of Object.keys(current)) {
      const c = current[label];
      n += c.missingFromSource.length + c.extraVsSource.length + c.dirsWithoutSkillMd.length + c.indexProblems.length;
    }
    return n;
  })();
  for (const label of Object.keys(current)) {
    const c = current[label];
    for (const d of c.dirsWithoutSkillMd) console.error(`❌ [${label}] directory "${d}" has no SKILL.md`);
    if (c.missingFromSource.length) console.error(`❌ [${label}] MISSING: ${c.missingFromSource.join(", ")}`);
    if (c.extraVsSource.length) console.error(`⚠️ [${label}] stalE (not in source): ${c.extraVsSource.join(", ")}`);
    for (const p of c.indexProblems) console.error(`❌ [${label}] ${p}`);
  }
  console.log(`\nRAW DRIFT: ${rawIssues} issue(s) across ${Object.keys(current).length} tree(s).`);
  if (JSON_OUT) console.log(JSON.stringify(current, null, 2));
  process.exit(0);
}

// ── Baseline load / update ─────────────────────────────────────────────────
if (UPDATE) {
  const baseline = { schema: 1, updatedBy: "validate-sync.mjs --update-baseline", trees: current };
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + "\n");
  console.log(`✅ Baseline updated: ${BASELINE_PATH}`);
  if (JSON_OUT) console.log(JSON.stringify({ updated: true, ...current }, null, 2));
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  console.error(`❌ No baseline at ${BASELINE_PATH}. Refusing to gate blind.`);
  console.error(`   Run: node scripts/validate-sync.mjs --update-baseline`);
  process.exit(1);
}
let baseline;
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
} catch {
  console.error(`❌ Baseline ${BASELINE_PATH} is not valid JSON.`);
  process.exit(1);
}
const baseTrees = baseline.trees || {};

// ── Gate: fail only on NEW/WORSE drift vs baseline ─────────────────────────
let newIssues = 0;
const gateReport = { trees: {} };

for (const label of Object.keys(current)) {
  const c = current[label];
  const b = baseTrees[label] || { missingFromSource: [], extraVsSource: [], dirsWithoutSkillMd: [], indexProblems: [] };
  const bMissing = new Set(b.missingFromSource || []);
  const bExtra = new Set(b.extraVsSource || []);
  const bDirs = new Set(b.dirsWithoutSkillMd || []);
  const bIndex = new Set(b.indexProblems || []);

  const newMissing = c.missingFromSource.filter((n) => !bMissing.has(n));
  const newExtra = c.extraVsSource.filter((n) => !bExtra.has(n));
  const newDirs = c.dirsWithoutSkillMd.filter((n) => !bDirs.has(n));
  const newIndex = c.indexProblems.filter((p) => !bIndex.has(p));

  const treeNew = newMissing.length + newExtra.length + newDirs.length + newIndex.length;
  newIssues += treeNew;
  gateReport.trees[label] = {
    newMissingFromSource: newMissing,
    newExtraVsSource: newExtra,
    newDirsWithoutSkillMd: newDirs,
    newIndexProblems: newIndex,
    clear: treeNew === 0,
  };

  for (const d of newDirs) { console.error(`❌ [${label}] NEW: directory "${d}" has no SKILL.md`); }
  if (newMissing.length) console.error(`❌ [${label}] NEW drift: missing from source — ${newMissing.join(", ")}`);
  if (newExtra.length) console.error(`❌ [${label}] NEW drift: stale skills — ${newExtra.join(", ")}`);
  for (const p of newIndex) console.error(`❌ [${label}] NEW: ${p}`);
  if (treeNew === 0) console.log(`✅ [${label}] gate clean (drift unchanged or reduced vs baseline)`);
}

if (JSON_OUT) console.log(JSON.stringify(gateReport, null, 2));

console.log("");
if (UPDATE) { /* already handled */ }
else if (newIssues === 0) {
  console.log(`✅ Gate passes — no new drift vs baseline (${Object.keys(current).length} tree(s)).`);
  console.log(`   Run --update-baseline after an intentional sync/reconcile.`);
  process.exit(0);
} else {
  console.log(`❌ Gate FAILS — ${newIssues} new/worsened drift issue(s) found vs baseline.`);
  console.log(`   If these are intentional (you synced/reconciled), run: node scripts/validate-sync.mjs --update-baseline`);
  process.exit(1);
}
