#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ws = require('./lib/workspace.cjs');

function generalRules() {
  if (process.env.CLAUDE_PLUGIN_OPTION_INJECT_RULES === 'false') return '';
  try {
    return fs.readFileSync(path.join(__dirname, '..', 'rules', 'ai-kit-rules.md'), 'utf8');
  } catch {
    return '';
  }
}

function projectStatus(cwd) {
  const workspace = ws.findWorkspace(cwd);
  if (workspace) {
    const lines = ['## ai-kit project rules: active', ws.describeWorkspace(workspace)];
    if (!ws.gateEnabled(workspace)) lines.push('Rules gate: off for this workspace.');
    const missing = (workspace.config.repos || [])
      .filter((r) => r && r.status !== 'skip' && !fs.existsSync(path.join(workspace.root, r.path, ws.RULE_FILE)));
    if (missing.length) lines.push(`Repos without rules: ${missing.map((r) => r.path).join(', ')}. The first edit there pauses for the user's choice: create rules (\`/ai-kit:setup-rules <repo>\`), continue without rules this session, or never ask.`);
    lines.push('Before changing code in a repo, apply its AGENTS.md (the rules gate injects it on the first edit if it is not loaded).');
    return lines.join('\n');
  }

  const gitRoot = ws.findGitRoot(cwd);
  const repos = gitRoot ? [] : ws.childRepos(cwd);
  if (!gitRoot && !repos.length) return '';
  const target = gitRoot || cwd;
  if (ws.isSkipped(target) || !ws.gateEnabled(null)) return '';

  return [
    '## ai-kit project rules: NOT SET UP',
    `No \`.ai-kit/workspace.json\` found for ${target}${repos.length ? ` (${repos.length} repositories below it)` : ''}.`,
    'Questions, reading, research and planning need no rules. The first time the work changes code in a project without rules, the rules gate pauses the edit and you must ask the user to choose:',
    '1. create the rules now with `/ai-kit:setup-rules` (Codex: the `setup-rules` skill), then resume the task;',
    '2. continue without rules for this session;',
    '3. never ask for this project.',
    'If the user already asked for implementation work here, you may raise this choice up front instead of waiting for the gate.'
  ].join('\n');
}

try {
  const input = ws.readStdin();
  const cwd = path.resolve(input.cwd || process.cwd());
  ws.pruneState();
  const parts = [generalRules(), projectStatus(cwd)].filter(Boolean);
  if (parts.length) process.stdout.write(parts.join('\n\n'));
} catch {}
process.exit(0);
