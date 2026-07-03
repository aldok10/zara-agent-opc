import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import memoryTools from '../tools/mcp/domain/memory.mjs';

const mem = memoryTools.memory.handler;

describe('metrics domain', () => {
  it('exposes the unified memory tool with system routing', () => {
    assert.ok(memoryTools.memory);
    assert.ok(memoryTools.memory.inputSchema.properties.action.enum.includes('system'));
  });

  it('dashboard (all) returns a string', async () => {
    const out = await mem({ action: 'system', op: 'dashboard', section: 'all' });
    assert.equal(typeof out, 'string');
    assert.ok(out.length > 0);
  });
});

describe('knowledge domain', () => {
  it('exposes the unified memory tool with manage routing', () => {
    assert.ok(memoryTools.memory);
    assert.ok(memoryTools.memory.inputSchema.properties.action.enum.includes('manage'));
    // team_knowledge removed (dead, solo user) — no longer a distinct tool.
  });

  it('knowledge index list_sections returns a string', async () => {
    const out = await mem({ action: 'manage', op: 'index', list_sections: true });
    assert.equal(typeof out, 'string');
    assert.ok(out.length > 0);
  });

  it('knowledge passage returns a string without throwing', async () => {
    const out = await mem({ action: 'recall', layer: 'knowledge', query: 'zzz_nonexistent_topic_xyz_qqq' });
    assert.equal(typeof out, 'string');
    assert.ok(out.length > 0);
  });
});
