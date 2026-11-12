#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ws = require('./lib/workspace.cjs');

const NON_HUMAN = /^\s*<(task-notification|system-reminder|side-sessions-event|ci-monitor-event)\b|SYSTEM NOTIFICATION - NOT USER INPUT/;
const ASKS_FOR_COMMENTS = /\b(add|write|with|keep|include)\b.{0,30}\b(comments?|docstrings?|jsdoc|javadoc)\b|\b(comment|document) (the|this|each|every)\b/i;

function compile(rules) {
  return (rules || []).map((r) => ({
    ...r,
    re: new RegExp(r.match, 'i'),
    ex: r.exclude ? new RegExp(r.exclude, 'i') : null
  }));
}

function loadRoutes(cwd) {
  const base = ws.readJson(path.join(__dirname, 'rule-router.json')) || { rules: [] };
  const workspace = ws.findWorkspace(cwd);
  const extra = workspace ? ws.readJson(path.join(workspace.root, '.ai-kit', 'routes.json')) : null;
  return {
    maxInjections: (extra && extra.maxInjections) || base.maxInjections || 3,
    rules: compile([...(base.rules || []), ...((extra && extra.rules) || [])])
  };
}

function matchRules(prompt, cwd) {
  if (!prompt || NON_HUMAN.test(prompt)) return [];
  const config = loadRoutes(cwd);
  return config.rules
    .filter((r) => r.re.test(prompt) && !(r.ex && r.ex.test(prompt)))
    .sort((a, b) => (a.priority || 9) - (b.priority || 9))
    .slice(0, config.maxInjections);
}

function main() {
  if (!ws.hookEnabled('rule-router')) return;
  const payload = ws.readStdin();
  const prompt = payload.prompt || payload.user_prompt || '';
  const cwd = payload.cwd || process.cwd();
  if (payload.session_id && prompt && !NON_HUMAN.test(prompt)) {
    const state = ws.readState(payload.session_id);
    state.commentsRequested = ASKS_FOR_COMMENTS.test(prompt);
    ws.writeState(payload.session_id, state);
  }
  const matched = matchRules(prompt, cwd);
  if (matched.length) {
    process.stdout.write(['## Triggered rules (ai-kit rule-router)', ...matched.map((r) => `- ${r.inject}`)].join('\n') + '\n');
  }
}

if (require.main === module) {
  try {
    main();
  } catch {}
  process.exit(0);
}

module.exports = { loadRoutes, matchRules };
