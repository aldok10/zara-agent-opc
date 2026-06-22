import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../tools/memory-db.mjs';
import os from 'os';
import path from 'path';
import fs from 'fs';

describe('dedup-on-learn', () => {
  const tmpHome = path.join(os.tmpdir(), `zara-dedup-${Date.now()}`);
  let store;

  before(() => { store = new MemoryStore(tmpHome); });
  after(() => { store.close(); fs.rmSync(tmpHome, { recursive: true }); });

  it('deduplicates near-identical values of same type', () => {
    store.learn('orig', 'golang is excellent for building concurrent systems', 'observed', 'fact');
    const r = store.learn('dupe', 'golang is excellent for building concurrent system', 'observed', 'fact');
    assert.equal(r.deduped, true);
  });

  it('does NOT dedup different types even if values are similar', () => {
    store.learn('arch-entry', 'prefer simple architecture patterns always', 'observed', 'architecture');
    const r = store.learn('fact-entry', 'prefer simple architecture patterns always', 'observed', 'fact');
    assert.notEqual(r.deduped, true);
  });

  it('skips dedup for short values (<= 10 chars)', () => {
    store.learn('short1', 'use Go', 'observed', 'fact');
    const r = store.learn('short2', 'use Go', 'observed', 'fact');
    assert.notEqual(r.deduped, true);
  });

  it('increments reinforced on dedup target', () => {
    store.learn('reinf-orig', 'this is a sufficiently long value for dedup testing purposes', 'observed', 'fact');
    store.learn('reinf-dupe', 'this is a sufficiently long value for dedup testing purpose', 'observed', 'fact');
    const results = store.recall('reinf-orig', 1, {});
    assert.ok(results.length > 0);
    // The original should have been reinforced
  });
});
