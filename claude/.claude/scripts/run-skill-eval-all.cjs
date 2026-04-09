#!/usr/bin/env node
/**
 * run-skill-eval-all.cjs — Run trigger evals for all skills with eval sets
 *
 * Usage:
 *   node .claude/scripts/run-skill-eval-all.cjs [--model <id>] [--concurrency <n>] [--skills-dir <path>]
 *
 * Runs skills sequentially by default (concurrency=1) to avoid overloading
 * claude -p subprocess pool. Each skill's run_eval.py already parallelises
 * its own queries internally.
 *
 * Requires: python3, pyyaml, claude CLI on PATH
 */

'use strict';

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// --- helpers -----------------------------------------------------------------

function findPython() {
  for (const bin of ['python3', 'python']) {
    try {
      execSync(`${bin} --version`, { stdio: 'pipe', timeout: 3000 });
      return bin;
    } catch { /* try next */ }
  }
  return null;
}

function findSkillCreatorDir(cwd) {
  const candidates = [
    path.join(__dirname, '..', 'skills', 'skill-creator'),
    path.join(cwd, '.claude', 'skills', 'skill-creator'),
  ];
  return candidates.find(p => fs.existsSync(path.join(p, 'scripts', 'run_eval.py'))) || null;
}

/** Find all skill dirs that have evals/eval-set.json under a root dir */
function findEvalDirs(skillsRoot) {
  const results = [];
  if (!fs.existsSync(skillsRoot)) return results;

  for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillDir = path.join(skillsRoot, entry.name);
    const evalSet = path.join(skillDir, 'evals', 'eval-set.json');
    if (fs.existsSync(evalSet)) {
      results.push({ name: entry.name, skillDir, evalSet });
    }
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

function printUsage() {
  console.log('Usage: node run-skill-eval-all.cjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --model <id>         Claude model to use (default: configured model)');
  console.log('  --concurrency <n>    Skills to eval in parallel (default: 1)');
  console.log('  --skills-dir <path>  Override skills root dir (default: .claude/skills)');
  console.log('  --filter <pattern>   Only eval skills matching name pattern (e.g. "web-*")');
  console.log('  --timeout <secs>     Per-query timeout in seconds (default: 60)');
  console.log('');
  console.log('Examples:');
  console.log('  node .claude/scripts/run-skill-eval-all.cjs');
  console.log('  node .claude/scripts/run-skill-eval-all.cjs --filter "web-*"');
  console.log('  node .claude/scripts/run-skill-eval-all.cjs --model claude-haiku-4-5-20251001 --concurrency 2');
}

// --- arg parsing -------------------------------------------------------------

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

let model = null;
let concurrency = 1;
let skillsDirOverride = null;
let filter = null;
let timeout = 60;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--model' && args[i + 1]) model = args[++i];
  else if (args[i] === '--concurrency' && args[i + 1]) concurrency = parseInt(args[++i], 10);
  else if (args[i] === '--skills-dir' && args[i + 1]) skillsDirOverride = args[++i];
  else if (args[i] === '--filter' && args[i + 1]) filter = args[++i];
  else if (args[i] === '--timeout' && args[i + 1]) timeout = parseInt(args[++i], 10);
}

// --- validation --------------------------------------------------------------

const cwd = process.cwd();

const python = findPython();
if (!python) {
  console.error('Error: python3 not found. Install via: https://python.org/ or winget install Python.Python.3');
  process.exit(1);
}

const skillCreatorDir = findSkillCreatorDir(cwd);
if (!skillCreatorDir) {
  console.error('Error: skill-creator not found at .claude/skills/skill-creator or .claude/scripts/../skills/skill-creator');
  process.exit(1);
}

const skillsRoot = skillsDirOverride
  ? path.resolve(cwd, skillsDirOverride)
  : path.join(cwd, '.claude', 'skills');

let skills = findEvalDirs(skillsRoot);
if (skills.length === 0) {
  console.error(`Error: no skills with eval sets found in ${skillsRoot}`);
  process.exit(1);
}

