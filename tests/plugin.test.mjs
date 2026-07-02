import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const config = { client: {}, directory: process.cwd() };

describe('plugin lifecycle', () => {
  let plugin;

  it('exports id and server function', async () => {
    plugin = await import('../.opencode/plugin/zara.mjs');
    assert.equal(plugin.id, 'zara');
    assert.equal(typeof plugin.server, 'function');
  });

  it('server() returns all expected hooks', async () => {
    const inst = await plugin.server(config);
    const hooks = ['event', 'experimental.chat.system.transform',
      'experimental.chat.messages.transform', 'experimental.session.compacting',
      'tool.execute.before', 'tool.execute.after', 'chat.message',
      'chat.response', 'tool', 'dispose'];
    for (const h of hooks) {
      assert.ok(h in inst, `missing hook: ${h}`);
    }
  });

  it('voice inject stays silent under violation threshold', async () => {
    const voice = (await import('../.opencode/plugin/zara/voice/index.mjs')).default;
    const v = voice(config);
    const msgs = [{ role: 'system', content: 'base' }];
    const out = v.inject(msgs);
    assert.equal(out[0].content, 'base', 'voice should not inject without violations');
  });

  it('voice inject fires after 3 banned-word violations', async () => {
    const voice = (await import('../.opencode/plugin/zara/voice/index.mjs')).default;
    const v = voice(config);
    for (let i = 0; i < 3; i++) v.onResponse('we must leverage a robust seamless solution');
    const msgs = [{ role: 'system', content: 'base' }];
    const out = v.inject(msgs);
    assert.ok(out[0].content.includes('[Voice]'), 'should inject after 3 violations');
  });

  it('observe afterTool does not throw on valid input', async () => {
    const inst = await plugin.server(config);
    assert.doesNotThrow(() => {
      inst['tool.execute.after'](
        { tool: 'bash', args: { command: 'ls' } },
        { output: 'file.txt' }
      );
    });
  });

  it('flow inject returns messages array', async () => {
    const flow = (await import('../.opencode/plugin/zara/flow/index.mjs')).default;
    const f = flow(config);
    const msgs = [{ role: 'system', content: 'test' }];
    const out = f.inject(msgs);
    assert.ok(Array.isArray(out), 'flow.inject should return array');
  });

  it('system.transform propagates through all modules', async () => {
    const inst = await plugin.server(config);
    const msgs = [{ role: 'system', content: 'original' }];
    const result = await inst['experimental.chat.system.transform']({ messages: msgs });
    assert.ok(result.messages[0].content.includes('original'), 'should keep original');
    assert.ok(result.messages[0].content.length > 'original'.length, 'modules should inject');
  });

  it('dispose does not throw', async () => {
    const inst = await plugin.server(config);
    assert.doesNotThrow(() => inst.dispose());
  });
});
