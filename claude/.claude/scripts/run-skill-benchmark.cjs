#!/usr/bin/env node
/**
 * run-skill-benchmark.cjs — Bridge for skill-creator aggregate_benchmark.py
 *
 * Usage:
 *   node .claude/scripts/run-skill-benchmark.cjs <workspace/iteration-N> [--skill-name <name>]
 *
 * Produces: benchmark.json + benchmark.md in the workspace directory.
 * Requires: python3, pyyaml
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
  return candidates.find(p => fs.existsSync(path.join(p, 'scripts', 'aggregate_benchmark.py'))) || null;
}

function printUsage() {
  console.error('Usage: node .claude/scripts/run-skill-benchmark.cjs <workspace/iteration-N> [--skill-name <name>]');
  console.error('');
  console.error('Examples:');
  console.error('  node .claude/scripts/run-skill-benchmark.cjs /tmp/skill-ws/iteration-1 --skill-name cook');
  console.error('');
  console.error('Produces: benchmark.json and benchmark.md in the workspace directory.');
  console.error('Prerequisites: python3, pyyaml (pip install pyyaml)');
}

// --- arg parsing -------------------------------------------------------------

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  printUsage();
  process.exit(args.length === 0 ? 1 : 0);
}

const workspacePath = args[0];
let skillName = null;
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--skill-name' && args[i + 1]) {
    skillName = args[++i];
  }
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
  console.error('Expected at .claude/skills/skill-creator or packages/core/skills/skill-creator');
  process.exit(1);
}

const resolvedWorkspace = path.resolve(process.cwd(), workspacePath);
if (!fs.existsSync(resolvedWorkspace)) {
  console.error(`Error: workspace path not found: ${resolvedWorkspace}`);
  process.exit(1);
}

// --- spawn -------------------------------------------------------------------

const pyArgs = ['-m', 'scripts.aggregate_benchmark', resolvedWorkspace];
if (skillName) pyArgs.push('--skill-name', skillName);

console.log(`Aggregating benchmark: ${path.basename(resolvedWorkspace)}`);
if (skillName) console.log(`Skill: ${skillName}`);
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
    console.log(`Benchmark complete. Output in: ${resolvedWorkspace}/benchmark.json`);
  }
  process.exit(code ?? 0);
});
