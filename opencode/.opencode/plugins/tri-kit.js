/**
 * tri-kit.js — OpenCode plugin for tri_ai_kit
 *
 * Maps Claude Code hooks → OpenCode plugin events:
 *   tui.prompt.append   → context-builder  (session/plan/rules reminder)
 *   tool.execute.before → privacy-checker  (sensitive file protection)
 *   tool.execute.after  → index reminder   (docs/reports/plans)
 *   session.idle        → session metrics + lesson capture + notifications
 *
 * CJS libs are bridged via createRequire — no source files are duplicated.
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const require    = createRequire(import.meta.url);

// Absolute path to the shared CJS libs in .claude/hooks/lib/
const HOOKS_LIB = path.resolve(__dirname, '../../.claude/hooks/lib');

// ─── Lazy-load CJS libs (fail-open if .claude is absent) ──────────────────────

let _contextBuilder = null;
function getContextBuilder() {
  if (_contextBuilder) return _contextBuilder;
  try {
    _contextBuilder = require(path.join(HOOKS_LIB, 'context-builder.cjs'));
  } catch { /* .claude not present — degraded mode */ }
  return _contextBuilder;
}

let _privacyChecker = null;
function getPrivacyChecker() {
  if (_privacyChecker) return _privacyChecker;
  try {
    _privacyChecker = require(path.join(HOOKS_LIB, 'privacy-checker.cjs'));
  } catch { /* .claude not present — degraded mode */ }
  return _privacyChecker;
}

// ─── Index reminder helpers (mirrors post-index-reminder.cjs) ─────────────────

const THROTTLE_MS = 2 * 60 * 1000; // 2 minutes per dir type
const THROTTLE_FILES = {
  docs:    path.join(os.tmpdir(), 'aikit-index-reminded-docs.json'),
  reports: path.join(os.tmpdir(), 'aikit-index-reminded-reports.json'),
  plans:   path.join(os.tmpdir(), 'aikit-index-reminded-plans.json'),
};

function isThrottled(key) {
  try {
    const data = JSON.parse(fs.readFileSync(THROTTLE_FILES[key], 'utf-8'));
    return Date.now() - data.ts < THROTTLE_MS;
  } catch { return false; }
}

function setThrottle(key) {
  try { fs.writeFileSync(THROTTLE_FILES[key], JSON.stringify({ ts: Date.now() })); } catch {}
}

// ─── Session metrics helpers (mirrors session-metrics.cjs) ────────────────────

const DATA_DIR      = path.join(process.cwd(), '.kit-data', 'improvements');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.jsonl');
const MAX_LINES     = 1000;

function execSafe(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch { return ''; }
}

function getGitDiffStats() {
  const raw = execSafe('git diff --stat HEAD');
  if (!raw) return { filesChanged: 0, insertions: 0, deletions: 0 };
  const lastLine = raw.split('\n').pop() || '';
  return {
    filesChanged: Number((lastLine.match(/(\d+) files? changed/) || [])[1] || 0),
    insertions:   Number((lastLine.match(/(\d+) insertions?/)   || [])[1] || 0),
    deletions:    Number((lastLine.match(/(\d+) deletions?/)    || [])[1] || 0),
  };
}

function rotateIfNeeded() {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return;
    const lines = fs.readFileSync(SESSIONS_FILE, 'utf-8').split('\n').filter(Boolean);
    if (lines.length >= MAX_LINES) {
      fs.writeFileSync(SESSIONS_FILE, lines.slice(-500).join('\n') + '\n');
    }
  } catch {}
}

// ─── Lesson capture helpers (mirrors lesson-capture.cjs) ──────────────────────

function readRecentSessions(count) {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return [];
    return fs.readFileSync(SESSIONS_FILE, 'utf-8')
      .split('\n').filter(Boolean).slice(-count)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch { return []; }
}

function evaluateSignificance(current, previous) {
  const triggers = [];

  if ((current.errors?.count ?? 0) > 0) {
    const types = (current.errors?.types ?? []).join(', ') || 'unknown';
    triggers.push({ type: 'FINDING', reason: `${current.errors.count} error(s) encountered (types: ${types})` });
  }

  if ((current.rework?.fixIterations ?? 0) >= 2) {
    triggers.push({ type: 'PATTERN', reason: `${current.rework.fixIterations} fix iterations — rework pattern detected` });
  }

  if ((current.rework?.verificationFailures ?? 0) >= 1) {
    triggers.push({ type: 'CONV', reason: `${current.rework.verificationFailures} verification failure(s) — convention or process gap` });
  }

  const prevSkills = new Set(previous.flatMap(s => s.skills?.loaded ?? []));
  const newSkills  = (current.skills?.loaded ?? []).filter(sk => !prevSkills.has(sk));
  if (newSkills.length > 0) {
    triggers.push({ type: 'NOTE', reason: `New skill(s) first-seen: ${newSkills.join(', ')}` });
  }

  return triggers;
}

// ─── Notification helpers (inline — mirrors notify.cjs providers) ─────────────

async function sendNotifications(message, $shell) {
  // Telegram
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
      const url  = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const body = JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: message });
      await $shell`curl -s -X POST ${url} -H "Content-Type: application/json" --data-raw ${body}`;
    } catch {}
  }

  // Discord
  if (process.env.DISCORD_WEBHOOK_URL) {
    try {
      const body = JSON.stringify({ content: message });
      await $shell`curl -s -X POST ${process.env.DISCORD_WEBHOOK_URL} -H "Content-Type: application/json" --data-raw ${body}`;
    } catch {}
  }

  // Slack
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      const body = JSON.stringify({ text: message });
      await $shell`curl -s -X POST ${process.env.SLACK_WEBHOOK_URL} -H "Content-Type: application/json" --data-raw ${body}`;
    } catch {}
  }
}

