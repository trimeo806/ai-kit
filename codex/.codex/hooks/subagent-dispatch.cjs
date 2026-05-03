#!/usr/bin/env node
/**
 * Subagent Dispatch - UserPromptSubmit Hook
 *
 * Classifies user prompts and injects a compact routing directive so the main
 * Codex conversation can auto-trigger the appropriate subagent.
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 */

try {

const fs = require('fs');
const { isHookEnabled } = require('./lib/kit-config-utils.cjs');

const AGENTS = [
  'a11y-specialist',
  'backend-architect',
  'backend-developer',
  'brainstormer',
  'business-analyst',
  'code-reviewer',
  'debugger',
  'design-specialist',
  'developer',
  'devops-engineer',
  'docs-manager',
  'frontend-architect',
  'frontend-developer',
  'git-manager',
  'journal-writer',
  'knowledge-graph-guide',
  'mcp-manager',
  'muji',
  'planner',
  'project-manager',
  'researcher',
  'security-auditor',
  'tester'
];

const ROUTES = [
  {
    agent: 'security-auditor',
    confidence: 'high',
    reason: 'security / OWASP / vulnerability prompt',
    patterns: [
      /\bsecurity\b/i,
      /\bsecure\b/i,
      /\bvulnerabilit(?:y|ies)\b/i,
      /\bowasp\b/i,
      /\bauth(?:entication|orization)?\b/i,
      /\bcsrf\b/i,
      /\bxss\b/i,
      /\binjection\b/i,
      /\bpen(?:etration)? test\b/i,
      /\bharden(?:ing)?\b/i
    ]
  },
  {
    agent: 'code-reviewer',
    confidence: 'high',
    reason: 'code review / audit prompt',
    patterns: [
      /\breview\b/i,
      /\baudit\b/i,
      /\bcheck my code\b/i,
      /\bbefore (?:merge|commit)\b/i,
      /\bis this good\b/i,
      /\bcode quality\b/i,
      /\bsuggest improvements\b/i
    ]
  },
  {
    agent: 'debugger',
    confidence: 'high',
    reason: 'debug / failure prompt',
    patterns: [
      /\bdebug\b/i,
      /\bfix\b/i,
      /\bfailing\b/i,
      /\bfails\b/i,
      /\bbroken\b/i,
      /\bcrash(?:es|ing)?\b/i,
      /\berror\b/i,
      /\btrace\b/i,
      /\bnot working\b/i
    ]
  },
  {
    agent: 'tester',
    confidence: 'high',
    reason: 'testing / validation prompt',
    patterns: [
      /\btest(?:s|ing)?\b/i,
      /\bcoverage\b/i,
      /\bvalidate\b/i,
      /\be2e\b/i,
      /\bunit test\b/i,
      /\bintegration test\b/i,
      /\bplaywright\b/i
    ]
  },
  {
    agent: 'business-analyst',
    confidence: 'high',
    reason: 'requirements / business logic prompt',
    patterns: [
      /\brequirements?\b/i,
      /\bacceptance criteria\b/i,
      /\buser stor(?:y|ies)\b/i,
      /\buse cases?\b/i,
      /\bprd\b/i,
      /\bbusiness logic\b/i,
      /\bbusiness rules?\b/i,
      /\bdomain rules?\b/i,
      /\bstakeholders?\b/i,
      /\bfeature analysis\b/i,
      /\banaly[sz]e (?:this )?feature\b/i,
      /\bclarify (?:this )?feature\b/i,
      /\bprompt refinement\b/i,
      /\brefine (?:this )?prompt\b/i,
      /\bimprove (?:this )?prompt\b/i
    ]
  },
  {
    agent: 'devops-engineer',
    confidence: 'high',
    reason: 'infrastructure / deployment prompt',
    patterns: [
      /\bdocker(?:file)?\b/i,
      /\bcompose\b/i,
      /\bterraform\b/i,
      /\bkubernetes\b/i,
      /\bk8s\b/i,
      /\bci\/cd\b/i,
      /\bgithub actions\b/i,
      /\bdeploy(?:ment)?\b/i,
      /\bcloud run\b/i,
      /\bobservability\b/i,
      /\bmonitoring\b/i
    ]
  },
  {
    agent: 'docs-manager',
    confidence: 'high',
    reason: 'documentation prompt',
    patterns: [
      /\bdocs?\b/i,
      /\bdocument(?:ation)?\b/i,
      /\breadme\b/i,
      /\bspec\b/i,
      /\brfc\b/i,
      /\bproposal\b/i
    ]
  },
  {
    agent: 'git-manager',
    confidence: 'high',
    reason: 'git workflow prompt',
    patterns: [
      /\bcommit\b/i,
      /\bpush\b/i,
      /\bpull request\b/i,
      /\bpr\b/i,
      /\bship it\b/i,
      /\bmerge\b/i,
      /\btag release\b/i
    ]
  },
  {
    agent: 'planner',
    confidence: 'high',
    reason: 'planning / architecture prompt',
    patterns: [
      /\bplan\b/i,
      /\broadmap\b/i,
      /\barchitect\b/i,
      /\bdesign (?:this|the approach|the system|an api|api)\b/i,
      /\bhow should we build\b/i,
      /\bspec out\b/i
    ]
  },
  {
    agent: 'brainstormer',
    confidence: 'high',
    reason: 'brainstorming / ideation prompt',
    patterns: [
      /\bbrainstorm\b/i,
      /\bideate\b/i,
      /\bthink through\b/i,
      /\bhelp me think\b/i,
      /\bi'?m considering\b/i
    ]
  },
  {
    agent: 'researcher',
    confidence: 'medium',
    reason: 'research / comparison prompt',
    patterns: [
      /\bresearch\b/i,
      /\bbest practices\b/i,
      /\bcompare\b/i,
      /\bhow does\b/i,
      /\bwhat is\b/i,
      /\bfind out\b/i,
      /\binvestigate\b/i
    ]
  },
  {
    agent: 'design-specialist',
    confidence: 'high',
    reason: 'design / brand / visual asset prompt',
    patterns: [
      /\bui\/ux\b/i,
      /\bdesign system\b/i,
      /\bbrand\b/i,
      /\blogo\b/i,
      /\bbanner\b/i,
      /\bslides?\b/i,
      /\bpitch deck\b/i,
      /\btypography\b/i,
      /\bcolor palette\b/i
    ]
  },
  {
    agent: 'frontend-developer',
    confidence: 'high',
    reason: 'frontend implementation prompt',
    patterns: [
      /\breact\b/i,
      /\bnext\.?js\b/i,
      /\btanstack\b/i,
      /\btsx?\b/i,
      /\bjsx?\b/i,
      /\bcomponent\b/i,
      /\bfrontend\b/i,
      /\bui\b/i,
      /\bpage\b/i,
      /\bform\b/i,
      /\bbutton\b/i
    ]
  },
  {
    agent: 'backend-developer',
    confidence: 'high',
    reason: 'backend implementation prompt',
    patterns: [
      /\bapi\b/i,
      /\bendpoint\b/i,
      /\bserver\b/i,
      /\bbackend\b/i,
      /\bdatabase\b/i,
      /\bmigration\b/i,
      /\bpostgres\b/i,
      /\bfastapi\b/i,
      /\bgo\b/i,
      /\bgraphql\b/i,
      /\brest\b/i
    ]
  },
  {
    agent: 'developer',
    confidence: 'medium',
    reason: 'generic build / implementation prompt',
    patterns: [
      /\bimplement\b/i,
      /\bbuild\b/i,
      /\badd\b/i,
      /\bcreate\b/i,
      /\bmake\b/i,
      /\bcontinue\b/i,
      /\bwire\b/i,
      /\bscaffold\b/i
    ]
  }
];

function getPrompt(payload) {
  const candidates = [
    payload?.user_prompt,
    payload?.prompt,
    payload?.message,
    payload?.input,
    payload?.transcript?.slice?.(-1)?.[0]?.content
  ];
  return candidates.find(value => typeof value === 'string' && value.trim())?.trim() || '';
}

function isSlashCommand(prompt) {
  return /^\/\S+/.test(prompt.trim());
}

function findExplicitAgents(prompt) {
  const normalized = prompt.toLowerCase();
  return AGENTS.map(agent => {
    const escaped = agent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = normalized.match(new RegExp(`(?:^|[^a-z0-9-])(${escaped})(?:$|[^a-z0-9-])`, 'i'));
    return match ? { agent, index: match.index } : null;
  })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index)
    .map(match => match.agent);
}

