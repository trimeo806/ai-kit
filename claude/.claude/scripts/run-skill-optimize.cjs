#!/usr/bin/env node
/**
 * run-skill-optimize.cjs — Bridge for skill-creator run_loop.py
 *
 * Usage:
 *   node .claude/scripts/run-skill-optimize.cjs <skill-path> --eval-set <path> [options]
 *
 * Options:
 *   --eval-set <path>       Path to eval JSON file (required)
 *   --model <id>            Model ID (default: claude-sonnet-4-6)
 *   --max-iterations <n>    Max optimization iterations (default: 5)
 *   --verbose               Verbose output
 *
 * Output JSON written to: <skill-path>/optimization-output.json
 * Requires: python3, pyyaml, claude CLI on PATH
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// --- helpers -----------------------------------------------------------------

function findPython() {
  const { execSync } = require('child_process');
  for (const bin of ['python3', 'python']) {
    try {
      execSync(`${bin} --version`, { stdio: 'pipe', timeout: 3000 });
      return bin;
    } catch { /* try next */ }
  }
  return null;
}

function findSkillCreatorDir() {
  const candidates = [
    path.join(__dirname, '..', 'skills', 'skill-creator'),
    path.join(process.cwd(), '.claude', 'skills', 'skill-creator'),
  ];
  return candidates.find(p => fs.existsSync(path.join(p, 'scripts', 'run_loop.py'))) || null;
}

function printUsage() {
  console.error('Usage: node .claude/scripts/run-skill-optimize.cjs <skill-path> --eval-set <path> [--model <id>] [--max-iterations 5] [--verbose]');
  console.error('');
  console.error('Examples:');
  console.error('  node .claude/scripts/run-skill-optimize.cjs .claude/skills/cook --eval-set /tmp/ws/trigger-eval.json');
  console.error('  node .claude/scripts/run-skill-optimize.cjs .claude/skills/plan --eval-set eval.json --max-iterations 3 --verbose');
  console.error('');
  console.error('Output: optimization-output.json written to the skill directory.');
  console.error('Prerequisites: python3, pyyaml (pip install pyyaml), claude CLI');
}

// --- arg parsing -------------------------------------------------------------

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  printUsage();
  process.exit(args.length === 0 ? 1 : 0);
}

const skillPath = args[0];
let evalSet = null;
let model = null;
let maxIterations = null;
let verbose = false;

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--eval-set' && args[i + 1]) { evalSet = args[++i]; }
  else if (args[i] === '--model' && args[i + 1]) { model = args[++i]; }
  else if (args[i] === '--max-iterations' && args[i + 1]) { maxIterations = args[++i]; }
  else if (args[i] === '--verbose') { verbose = true; }
}

if (!evalSet) {
  console.error('Error: --eval-set <path> is required');
  console.error('');
  printUsage();
  process.exit(1);
}

// --- validation --------------------------------------------------------------

const python = findPython();
if (!python) {
  console.error('Error: python3 not found on PATH.');
  console.error('Install Python 3: https://python.org/ or via winget: winget install Python.Python.3');
  process.exit(1);
}

const skillCreatorDir = findSkillCreatorDir();
if (!skillCreatorDir) {
  console.error('Error: skill-creator directory not found.');
  process.exit(1);
}

const resolvedSkillPath = path.resolve(process.cwd(), skillPath);
if (!fs.existsSync(resolvedSkillPath)) {
  console.error(`Error: skill path not found: ${resolvedSkillPath}`);
  process.exit(1);
}

const resolvedEvalSet = path.resolve(process.cwd(), evalSet);
if (!fs.existsSync(resolvedEvalSet)) {
  console.error(`Error: eval set not found: ${resolvedEvalSet}`);
  process.exit(1);
}

// Output JSON goes beside the skill
const outputJson = path.join(resolvedSkillPath, 'optimization-output.json');

// --- spawn -------------------------------------------------------------------

const pyArgs = [
  '-m', 'scripts.run_loop',
  '--eval-set', resolvedEvalSet,
  '--skill-path', resolvedSkillPath,
];
if (model) pyArgs.push('--model', model);
if (maxIterations) pyArgs.push('--max-iterations', maxIterations);
if (verbose) pyArgs.push('--verbose');

console.log(`Optimizing skill: ${path.basename(resolvedSkillPath)}`);
console.log(`Eval set: ${path.basename(resolvedEvalSet)}`);
if (model) console.log(`Model: ${model}`);
console.log(`Max iterations: ${maxIterations || 5}`);
console.log('');
console.log('This will take several minutes. Output streams in real-time.');
console.log('');

const child = spawn(python, pyArgs, {
  cwd: skillCreatorDir,
  stdio: 'inherit',
});

child.on('error', (err) => {
  if (err.code === 'ENOENT') {
    console.error(`Error: ${python} not found`);
  } else {
    console.error(`Error: ${err.message}`);
  }
  process.exit(1);
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('');
    console.log(`Optimization complete.`);
    if (fs.existsSync(outputJson)) {
      console.log(`Output JSON: ${outputJson}`);
      console.log('Run skill:report to generate an HTML report from this output.');
    }
  }
  process.exit(code ?? 0);
});
