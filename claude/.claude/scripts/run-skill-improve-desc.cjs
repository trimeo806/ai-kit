#!/usr/bin/env node
/**
 * run-skill-improve-desc.cjs — Bridge for skill-creator improve_description.py
 *
 * Usage:
 *   node .claude/scripts/run-skill-improve-desc.cjs <skill-path>
 *
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
  return candidates.find(p => fs.existsSync(path.join(p, 'scripts', 'improve_description.py'))) || null;
}

function printUsage() {
  console.error('Usage: node .claude/scripts/run-skill-improve-desc.cjs <skill-path>');
  console.error('');
  console.error('Examples:');
  console.error('  node .claude/scripts/run-skill-improve-desc.cjs .claude/skills/cook');
  console.error('');
  console.error('Prerequisites: python3, pyyaml (pip install pyyaml), claude CLI');
}

// --- arg parsing -------------------------------------------------------------

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  printUsage();
  process.exit(args.length === 0 ? 1 : 0);
}

const skillPath = args[0];

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

// --- spawn -------------------------------------------------------------------

const pyArgs = ['-m', 'scripts.improve_description', resolvedSkillPath];

console.log(`Improving description: ${path.basename(resolvedSkillPath)}`);
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
  process.exit(code ?? 0);
});
