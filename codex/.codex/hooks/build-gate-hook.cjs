#!/usr/bin/env node
/**
 * build-gate-hook.cjs - PreToolUse hook
 *
 * Intercepts `git commit` Bash commands and runs build verification
 * before allowing them to proceed.
 *
 * Exit codes:
 *   0 = allow (build passed, skipped, or non-commit command)
 *   2 = block (build failed)
 *
 * Bypass:
 *   - `--skip-build` in the git commit command
 *   - `TRI_SKIP_BUILD=1` environment variable
 *   - `hooks['build-gate'].enabled = false` in .tri-ai-kit.json
 *   - `TRI_BUILD_GATE_RAN=1` env (dedup — skill already ran gate)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { isHookEnabled } = require('./lib/kit-config-utils.cjs');

try {
  // ─── Config check (fast path) ───
  if (!isHookEnabled('build-gate')) {
    process.exit(0);
  }

  // ─── Dedup: skill-level gate already ran this session ───
  if (process.env['TRI_BUILD_GATE_RAN'] === '1') {
    process.stderr.write('build-gate-hook: skipping (already ran via skill)\n');
    process.exit(0);
  }

  // ─── Parse stdin ───
  let input = '';
  try {
    input = fs.readFileSync(0, 'utf-8');
  } catch {
    process.exit(0); // No stdin — allow
  }

  if (!input || !input.trim()) {
    process.exit(0);
  }

  /** @type {{ tool_name?: string, tool_input?: { command?: string } }} */
  let data;
  try {
    data = JSON.parse(input);
  } catch {
    process.exit(0); // Parse error — fail-open
  }

  // ─── Only intercept Bash tool calls ───
  if (data.tool_name !== 'Bash') {
    process.exit(0);
  }

  const command = data.tool_input && data.tool_input.command;
  if (typeof command !== 'string') {
    process.exit(0);
  }

  // ─── Match git commit commands ───
  // Matches: git commit, git  commit, etc.
  // Does NOT match: git commit-msg (no word boundary issue — \b handles it)
  if (!/\bgit\s+commit\b/.test(command)) {
    process.exit(0); // Fast exit for non-commit commands
  }

  // ─── Bypass checks ───

  // --skip-build in the commit command
  if (/--skip-build/.test(command)) {
    process.stderr.write('build-gate-hook: skipping (--skip-build in command)\n');
    process.exit(0);
  }

  // TRI_SKIP_BUILD env var
  if (process.env['TRI_SKIP_BUILD'] === '1') {
    process.stderr.write('build-gate-hook: skipping (TRI_SKIP_BUILD=1)\n');
    process.exit(0);
  }

  // ─── Run build-gate ───
  const buildGatePath = path.join(__dirname, 'lib', 'build-gate.cjs');
  process.stderr.write('build-gate-hook: intercepted git commit — running build verification...\n');

  let stdout = '';
  let exitCode = 0;

  try {
    stdout = execSync(`node "${buildGatePath}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'inherit'], // inherit stderr so build output is visible
      timeout: 360000, // 6 min — build-gate default is 5 min, give buffer
    });
  } catch (err) {
    exitCode = err.status || 1;
    stdout = err.stdout || '';
  }

  // ─── Parse result ───
  /** @type {{ success?: boolean|null, warning?: string, error?: string, platform?: string, duration_ms?: number }} */
  let result = {};
  try {
    result = JSON.parse(stdout.trim());
  } catch {
    // stdout unparseable — treat as failure only if exit code was nonzero
    if (exitCode === 0) {
      process.exit(0); // Unclear result but no error — allow
    }
    process.stderr.write('build-gate-hook: build-gate output unparseable — blocking commit\n');
    process.exit(2);
  }

  // Exit 2 from build-gate = no build command detected — warn but allow
  if (exitCode === 2 || result.success === null) {
    process.stderr.write(`build-gate-hook: ${result.warning || 'no build command detected — skipping gate'}\n`);
    process.exit(0);
  }

  // Build passed
  if (result.success === true) {
    const duration = result.duration_ms ? ` (${result.duration_ms}ms)` : '';
    process.stderr.write(`build-gate-hook: build passed${duration} — commit allowed\n`);
    process.exit(0);
  }

  // Build failed — block commit
  const errorExcerpt = result.error ? `\n\n${result.error}` : '';
  process.stderr.write(
    `\nbuild-gate-hook: BUILD FAILED — commit blocked\n` +
    `Platform: ${result.platform || 'unknown'}${errorExcerpt}\n\n` +
    `Fix the build errors above, then retry your commit.\n` +
    `To bypass (WIP/draft): add --skip-build or set TRI_SKIP_BUILD=1\n`
  );
  process.exit(2);

} catch (e) {
  // Outer catch — fail-open, never block on hook errors
  try {
    const logDir = path.join(__dirname, '.logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(
      path.join(logDir, 'hook-log.jsonl'),
      JSON.stringify({ ts: new Date().toISOString(), hook: 'build-gate-hook', status: 'crash', error: e.message }) + '\n'
    );
  } catch (_) {}
  process.exit(0);
}
