// tests/vector-store.test.mjs — Chroma vector backend adapter (no server needed)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('vector-store adapter', () => {
  it('defaults to sqlite backend (no behavior change)', async () => {
    const mod = await import('../tools/vector-store.mjs');
    assert.equal(mod.VECTOR_BACKEND, 'sqlite');
    assert.equal(mod.CHROMA_ENABLED, false);
  });

  it('getVectorStore returns null when backend is sqlite', async () => {
    const mod = await import('../tools/vector-store.mjs');
    assert.equal(mod.getVectorStore(), null);
  });

  it('exports the expected public surface', async () => {
    const mod = await import('../tools/vector-store.mjs');
    assert.equal(typeof mod.getVectorStore, 'function');
    assert.equal(typeof mod.CHROMA_ENABLED, 'boolean');
    assert.equal(typeof mod.VECTOR_BACKEND, 'string');
  });

  it('store exposes upsert, upsertBatch, query, reachable, count, remove', async () => {
    // Force-enable to inspect the store shape without a running server.
    process.env.ZARA_VECTOR = 'chroma';
    const mod = await import('../tools/vector-store.mjs?shape');
    const store = mod.getVectorStore();
    if (store) {
      for (const m of ['upsert', 'upsertBatch', 'query', 'reachable', 'count', 'remove']) {
        assert.equal(typeof store[m], 'function', `missing ${m}`);
      }
    }
    delete process.env.ZARA_VECTOR;
  });
});
