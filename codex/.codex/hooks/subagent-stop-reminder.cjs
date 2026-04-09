#!/usr/bin/env node
/**
 * subagent-stop-reminder.cjs — SubagentStop Hook
 *
 * General post-subagent handler. Self-filters by agent_type to dispatch
 * appropriate reminders per agent kind.
 *
 * Currently:
 *   - planner agents → reminds to run /cook before implementing
 *
 * Exit Codes:
 *   0 - Always (non-blocking)
 */

try {

const fs = require('fs');
const { isHookEnabled } = require('./lib/kit-config-utils.cjs');

if (!isHookEnabled('subagent-stop-reminder')) process.exit(0);

function main() {
  let input = '';
  try {
    input = fs.readFileSync(0, 'utf-8');
  } catch {
    process.exit(0);
  }

  let hookData;
  try {
    hookData = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const agentType = (hookData.agent_type || hookData.agent_id || '').toLowerCase();

  // Only trigger for planning agents
  if (!agentType.includes('plan') && !agentType.includes('planner')) {
    process.exit(0);
  }

  console.log('Plan subagent completed. Before implementing:\n  Run /cook {plan.md} to start implementation from a fresh context.');
  process.exit(0);
}

main();

} catch (e) {
  // Minimal crash logging — only Node builtins, no lib/ deps
  try {
    const fs = require('fs');
    const p = require('path');
    const logDir = p.join(__dirname, '.logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(
      p.join(logDir, 'hook-log.jsonl'),
      JSON.stringify({ ts: new Date().toISOString(), hook: p.basename(__filename, '.cjs'), status: 'crash', error: e.message }) + '\n'
    );
  } catch (_) {}
  process.exit(0); // fail-open
}