function findRouteMatches(prompt) {
  return ROUTES.map((route, priority) => {
    const indexes = route.patterns
      .map(pattern => prompt.search(pattern))
      .filter(index => index >= 0);
    if (indexes.length === 0) return null;
    return {
      ...route,
      priority,
      index: Math.min(...indexes)
    };
  }).filter(Boolean);
}

function classifyPrompt(prompt) {
  if (!prompt || isSlashCommand(prompt)) return null;

  const explicitAgents = findExplicitAgents(prompt);
  if (explicitAgents.length > 0) {
    return {
      agents: explicitAgents,
      confidence: 'explicit',
      reason: 'agent named in prompt'
    };
  }

  const matches = findRouteMatches(prompt);
  if (matches.length === 0) return null;

  const hasSequencing = /\bthen\b|\bafter\b|\bfollow(?:ed)? by\b|\bnext\b|\bfinally\b/i.test(prompt);
  const specificMatches = matches.length > 1
    ? matches.filter(route => route.agent !== 'developer')
    : matches;
  const orderedMatches = hasSequencing
    ? [...specificMatches].sort((a, b) => a.index - b.index || a.priority - b.priority)
    : [...specificMatches].sort((a, b) => a.priority - b.priority || a.index - b.index);
  const primary = orderedMatches[0];
  const chain = [];

  for (const route of orderedMatches) {
    if (!hasSequencing && chain.length >= 1) break;
    if (chain.length >= 3) break;
    if (!chain.includes(route.agent)) chain.push(route.agent);
  }

  return {
    agents: chain,
    confidence: primary.confidence,
    reason: primary.reason
  };
}

