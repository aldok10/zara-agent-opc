import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../tools/memory-db.mjs';
import os from 'os';
import path from 'path';
import fs from 'fs';

describe('deleteByPattern', () => {
  const tmpHome = path.join(os.tmpdir(), `zara-del-${Date.now()}`);
  let store;

  before(() => { store = new MemoryStore(tmpHome); });
  after(() => { store.close(); fs.rmSync(tmpHome, { recursive: true }); });

  it('deletes semantic entry by key match', async () => {
    await store.learn('delete-me-key', 'some value', 'observed', 'fact');
    await store.learn('keep-me', 'other value', 'observed', 'fact');
    const result = await store.deleteByPattern('delete-me');
    assert.equal(result.semantic, 1);
    assert.equal((await store.recall('keep-me', 3, {})).length, 1);
  });

  it('deletes semantic entry by value match', async () => {
    await store.learn('test-val', 'unique-marker-xyz', 'observed', 'fact');
    const result = await store.deleteByPattern('unique-marker-xyz');
    assert.equal(result.semantic, 1);
  });

  it('deletes episodic by event content', async () => {
    store.recordEpisode('something with target-phrase happened', 'ok');
    const result = await store.deleteByPattern('target-phrase');
    assert.equal(result.episodic, 1);
  });

  it('does NOT delete unrelated entries', async () => {
    await store.learn('safe-entry', 'completely unrelated', 'observed', 'fact');
    await store.deleteByPattern('nonexistent-pattern');
    assert.equal((await store.recall('safe-entry', 3, {})).length, 1);
  });

  it('escapes SQL LIKE wildcards in pattern', async () => {
    await store.learn('normal-key', 'normal value', 'observed', 'fact');
    await store.learn('percent-key', 'has percent % char', 'observed', 'fact');
    // Pattern "%" should NOT match everything due to escapeLike
    const result = await store.deleteByPattern('%');
    // Should only match entries that literally contain %
    assert.ok(result.semantic <= 1);
    // normal-key should survive
    assert.equal((await store.recall('normal-key', 3, {})).length, 1);
  });

  it('refuses if pattern matches > 50 entries', async () => {
    // Use different types across entries to bypass same-type dedup, keys still match the pattern
    const types = ['fact', 'policy', 'workflow', 'pitfall', 'architecture', 'decision', 'preference'];
    for (let i = 0; i < 60; i++) {
      const t = types[i % types.length];
      await store.learn(`bulk-${i}`, `unique-val-${i}-${Math.random().toString(36)}`, 'observed', t);
    }
    const result = await store.deleteByPattern('bulk-');
    assert.ok(result.error, 'Should return error for broad pattern');
    assert.ok(result.total > 50);
    // Verify nothing was deleted
    const remaining = await store.recall('bulk-0', 3, {});
    assert.ok(remaining.length > 0);
  });
});
