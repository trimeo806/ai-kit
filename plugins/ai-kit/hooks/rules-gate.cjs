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

function choiceMessage(project, wsRoot) {
  const scopeArg = wsRoot ? ` repo ${path.relative(wsRoot, project) || '.'}` : '';
  const what = wsRoot
    ? `repository ${project} has no project rules (no AGENTS.md; workspace ${wsRoot} does not mark it "skip").`
    : `project ${project} has no project rules yet (no .ai-kit/workspace.json).`;
  return [
    `ai-kit rules gate (first run, asked once): ${what}`,
    'Do not edit yet. Pause the task and ask the user once (AskUserQuestion in Claude, a plain question in Codex), with option 1 recommended:',
    `1. Create rules now — run \`/ai-kit:create-rules${scopeArg}\` (Codex: the create-rules skill) with the user; it asks which scope (plugin-wide, workspace, repository, subfolder), writes the rules and records the first run. Then resume the original task.`,
    `2. Not now — run: node "${RULES_CLI}" onboarded later`,
    '   then retry the edit. Follow ai-kit defaults only, invent no project conventions, and say in your final report that no project rules were applied.',
    'Either way ai-kit never asks again; later the user runs /ai-kit:create-rules for a project, repository or folder when they want rules.',
    'Run the command for option 2 only after the user picked it. Never bypass the gate by editing through the shell.'
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
      if (!gitRoot || !ws.gateEnabled(null) || allowed(gitRoot) || ws.isOnboarded()) continue;
      deny(choiceMessage(gitRoot, null));
    }

    if (!ws.gateEnabled(workspace)) continue;
    const entry = ws.repoEntry(workspace, file);
    if (entry && entry.status === 'skip') continue;

    const gitRoot = ws.findGitRoot(dir);
    if (gitRoot && gitRoot !== workspace.root && ws.isWithin(gitRoot, workspace.root)) {
      const repoHasRules = ws.ruleChain(gitRoot, gitRoot).length > 0;
      if (!repoHasRules && !allowed(gitRoot) && !ws.isOnboarded()) deny(choiceMessage(gitRoot, workspace.root));
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
