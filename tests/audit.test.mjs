import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import auditTools from '../tools/mcp/domain/audit.mjs';

describe('zara_self_audit', () => {
  it('exposes the audit tool', () => {
    assert.ok(auditTools.zara_self_audit);
    assert.equal(typeof auditTools.zara_self_audit.handler, 'function');
  });

  it('returns a report on the real project config', async () => {
    const out = await auditTools.zara_self_audit.handler({});
    assert.match(out, /Self-audit:/);
    // Should report on agents, plugin modules, and MCP domains
    assert.match(out, /agent prompt files present/);
    assert.match(out, /plugin modules present/);
    assert.match(out, /MCP domains present/);
  });

  it('reports clean when nothing is missing', async () => {
    const out = await auditTools.zara_self_audit.handler({});
    // On a healthy checkout there should be no missing-file findings
    assert.ok(!out.includes('missing →'), `unexpected findings:\n${out}`);
  });

  it('emits a capability map when map=true', async () => {
    const out = await auditTools.zara_self_audit.handler({ map: true });
    assert.match(out, /Capability Map/);
    assert.match(out, /MCP domains/);
    assert.match(out, /Plugin modules/);
    assert.match(out, /Agents/);
  });
});