// Apply --filter (glob-style name matching via simple wildcard)
if (filter) {
  const pattern = new RegExp('^' + filter.replace(/\*/g, '.*') + '$');
  skills = skills.filter(s => pattern.test(s.name));
  if (skills.length === 0) {
    console.error(`No skills matched filter: ${filter}`);
    process.exit(1);
  }
}

// --- batch runner ------------------------------------------------------------

const results = [];
let passed = 0;
let failed = 0;
let errored = 0;

/**
 * Run eval for one skill synchronously, capture output, return result summary.
 * run_eval.py exits 0 on pass, 1 on failure/error.
 */
function evalSkill({ name, skillDir, evalSet }) {
  const pyArgs = [
    '-m', 'scripts.run_eval',
    '--skill-path', skillDir,
    '--eval-set', evalSet,
    '--timeout', String(timeout),
  ];
  if (model) pyArgs.push('--model', model);

  const result = spawnSync(python, pyArgs, {
    cwd: skillCreatorDir,
    encoding: 'utf8',
    timeout: (timeout + 30) * 1000 * 15, // generous outer timeout (15 queries max)
  });

  const output = (result.stdout || '') + (result.stderr || '');
  const exitCode = result.status ?? 1;

  return { name, exitCode, output };
}

// --- sequential execution (concurrency=1) or chunked parallel ----------------

console.log(`\n🔍 Skill Eval — ${skills.length} skills | concurrency=${concurrency}${model ? ` | model=${model}` : ''}\n`);
console.log('─'.repeat(60));

async function runBatch() {
  // Process in chunks of `concurrency` using Promise.all
  for (let i = 0; i < skills.length; i += concurrency) {
    const chunk = skills.slice(i, i + concurrency);

    const chunkResults = await Promise.all(
      chunk.map(skill => new Promise((resolve) => {
        process.stdout.write(`  ⏳ ${skill.name.padEnd(35)} `);
        const r = evalSkill(skill);
        if (r.exitCode === 0) {
          passed++;
          process.stdout.write('✓ pass\n');
        } else if (r.exitCode === 2) {
          errored++;
          process.stdout.write('⚠ error\n');
        } else {
          failed++;
          process.stdout.write('✗ fail\n');
        }
        results.push(r);
        resolve(r);
      }))
    );
  }
}

runBatch().then(() => {
  // --- summary ----------------------------------------------------------------
  console.log('─'.repeat(60));
  console.log(`\n📊 Results: ${passed} passed | ${failed} failed | ${errored} errors\n`);

  if (failed > 0 || errored > 0) {
    console.log('── Failures / Errors ──────────────────────────────────────');
    for (const r of results) {
      if (r.exitCode !== 0) {
        console.log(`\n  ${r.exitCode === 2 ? '⚠' : '✗'} ${r.name}`);
        // Print last 20 lines of output to keep it scannable
        const lines = r.output.trim().split('\n').slice(-20);
        for (const line of lines) console.log(`    ${line}`);
      }
    }
    console.log('');
  }

  // Write machine-readable results to reports/
  const reportsDir = path.join(cwd, 'reports');
  if (fs.existsSync(reportsDir)) {
    // Format: YYMMDD-HHMM (e.g. 260331-1430) matching kit naming convention
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const ts = `${String(now.getFullYear()).slice(2)}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    const reportPath = path.join(reportsDir, `${ts}-skill-eval-all.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      runAt: new Date().toISOString(),
      model: model || 'default',
      skillsDir: skillsRoot,
      filter: filter || null,
      summary: { total: skills.length, passed, failed, errored },
      results: results.map(r => ({ skill: r.name, pass: r.exitCode === 0, exitCode: r.exitCode })),
    }, null, 2));
    console.log(`  Results saved: ${path.relative(cwd, reportPath)}\n`);
  }

  process.exit(failed > 0 || errored > 0 ? 1 : 0);
});
