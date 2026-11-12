#!/usr/bin/env node
'use strict';

const path = require('path');
const ws = require('./lib/workspace.cjs');

const PLUGIN = 'ai-kit';

const IMPLEMENTATION_TEXT = [
  'ai-kit rule: implementation text (project rules may override).',
  '- No code comments unless the user explicitly asked for them; no doc comments (Javadoc, JSDoc/TSDoc, docstrings, KDoc, `/** */`) in implementation or test code.',
  '- Code, test names, log and error messages never cite the plan, spec, tasks or ticket (`AC-1`, `FR-3`, `PROJ-123`, "per the spec"). Name things by behavior.'
].join('\n');

function roleName(agentType) {
  return agentType.includes(':') ? agentType.split(':') : [null, agentType];
}

function projectRules(cwd) {
  const workspace = ws.findWorkspace(cwd);
  if (!workspace) {
    return 'ai-kit project rules: none set up for this workspace. Follow ai-kit defaults and do not invent project conventions; report anything you had to assume.';
  }
  const docsDir = (workspace.config && workspace.config.docsDir) || 'docs';
  return [
    'ai-kit project rules (they override ai-kit defaults):',
    ws.describeWorkspace(workspace),
    `- Before editing in a repo, read every AGENTS.md from ${workspace.root} down to the folder you change, unless the brief already pasted them.`,
    `- Work artifacts go in ${path.join(workspace.root, docsDir)}/<TICKET-KEY>/ or /<intention-name>/ (use the folder the brief names); reports in its reports/ subfolder.`
  ].join('\n');
}

function roster(agentType) {
  const [plugin, name] = roleName(agentType);
  if (plugin && plugin !== PLUGIN) return '';
  const roles = (ws.readJson(path.join(__dirname, 'subagent-skills.json')) || {}).roles || {};
  const entries = roles[name];
  if (!entries || !entries.length) return '';
  return [
    `## Your skill set (role: ${name})`,
    'Invoke these with the Skill tool when the step matches; skip the ones that do not apply.',
    ...entries.map(({ skill, when }) => `- \`${skill}\` — ${when}`)
  ].join('\n');
}

try {
  if (process.env.CLAUDE_PLUGIN_OPTION_INJECT_RULES !== 'false') {
    const input = ws.readStdin();
    const cwd = path.resolve(input.cwd || process.cwd());
    const parts = [IMPLEMENTATION_TEXT, projectRules(cwd), roster(input.agent_type || '')].filter(Boolean);
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'SubagentStart', additionalContext: parts.join('\n\n') }
    }));
  }
} catch {}
process.exit(0);
