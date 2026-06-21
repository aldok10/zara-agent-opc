import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { McpServer } from '../tools/mcp/server.mjs';

describe('McpServer', () => {
  const server = new McpServer('test-server', '1.0.0');
  server.register({
    echo: {
      description: 'Echoes input',
      inputSchema: { type: 'object', properties: { msg: { type: 'string' } } },
      handler: (args) => args.msg || 'empty',
    },
    fail: {
      description: 'Always throws',
      inputSchema: { type: 'object' },
      handler: () => { throw new Error('intentional'); },
    },
  });

  it('responds to initialize', async () => {
    const res = await server.handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    assert.equal(res.jsonrpc, '2.0');
    assert.equal(res.id, 1);
    assert.equal(res.result.serverInfo.name, 'test-server');
    assert.equal(res.result.protocolVersion, '2024-11-05');
  });

  it('lists registered tools', async () => {
    const res = await server.handle({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    assert.equal(res.result.tools.length, 2);
    assert.ok(res.result.tools.find(t => t.name === 'echo'));
  });

  it('calls tool successfully', async () => {
    const res = await server.handle({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'echo', arguments: { msg: 'hello' } } });
    assert.equal(res.result.content[0].text, 'hello');
    assert.equal(res.result.isError, undefined);
  });

  it('returns error content for throwing tool', async () => {
    const res = await server.handle({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'fail', arguments: {} } });
    assert.equal(res.result.content[0].text, 'Error: intentional');
    assert.equal(res.result.isError, true);
  });

  it('rejects unknown tool', async () => {
    const res = await server.handle({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'nope', arguments: {} } });
    assert.equal(res.error.code, -32601);
  });

  it('rejects invalid jsonrpc', async () => {
    const res = await server.handle({ id: 6, method: 'initialize' });
    assert.equal(res.error.code, -32600);
  });

  it('returns null for notifications', async () => {
    const res = await server.handle({ jsonrpc: '2.0', method: 'notifications/initialized' });
    assert.equal(res, null);
  });

  it('returns error for unknown method with id', async () => {
    const res = await server.handle({ jsonrpc: '2.0', id: 7, method: 'nonexistent', params: {} });
    assert.equal(res.error.code, -32601);
  });
});
