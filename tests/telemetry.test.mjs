// Token/Cost Telemetry Tests (Issue #10)

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';

const HOME = path.join(os.homedir(), '.zara');
const TELEMETRY_DB = path.join(HOME, 'telemetry.db');

// Dynamic import to test the module
let telemetry;
try { telemetry = await import('../tools/telemetry.mjs'); } catch (e) { telemetry = null; }

describe('telemetry module', () => {
  it('exports recordTurn and getMetrics', () => {
    assert.ok(telemetry, 'telemetry module must exist');
    assert.ok(typeof telemetry.recordTurn === 'function', 'must export recordTurn');
    assert.ok(typeof telemetry.getMetrics === 'function', 'must export getMetrics');
  });

  it('recordTurn stores token data', () => {
    const result = telemetry.recordTurn({
      tokens_in: 1000,
      tokens_out: 200,
      tools_called: 3,
      agent: 'zara',
      model: 'claude-sonnet',
      cached_tokens: 800,
    });
    assert.ok(result, 'recordTurn must return truthy');
  });

  it('getMetrics returns session totals', () => {
    // Record a few turns
    telemetry.recordTurn({ tokens_in: 500, tokens_out: 100, tools_called: 1, agent: 'zara' });
    telemetry.recordTurn({ tokens_in: 300, tokens_out: 50, tools_called: 2, agent: 'forge' });

    const metrics = telemetry.getMetrics('today');
    assert.ok(metrics.total_in > 0, 'must have total input tokens');
    assert.ok(metrics.total_out > 0, 'must have total output tokens');
    assert.ok(metrics.turns > 0, 'must count turns');
  });

  it('getMetrics supports per-agent breakdown', () => {
    const metrics = telemetry.getMetrics('today');
    assert.ok(metrics.by_agent, 'must have per-agent breakdown');
    assert.ok(metrics.by_agent.zara || metrics.by_agent.forge, 'must track at least one agent');
  });

  it('estimates cost from token counts', () => {
    const metrics = telemetry.getMetrics('today');
    assert.ok(typeof metrics.est_cost_usd === 'number', 'must estimate cost');
    assert.ok(metrics.est_cost_usd >= 0, 'cost must be non-negative');
  });

  after(() => {
    // Cleanup test entries (telemetry uses its own DB)
    try { telemetry.cleanup('__test__'); } catch {}
  });
});
