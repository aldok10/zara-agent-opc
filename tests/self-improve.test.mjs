import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { McpServer } from '../tools/mcp/server.mjs';
import improveTools from '../tools/mcp/domain/improve.mjs';
import sessionTools from '../tools/mcp/domain/session.mjs';

describe('Self-Improve Tool', () => {
  let server;

  before(() => {
    server = new McpServer('test-server', '1.0.0');
    server.registerAll([improveTools, sessionTools]);
  });

  it('zara_self_improve phase observe returns signals', async () => {
    const res = await server.handle({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'zara_self_improve', arguments: { phase: 'observe' } },
    });

    assert.ok(res.result);
    const output = res.result.content[0].text;
    assert.ok(output.includes('audit'), 'should include audit signal');
    assert.ok(output.includes('memory'), 'should include memory signal');
    assert.ok(output.includes('tools'), 'should include tools signal');
    assert.ok(output.includes('microTools'), 'should include microTools signal');
    assert.ok(output.includes('learnings'), 'should include learnings signal');
    assert.ok(output.includes('reflections'), 'should include reflections signal');
  });

  it('zara_self_improve phase orient returns prioritized structure', async () => {
    const res = await server.handle({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'zara_self_improve', arguments: { phase: 'orient' } },
    });

    assert.ok(res.result);
    const output = res.result.content[0].text;
    const parsed = JSON.parse(output);
    assert.ok('priority' in parsed, 'should have priority key');
    assert.ok('recommendations' in parsed.priority, 'should have recommendations array');
    assert.ok('healthy' in parsed.priority, 'should have healthy boolean');
  });

  it('zara_self_improve phase full runs observe + orient together', async () => {
    const res = await server.handle({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'zara_self_improve', arguments: { phase: 'full' } },
    });

    assert.ok(res.result);
    const output = res.result.content[0].text;
    const parsed = JSON.parse(output);
    assert.ok('signals' in parsed, 'full phase should include signals');
    assert.ok('priority' in parsed, 'full phase should include priority');
  });

  // Self-improvement is preserved as the on-demand zara_self_improve tool.
  // The old timer-driven `loop` scheduling was removed (token/CPU waster).
});
