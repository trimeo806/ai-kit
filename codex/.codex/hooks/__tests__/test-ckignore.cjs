#!/usr/bin/env node

/**
 * Test script for .tri-ignore functionality
 * Tests that scout-block.sh respects .tri-ignore patterns
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { checkScoutBlock } = require('../lib/scout-checker.cjs');

const hookPath = path.join(__dirname, '..', 'scout-block.cjs');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-ignore-test-'));
const ignoreDir = path.join(tempDir, '.codex');
const ignoreFilePath = path.join(ignoreDir, '.tri-ignore');
fs.mkdirSync(ignoreDir, { recursive: true });
writeCkignore(['node_modules', '.git', 'dist', 'build', '__pycache__']);

function runTest(name, input, expected) {
  const result = checkScoutBlock({
    toolName: input.tool_name,
    toolInput: input.tool_input,
    options: {
      claudeDir: ignoreDir,
      ignoreFilePath,
      checkBroadPatterns: true
    }
  });
  const actual = result.blocked ? 'BLOCKED' : 'ALLOWED';
  const success = actual === expected;
  return { name, expected, actual, success, error: result.reason };
}

function writeCkignore(patterns) {
  fs.writeFileSync(ignoreFilePath, patterns.join('\n') + '\n');
}

function restoreCkignore() {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('Testing .tri-ignore functionality...\n');

let passed = 0;
let failed = 0;

// Test 1: Default patterns work (with existing .tri-ignore)
console.log('--- Test 1: Default patterns from .tri-ignore ---');
let result = runTest(
  'node_modules blocked (default)',
  { tool_name: 'Read', tool_input: { file_path: 'node_modules/pkg.json' } },
  'BLOCKED'
);
if (result.success) {
  console.log(`✓ ${result.name}: ${result.actual}`);
  passed++;
} else {
  console.log(`✗ ${result.name}: expected ${result.expected}, got ${result.actual}`);
  failed++;
}

// Test 2: Custom pattern - only block 'vendor' directory
console.log('\n--- Test 2: Custom .tri-ignore with only "vendor" ---');
writeCkignore(['# Custom ignore', 'vendor']);

result = runTest(
  'vendor blocked (custom)',
  { tool_name: 'Read', tool_input: { file_path: 'vendor/lib.js' } },
  'BLOCKED'
);
if (result.success) {
  console.log(`✓ ${result.name}: ${result.actual}`);
  passed++;
} else {
  console.log(`✗ ${result.name}: expected ${result.expected}, got ${result.actual}`);
  failed++;
}

result = runTest(
  'node_modules ALLOWED when not in .tri-ignore',
  { tool_name: 'Read', tool_input: { file_path: 'node_modules/pkg.json' } },
  'ALLOWED'
);
if (result.success) {
  console.log(`✓ ${result.name}: ${result.actual}`);
  passed++;
} else {
  console.log(`✗ ${result.name}: expected ${result.expected}, got ${result.actual}`);
  failed++;
}

// Test 3: Multiple custom patterns
console.log('\n--- Test 3: Multiple custom patterns ---');
writeCkignore(['vendor', 'temp', '.cache']);

result = runTest(
  'vendor blocked',
  { tool_name: 'Grep', tool_input: { pattern: 'test', path: 'vendor' } },
  'BLOCKED'
);
if (result.success) {
  console.log(`✓ ${result.name}: ${result.actual}`);
  passed++;
} else {
  console.log(`✗ ${result.name}: expected ${result.expected}, got ${result.actual}`);
  failed++;
}

result = runTest(
  'temp blocked',
  { tool_name: 'Bash', tool_input: { command: 'ls temp/' } },
  'BLOCKED'
);
if (result.success) {
  console.log(`✓ ${result.name}: ${result.actual}`);
  passed++;
} else {
  console.log(`✗ ${result.name}: expected ${result.expected}, got ${result.actual}`);
  failed++;
}

result = runTest(
  '.cache blocked',
  { tool_name: 'Glob', tool_input: { pattern: '.cache/**' } },
  'BLOCKED'
);
if (result.success) {
  console.log(`✓ ${result.name}: ${result.actual}`);
  passed++;
} else {
  console.log(`✗ ${result.name}: expected ${result.expected}, got ${result.actual}`);
  failed++;
}

result = runTest(
  'src still allowed',
  { tool_name: 'Read', tool_input: { file_path: 'src/index.js' } },
  'ALLOWED'
);
if (result.success) {
  console.log(`✓ ${result.name}: ${result.actual}`);
  passed++;
} else {
  console.log(`✗ ${result.name}: expected ${result.expected}, got ${result.actual}`);
  failed++;
}

// Test 4: Comments and empty lines ignored
console.log('\n--- Test 4: Comments and empty lines handled ---');
writeCkignore(['# This is a comment', '', 'blockeddir', '# Another comment', '']);

result = runTest(
  'blockeddir blocked',
  { tool_name: 'Read', tool_input: { file_path: 'blockeddir/file.txt' } },
  'BLOCKED'
);
if (result.success) {
  console.log(`✓ ${result.name}: ${result.actual}`);
  passed++;
} else {
  console.log(`✗ ${result.name}: expected ${result.expected}, got ${result.actual}`);
  failed++;
}

result = runTest(
  'otherdir allowed',
  { tool_name: 'Read', tool_input: { file_path: 'otherdir/file.txt' } },
  'ALLOWED'
);
if (result.success) {
  console.log(`✓ ${result.name}: ${result.actual}`);
  passed++;
} else {
  console.log(`✗ ${result.name}: expected ${result.expected}, got ${result.actual}`);
  failed++;
}

// Restore original .tri-ignore
restoreCkignore();

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
