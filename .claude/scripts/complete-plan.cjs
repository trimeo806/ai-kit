#!/usr/bin/env node
/**
 * Complete an active plan
 *
 * Usage: node .claude/scripts/complete-plan.cjs <plan-directory>
 *
 * Actions:
 * 1. Updates plan.md frontmatter: status → completed, adds completed date
 * 2. Clears session active plan (sets activePlan to null)
 * 3. Updates plans/README.md — moves entry from Active to Recently Completed
 * 4. Updates plans/index.json counts
 */

const path = require('path');
const fs = require('fs');

const { readSessionState, writeSessionState, normalizePath } = require('../hooks/lib/kit-config-utils.cjs');

const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Read and parse YAML frontmatter from a markdown file
 * Returns { frontmatter: string, body: string, raw: object }
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: '', body: content, raw: {} };

  const raw = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) raw[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { frontmatter: match[1], body: match[2], raw };
}

/**
 * Update a specific frontmatter key in content
 */
function setFrontmatterKey(content, key, value) {
  // If key exists, replace it
  const keyPattern = new RegExp(`^(${key}):.*$`, 'm');
  if (keyPattern.test(content)) {
    return content.replace(keyPattern, `$1: ${value}`);
  }
  // Otherwise insert after the opening ---
  return content.replace(/^---\n/, `---\n${key}: ${value}\n`);
}

/**
 * Update plans/README.md — move entry from Active to Recently Completed
 */
function updateReadme(readmePath, planSlug, planTitle) {
  if (!fs.existsSync(readmePath)) return;

  let content = fs.readFileSync(readmePath, 'utf8');

  // Remove from Active table
  const activeRowPattern = new RegExp(`\\| ${planSlug}[^\\n]*\\n`, 'm');
  content = content.replace(activeRowPattern, '');

  // Add to Recently Completed table (handle optional blank line between heading and table)
  const completedRow = `| ${planSlug} | ${TODAY} | ${planTitle || planSlug} |\n`;
  content = content.replace(
    /(## Recently Completed\n\n?\|[^\n]*\n\|[^\n]*\n)/,
    (match) => match + completedRow
  );

  fs.writeFileSync(readmePath, content);
}

/**
 * Update plans/index.json counts
 */
function updateIndexJson(indexPath) {
  if (!fs.existsSync(indexPath)) return;

  try {
    const data = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    if (data.counts) {
      if (data.counts.active > 0) data.counts.active--;
      data.counts.completed = (data.counts.completed || 0) + 1;
      data.updated = TODAY;
    }
    fs.writeFileSync(indexPath, JSON.stringify(data, null, 2) + '\n');
  } catch (e) {
    console.error('Warning: Could not update index.json: ' + e.message);
  }
}

/**
 * Clear session active plan
 */
function clearSessionPlan(planAbsPath) {
  const sessionId = process.env.tri-ai-kit_SESSION_ID;
  if (!sessionId) return;

  try {
    const state = readSessionState(sessionId);
    if (state && state.activePlan === planAbsPath) {
      state.activePlan = null;
      state.timestamp = Date.now();
      state.source = 'complete-plan';
      writeSessionState(sessionId, state);
    }
  } catch (e) {
    // Non-fatal — session may not exist
  }
}

/**
 * Main execution
 */
function main() {
  const planPath = process.argv[2];
  if (!planPath) {
    console.error('Usage: complete-plan.cjs <plan-directory>');
    console.error('Example: node .claude/scripts/complete-plan.cjs plans/260305-0204-skill-consolidation');
    process.exit(1);
  }

  const cwd = process.cwd();
  const resolvedPath = path.isAbsolute(planPath) ? planPath : path.resolve(cwd, planPath);
  const absolutePath = normalizePath(resolvedPath) || resolvedPath;

  if (!fs.existsSync(absolutePath)) {
    console.error('Error: Plan directory does not exist: ' + absolutePath);
    process.exit(1);
  }

  const stats = fs.statSync(absolutePath);
  if (!stats.isDirectory()) {
    console.error('Error: Path is not a directory: ' + absolutePath);
    process.exit(1);
  }

  const planMd = path.join(absolutePath, 'plan.md');
  if (!fs.existsSync(planMd)) {
    console.error('Error: plan.md not found in: ' + absolutePath);
    process.exit(1);
  }

  // 1. Update plan.md frontmatter
  let content = fs.readFileSync(planMd, 'utf8');
  const { raw } = parseFrontmatter(content);
  const planTitle = raw.title || path.basename(absolutePath);
  const planSlug = path.basename(absolutePath);

  content = setFrontmatterKey(content, 'status', 'completed');
  content = setFrontmatterKey(content, 'completed', TODAY);
  content = setFrontmatterKey(content, 'updated', TODAY);

  fs.writeFileSync(planMd, content);
  console.log('Updated plan.md: status → completed, completed: ' + TODAY);

  // 2. Clear session active plan
  clearSessionPlan(absolutePath);

  // 3. Update plans/README.md
  const readmePath = path.join(cwd, 'plans', 'README.md');
  updateReadme(readmePath, planSlug, planTitle);

  // 4. Update index.json
  const indexPath = path.join(cwd, 'plans', 'index.json');
  updateIndexJson(indexPath);

  console.log('Plan completed: ' + planSlug);
  process.exit(0);
}

main();
