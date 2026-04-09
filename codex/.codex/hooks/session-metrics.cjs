#!/usr/bin/env node
/**
 * Session Metrics Hook — Collects session metrics on Stop
 *
 * Fires: On Stop event
 * Purpose: Gather session duration, git diff stats, append to sessions.jsonl
 *
 * Storage: .kit-data/improvements/sessions.jsonl (append-only JSONL)
 * Rotation: Auto-rotates at 1000 lines
 * Failure mode: Silent — never blocks session exit
 */

try {

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { isHookEnabled } = require('./lib/kit-config-utils.cjs');

if (!isHookEnabled('session-metrics')) process.exit(0);

const DATA_DIR = path.join(process.cwd(), '.kit-data', 'improvements');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.jsonl');
const CURRENT_SESSION_FILE = path.join(DATA_DIR, 'current-session.json');
const MAX_LINES = 1000;

function execSafe(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim();
  } catch {
    return '';
  }
}

function getGitDiffStats() {
  const raw = execSafe('git diff --stat HEAD 2>/dev/null | tail -1');
  if (!raw) return { filesChanged: 0, insertions: 0, deletions: 0 };

  const files = (raw.match(/(\d+) files? changed/) || [])[1] || 0;
  const ins = (raw.match(/(\d+) insertions?/) || [])[1] || 0;
  const del = (raw.match(/(\d+) deletions?/) || [])[1] || 0;

  return {
    filesChanged: Number(files),
    insertions: Number(ins),
    deletions: Number(del)
  };
}

function readCurrentSession() {
  try {
    if (fs.existsSync(CURRENT_SESSION_FILE)) {
      return JSON.parse(fs.readFileSync(CURRENT_SESSION_FILE, 'utf-8'));
    }
  } catch { /* silent */ }
  return null;
}

function rotateIfNeeded() {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return;
    const content = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    if (lines.length >= MAX_LINES) {
      // Keep last 500 lines
      const trimmed = lines.slice(-500).join('\n') + '\n';
      fs.writeFileSync(SESSIONS_FILE, trimmed);
    }
  } catch { /* silent */ }
}

const { parseTranscript } = require('./lib/transcript-parser.cjs');

async function main() {
  try {
    // Read stdin (Stop hook payload)
    let payload = {};
    try {
      const raw = fs.readFileSync(0, 'utf-8').trim();
      if (raw) payload = JSON.parse(raw);
    } catch { /* ok */ }

    // Ensure data directory
    fs.mkdirSync(DATA_DIR, { recursive: true });

    // Read session start info
    const session = readCurrentSession();
    const now = new Date();
    const duration_ms = session?.startedAt
      ? now.getTime() - new Date(session.startedAt).getTime()
      : null;

    // Gather git stats
    const git = getGitDiffStats();
    const branch = execSafe('git branch --show-current') || session?.branch || 'unknown';

    // Transcript scan — extract tool counts and subagent count
    let toolStats = null;
    if (payload.transcript_path) {
      try {
        const transcriptData = await parseTranscript(payload.transcript_path);
        // Count tools by name
        const toolCounts = {};
        for (const tool of transcriptData.tools) {
          toolCounts[tool.name] = (toolCounts[tool.name] || 0) + 1;
        }
        const subagentCount = transcriptData.agents.length;
        toolStats = { tools: toolCounts, subagentCount };
      } catch { /* silent — skip on parse error */ }
    }

    // Build metrics entry — merge breadcrumbs from prompt hook if available
    const breadcrumbs = session || {};
    const entry = {
      sessionId: session?.sessionId || `anon-${Date.now()}`,
      timestamp: now.toISOString(),
      duration_ms,
      branch,
      git,
      tasks: breadcrumbs.tasks || { total: 0, completed: 0, failed: 0 },
      errors: breadcrumbs.errors || { count: 0, types: [] },
      rework: breadcrumbs.rework || { fixIterations: 0, verificationFailures: 0 },
      skills: {
        discovered: [],
        loaded: breadcrumbs.skills?.loaded || [],
        unused: []
      },
      knowledge: { retrieved: 0, captured: 0, staleHits: 0 },
      routing: breadcrumbs.routing || { intent: null, command: null, platform: null },
      ...(toolStats || {})
    };

    // Rotate if needed, then append
    rotateIfNeeded();
    fs.appendFileSync(SESSIONS_FILE, JSON.stringify(entry) + '\n');

    // Clean up current session marker
    try { fs.unlinkSync(CURRENT_SESSION_FILE); } catch { /* ok */ }

    process.exit(0);
  } catch (error) {
    // Silent failure — never block session exit
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
