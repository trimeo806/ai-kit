#!/usr/bin/env node
/**
 * build-gate.cjs - Build verification gate
 *
 * Detects the project platform and runs the appropriate build command.
 * Used by git commit/push workflows and audit completion to verify builds don't break.
 *
 * Exit codes:
 *   0 = build passed, skipped, or no build command detected (informational)
 *   1 = build failed
 *
 * Usage:
 *   node .codex/hooks/lib/build-gate.cjs [--platform web|android|ios|backend] [--dry-run] [--skip-build] [--timeout <ms>]
 *
 * Output (stdout): JSON { platform, command, success, duration_ms, warning?, error? }
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { detectPackageManager, detectFramework } = require('./project-detector.cjs');

// ─── CLI Arg Parsing ───

const args = process.argv.slice(2);

/**
 * Parse --key value or --key=value args
 * @param {string} key
 * @returns {string|null}
 */
function getArg(key) {
  const flagIndex = args.indexOf(key);
  if (flagIndex !== -1 && args[flagIndex + 1] && !args[flagIndex + 1].startsWith('--')) {
    return args[flagIndex + 1];
  }
  const eqArg = args.find(a => a.startsWith(`${key}=`));
  if (eqArg) return eqArg.split('=').slice(1).join('=');
  return null;
}

/**
 * Check if a boolean flag is present
 * @param {string} key
 * @returns {boolean}
 */
function hasFlag(key) {
  return args.includes(key);
}

const platformOverride = getArg('--platform');
const dryRun = hasFlag('--dry-run');
const skipBuild = hasFlag('--skip-build');
const timeoutMs = parseInt(getArg('--timeout') || '300000', 10); // 5min default

// ─── Platform Detection ───

/** @typedef {'web'|'android'|'ios'|'backend'|'unknown'} Platform */

/**
 * Detect which build platform applies to the current directory.
 * Priority: web > backend > android > ios
 * @returns {Platform}
 */
function detectPlatform() {
  // Web: package.json with build script (standard or Nx monorepo)
  if (fs.existsSync('package.json')) {
    try {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      if (pkg.scripts && pkg.scripts.build) return 'web';
      // Nx monorepo: no standard 'build' script but has nx run ...:build scripts
      if (fs.existsSync('nx.json')) {
        const hasNxBuild = Object.values(pkg.scripts || {}).some(
          v => typeof v === 'string' && v.includes('nx run') && v.includes(':build')
        );
        if (hasNxBuild) return 'web';
      }
    } catch { /* ignore */ }
  }

  // Backend: Maven
  if (fs.existsSync('pom.xml')) return 'backend';

  // Android: Gradle
  if (fs.existsSync('build.gradle.kts') || fs.existsSync('build.gradle')) return 'android';

  // iOS: Xcode project
  try {
    const entries = fs.readdirSync('.');
    if (entries.some(e => e.endsWith('.xcodeproj') || e.endsWith('.xcworkspace'))) return 'ios';
  } catch { /* ignore */ }

  // Swift Package
  if (fs.existsSync('Package.swift')) return 'ios';

  return 'unknown';
}

// ─── Build Commands ───

/**
 * Resolve the build command for a given platform.
 * @param {Platform} platform
 * @returns {string|null}
 */
function getBuildCommand(platform) {
  switch (platform) {
    case 'web': {
      // Respect the project's package manager
      const pm = detectPackageManager();
      const runner = pm === 'bun' ? 'bun' : pm === 'pnpm' ? 'pnpm' : pm === 'yarn' ? 'yarn' : 'npm';
      // Nx monorepo: prefer nx run ...:build script over standard 'build'
      if (fs.existsSync('nx.json') && fs.existsSync('package.json')) {
        try {
          const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
          const nxBuildEntry = Object.entries(pkg.scripts || {}).find(
            ([, v]) => typeof v === 'string' && v.includes('nx run') && v.includes(':build')
          );
          if (nxBuildEntry) return `${runner} run ${nxBuildEntry[0]}`;
        } catch { /* ignore */ }
      }
      return `${runner} run build`;
    }
    case 'backend':
      return 'mvn package -DskipTests';
    case 'android':
      return './gradlew assembleDebug';
    case 'ios': {
      // Try to detect scheme from .xcodeproj or .xcworkspace
      const scheme = detectXcodeScheme();
      if (scheme) {
        return `xcodebuild build -scheme '${scheme}' -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO`;
      }
      return `xcodebuild build -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO`;
    }
    default:
      return null;
  }
}

/**
 * Detect Xcode scheme from .xcodeproj contents.
 * Returns the first scheme found, or null.
 * @returns {string|null}
 */
function detectXcodeScheme() {
  try {
    const entries = fs.readdirSync('.');
    for (const entry of entries) {
      if (entry.endsWith('.xcodeproj')) {
        const schemesDir = path.join(entry, 'xcshareddata', 'xcschemes');
        if (fs.existsSync(schemesDir)) {
          const schemes = fs.readdirSync(schemesDir).filter(f => f.endsWith('.xcscheme'));
          if (schemes.length > 0) return schemes[0].replace('.xcscheme', '');
        }
        // Fall back to project name as scheme
        return entry.replace('.xcodeproj', '');
      }
    }
    // Try .xcworkspace
    for (const entry of entries) {
      if (entry.endsWith('.xcworkspace')) {
        return entry.replace('.xcworkspace', '');
      }
    }
  } catch { /* ignore */ }
  return null;
}

// ─── Build Execution ───

/**
 * Run the build command and return result.
 * @param {string} command
 * @returns {{ success: boolean, duration_ms: number, error?: string }}
 */
function runBuild(command) {
  const start = Date.now();
  try {
    execSync(command, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: timeoutMs,
      encoding: 'utf8',
    });
    return { success: true, duration_ms: Date.now() - start };
  } catch (err) {
    const stderr = err.stderr ? String(err.stderr).slice(-500) : '';
    const stdout = err.stdout ? String(err.stdout).slice(-300) : '';
    const excerpt = (stderr || stdout).trim().split('\n').slice(-10).join('\n');
    return { success: false, duration_ms: Date.now() - start, error: excerpt };
  }
}

// ─── Main ───

function main() {
  // --skip-build: exit immediately, no block
  if (skipBuild) {
    const result = { platform: 'skipped', command: null, success: true, warning: 'Build check skipped via --skip-build' };
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exit(0);
  }

  const platform = /** @type {Platform} */ (platformOverride || detectPlatform());
  const command = getBuildCommand(platform);

  // No build command detected — exit 0 (informational, not an error)
  if (!command) {
    const result = { platform, command: null, success: null, warning: 'No build command detected for this project — build gate skipped' };
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exit(0);
  }

  // Dry run: report what would run without executing
  if (dryRun) {
    const result = { platform, command, success: null, warning: 'Dry run — build not executed' };
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exit(0);
  }

  // Run the build
  process.stderr.write(`▶ build-gate: running ${platform} build...\n  ${command}\n`);
  const { success, duration_ms, error } = runBuild(command);

  /** @type {object} */
  const result = { platform, command, success, duration_ms };
  if (error) result.error = error;

  process.stdout.write(JSON.stringify(result) + '\n');

  if (success) {
    process.stderr.write(`✓ build-gate: build passed (${duration_ms}ms)\n`);
    process.exit(0);
  } else {
    process.stderr.write(`✗ build-gate: build FAILED\n${error || ''}\n`);
    process.exit(1);
  }
}

main();
