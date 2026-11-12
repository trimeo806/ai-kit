#!/usr/bin/env node
/**
 * no-comments-guard.cjs - PostToolUse hook (Edit|Write)
 *
 * Flags comment lines added without the user asking for them this turn.
 * Feeds a reason back to Claude (exit 2 / stderr) — does not block the
 * write (already happened) and does not auto-delete lines.
 */

try {

const fs = require('fs');
const path = require('path');
const { isHookEnabled, readSessionState } = require('./lib/kit-config-utils.cjs');

if (!isHookEnabled('no-comments-guard') || process.env.CLAUDE_PLUGIN_OPTION_NO_COMMENTS_GUARD === 'false') process.exit(0);

const CODE_EXT = /\.(js|jsx|ts|tsx|mjs|cjs|py|go|java|c|cc|cpp|h|hpp|cs|php|rb|sh|ps1|sql|css|scss|less|swift|kt|rs)$/i;
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*(?!\/)|#(?!!)|<!--|-->|--)/;
const DOC_LINE = /^\s*(\/\*\*|\/\/\/|"""|''')/;
const PLAN_REF = /\b((US\d+-)?AC-?\d+|[ST]\d+-AC\d+|FR-(U-)?\d+|EC-\d+|SC-\d+|RISK-\d+|DEC-\d+)\b/;

function addedLines(oldText, newText) {
  const oldLines = new Set((oldText || '').split(/\r?\n/));
  return (newText || '').split(/\r?\n/).filter((l) => l.trim() && !oldLines.has(l));
}

function sampleOf(lines) {
  return lines.slice(0, 5).map((l) => l.trim()).join('\n  ');
}

function main() {
  let input;
  try {
    input = fs.readFileSync(0, 'utf-8');
  } catch {
    process.exit(0);
  }

  let hookData;
  try {
    hookData = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const { tool_name: toolName, tool_input: toolInput, session_id: sessionId } = hookData;
  if (!toolInput || !toolInput.file_path) process.exit(0);
  if (!CODE_EXT.test(toolInput.file_path)) process.exit(0);

  let added = [];
  if (toolName === 'Edit') {
    added = addedLines(toolInput.old_string, toolInput.new_string);
  } else if (toolName === 'Write') {
    added = addedLines('', toolInput.content);
  }
  if (added.length === 0) process.exit(0);

  const state = readSessionState(sessionId);
  const commentsRequested = Boolean(state && state.commentsRequested);
  const docs = added.filter((l) => DOC_LINE.test(l));
  const planRefs = added.filter((l) => PLAN_REF.test(l));
  const comments = commentsRequested ? [] : added.filter((l) => COMMENT_LINE.test(l) && !DOC_LINE.test(l));

  const file = path.basename(toolInput.file_path);
  const notes = [];
  if (comments.length) {
    notes.push(
      `NOTE: ${comments.length} comment line(s) added to ${file} without being asked.\n  ${sampleOf(comments)}\n` +
      `ai-kit rule "Code comments": no comments unless explicitly requested. Remove them.`
    );
  }
  if (docs.length) {
    notes.push(
      `NOTE: ${docs.length} doc comment block(s) added to ${file}.\n  ${sampleOf(docs)}\n` +
      `ai-kit rule "No doc comments in implementation": no Javadoc/JSDoc/docstrings; let names and types say it. Remove them.`
    );
  }
  if (planRefs.length) {
    notes.push(
      `NOTE: ${planRefs.length} line(s) in ${file} cite a plan/spec/ticket ID.\n  ${sampleOf(planRefs)}\n` +
      `ai-kit rule "No plan or spec references in implementation": name code, comments and test descriptions by behavior; keep the ID mapping in the tracker/plan. Rewrite them.`
    );
  }
  if (notes.length === 0) process.exit(0);

  console.error(notes.join('\n\n'));
  process.exit(2);
}

main();

} catch (e) {
  try {
    const fs = require('fs');
    const p = require('path');
    const logDir = p.join(process.env.CLAUDE_PLUGIN_DATA || __dirname, '.logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(
      p.join(logDir, 'hook-log.jsonl'),
      JSON.stringify({ ts: new Date().toISOString(), hook: 'no-comments-guard', status: 'crash', error: e.message }) + '\n'
    );
  } catch (_) {}
  process.exit(0);
}
