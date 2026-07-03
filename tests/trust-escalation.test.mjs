import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../tools/memory-db.mjs';
import os from 'os';
import path from 'path';
import fs from 'fs';

describe('trust escalation', () => {
  const tmpHome = path.join(os.tmpdir(), `zara-trust-esc-${Date.now()}`);
  let store;

  before(() => { store = new MemoryStore(tmpHome); });
  after(() => { store.close(); fs.rmSync(tmpHome, { recursive: true }); });

  it('source ceiling: observed capped at 0.85', async () => {
    await store.learn('ceil-obs', 'observed memory ceiling enforcement test value', 'observed', 'fact');
    for (let i = 0; i < 10; i++) await store.adjustTrust(['ceil-obs'], 'success');
    const r = await store.recall('ceil-obs', 1, {});
    assert.ok(r[0].trust_score <= 0.85, `expected <= 0.85, got ${r[0].trust_score}`);
  });

  it('source ceiling: inferred capped at 0.7', async () => {
    const s2 = new MemoryStore(path.join(tmpHome, 'ceil2'));
    await s2.learn('ceil-inf', 'inferred memory ceiling enforcement test value', 'inferred', 'fact');
    for (let i = 0; i < 10; i++) await s2.adjustTrust(['ceil-inf'], 'success');
    const r = await s2.recall('ceil-inf', 1, {});
    assert.ok(r[0].trust_score <= 0.7, `expected <= 0.7, got ${r[0].trust_score}`);
    s2.close();
    fs.rmSync(path.join(tmpHome, 'ceil2'), { recursive: true });
  });

  it('trust decay subtracts per-type rate for 30+ day old memories', async () => {
    // Manually set accessed date to 35 days ago
    await store.learn('decay-fact', 'trust decay test fact value for aging', 'observed', 'fact');
    const past = new Date(Date.now() - 35 * 86400000).toISOString().split('T')[0];
    store.db.prepare('UPDATE semantic SET accessed = ?, updated = ? WHERE key = ?').run(past, past, 'decay-fact');
    // Set known trust_score
    store.db.prepare('UPDATE semantic SET trust_score = 0.6 WHERE key = ?').run('decay-fact');
    await store.applyDecay();
    const r = await store.recall('decay-fact', 1, {});
    // fact rate is 0.03, so 0.6 - 0.03 = 0.57
    assert.ok(Math.abs(r[0].trust_score - 0.57) < 0.01, `expected ~0.57, got ${r[0].trust_score}`);
  });

  it('user-reconfirms: re-learning with user_explicit boosts trust', async () => {
    const s3 = new MemoryStore(path.join(tmpHome, 'reconf'));
    await s3.learn('reconf-key', 'user reconfirm test value for trust boost', 'observed', 'fact');
    const before = s3.db.prepare('SELECT trust_score FROM semantic WHERE key = ?').get('reconf-key');
    await s3.learn('reconf-key', 'user reconfirm test value updated version', 'user_explicit', 'fact');
    const after2 = s3.db.prepare('SELECT trust_score FROM semantic WHERE key = ?').get('reconf-key');
    assert.ok(after2.trust_score > (before.trust_score ?? 0.5), `expected boost, got ${after2.trust_score}`);
    assert.ok(Math.abs(after2.trust_score - 0.65) < 0.01, `expected ~0.65, got ${after2.trust_score}`);
    s3.close();
    fs.rmSync(path.join(tmpHome, 'reconf'), { recursive: true });
  });

  it('budget cap: 6th adjustment in same hour is blocked', async () => {
    const s4 = new MemoryStore(path.join(tmpHome, 'budget'));
    const topics = ['kubernetes pod autoscaling', 'postgresql vacuum maintenance', 'redis cluster sharding', 'graphql resolver batching', 'elasticsearch index mapping', 'docker compose networking'];
    for (let i = 0; i < 6; i++) await s4.learn(`bud-${i}`, topics[i], 'observed', 'fact');
    for (let i = 0; i < 5; i++) {
      const r = await s4.adjustTrust([`bud-${i}`], 'success');
      assert.equal(r.adjusted, 1, `bud-${i} should adjust`);
    }
    const blocked = await s4.adjustTrust(['bud-5'], 'success');
    assert.equal(blocked.adjusted, 0);
    assert.equal(blocked.budgetExceeded, true);
    s4.close();
    fs.rmSync(path.join(tmpHome, 'budget'), { recursive: true });
  });

  it('policy/architecture types never trust-decay', async () => {
    await store.learn('nodecay-pol', 'policy memory should never decay trust score', 'user_explicit', 'policy');
    const past = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0];
    store.db.prepare('UPDATE semantic SET accessed = ?, updated = ?, trust_score = 0.8 WHERE key = ?').run(past, past, 'nodecay-pol');
    await store.applyDecay();
    const r = store.db.prepare('SELECT trust_score FROM semantic WHERE key = ?').get('nodecay-pol');
    assert.equal(r.trust_score, 0.8);
  });
});
