#!/usr/bin/env node
/**
 * post-index-reminder.cjs — PostToolUse(Edit|Write|MultiEdit) Hook
 *
 * After writing any file in docs/, reports/, or plans/, reminds the agent
 * to update the corresponding index file if it wasn't the file just written.
 *
 * Throttled per directory type (2 min) to avoid noise when writing multiple
 * files in the same directory in quick succession.
 *
 * Exit Codes:
 *   0 - Always (non-blocking)
 */

try {

const fs = require('fs');
const path = require('path');

const THROTTLE_MS = 2 * 60 * 1000; // 2 minutes per directory type
const THROTTLE_FILES = {
  docs:    '/tmp/tri-ai-kit-index-reminded-docs.json',
  reports: '/tmp/tri-ai-kit-index-reminded-reports.json',
  plans:   '/tmp/tri-ai-kit-index-reminded-plans.json',
};

function isThrottled(key) {
  try {
    const data = JSON.parse(fs.readFileSync(THROTTLE_FILES[key], 'utf-8'));
    return Date.now() - data.ts < THROTTLE_MS;
  } catch { return false; }
}

function setThrottle(key) {
  try { fs.writeFileSync(THROTTLE_FILES[key], JSON.stringify({ ts: Date.now() })); } catch { /* non-critical */ }
}

function main() {
  let hookData;
  try {
    hookData = JSON.parse(fs.readFileSync(0, 'utf-8'));
  } catch {
    process.exit(0);
  }

  const filePath = (hookData.tool_input || {}).file_path || '';
  if (!filePath) process.exit(0);

  // Normalize to forward slashes for cross-platform matching
  const normalized = filePath.replace(/\\/g, '/');

  const messages = [];

  // docs/ — any .md file that is NOT docs/index.json
  if (/\/docs\//.test(normalized) && !normalized.endsWith('/docs/index.json')) {
    if (!isThrottled('docs')) {
      setThrottle('docs');
      messages.push(
        '[Index] File written in docs/ — update `docs/index.json`:\n' +
        '  • Add/update entry in `entries[]` with id, title, category, status, path, tags, agentHint\n' +
        '  • Set root `updatedAt` to today'
      );
    }
  }

  // reports/ — any file that is NOT reports/index.json
  if (/\/reports\//.test(normalized) && !normalized.endsWith('/reports/index.json')) {
    if (!isThrottled('reports')) {
      setThrottle('reports');
      messages.push(
        '[Index] File written in reports/ — update `reports/index.json`:\n' +
        '  • Append entry: { id, type, agent, title, verdict, files: { agent, human }, plan, created }\n' +
        '  • See `core/references/index-protocol.md` for schema'
      );
    }
  }

  // plans/ — any .md file that is NOT plans/index.json or plans/README.md
  if (/\/plans\//.test(normalized) &&
      !normalized.endsWith('/plans/index.json') &&
      !normalized.endsWith('/plans/README.md') &&
      normalized.endsWith('.md')) {
    if (!isThrottled('plans')) {
      setThrottle('plans');
      messages.push(
        '[Index] File written in plans/ — update `plans/index.json`:\n' +
        '  • Add/update entry: { id, title, status, path, created, updated, platforms, effort }\n' +
        '  • See `core/references/index-protocol.md` for schema'
      );
    }
  }

  if (messages.length === 0) process.exit(0);

  process.stdout.write(JSON.stringify({ additionalContext: messages.join('\n\n') }) + '\n');
  process.exit(0);
}

main();

} catch (e) {
  try {
    const fs = require('fs');
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
