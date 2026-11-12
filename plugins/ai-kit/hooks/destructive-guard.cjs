#!/usr/bin/env node

try {

const fs = require('fs');
const { isHookEnabled } = require('./lib/kit-config-utils.cjs');

if (!isHookEnabled('destructive-guard')) process.exit(0);

const GIT_SUBCOMMAND = /(?:^|[\s"'\\/&|;(])git(?:\.exe)?["']?\s+((?:(?:-C|-c|--git-dir|--work-tree|--namespace)\s+(?:"[^"]*"|'[^']*'|\S+)\s+|--?[\w-]+(?:=\S+)?\s+)*)(push|reset|clean|branch)\b(.*)$/i;
const DELETE_COMMANDS = new Set(['rm', 'remove-item', 'ri', 'del', 'rd', 'rmdir', 'erase']);
const SHORT_FLAG_BUNDLE = /^[rfdiv]+$/i;

function segments(command) {
  return command.split(/\r?\n|&&|\|\||[;|&]/).map((s) => s.trim()).filter(Boolean);
}

function tokens(segment) {
  return segment.match(/"[^"]*"|'[^']*'|\S+/g) || [];
}

function gitFinding(segment) {
  const m = segment.match(GIT_SUBCOMMAND);
  if (!m) return null;
  const sub = m[2].toLowerCase();
  const args = tokens(m[3]);
  const has = (re) => args.some((a) => re.test(a));

  if (sub === 'push') {
    if (has(/^(--dry-run|-n)$/)) return null;
    const forced = has(/^(--force(-with-lease)?(=.*)?|--force-if-includes|-[a-z]*f[a-z]*)$/i) || has(/^\+/);
    return forced ? 'git push --force rewrites remote history' : 'git push publishes commits to the remote';
  }
  if (sub === 'reset' && has(/^--hard$/i)) return 'git reset --hard discards uncommitted changes';
  if (sub === 'clean' && has(/^(--force|-[a-z]*f[a-z]*)$/i) && !has(/^(--dry-run|-[a-z]*n[a-z]*)$/i)) {
    return 'git clean -f deletes untracked files';
  }
  if (sub === 'branch') {
    const forceDelete = has(/^-[a-z]*D[a-z]*$/) ||
      (has(/^(--delete|-[a-z]*d[a-z]*)$/) && has(/^(--force|-[a-z]*f[a-z]*)$/));
    if (forceDelete) return 'git branch -D deletes a branch even if it is not merged';
  }
  return null;
}

function deleteFlags(args) {
  let recursive = false;
  let force = false;
  for (const raw of args) {
    const arg = raw.split(':')[0].toLowerCase();
    if (arg === '--recursive') recursive = true;
    else if (arg === '--force') force = true;
    else if (/^-[a-z]+$/.test(arg)) {
      const name = arg.slice(1);
      if ('recurse'.startsWith(name)) recursive = true;
      else if ('force'.startsWith(name)) force = true;
      else if (SHORT_FLAG_BUNDLE.test(name)) {
        if (name.includes('r')) recursive = true;
        if (name.includes('f')) force = true;
      }
    }
  }
  return recursive && force;
}

function deleteFinding(segment) {
  const toks = segment.replace(/["'`]/g, ' ').split(/\s+/).filter(Boolean);
  for (let i = 0; i < toks.length; i++) {
    const word = toks[i].split(/[\\/]/).pop().replace(/\.exe$/i, '').toLowerCase();
    if (DELETE_COMMANDS.has(word) && deleteFlags(toks.slice(i + 1))) {
      return 'recursive forced delete (rm -rf / Remove-Item -Recurse -Force) removes files without recovery';
    }
  }
  return null;
}

function findReasons(command) {
  const reasons = [];
  for (const segment of segments(command)) {
    const reason = gitFinding(segment) || deleteFinding(segment);
    if (reason && !reasons.includes(reason)) reasons.push(reason);
  }
  return reasons;
}

function main() {
  let hookData;
  try {
    hookData = JSON.parse(fs.readFileSync(0, 'utf-8'));
  } catch {
    process.exit(0);
  }

  const command = hookData && hookData.tool_input && hookData.tool_input.command;
  if (typeof command !== 'string' || !command.trim()) process.exit(0);

  const reasons = findReasons(command);
  if (reasons.length === 0) process.exit(0);

  fs.writeSync(1, JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: `ai-kit destructive-guard: ${reasons.join('; ')}. Confirm before it runs.`
    }
  }));
  process.exit(0);
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
      JSON.stringify({ ts: new Date().toISOString(), hook: 'destructive-guard', status: 'crash', error: e.message }) + '\n'
    );
  } catch (_) {}
  process.exit(0);
}
