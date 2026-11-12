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
    if (missing.length) lines.push(`Repos without rules: ${missing.map((r) => r.path).join(', ')}. Work there with workspace rules and ai-kit defaults; create repo rules only when the user asks (\`/ai-kit:create-rules repo <path>\`).`);
    lines.push('Before changing code in a repo, apply its AGENTS.md (the rules gate injects it on the first edit if it is not loaded).');
    if (!ws.isOnboarded()) lines.push('', firstRun(workspace.root, null, []));
    return lines.join('\n');
  }

  const gitRoot = ws.findGitRoot(cwd);
  const repos = gitRoot ? [] : ws.childRepos(cwd);
  const target = gitRoot || cwd;
  if (!ws.isOnboarded()) return firstRun(target, gitRoot, repos);
  if (!gitRoot && !repos.length) return '';
  if (ws.isSkipped(target) || !ws.gateEnabled(null)) return '';

  return [
    '## ai-kit project rules: none here',
    `No \`.ai-kit/workspace.json\` or AGENTS.md for ${target}. Work with ai-kit defaults and the code's own patterns, invent no project conventions, and do not ask the user to set up rules.`,
    'Only when the user asks for rules (for this project, a repository, a subfolder or plugin-wide) run `/ai-kit:create-rules` (Codex: the `create-rules` skill).'
  ].join('\n');
}

function firstRun(target, gitRoot, repos) {
  const where = gitRoot
    ? `repository ${gitRoot}`
    : repos.length ? `folder ${target} (${repos.length} repositories below it)` : `folder ${target}`;
  return [
    '## ai-kit first run: rules setup (asked once)',
    `ai-kit has not been set up on this machine yet (no ${ws.ONBOARDING_FILE}). Current ${where}.`,
    'In your first reply, before other work, invoke skill `ai-kit:create-rules` in first-run mode (Codex: the `create-rules` skill). It asks the user once whether to create rules now and for which scope:',
    '- plugin-wide personal rules (every project, `~/.ai-kit/AGENTS.md`);',
    '- this workspace / project (all repositories below it);',
    '- one repository;',
    '- one subfolder or module;',
    '- not now.',
    'Whatever the user picks, the skill records it with `rules.cjs onboarded`, so ai-kit never asks again; later rules are created only when the user asks (`/ai-kit:create-rules [scope] [path]`).',
    'If the user only asked a quick question, answer it first, then ask the first-run question in the same reply.'
  ].join('\n');
}

function personalRules() {
  const text = ws.pluginRules();
  if (!text) return '';
  return [
    `## Your ai-kit rules (all projects, ${ws.PLUGIN_RULE_FILE})`,
    'They override ai-kit general rules; project rules (AGENTS.md in the workspace) override them.',
    '',
    text
  ].join('\n');
}

try {
  const input = ws.readStdin();
  const cwd = path.resolve(input.cwd || process.cwd());
  ws.pruneState();
  const parts = [generalRules(), personalRules(), projectStatus(cwd)].filter(Boolean);
  if (parts.length) process.stdout.write(parts.join('\n\n'));
} catch {}
process.exit(0);
