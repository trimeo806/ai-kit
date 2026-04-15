#!/usr/bin/env node
/**
 * Tests for subagent-dispatch.cjs hook.
 * Run: node --test .codex/hooks/__tests__/subagent-dispatch.test.cjs
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('child_process');
const path = require('path');

const HOOK_PATH = path.join(__dirname, '..', 'subagent-dispatch.cjs');
const {
  classifyPrompt,
  findExplicitAgents,
  getPrompt
} = require(HOOK_PATH);

function runHook(inputData, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [HOOK_PATH], {
      cwd: options.cwd || process.cwd(),
      env: {
        ...process.env,
        CLAUDE_ENV_FILE: '',
        ...options.env
      }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', data => { stdout += data.toString(); });
    proc.stderr.on('data', data => { stderr += data.toString(); });

    if (inputData) {
      proc.stdin.write(typeof inputData === 'string' ? inputData : JSON.stringify(inputData));
    }
    proc.stdin.end();

    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('Hook execution timed out'));
    }, 10000);

    proc.on('close', code => {
      clearTimeout(timeout);
      resolve({ stdout, stderr, exitCode: code });
    });
    proc.on('error', error => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

describe('subagent-dispatch.cjs', () => {
  describe('prompt extraction', () => {
    it('reads user_prompt first', () => {
      assert.strictEqual(getPrompt({ user_prompt: 'run tests' }), 'run tests');
    });

    it('falls back to prompt', () => {
      assert.strictEqual(getPrompt({ prompt: 'review code' }), 'review code');
    });
  });

  describe('classification', () => {
    it('routes frontend implementation to frontend-developer', () => {
      const route = classifyPrompt('Add a React form component');
      assert.deepStrictEqual(route.agents, ['frontend-developer']);
      assert.strictEqual(route.confidence, 'high');
    });

    it('routes API implementation to backend-developer', () => {
      const route = classifyPrompt('Implement a REST API endpoint');
      assert.deepStrictEqual(route.agents, ['backend-developer']);
    });

    it('routes failing prompts to debugger before generic developer', () => {
      const route = classifyPrompt('Fix this failing test error');
      assert.deepStrictEqual(route.agents, ['debugger']);
    });

    it('detects explicit agent references', () => {
      assert.deepStrictEqual(findExplicitAgents('Run frontend-developer then code-reviewer'), [
        'frontend-developer',
        'code-reviewer'
      ]);
    });

    it('returns no route for slash commands', () => {
      assert.strictEqual(classifyPrompt('/plan build this'), null);
    });

    it('returns no route for casual prompts', () => {
      assert.strictEqual(classifyPrompt('thanks, that helps'), null);
    });

    it('builds a short chain when sequencing words are present', () => {
      const route = classifyPrompt('Implement the API then review it and run tests');
      assert.deepStrictEqual(route.agents, ['backend-developer', 'code-reviewer', 'tester']);
    });
  });

  describe('hook execution', () => {
    it('exits with code 0 for empty stdin', async () => {
      const result = await runHook(null);
      assert.strictEqual(result.exitCode, 0);
      assert.strictEqual(result.stdout, '');
    });

    it('prints delegation directive for matched prompts', async () => {
      const result = await runHook({ user_prompt: 'Review this change before merge' });
      assert.strictEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes('Auto Subagent Delegation'));
      assert.ok(result.stdout.includes('`code-reviewer`'));
      assert.ok(result.stdout.includes('spawn_agent'));
    });

    it('uses default enabled config when no project config exists', async () => {
      const result = await runHook(
        { user_prompt: 'Run tests' },
        { env: { HOME: '/tmp/tri-ai-kit-subagent-dispatch-test-home' } }
      );
      assert.strictEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes('`tester`'));
    });

    it('fails open on invalid JSON', async () => {
      const result = await runHook('not json');
      assert.strictEqual(result.exitCode, 0);
    });
  });
});
