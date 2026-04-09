#!/usr/bin/env node
/**
 * privacy-block.cjs - Block access to sensitive files unless user-approved
 *
 * PRIVACY-based blocking (separate from SIZE-based scout-block)
 * Blocks sensitive files. LLM must get user approval and use APPROVED: prefix.
 *
 * Flow:
 * 1. LLM tries: Read ".env" → BLOCKED
 * 2. LLM asks user for permission
 * 3. User approves
 * 4. LLM retries: Read "APPROVED:.env" → ALLOWED
 *
 * Core logic extracted to lib/privacy-checker.cjs for OpenCode plugin reuse.
 */

const fs = require('fs');
const path = require('path');
const { isHookEnabled } = require('./lib/kit-config-utils.cjs');

if (!isHookEnabled('privacy')) process.exit(0);

// Import shared privacy checking logic
const {
  checkPrivacy,
  isSafeFile,
  isPrivacyBlockDisabled,
  isPrivacySensitive,
  hasApprovalPrefix,
  stripApprovalPrefix,
  extractPaths,
  isSuspiciousPath
} = require('./lib/privacy-checker.cjs');

/**
 * Format block message with approval instructions and JSON marker for ask the user
 * @param {string} filePath - Blocked file path
 * @returns {string} Formatted block message with JSON marker
 */
function formatBlockMessage(filePath) {
  const basename = path.basename(filePath);

  // JSON marker for LLM to parse and use ask the user
  const promptData = {
    type: 'PRIVACY_PROMPT',
    file: filePath,
    basename: basename,
    question: {
      header: 'File Access',
      text: `I need to read "${basename}" which may contain sensitive data (API keys, passwords, tokens). Do you approve?`,
      options: [
        { label: 'Yes, approve access', description: `Allow reading ${basename} this time` },
        { label: 'No, skip this file', description: 'Continue without accessing this file' }
      ]
    }
  };

  return `
\x1b[36mNOTE:\x1b[0m This is not an error - this block protects sensitive data.

\x1b[33mPRIVACY BLOCK\x1b[0m: Sensitive file access requires user approval

  \x1b[33mFile:\x1b[0m ${filePath}

  This file may contain secrets (API keys, passwords, tokens).

\x1b[90m@@PRIVACY_PROMPT_START@@\x1b[0m
${JSON.stringify(promptData, null, 2)}
\x1b[90m@@PRIVACY_PROMPT_END@@\x1b[0m

  \x1b[34mClaude:\x1b[0m Use ask the user with the JSON above, then:
  \x1b[32mIf "Yes":\x1b[0m Use bash to read: cat "${filePath}"
  \x1b[31mIf "No":\x1b[0m  Continue without this file.
`;
}

/**
 * Format approval notice
 * @param {string} filePath - Approved file path
 * @returns {string} Formatted approval notice
 */
function formatApprovalNotice(filePath) {
  return `\x1b[32m✓\x1b[0m Privacy: User-approved access to ${path.basename(filePath)}`;
}

// Main
function main() {
  let input = '';
  try {
    input = fs.readFileSync(0, 'utf-8');
  } catch {
    process.exit(0); // No stdin, allow
  }

  let hookData;
  try {
    hookData = JSON.parse(input);
  } catch (e) {
    process.exit(0); // Invalid JSON, allow
  }

  const { tool_input: toolInput, tool_name: toolName } = hookData;

  // Use shared privacy checker
  const result = checkPrivacy({
    toolName,
    toolInput,
    options: { allowBash: true }
  });

  // Handle results
  if (result.approved) {
    // User approved - allow with notice
    if (result.suspicious) {
      console.error('\x1b[33mWARN:\x1b[0m Approved path is outside project:', result.filePath);
    }
    console.error(formatApprovalNotice(result.filePath));
    process.exit(0);
  }

  if (result.isBash) {
    // Bash: warn but don't block - allows "Yes → bash cat" flow
    console.error(`\x1b[33mWARN:\x1b[0m ${result.reason}`);
    process.exit(0);
  }

  if (result.blocked) {
    // No approval - block
    console.error(formatBlockMessage(result.filePath));
    process.exit(2);
  }

  process.exit(0); // Allow
}

// Run main only when executed directly (not when required for testing)
if (require.main === module) {
  try {
    main();
  } catch (e) {
    // Minimal crash logging — only Node builtins, no lib/ deps
    try {
      const p = require('path');
      const logDir = p.join(__dirname, '.logs');
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      fs.appendFileSync(
        p.join(logDir, 'hook-log.jsonl'),
        JSON.stringify({ ts: new Date().toISOString(), hook: p.basename(__filename, '.cjs'), status: 'crash', error: e.message }) + '\n'
      );
    } catch (_) {}
    process.exit(0); // fail-open
  }
}

// Export functions for unit testing
if (typeof module !== 'undefined') {
  module.exports = {
    isSafeFile,
    isPrivacyBlockDisabled,
    isPrivacySensitive,
    hasApprovalPrefix,
    stripApprovalPrefix,
    extractPaths,
  };
}
