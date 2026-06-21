import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Regression guard: the composition root calls createX(config) on every module
// and invokes lifecycle hooks. A module exporting a plain object instead of a
// factory (the social bug) silently breaks the whole plugin. This locks it down.

describe('plugin composition root', () => {
  it('every module is a factory and the plugin assembles', async () => {
    const p = await import('../.opencode/plugin/zara.mjs');
    const inst = await p.server({ client: {}, directory: process.cwd() });
    assert.ok(inst, 'server() should return an instance');
    assert.ok(inst.tool && typeof inst.tool === 'object', 'tools should aggregate');
    assert.ok(Object.keys(inst.tool).length > 0, 'should expose tools');
  });

  it('each domain module default-exports a callable factory', async () => {
    const modules = ['observe', 'memory', 'flow', 'dev', 'social', 'evolve', 'empathy', 'relationship'];
    for (const m of modules) {
      const mod = await import(`../.opencode/plugin/zara/${m}/index.mjs`);
      assert.equal(typeof mod.default, 'function', `${m} must default-export a factory function`);
      const inst = mod.default({ client: {}, directory: process.cwd() });
      assert.ok(inst && typeof inst === 'object', `${m} factory must return a module object`);
    }
  });

  it('inject hooks return the messages array (no accidental void)', async () => {
    const p = await import('../.opencode/plugin/zara.mjs');
    const inst = await p.server({ client: {}, directory: process.cwd() });
    const messages = [{ role: 'system', content: 'base' }];
    const out = await inst['experimental.chat.system.transform']({ messages });
    assert.ok(out && Array.isArray(out.messages), 'system.transform should return { messages }');
  });
});
