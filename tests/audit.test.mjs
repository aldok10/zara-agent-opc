import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import memoryTools from '../tools/mcp/domain/memory.mjs';

const mem = memoryTools.memory.handler;

describe('zara_self_audit', () => {
  it('exposes the unified memory tool with system routing', () => {
    assert.ok(memoryTools.memory);
    assert.equal(typeof memoryTools.memory.handler, 'function');
    assert.ok(memoryTools.memory.inputSchema.properties.action.enum.includes('system'));
  });

  it('returns a report on the real project config', async () => {
    const out = await mem({ action: 'system', op: 'audit' });
    assert.match(out, /Self-audit:/);
    // Should report on agents, plugin modules, and MCP domains
    assert.match(out, /agent prompt files present/);
    assert.match(out, /plugin modules present/);
    assert.match(out, /MCP domains present/);
  });

  it('reports clean when nothing is missing', async () => {
    const out = await mem({ action: 'system', op: 'audit' });
    // On a healthy checkout there should be no missing-file findings
    assert.ok(!out.includes('missing →'), `unexpected findings:\n${out}`);
  });

  it('emits a capability map when map=true', async () => {
    const out = await mem({ action: 'system', op: 'audit', map: true });
    assert.match(out, /Capability Map/);
    assert.match(out, /MCP domains/);
    assert.match(out, /Agents/);
  });
});
