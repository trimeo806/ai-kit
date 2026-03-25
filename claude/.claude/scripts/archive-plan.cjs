#!/usr/bin/env node
/**
 * Archive a completed plan
 *
 * Usage: node .claude/scripts/archive-plan.cjs <plan-directory>
 *
 * Actions:
 * 1. Moves plans/{slug}/ → plans/archive/{slug}/
 * 2. Updates plan.md frontmatter: status → archived
 * 3. Updates plans/README.md (removes from Recently Completed)
 * 4. Updates plans/index.json counts
 */

const path = require('path');
const fs = require('fs');

const { normalizePath } = require('../hooks/lib/kit-config-utils.cjs');

const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Update a specific frontmatter key in content
 */
function setFrontmatterKey(content, key, value) {
  const keyPattern = new RegExp(`^(${key}):.*$`, 'm');
  if (keyPattern.test(content)) {
    return content.replace(keyPattern, `$1: ${value}`);
  }
  return content.replace(/^---\n/, `---\n${key}: ${value}\n`);
}

/**
 * Remove entry from plans/README.md Recently Completed section
 */
function updateReadme(readmePath, planSlug) {
  if (!fs.existsSync(readmePath)) return;

  let content = fs.readFileSync(readmePath, 'utf8');
  // Remove any row mentioning this slug
  const rowPattern = new RegExp(`\\| ${planSlug}[^\\n]*\\n`, 'm');
  content = content.replace(rowPattern, '');
  fs.writeFileSync(readmePath, content);
}

/**
 * Update plans/index.json counts
 */
function updateIndexJson(indexPath, fromStatus) {
  if (!fs.existsSync(indexPath)) return;

  try {
    const data = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    if (data.counts) {
      if (fromStatus === 'active' && data.counts.active > 0) data.counts.active--;
      else if (fromStatus === 'completed' && data.counts.completed > 0) data.counts.completed--;
      data.counts.archived = (data.counts.archived || 0) + 1;
      data.updated = TODAY;
    }
    fs.writeFileSync(indexPath, JSON.stringify(data, null, 2) + '\n');
  } catch (e) {
    console.error('Warning: Could not update index.json: ' + e.message);
  }
}

/**
 * Recursively copy directory
 */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Get current status from plan.md frontmatter
 */
function getCurrentStatus(planMd) {
  const content = fs.readFileSync(planMd, 'utf8');
  const match = content.match(/^status:\s*(.+)$/m);
  return match ? match[1].trim() : 'unknown';
}

/**
 * Main execution
 */
function main() {
  const planPath = process.argv[2];
  if (!planPath) {
    console.error('Usage: archive-plan.cjs <plan-directory>');
    console.error('Example: node .claude/scripts/archive-plan.cjs plans/260305-0204-skill-consolidation');
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

  const planSlug = path.basename(absolutePath);
  const planParent = path.dirname(absolutePath);

  // Determine archive dir (sibling archive/ folder)
  const archiveDir = path.join(planParent, 'archive');
  const archiveDest = path.join(archiveDir, planSlug);

  if (fs.existsSync(archiveDest)) {
    console.error('Error: Archive destination already exists: ' + archiveDest);
    process.exit(1);
  }

  const planMd = path.join(absolutePath, 'plan.md');
  if (!fs.existsSync(planMd)) {
    console.error('Error: plan.md not found in: ' + absolutePath);
    process.exit(1);
  }

  // Get current status for index.json count adjustment
  const currentStatus = getCurrentStatus(planMd);

  // 1. Update plan.md frontmatter to archived
  let content = fs.readFileSync(planMd, 'utf8');
  content = setFrontmatterKey(content, 'status', 'archived');
  content = setFrontmatterKey(content, 'updated', TODAY);
  fs.writeFileSync(planMd, content);

  // 2. Move directory to archive
  fs.mkdirSync(archiveDir, { recursive: true });
  copyDir(absolutePath, archiveDest);
  fs.rmSync(absolutePath, { recursive: true, force: true });
  console.log('Moved: ' + absolutePath + ' → ' + archiveDest);

  // 3. Update plans/README.md
  const readmePath = path.join(cwd, 'plans', 'README.md');
  updateReadme(readmePath, planSlug);

  // 4. Update index.json
  const indexPath = path.join(cwd, 'plans', 'index.json');
  updateIndexJson(indexPath, currentStatus);

  console.log('Plan archived: ' + planSlug);
  process.exit(0);
}

main();
