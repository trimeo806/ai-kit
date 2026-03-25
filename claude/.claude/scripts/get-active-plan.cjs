#!/usr/bin/env node
/**
 * Get active plan from session state
 *
 * Usage: node .claude/scripts/get-active-plan.cjs
 *
 * Reads active plan path from session temp file.
 * Falls back to scanning plans/ for status: active if session is stale.
 * Prints path to stdout or 'none' if no active plan.
 */

// Version check (must run before requires that may use Node 18+ APIs)
const [major] = process.versions.node.split('.').map(Number);
if (major < 18) {
  console.error('Error: Node.js >= 18.0.0 required (current: ' + process.version + ')');
  console.error('Please upgrade: https://nodejs.org/ or use nvm: nvm install 18');
  process.exit(1);
}

const fs = require('fs');
const path = require('path');
const { readSessionState } = require('../hooks/lib/kit-config-utils.cjs');

/**
 * Read status from plan.md frontmatter
 */
function readPlanStatus(planDir) {
  const planMd = path.join(planDir, 'plan.md');
  if (!fs.existsSync(planMd)) return null;
  try {
    const content = fs.readFileSync(planMd, 'utf8');
    const match = content.match(/^status:\s*(.+)$/m);
    if (!match) return null;
    return match[1].trim().replace(/^["']|["']$/g, '');
  } catch (e) {
    return null;
  }
}

/**
 * Read created date from plan.md frontmatter
 */
function readPlanCreated(planDir) {
  const planMd = path.join(planDir, 'plan.md');
  if (!fs.existsSync(planMd)) return null;
  try {
    const content = fs.readFileSync(planMd, 'utf8');
    const match = content.match(/^created:\s*(.+)$/m);
    if (!match) return null;
    return match[1].trim().replace(/^["']|["']$/g, '');
  } catch (e) {
    return null;
  }
}

/**
 * Scan plans directory for plan.md files with status: active
 * Returns the most recently created active plan path, or null
 */
function findActivePlanByFrontmatter(plansDir) {
  if (!fs.existsSync(plansDir)) return null;
  try {
    const entries = fs.readdirSync(plansDir, { withFileTypes: true });
    const activePlans = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'archive') continue;
      const dirPath = path.join(plansDir, entry.name);
      const status = readPlanStatus(dirPath);
      if (status === 'active') {
        activePlans.push(dirPath);
      }
    }
    if (activePlans.length === 0) return null;
    // Return the one with the most recent timestamp prefix (sort descending)
    activePlans.sort((a, b) => path.basename(b).localeCompare(path.basename(a)));
    return activePlans[0];
  } catch (e) {
    return null;
  }
}

/**
 * Main execution
 */
function main() {
  // Get session ID from environment
  const sessionId = process.env.tri-ai-kit_SESSION_ID;
  if (!sessionId) {
    console.error('Warning: tri-ai-kit_SESSION_ID not set');
    console.log('none');
    process.exit(0);
  }

  try {
    // Read session state
    const state = readSessionState(sessionId);
    let planPath = null;
    let resolvedBy = null;

    if (state && state.activePlan) {
      // Verify the session plan still exists and is still active
      const sessionPlan = state.activePlan;
      if (fs.existsSync(sessionPlan)) {
        const status = readPlanStatus(sessionPlan);
        if (!status || status === 'active') {
          planPath = sessionPlan;
          resolvedBy = 'session';
        }
        // If session plan is completed/archived, fall through to scan
      }
    }

    // Fallback: scan plans/ directory for status: active
    if (!planPath) {
      const plansDir = path.join(process.cwd(), 'plans');
      planPath = findActivePlanByFrontmatter(plansDir);
      if (planPath) resolvedBy = 'frontmatter';
    }

    if (planPath) {
      const slug = path.basename(planPath);
      const created = readPlanCreated(planPath) || 'unknown';
      const status = readPlanStatus(planPath) || 'active';
      console.log(planPath + ' | status: ' + status + ' | created: ' + created);
    } else {
      console.log('none');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error: ' + error.message);
    console.log('none');
    process.exit(0);
  }
}

main();
