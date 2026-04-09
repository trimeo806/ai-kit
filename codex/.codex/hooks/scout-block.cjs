#!/usr/bin/env node
/**
 * scout-block.cjs - Cross-platform hook for blocking directory access
 *
 * Blocks access to directories listed in .codex/.tri-ignore
 * Uses gitignore-spec compliant pattern matching via 'ignore' package
 *
 * Blocking Rules:
 * - File paths: Blocks any file_path/path/pattern containing blocked directories
 * - Bash commands: Blocks directory access (cd, ls, cat, etc.) but ALLOWS build commands
 *   - Blocked: cd node_modules, ls packages/web/node_modules, cat dist/file.js
 *   - Allowed: npm build, go build, cargo build, make, mvn, gradle, docker build, kubectl, terraform
 *
 * Configuration:
 * - Edit .codex/.tri-ignore to customize blocked patterns (one per line, # for comments)
 * - Supports negation patterns (!) to allow specific paths
 *
 * Exit Codes:
 * - 0: Command allowed
 * - 2: Command blocked
 *
 * Core logic extracted to lib/scout-checker.cjs for OpenCode plugin reuse.
 */

const fs = require('fs');
const path = require('path');

// Import shared scout checking logic
const {
  checkScoutBlock,
  isBuildCommand,
  isVenvExecutable,
  isAllowedCommand
} = require('./lib/scout-checker.cjs');

// Import config utils to respect .tri-ai-kit.json settings
const { loadConfig } = require('./lib/kit-config-utils.cjs');

// Import formatters (kept local as they're Claude-specific output)
const { formatBlockedError } = require('./scout-block/error-formatter.cjs');
const { formatBroadPatternError } = require('./scout-block/broad-pattern-detector.cjs');

try {
  // Load config — respects .tri-ai-kit.json hooks.scout settings
  const config = loadConfig({ includeProject: false, includeAssertions: false, includeLocale: false });
  const scoutConfig = config.hooks?.scout ?? {};

  // Allow disabling scout-block via config: { "hooks": { "scout": { "enabled": false } } }
  if (scoutConfig.enabled === false) {
    process.exit(0);
  }

  // Read stdin synchronously
  const hookInput = fs.readFileSync(0, 'utf-8');

  // Validate input not empty
  if (!hookInput || hookInput.trim().length === 0) {
    console.error('ERROR: Empty input');
    process.exit(2);
  }

  // Parse JSON
  let data;
  try {
    data = JSON.parse(hookInput);
  } catch (parseError) {
    // Fail-open for unparseable input
    console.error('WARN: JSON parse failed, allowing operation');
    process.exit(0);
  }

  // Validate structure
  if (!data.tool_input || typeof data.tool_input !== 'object') {
    // Fail-open for invalid structure
    console.error('WARN: Invalid JSON structure, allowing operation');
    process.exit(0);
  }

  const toolInput = data.tool_input;
  const toolName = data.tool_name || 'unknown';
  const claudeDir = path.dirname(__dirname); // Go up from hooks/ to .claude/

  // Resolve ignore file path from config (supports absolute or relative to cwd)
  const ignoreFileRaw = scoutConfig.ignoreFile || '.codex/.tri-ignore';
  const ignoreFilePath = path.isAbsolute(ignoreFileRaw)
    ? ignoreFileRaw
    : path.join(process.cwd(), ignoreFileRaw);

  // Use shared scout checker
  const result = checkScoutBlock({
    toolName,
    toolInput,
    options: {
      claudeDir,
      ignoreFilePath,
      checkBroadPatterns: true
    }
  });

  // Handle allowed commands
  if (result.isAllowedCommand) {
    process.exit(0);
  }

  // Handle broad pattern blocks
  if (result.blocked && result.isBroadPattern) {
    const errorMsg = formatBroadPatternError({
      blocked: true,
      reason: result.reason,
      suggestions: result.suggestions
    }, claudeDir);
    console.error(errorMsg);
    process.exit(2);
  }

  // Handle pattern blocks
  if (result.blocked) {
    const errorMsg = formatBlockedError({
      path: result.path,
      pattern: result.pattern,
      tool: toolName,
      claudeDir: claudeDir
    });
    console.error(errorMsg);
    process.exit(2);
  }

  // All paths allowed
  process.exit(0);

} catch (error) {
  // Fail-open for unexpected errors
  console.error('WARN: Hook error, allowing operation -', error.message);
  // Crash logging — only Node builtins
  try {
    const _fs = require('fs');
    const _p = require('path');
    const logDir = _p.join(__dirname, '.logs');
    if (!_fs.existsSync(logDir)) _fs.mkdirSync(logDir, { recursive: true });
    _fs.appendFileSync(
      _p.join(logDir, 'hook-log.jsonl'),
      JSON.stringify({ ts: new Date().toISOString(), hook: _p.basename(__filename, '.cjs'), status: 'crash', error: error.message }) + '\n'
    );
  } catch (_) {}
  process.exit(0);
}
