import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../tools/memory-db.mjs';
import os from 'os';
import path from 'path';
import fs from 'fs';

describe('trust calibration', () => {
  const tmpHome = path.join(os.tmpdir(), `zara-trust-${Date.now()}`);
  let store;

  before(() => { store = new MemoryStore(tmpHome); });
  after(() => { store.close(); fs.rmSync(tmpHome, { recursive: true }); });

  it('success increases trust by 0.1', () => {
    store.learn('trust-s', 'kubernetes pod autoscaling horizontal metrics setup', 'observed', 'fact');
    store.adjustTrust(['trust-s'], 'success');
    const r = store.recall('trust-s', 1, {});
    assert.ok(r[0].trust_score > 0.5);
    assert.ok(Math.abs(r[0].trust_score - 0.6) < 0.01);
  });

  it('failure decreases trust by 0.15', () => {
    store.learn('trust-f', 'postgresql vacuum analyze table maintenance schedule', 'observed', 'fact');
    store.adjustTrust(['trust-f'], 'failure');
    const r = store.recall('trust-f', 1, {});
    assert.ok(r[0].trust_score < 0.5);
    assert.ok(Math.abs(r[0].trust_score - 0.35) < 0.01);
  });

  it('clamps at 1.0 ceiling', () => {
    store.learn('trust-max', 'redis cluster sharding consistent hashing algorithm', 'observed', 'fact');
    for (let i = 0; i < 10; i++) store.adjustTrust(['trust-max'], 'success');
    const r = store.recall('trust-max', 1, {});
    assert.ok(r[0].trust_score <= 1.0);
  });

  it('clamps at 0.2 floor', () => {
    store.learn('trust-min', 'graphql resolver batching dataloader pattern implementation', 'observed', 'fact');
    for (let i = 0; i < 10; i++) store.adjustTrust(['trust-min'], 'failure');
    const r = store.recall('trust-min', 1, {});
    assert.ok(r[0].trust_score >= 0.2);
  });

  it('higher trust ranks above lower trust in recall', () => {
    store.learn('high-trust', 'elasticsearch index mapping analysis tokenizer custom', 'observed', 'fact');
    store.learn('low-trust', 'elasticsearch query dsl bool must filter aggregation', 'observed', 'fact');
    for (let i = 0; i < 5; i++) store.adjustTrust(['high-trust'], 'success');
    for (let i = 0; i < 3; i++) store.adjustTrust(['low-trust'], 'failure');
    const results = store.recall('elasticsearch', 5, {});
    const highIdx = results.findIndex(r => r.key === 'high-trust');
    const lowIdx = results.findIndex(r => r.key === 'low-trust');
    assert.ok(highIdx >= 0 && lowIdx >= 0, 'Both entries should be found');
    assert.ok(highIdx < lowIdx, 'Higher trust should rank first');
  });
});