// ─── Plugin export ─────────────────────────────────────────────────────────────

export const TriKit = async ({ client, $, directory }) => {
  return {

    // ── 1. Context reminder — prepend session/plan/rules info to each prompt ──
    'tui.prompt.append': async (input, output) => {
      try {
        const cb = getContextBuilder();
        if (!cb) return;
        const result = cb.buildReminderContext({ configDirName: '.claude' });
        if (result?.content) {
          output.text = (output.text ? output.text + '\n\n' : '') + result.content;
        }
      } catch { /* fail-open */ }
    },

    // ── 2. Privacy guard — block sensitive file access before it happens ──────
    'tool.execute.before': async (input, output) => {
      try {
        const pc = getPrivacyChecker();
        if (!pc) return;

        // Map OpenCode lowercase tool names to privacy-checker's capitalized names
        const toolNameMap = {
          read:        'Read',
          write:       'Write',
          edit:        'Edit',
          'multi-edit':'MultiEdit',
          bash:        'Bash',
          glob:        'Glob',
          grep:        'Grep',
        };
        const toolName  = toolNameMap[input.tool] ?? input.tool;
        const args      = output.args ?? {};
        const toolInput = {
          file_path: args.filePath ?? args.file_path,
          path:      args.path,
          command:   args.command,
          pattern:   args.pattern,
        };

        const result = pc.checkPrivacy({ toolName, toolInput });
        if (result.blocked) {
          throw new Error(
            `[tri-kit privacy] Access to "${result.filePath}" is blocked — it may contain sensitive data.\n` +
            `To allow access, prefix the path with "APPROVED:" (e.g. APPROVED:${result.filePath}).`
          );
        }
      } catch (e) {
        // Re-throw intentional blocks; swallow all other errors
        if (e.message?.startsWith('[tri-kit privacy]')) throw e;
      }
    },

    // ── 3. Index reminder — prompt to update index.json after docs/reports/plans edits ──
    'tool.execute.after': async (input, output) => {
      try {
        if (!['write', 'edit', 'multi-edit'].includes(input.tool)) return;

        // Args may be on input.args (after) or output.args (before mutation)
        const args     = input.args ?? output?.args ?? {};
        const filePath = args.filePath ?? args.file_path ?? '';
        if (!filePath) return;

        const normalized = filePath.replace(/\\/g, '/');
        const messages   = [];

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

        if (
          /\/plans\//.test(normalized) &&
          !normalized.endsWith('/plans/index.json') &&
          !normalized.endsWith('/plans/README.md') &&
          normalized.endsWith('.md')
        ) {
          if (!isThrottled('plans')) {
            setThrottle('plans');
            messages.push(
              '[Index] File written in plans/ — update `plans/index.json`:\n' +
              '  • Add/update entry: { id, title, status, path, created, updated, platforms, effort }\n' +
              '  • See `core/references/index-protocol.md` for schema'
            );
          }
        }

        if (messages.length > 0) {
          try {
            await client.app.log({
              body: { service: 'tri-kit', level: 'info', message: messages.join('\n\n') },
            });
          } catch {}
        }
      } catch { /* fail-open */ }
    },

    // ── 4. Session idle — metrics, lesson capture, notifications ─────────────
    event: async ({ event }) => {
      if (event.type !== 'session.idle') return;

      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });

        const git    = getGitDiffStats();
        const branch = execSafe('git branch --show-current') || 'unknown';

        const entry = {
          sessionId: `opencode-${Date.now()}`,
          timestamp: new Date().toISOString(),
          duration_ms: null,
          branch,
          git,
          tasks:     { total: 0, completed: 0, failed: 0 },
          errors:    { count: 0, types: [] },
          rework:    { fixIterations: 0, verificationFailures: 0 },
          skills:    { discovered: [], loaded: [], unused: [] },
          knowledge: { retrieved: 0, captured: 0, staleHits: 0 },
          routing:   { intent: null, command: null, platform: null },
        };

        rotateIfNeeded();
        fs.appendFileSync(SESSIONS_FILE, JSON.stringify(entry) + '\n');

        // Lesson capture — evaluate significance and prompt if warranted
        const sessions = readRecentSessions(6);
        if (sessions.length > 0) {
          const current  = sessions[sessions.length - 1];
          const previous = sessions.slice(0, -1);
          const triggers = evaluateSignificance(current, previous);

          if (triggers.length > 0) {
            const summary = triggers.map(t => `- **${t.type}**: ${t.reason}`).join('\n');
            try {
              await client.app.log({
                body: {
                  service: 'tri-kit',
                  level:   'info',
                  message: `Session metrics detected significant learnings. Consider capturing:\n${summary}\n\nUse the knowledge-capture skill to persist these to docs/ if warranted.`,
                },
              });
            } catch {}
          }
        }

        // Notifications — fire if any provider env vars are configured
        const hasNotify = process.env.TELEGRAM_BOT_TOKEN ||
                          process.env.DISCORD_WEBHOOK_URL  ||
                          process.env.SLACK_WEBHOOK_URL;

        if (hasNotify && $) {
          const msg = `[opencode] Session idle on branch: ${branch} | +${git.insertions} -${git.deletions} lines in ${git.filesChanged} files`;
          await sendNotifications(msg, $);
        }
      } catch { /* fail-open — never block session exit */ }
    },

  };
};
