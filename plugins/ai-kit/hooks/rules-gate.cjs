#!/usr/bin/env node
'use strict';

const path = require('path');
const ws = require('./lib/workspace.cjs');

const ALWAYS_ALLOWED = new Set(['AGENTS.md', 'CLAUDE.md', 'AGENTS.override.md']);

function patchTargets(text) {
  const out = [];
  const re = /^\*\*\* (?:Add|Update|Delete) File: (.+)$|^\*\*\* Move to: (.+)$/gm;
  let m;
  while ((m = re.exec(text || ''))) out.push((m[1] || m[2]).trim());
  return out;
}

function targets(input) {
  const t = input.tool_input || {};
  const found = [];
  for (const key of ['file_path', 'notebook_path', 'path']) {
    if (typeof t[key] === 'string') found.push(t[key]);
  }
  for (const key of ['command', 'input', 'patch']) {
    const v = t[key];
    if (typeof v === 'string' && v.includes('*** ')) found.push(...patchTargets(v));
    if (Array.isArray(v)) found.push(...patchTargets(v.join('\n')));
  }
  if (typeof t === 'string') found.push(...patchTargets(t));
  const cwd = input.cwd || process.cwd();
  return [...new Set(found.map((f) => path.resolve(cwd, f)))];
}

function exempt(file) {
  return ALWAYS_ALLOWED.has(path.basename(file)) || file.split(path.sep).includes('.ai-kit');
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason
    }
  }));
  process.exit(0);
}

const RULES_CLI = path.join(__dirname, '..', 'scripts', 'rules.cjs');

function choiceMessage(project, sessionId, wsRoot) {
  const setupArg = wsRoot ? ` ${path.relative(wsRoot, project) || '.'}` : '';
  const what = wsRoot
    ? `repository ${project} has no project rules (no AGENTS.md; workspace ${wsRoot} does not mark it "skip").`
    : `project ${project} has no project rules yet (no .ai-kit/workspace.json).`;
  return [
    `ai-kit rules gate: ${what}`,
    'Do not edit yet. Pause the task and ask the user to choose (AskUserQuestion in Claude, a plain question in Codex), with option 1 recommended:',
    `1. Create the rules now — run \`/ai-kit:setup-rules${setupArg}\` (Codex: the setup-rules skill) as an interactive session with the user. When the rules are written, resume the original task; the gate then loads them.`,
    `2. Continue without rules for this session — run: node "${RULES_CLI}" allow "${project}" --session ${sessionId}`,
    '   then retry the edit. Follow ai-kit defaults only, invent no project conventions, and say in your final report that no project rules were applied.',
    `3. Never ask for this project — run: node "${RULES_CLI}" skip "${project}"`,
    '   then retry the edit (undo later with `unskip`).',
    'Run the command for option 2 or 3 only after the user picked it. Never bypass the gate by editing through the shell.'
  ].join('\n');
}

function main() {
  const input = ws.readStdin();
  const cwd = path.resolve(input.cwd || process.cwd());
  const files = targets(input).filter((f) => !exempt(f));
  if (!files.length) return;

  const sessionId = input.session_id || 'no-session';
  const stateKey = `${sessionId}${input.agent_id ? `-${input.agent_id}` : ''}`;
  const allowed = (dir) => ws.isSkipped(dir) || ws.allowedThisSession(sessionId, dir);
  const state = ws.readState(stateKey);
  const loaded = new Set(state.loadedRules || []);
  const toLoad = [];

  for (const file of files) {
    const dir = path.dirname(file);
    const workspace = ws.findWorkspace(dir);

    if (!workspace) {
      const gitRoot = ws.findGitRoot(dir);
      if (!gitRoot || !ws.gateEnabled(null) || allowed(gitRoot)) continue;
      deny(choiceMessage(gitRoot, sessionId, null));
    }

    if (!ws.gateEnabled(workspace)) continue;
    const entry = ws.repoEntry(workspace, file);
    if (entry && entry.status === 'skip') continue;

    const gitRoot = ws.findGitRoot(dir);
    if (gitRoot && gitRoot !== workspace.root && ws.isWithin(gitRoot, workspace.root)) {
      const repoHasRules = ws.ruleChain(gitRoot, gitRoot).length > 0;
      if (!repoHasRules && !allowed(gitRoot)) deny(choiceMessage(gitRoot, sessionId, workspace.root));
    }

    for (const rule of ws.ruleChain(workspace.root, dir)) {
      const native = ws.isWithin(cwd, path.dirname(rule));
      if (!native && !loaded.has(rule) && !toLoad.includes(rule)) toLoad.push(rule);
    }
  }

  if (!toLoad.length) return;

  state.loadedRules = [...loaded, ...toLoad];
  ws.writeState(stateKey, state);

  const body = toLoad.map((f) => `===== ${f} =====\n${ws.readRule(f)}`).join('\n\n');
  deny([
    'ai-kit rules gate: this edit touches a folder whose project rules are not loaded in this session yet.',
    'Read and apply the rules below (they override ai-kit defaults), re-check the planned change against them, then retry the same edit.',
    '',
    body
  ].join('\n'));
}

try {
  main();
} catch {}
process.exit(0);
