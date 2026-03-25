#!/usr/bin/env node
/**
 * Lesson Capture Hook — Evaluates session significance on Stop
 *
 * Fires: On Stop event, after session-metrics
 * Purpose: Read just-written metrics, evaluate significance thresholds,
 *          output prompt asking Claude to capture knowledge if warranted
 *
 * Failure mode: Silent — outputs {"ok": true} if nothing significant
 */

try {

const fs = require('fs');
const path = require('path');
const { isHookEnabled } = require('./lib/kit-config-utils.cjs');

if (!isHookEnabled('lesson-capture')) process.exit(0);

const DATA_DIR = path.join(process.cwd(), '.kit-data', 'improvements');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.jsonl');

/**
 * Read the last N session entries from JSONL
 */
function readRecentSessions(count) {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return [];
    const lines = fs.readFileSync(SESSIONS_FILE, 'utf-8')
      .split('\n')
      .filter(Boolean);
    return lines.slice(-count).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

/**
 * Check if a skill is new (not seen in previous sessions)
 */
function findNewSkills(current, previous) {
  const prevSkills = new Set();
  for (const s of previous) {
    for (const sk of (s.skills?.loaded || [])) {
      prevSkills.add(sk);
    }
  }
  return (current.skills?.loaded || []).filter(sk => !prevSkills.has(sk));
}

/**
 * Evaluate significance thresholds
 */
function evaluateSignificance(current, previousSessions) {
  const triggers = [];

  // Errors fixed
  if (current.errors?.count > 0) {
    triggers.push({
      type: 'FINDING',
      reason: `${current.errors.count} error(s) encountered (types: ${(current.errors.types || []).join(', ') || 'unknown'})`
    });
  }

  // Rework pattern
  if (current.rework?.fixIterations >= 2) {
    triggers.push({
      type: 'PATTERN',
      reason: `${current.rework.fixIterations} fix iterations — rework pattern detected`
    });
  }

  // Verification failure
  if (current.rework?.verificationFailures >= 1) {
    triggers.push({
      type: 'CONV',
      reason: `${current.rework.verificationFailures} verification failure(s) — convention or process gap`
    });
  }

  // New skill first-seen
  const newSkills = findNewSkills(current, previousSessions);
  if (newSkills.length > 0) {
    triggers.push({
      type: 'NOTE',
      reason: `New skill(s) first-seen: ${newSkills.join(', ')}`
    });
  }

  return triggers;
}

function main() {
  try {
    // Read stdin (Stop hook payload)
    try { fs.readFileSync(0, 'utf-8'); } catch { /* ok */ }

    const sessions = readRecentSessions(6); // current + 5 previous
    if (sessions.length === 0) {
      process.exit(0);
    }

    const current = sessions[sessions.length - 1];
    const previous = sessions.slice(0, -1);
    const triggers = evaluateSignificance(current, previous);

    if (triggers.length === 0) {
      // Nothing significant — exit silently
      process.exit(0);
    }

    // Output prompt hook asking Claude to capture knowledge
    const triggerSummary = triggers
      .map(t => `- **${t.type}**: ${t.reason}`)
      .join('\n');

    const result = {
      ok: false,
      reason: `Session metrics detected significant learnings. Consider capturing:\n${triggerSummary}\n\nUse the knowledge-capture skill to persist these to docs/ if warranted.`
    };

    console.log(JSON.stringify(result));
    process.exit(0);
  } catch {
    // Silent failure
    process.exit(0);
  }
}

main();

} catch (e) {
  // Minimal crash logging — only Node builtins, no lib/ deps
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