function buildDirective(route, prompt) {
  const taskPreview = prompt.replace(/\s+/g, ' ').slice(0, 240);
  const agentList = route.agents.map(agent => `\`${agent}\``).join(' -> ');

  return [
    `## Auto Subagent Delegation`,
    `- Trigger: ${route.confidence} confidence (${route.reason})`,
    `- Task: ${taskPreview}`,
    `- Agent chain: ${agentList}`,
    `- Action: The main conversation should call \`spawn_agent\` for the listed agent(s) before local implementation unless the task is trivial, tightly coupled to current local context, or blocked on immediate local inspection.`,
    `- Sequencing: If multiple agents are listed, run them in order and pass each result to the next. Keep orchestration in the main conversation; subagents must not spawn subagents.`,
    ``
  ].join('\n');
}

async function main() {
  try {
    if (!isHookEnabled('subagent-dispatch')) process.exit(0);

    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);
    const prompt = getPrompt(payload);
    const route = classifyPrompt(prompt);

    if (!route) process.exit(0);

    console.log(buildDirective(route, prompt));
    process.exit(0);
  } catch (error) {
    console.error(`Subagent dispatch hook error: ${error.message}`);
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  AGENTS,
  ROUTES,
  buildDirective,
  classifyPrompt,
  findRouteMatches,
  findExplicitAgents,
  getPrompt
};

} catch (e) {
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
  process.exit(0);
}
