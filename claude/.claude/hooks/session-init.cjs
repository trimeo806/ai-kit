#!/usr/bin/env node
/**
 * SessionStart Hook - Initializes session environment with project detection
 *
 * Fires: Once per session (startup, resume, clear, compact)
 * Purpose: Load config, detect project info, persist to env vars, output context
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 *
 * Core detection logic extracted to lib/project-detector.cjs for OpenCode plugin reuse.
 */

try {

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  loadConfig,
  writeEnv,
  writeSessionState,
  resolvePlanPath,
  getReportsPath,
  resolveNamingPattern,
  isHookEnabled,
  getResearchConfig
} = require('./lib/kit-config-utils.cjs');

if (!isHookEnabled('session-init')) process.exit(0);

// Import shared project detection logic
const {
  detectProjectType,
  detectPackageManager,
  detectFramework,
  getPythonVersion,
  getGitRemoteUrl,
  getGitBranch,
  getCodingLevelStyleName,
  getCodingLevelGuidelines,
  buildContextOutput,
  execSafe
} = require('./lib/project-detector.cjs');

/**
 * Main hook execution
 */
async function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    const data = stdin ? JSON.parse(stdin) : {};
    const envFile = process.env.CLAUDE_ENV_FILE;
    const source = data.source || 'unknown';
    const sessionId = data.session_id || null;

    // Load project-scoped secrets (.claude/.env) — gitignored, never committed
    const dotEnvPath = path.join(process.cwd(), '.claude', '.env');
    if (fs.existsSync(dotEnvPath)) {
      const lines = fs.readFileSync(dotEnvPath, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        if (key && !process.env[key]) process.env[key] = val; // shell env takes priority
      }
    }

    const config = loadConfig();

    const detections = {
      type: detectProjectType(config.project?.type),
      pm: detectPackageManager(config.project?.packageManager),
      framework: detectFramework(config.project?.framework)
    };

    // Resolve plan - now returns { path, resolvedBy }
    const resolved = resolvePlanPath(null, config);

    // CRITICAL FIX: Only persist explicitly-set plans to session state
    // Branch-matched plans are "suggested" - stored separately, not as activePlan
    // This prevents stale plan pollution on fresh sessions
    if (sessionId) {
      writeSessionState(sessionId, {
        sessionOrigin: process.cwd(),
        // Only session-resolved plans are truly "active"
        activePlan: resolved.resolvedBy === 'session' ? resolved.path : null,
        // Track suggested plan separately (for UI hints, not for report paths)
        suggestedPlan: resolved.resolvedBy === 'branch' ? resolved.path : null,
        timestamp: Date.now(),
        source
      });
    }

    // Reports path only uses active plans, not suggested ones
    const reportsPath = getReportsPath(resolved.path, resolved.resolvedBy, config.plan, config.paths);

    // Collect static environment info (computed once per session)
    const staticEnv = {
      nodeVersion: process.version,
      pythonVersion: getPythonVersion(),
      osPlatform: process.platform,
      gitUrl: getGitRemoteUrl(),
      gitBranch: getGitBranch(),
      gitRoot: execSafe('git rev-parse --show-toplevel'),
      user: process.env.USERNAME || process.env.USER || process.env.LOGNAME || os.userInfo().username,
      locale: process.env.LANG || '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      claudeSettingsDir: path.resolve(__dirname, '..')
    };

    // Compute base directory for absolute paths (Issue #327: use CWD for subdirectory support)
    // Git root is kept in staticEnv for reference, but CWD determines where files are created
    const baseDir = process.cwd();

    // Compute resolved naming pattern (date + issue resolved, {slug} kept as placeholder)
    const namePattern = resolveNamingPattern(config.plan, staticEnv.gitBranch);

    if (envFile) {
      // Session & plan config
      writeEnv(envFile, 'tri-ai-kit_SESSION_ID', sessionId || '');
      writeEnv(envFile, 'tri-ai-kit_PLAN_NAMING_FORMAT', config.plan.namingFormat);
      writeEnv(envFile, 'tri-ai-kit_PLAN_DATE_FORMAT', config.plan.dateFormat);
      writeEnv(envFile, 'tri-ai-kit_PLAN_ISSUE_PREFIX', config.plan.issuePrefix || '');
      writeEnv(envFile, 'tri-ai-kit_PLAN_REPORTS_DIR', config.plan.reportsDir);

      // NEW: Resolved naming pattern for DRY file naming in agents
      // Example: "251212-1830-GH-88-{slug}" or "251212-1830-{slug}"
      // Agents use: `{agent-type}-$tri-ai-kit_NAME_PATTERN.md` and substitute {slug}
      writeEnv(envFile, 'tri-ai-kit_NAME_PATTERN', namePattern);

      // Plan resolution
      writeEnv(envFile, 'tri-ai-kit_ACTIVE_PLAN', resolved.resolvedBy === 'session' ? resolved.path : '');
      writeEnv(envFile, 'tri-ai-kit_SUGGESTED_PLAN', resolved.resolvedBy === 'branch' ? resolved.path : '');

      // Paths - use absolute paths based on CWD for subdirectory workflow support (Issue #327)
      writeEnv(envFile, 'tri-ai-kit_GIT_ROOT', staticEnv.gitRoot || '');
      writeEnv(envFile, 'tri-ai-kit_REPORTS_PATH', path.join(baseDir, reportsPath));
      writeEnv(envFile, 'tri-ai-kit_DOCS_PATH', path.join(baseDir, config.paths.docs));
      writeEnv(envFile, 'tri-ai-kit_PLANS_PATH', path.join(baseDir, config.paths.plans));
      writeEnv(envFile, 'tri-ai-kit_PROJECT_ROOT', process.cwd());

      // Project detection
      writeEnv(envFile, 'tri-ai-kit_PROJECT_TYPE', detections.type || '');
      writeEnv(envFile, 'tri-ai-kit_PACKAGE_MANAGER', detections.pm || '');
      writeEnv(envFile, 'tri-ai-kit_FRAMEWORK', detections.framework || '');

      // NEW: Static environment info (so other hooks don't need to recompute)
      writeEnv(envFile, 'tri-ai-kit_NODE_VERSION', staticEnv.nodeVersion);
      writeEnv(envFile, 'tri-ai-kit_PYTHON_VERSION', staticEnv.pythonVersion || '');
      writeEnv(envFile, 'tri-ai-kit_OS_PLATFORM', staticEnv.osPlatform);
      writeEnv(envFile, 'tri-ai-kit_GIT_URL', staticEnv.gitUrl || '');
      writeEnv(envFile, 'tri-ai-kit_GIT_BRANCH', staticEnv.gitBranch || '');
      writeEnv(envFile, 'tri-ai-kit_USER', staticEnv.user);
      writeEnv(envFile, 'tri-ai-kit_LOCALE', staticEnv.locale);
      writeEnv(envFile, 'tri-ai-kit_TIMEZONE', staticEnv.timezone);
      writeEnv(envFile, 'tri-ai-kit_CLAUDE_SETTINGS_DIR', staticEnv.claudeSettingsDir);

      // Locale config
      if (config.locale?.thinkingLanguage) {
        writeEnv(envFile, 'tri-ai-kit_THINKING_LANGUAGE', config.locale.thinkingLanguage);
      }
      if (config.locale?.responseLanguage) {
        writeEnv(envFile, 'tri-ai-kit_RESPONSE_LANGUAGE', config.locale.responseLanguage);
      }

      // Plan validation config (for /plan:validate, /plan:deep, /plan:parallel)
      const validation = config.plan?.validation || {};
      writeEnv(envFile, 'tri-ai-kit_VALIDATION_MODE', validation.mode || 'prompt');
      writeEnv(envFile, 'tri-ai-kit_VALIDATION_MIN_QUESTIONS', validation.minQuestions || 3);
      writeEnv(envFile, 'tri-ai-kit_VALIDATION_MAX_QUESTIONS', validation.maxQuestions || 8);
      writeEnv(envFile, 'tri-ai-kit_VALIDATION_FOCUS_AREAS', (validation.focusAreas || ['assumptions', 'risks', 'tradeoffs', 'architecture']).join(','));

      // Coding level config (for output style selection)
      const codingLevel = config.codingLevel ?? 5;
      writeEnv(envFile, 'tri-ai-kit_CODING_LEVEL', codingLevel);
      writeEnv(envFile, 'tri-ai-kit_CODING_LEVEL_STYLE', getCodingLevelStyleName(codingLevel));

      // Research engine config
      const researchCfg = getResearchConfig(config);
      writeEnv(envFile, 'tri-ai-kit_RESEARCH_ENGINE', researchCfg.engine);
      writeEnv(envFile, 'tri-ai-kit_GEMINI_MODEL', researchCfg.geminiModel);

      // Propagate API keys from .claude/.env to subagent shells
      if (process.env.GEMINI_API_KEY) writeEnv(envFile, 'GEMINI_API_KEY', process.env.GEMINI_API_KEY);
      if (process.env.PERPLEXITY_API_KEY) writeEnv(envFile, 'PERPLEXITY_API_KEY', process.env.PERPLEXITY_API_KEY);
    }

    // Write current session marker for session-metrics Stop hook
    const improvementsDir = path.join(process.cwd(), '.kit-data', 'improvements');
    try {
      fs.mkdirSync(improvementsDir, { recursive: true });
      fs.writeFileSync(
        path.join(improvementsDir, 'current-session.json'),
        JSON.stringify({
          startedAt: new Date().toISOString(),
          sessionId: sessionId || `anon-${Date.now()}`,
          branch: staticEnv.gitBranch || 'unknown'
        })
      );
    } catch { /* silent — non-critical */ }

    // Biweekly improvement summary gate
    try {
      const summaryMetaPath = path.join(process.cwd(), '.kit-data', 'improvements', 'last-summary.json');
      const sessionsPath = path.join(process.cwd(), '.kit-data', 'improvements', 'sessions.jsonl');
      const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
      let shouldPromptSummary = false;

      if (fs.existsSync(sessionsPath)) {
        const sessionLines = fs.readFileSync(sessionsPath, 'utf-8').split('\n').filter(Boolean);
        if (sessionLines.length >= 5) { // Only prompt if we have enough data
          if (fs.existsSync(summaryMetaPath)) {
            const meta = JSON.parse(fs.readFileSync(summaryMetaPath, 'utf-8'));
            const lastRun = new Date(meta.generatedAt).getTime();
            if (Date.now() - lastRun > FOURTEEN_DAYS_MS) {
              shouldPromptSummary = true;
            }
          } else {
            // Never run before — prompt if we have data
            shouldPromptSummary = true;
          }
        }
      }

      if (shouldPromptSummary) {
        console.log(`\n📊 Biweekly improvement summary is due. Run \`/review-improvements\` to analyze session patterns and generate a summary.`);
      }
    } catch { /* silent — non-critical */ }

    console.log(`Session ${source}. ${buildContextOutput(config, detections, resolved, staticEnv.gitRoot)}`);

    // Research engine context line
    const researchCfg = getResearchConfig(config);
    if (researchCfg.engine === 'gemini') {
      console.log(`Research engine: gemini (model: ${researchCfg.geminiModel})`);
    } else {
      console.log(`Research engine: websearch`);
    }

    // Info: Show git root when running from subdirectory (Issue #327: now supported)
    if (staticEnv.gitRoot && staticEnv.gitRoot !== process.cwd()) {
      console.log(`📁 Subdirectory mode: Plans/docs will be created in current directory`);
      console.log(`   Git root: ${staticEnv.gitRoot}`);
    }

    // MITIGATION: Issue #277 - Auto-compact can bypass AskUserQuestion approval gates
    // When context is compacted mid-workflow, the summarization may lose "pending approval" state.
    // This warning reminds Claude to verify if user approval was pending before proceeding.
    // Upstream bug: Claude Code CLI should preserve pending interactive state during compaction.
    if (source === 'compact') {
      console.log(`\n⚠️ CONTEXT COMPACTED - APPROVAL STATE CHECK:`);
      console.log(`If you were waiting for user approval via AskUserQuestion (e.g., Step 4 review gate),`);
      console.log(`you MUST re-confirm with the user before proceeding. Do NOT assume approval was given.`);
      console.log(`Use AskUserQuestion to verify: "Context was compacted. Please confirm approval to continue."`);
    }

    // Auto-inject coding level guidelines (if not disabled)
    const codingLevel = config.codingLevel ?? -1;
    const guidelines = getCodingLevelGuidelines(codingLevel);
    if (guidelines) {
      console.log(`\n${guidelines}`);
    }

    if (config.assertions?.length > 0) {
      console.log(`\nUser Assertions:`);
      config.assertions.forEach((assertion, i) => {
        console.log(`  ${i + 1}. ${assertion}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error(`SessionStart hook error: ${error.message}`);
    process.exit(0);
  }
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
