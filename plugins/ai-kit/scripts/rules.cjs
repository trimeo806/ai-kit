#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ws = require('../hooks/lib/workspace.cjs');

const IMPORT_LINE = '@AGENTS.md';

function exists(dir, name) {
  return fs.existsSync(path.join(dir, name));
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function packageScripts(dir) {
  const pkg = ws.readJson(path.join(dir, 'package.json'));
  if (!pkg) return null;
  const pm = exists(dir, 'pnpm-lock.yaml') ? 'pnpm' : exists(dir, 'yarn.lock') ? 'yarn' : exists(dir, 'bun.lockb') || exists(dir, 'bun.lock') ? 'bun' : 'npm';
  const deps = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
  const notable = deps.filter((d) => /^(react|next|vue|nuxt|svelte|@angular\/core|express|fastify|@nestjs\/core|vite|vitest|jest|playwright|@playwright\/test|cypress|typescript|tailwindcss|eslint|prettier|biome|nx|turbo)$/.test(d));
  return { packageManager: pm, scripts: pkg.scripts || {}, notableDeps: notable, workspaces: pkg.workspaces || null };
}

function detect(dir) {
  const markers = {
    'package.json': 'node', 'tsconfig.json': 'typescript', 'pom.xml': 'java-maven', 'build.gradle': 'java-gradle',
    'build.gradle.kts': 'kotlin-gradle', 'go.mod': 'go', 'pyproject.toml': 'python', 'requirements.txt': 'python',
    'Cargo.toml': 'rust', 'Gemfile': 'ruby', 'composer.json': 'php', 'Package.swift': 'swift', 'pubspec.yaml': 'dart',
    'Dockerfile': 'docker', 'docker-compose.yml': 'docker-compose', 'compose.yaml': 'docker-compose',
    'nx.json': 'nx', 'turbo.json': 'turborepo', 'Makefile': 'make', 'justfile': 'just'
  };
  const stack = [...new Set(Object.entries(markers).filter(([f]) => exists(dir, f)).map(([, s]) => s))];
  if (fs.readdirSync(dir).some((f) => f.endsWith('.csproj') || f.endsWith('.sln'))) stack.push('dotnet');
  const ci = ['.github/workflows', '.gitlab-ci.yml', 'bitbucket-pipelines.yml', 'azure-pipelines.yml', 'Jenkinsfile', '.circleci']
    .filter((f) => exists(dir, f));
  const existingRules = ['AGENTS.md', 'CLAUDE.md', '.cursorrules', '.cursor/rules', '.github/copilot-instructions.md', 'CONTRIBUTING.md', '.editorconfig']
    .filter((f) => exists(dir, f));
  const lint = ['.eslintrc', '.eslintrc.js', '.eslintrc.json', 'eslint.config.js', 'eslint.config.mjs', 'biome.json', '.prettierrc', 'checkstyle.xml', '.golangci.yml', 'ruff.toml', '.rubocop.yml']
    .filter((f) => exists(dir, f));
  const remote = readText(path.join(dir, '.git', 'config'));
  const host = remote ? (remote.match(/url = .*(github|gitlab|bitbucket|dev\.azure|visualstudio)/i) || [])[1] : null;
  return {
    path: dir,
    stack,
    node: packageScripts(dir),
    makeTargets: exists(dir, 'Makefile') ? (readText(path.join(dir, 'Makefile')).match(/^[a-zA-Z0-9_-]+(?=:)/gm) || []).slice(0, 30) : [],
    ci,
    lint,
    existingRules,
    vcsHost: host ? host.toLowerCase().replace('dev.azure', 'azure-devops').replace('visualstudio', 'azure-devops') : null
  };
}

function status(dir) {
  const target = path.resolve(dir || process.cwd());
  const workspace = ws.findWorkspace(target);
  const root = workspace ? workspace.root : target;
  const gitRoot = ws.findGitRoot(root);
  const repos = gitRoot && gitRoot === root ? [root] : ws.childRepos(root, 3);
  if (!repos.length && gitRoot) repos.push(gitRoot);
  return {
    workspaceRoot: root,
    configured: Boolean(workspace),
    config: workspace ? workspace.config : null,
    skipped: ws.isSkipped(root),
    rootRules: { agents: exists(root, 'AGENTS.md'), claude: exists(root, 'CLAUDE.md'), claudeImports: hasImport(path.join(root, 'CLAUDE.md')) },
    repos: repos.map((r) => ({
      path: path.relative(root, r) || '.',
      agents: exists(r, 'AGENTS.md'),
      claude: exists(r, 'CLAUDE.md'),
      claudeImports: hasImport(path.join(r, 'CLAUDE.md')),
      skipped: ws.isSkipped(r)
    }))
  };
}

function hasImport(file) {
  const text = readText(file);
  return Boolean(text && text.split(/\r?\n/).some((l) => l.trim() === IMPORT_LINE));
}

function linkClaude(dir) {
  const file = path.join(path.resolve(dir), 'CLAUDE.md');
  const text = readText(file);
  if (text === null) {
    fs.writeFileSync(file, `${IMPORT_LINE}\n`);
    return { file, action: 'created' };
  }
  if (hasImport(file)) return { file, action: 'unchanged' };
  fs.writeFileSync(file, `${IMPORT_LINE}\n\n${text}`);
  return { file, action: 'prepended-import' };
}

function editSkip(dir, add) {
  const abs = path.resolve(dir);
  const paths = ws.skipList().filter((p) => path.resolve(p) !== abs);
  if (add) paths.push(abs);
  fs.mkdirSync(path.dirname(ws.SKIP_FILE), { recursive: true });
  fs.writeFileSync(ws.SKIP_FILE, JSON.stringify({ paths }, null, 2) + '\n');
  return { skipFile: ws.SKIP_FILE, paths };
}

function editSessionAllow(dir, sessionId, add) {
  if (!sessionId) {
    process.stderr.write('allow/disallow need --session <id> (the rules gate message gives it)\n');
    process.exit(1);
  }
  return { session: sessionId, allowedWithoutRules: ws.allowForSession(sessionId, dir, add) };
}

const USAGE = 'usage: rules.cjs <status|detect|link-claude|skip|unskip> [dir] | <allow|disallow> <dir> --session <id>';

function main() {
  const args = process.argv.slice(2);
  const sessionIdx = args.indexOf('--session');
  const sessionId = sessionIdx >= 0 ? args[sessionIdx + 1] : null;
  const [cmd, arg] = sessionIdx >= 0 ? args.filter((_, i) => i !== sessionIdx && i !== sessionIdx + 1) : args;
  const dir = arg || process.cwd();
  const commands = {
    status: () => status(dir),
    detect: () => detect(path.resolve(dir)),
    'link-claude': () => linkClaude(dir),
    skip: () => editSkip(dir, true),
    unskip: () => editSkip(dir, false),
    allow: () => editSessionAllow(dir, sessionId, true),
    disallow: () => editSessionAllow(dir, sessionId, false)
  };
  if (!commands[cmd]) {
    process.stderr.write(USAGE + '\n');
    process.exit(1);
  }
  process.stdout.write(JSON.stringify(commands[cmd](), null, 2) + '\n');
}

main();
