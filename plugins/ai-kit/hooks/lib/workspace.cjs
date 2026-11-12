'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const RULE_FILE = 'AGENTS.md';
const WORKSPACE_FILE = path.join('.ai-kit', 'workspace.json');
const SKIP_FILE = path.join(os.homedir(), '.ai-kit', 'skip.json');
const MAX_RULE_CHARS = 12000;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function readStdin() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw && raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function ancestors(dir) {
  const out = [];
  let cur = path.resolve(dir);
  while (true) {
    out.push(cur);
    const parent = path.dirname(cur);
    if (parent === cur) return out;
    cur = parent;
  }
}

function isWithin(child, parent) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function findWorkspace(startDir) {
  if (!startDir) return null;
  const home = os.homedir();
  for (const dir of ancestors(startDir)) {
    const file = path.join(dir, WORKSPACE_FILE);
    if (fs.existsSync(file)) {
      return { root: dir, file, config: readJson(file) || {} };
    }
    if (dir === home) break;
  }
  return null;
}

function findGitRoot(startDir) {
  for (const dir of ancestors(startDir)) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
  }
  return null;
}

function childRepos(dir, depth = 2) {
  const found = [];
  const walk = (d, level) => {
    if (level > depth) return;
    let entries = [];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('.') || e.name === 'node_modules') continue;
      const full = path.join(d, e.name);
      if (fs.existsSync(path.join(full, '.git'))) found.push(full);
      else walk(full, level + 1);
    }
  };
  walk(dir, 1);
  return found;
}

function skipList() {
  const data = readJson(SKIP_FILE);
  return Array.isArray(data && data.paths) ? data.paths : [];
}

function isSkipped(dir) {
  return skipList().some((p) => isWithin(path.resolve(dir), path.resolve(p)));
}

function gateEnabled(ws) {
  if (String(process.env.AI_KIT_GATE || '').toLowerCase() === 'off') return false;
  if (process.env.CLAUDE_PLUGIN_OPTION_RULES_GATE === 'false') return false;
  if (ws && ws.config && ws.config.gate === 'off') return false;
  return true;
}

function repoEntry(ws, file) {
  const repos = (ws && ws.config && Array.isArray(ws.config.repos)) ? ws.config.repos : [];
  let best = null;
  for (const r of repos) {
    if (!r || typeof r.path !== 'string') continue;
    const abs = path.resolve(ws.root, r.path);
    if (isWithin(file, abs) && (!best || abs.length > best.abs.length)) best = { ...r, abs };
  }
  return best;
}

function ruleChain(root, dir) {
  const chain = [];
  for (const d of ancestors(dir).reverse()) {
    if (!isWithin(d, root)) continue;
    const f = path.join(d, RULE_FILE);
    if (fs.existsSync(f)) chain.push(f);
  }
  return chain;
}

function readRule(file) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    return text.length > MAX_RULE_CHARS ? text.slice(0, MAX_RULE_CHARS) + `\n\n[truncated — read the rest of ${file}]` : text;
  } catch {
    return '';
  }
}

const STATE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function stateDir() {
  return process.env.AI_KIT_STATE_DIR || path.join(os.homedir(), '.ai-kit', 'state');
}

function pruneState() {
  const dir = path.join(stateDir(), 'sessions');
  let files = [];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return;
  }
  const cutoff = Date.now() - STATE_TTL_MS;
  for (const f of files) {
    try {
      const full = path.join(dir, f);
      if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full);
    } catch {}
  }
}

function allowedThisSession(sessionId, dir) {
  const allowed = readState(sessionId).allowedWithoutRules || [];
  return allowed.some((p) => isWithin(path.resolve(dir), path.resolve(p)));
}

function allowForSession(sessionId, dir, add = true) {
  const state = readState(sessionId);
  const abs = path.resolve(dir);
  const allowed = (state.allowedWithoutRules || []).filter((p) => path.resolve(p) !== abs);
  if (add) allowed.push(abs);
  state.allowedWithoutRules = allowed;
  writeState(sessionId, state);
  return allowed;
}

function stateFile(sessionId) {
  const safe = String(sessionId || 'no-session').replace(/[^A-Za-z0-9_-]/g, '_');
  return path.join(stateDir(), 'sessions', `${safe}.json`);
}

function readState(sessionId) {
  return readJson(stateFile(sessionId)) || {};
}

function writeState(sessionId, state) {
  try {
    const f = stateFile(sessionId);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(state));
  } catch {}
}

function hookEnabled(name, cwd) {
  const off = String(process.env.AI_KIT_HOOKS_OFF || '').split(',').map((s) => s.trim());
  if (off.includes(name)) return false;
  const ws = findWorkspace(cwd || process.cwd());
  const hooks = ws && ws.config && ws.config.hooks;
  return !(hooks && hooks[name] === false);
}

function describeWorkspace(ws) {
  const c = ws.config || {};
  const lines = [`Workspace: ${ws.root}${c.name ? ` (${c.name})` : ''} · docsDir: ${c.docsDir || 'docs'}`];
  if (c.tracker && c.tracker.type) lines.push(`Tracker: ${c.tracker.type}${c.tracker.keyPattern ? ` · key /${c.tracker.keyPattern}/` : ''}${c.tracker.access ? ` · via ${c.tracker.access}` : ''}`);
  if (c.vcs && c.vcs.host) lines.push(`VCS: ${c.vcs.host}${c.vcs.cli ? ` · cli ${c.vcs.cli}` : ''}${c.vcs.defaultBranch ? ` · base ${c.vcs.defaultBranch}` : ''}`);
  if (Array.isArray(c.repos) && c.repos.length) {
    lines.push('Repos:');
    for (const r of c.repos) lines.push(`- ${r.path} (${r.status || 'ready'})${r.stack ? ` — ${[].concat(r.stack).join(', ')}` : ''}`);
  }
  return lines.join('\n');
}

module.exports = {
  RULE_FILE,
  WORKSPACE_FILE,
  SKIP_FILE,
  readJson,
  readStdin,
  ancestors,
  isWithin,
  findWorkspace,
  findGitRoot,
  childRepos,
  skipList,
  isSkipped,
  gateEnabled,
  repoEntry,
  ruleChain,
  readRule,
  readState,
  writeState,
  pruneState,
  allowedThisSession,
  allowForSession,
  hookEnabled,
  describeWorkspace
};
