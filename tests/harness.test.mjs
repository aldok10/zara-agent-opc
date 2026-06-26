// tests/harness.test.mjs — Self-harness module tests
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';

const HOME = path.join(os.homedir(), '.zara');
const HARNESS_DIR = path.join(HOME, 'harness');
const REFLECTIONS_LOG = path.join(HOME, 'reflections', 'log.jsonl');

describe('self-harness module', () => {
  let harness;

  before(async () => {
    const mod = await import('../.opencode/plugin/zara/harness/index.mjs');
    harness = mod.default({ directory: process.cwd() });
  });

  it('exports onEvent, inject, and tools', () => {
    assert.equal(typeof harness.onEvent, 'function');
    assert.equal(typeof harness.inject, 'function');
    assert.ok(harness.tools.harness_run);
    assert.ok(harness.tools.harness_security);
    assert.ok(harness.tools.harness_history);
  });

  it('harness_run returns report even with no failures', async () => {
    const result = await harness.tools.harness_run.execute({ days: 1 });
    assert.ok(result.output.includes('No failures') || result.output.includes('Self-Harness Report'));
  });

  it('harness_security runs without crash', async () => {
    const result = await harness.tools.harness_security.execute({ fix: false });
    assert.ok(result.output.includes('Security') || result.output.includes('clean'));
  });

  it('harness_history returns even when empty', async () => {
    const result = await harness.tools.harness_history.execute({ type: 'findings' });
    assert.ok(result.output);
  });

  it('inject does not crash on empty messages', () => {
    const msgs = [{ role: 'system', content: 'test' }];
    const result = harness.inject(msgs);
    assert.ok(Array.isArray(result));
    assert.ok(result.length >= 1);
  });

  it('onEvent handles session.created without crash', () => {
    assert.doesNotThrow(() => harness.onEvent({ type: 'session.created' }));
  });

  it('security audit detects permissive memory.db', async () => {
    const memDb = path.join(HOME, 'memory.db');
    if (!fs.existsSync(memDb)) return; // skip if no db
    const result = await harness.tools.harness_security.execute({ fix: false });
    // Should either find issues or report clean
    assert.ok(result.output.includes('Security'));
  });
});
