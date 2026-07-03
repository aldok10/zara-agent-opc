// Characterization tests for memory-db.mjs — lock CURRENT public-API behavior
// BEFORE the Batch 4 facade/module split. These pin the observable contract of:
//   - recallAsync        (hybrid FTS + vector fusion, token budget, type/scope filter)
//   - dreamConsolidate   (merge exact-normalized dupes + archive stale)
//   - adjustTrust        (trust escalation/decay math, source ceiling, budget cap)
//   - detectContradictions (near-similar same-type conflict flagging)
//
// They exercise ONLY the public surface (MemoryStore methods + exported fns),
// never the internal `_sqlite*` methods, so the refactor can move internals
// freely as long as these stay green.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { MemoryStore } from '../tools/memory-db.mjs';

// Deterministic embedder: "deploy" presence drives one axis. Lets us assert a
// stable semantic ranking in recallAsync without loading a real model.
class DeployEmbedder {
  embed(text) {
    const vec = new Float32Array(64).fill(0);
    const hasDeploy = text.toLowerCase().includes('deploy');
    vec[0] = hasDeploy ? 0.9 : 0.1;
    vec[1] = hasDeploy ? 0.1 : 0.9;
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map(v => v / mag);
  }
  cosineSim(a, b) { return a.reduce((s, v, i) => s + v * b[i], 0); }
}

describe('memory-db characterization (pre-refactor contract)', () => {
  const homes = [];
  function freshStore(embedder) {
    const home = path.join(os.tmpdir(), `zara-char-${process.hrtime.bigint()}`);
    homes.push(home);
    const store = new MemoryStore(home, embedder);
    void store.db; // trigger init
    return store;
  }
  after(() => {
    for (const h of homes) { try { fs.rmSync(h, { recursive: true, force: true }); } catch {} }
  });

  // --- recallAsync (hybrid fusion) ---

  describe('recallAsync', () => {
    it('re-ranks by semantic similarity (deploy fact wins)', async () => {
      const store = freshStore(new DeployEmbedder());
      await store.learn('k8s.pods', 'kubernetes pod scaling strategy', 'observed', 'fact', '');
      await store.learn('k8s.deploy', 'kubernetes deployment rollout process', 'observed', 'fact', '');
      await store.learn('k8s.svc', 'kubernetes service mesh configuration', 'observed', 'fact', '');
      const results = await store.recallAsync('kubernetes deployment', 5);
      assert.ok(results.length > 0, 'returns results');
      assert.equal(results[0].key, 'k8s.deploy', 'deploy fact ranks first');
      store.close();
    });

    it('honors the type filter (only matching type returned)', async () => {
      const store = freshStore(new DeployEmbedder());
      await store.learn('a.fact', 'kubernetes deploy pipeline note', 'observed', 'fact', '');
      await store.learn('b.pref', 'kubernetes deploy preference note', 'observed', 'preference', '');
      const typed = await store.recallAsync('kubernetes deploy', 5, { type: 'fact' });
      assert.ok(typed.length > 0, 'returns results');
      assert.ok(typed.every(r => r.type === 'fact'), 'all results are type=fact');
      store.close();
    });

    it('applies a token budget by trimming low-ranked results', async () => {
      const store = freshStore(new DeployEmbedder());
      await store.learn('tb.one', 'kubernetes deployment alpha entry text', 'observed', 'fact', '');
      await store.learn('tb.two', 'kubernetes deployment beta entry text', 'observed', 'fact', '');
      const full = await store.recallAsync('kubernetes deployment', 5);
      const budgeted = await store.recallAsync('kubernetes deployment', 5, { tokenBudget: 5 });
      assert.ok(budgeted.length <= full.length, 'budget never increases result count');
      // A 5-token budget is smaller than any single ~9-word entry → yields none.
      assert.equal(budgeted.length, 0, 'tiny budget trims everything');
      store.close();
    });

    it('falls back to sync recall when the embedder throws', async () => {
      class FlakyEmbedder {
        #n = 0; #failAfter;
        constructor(failAfter) { this.#failAfter = failAfter; }
        embed(text) {
          this.#n++;
          if (this.#n > this.#failAfter) throw new Error('embedder unavailable');
          return new Float32Array(64).fill(1 / Math.sqrt(64));
        }
        cosineSim(a, b) { return a.reduce((s, v, i) => s + v * b[i], 0); }
      }
      const seed = freshStore(new FlakyEmbedder(50));
      await seed.learn('fallback.fact', 'short', 'observed', 'fact', '');
      seed.close();
      // Reuse same home, embedder fails immediately → recallAsync degrades to sync.
      const store = new MemoryStore(homes[homes.length - 1], new FlakyEmbedder(0));
      void store.db;
      const results = await store.recallAsync('fallback', 5);
      assert.ok(results.some(r => r.key === 'fallback.fact'), 'sync fallback still finds the entry');
      store.close();
    });
  });

  // --- dreamConsolidate (merge dupes + archive stale) ---

  describe('dreamConsolidate', () => {
    it('merges exact-normalized duplicate values into one survivor', async () => {
      const store = freshStore();
      // Values <= 10 chars skip the learn-time dedup, so both rows persist and
      // the dreamer merge is what collapses them.
      await store.learn('dup.one', 'short val', 'observed', 'fact', '');
      await store.learn('dup.two', 'short val', 'observed', 'fact', '');
      assert.equal(await store.semanticCount(), 2, 'both dupes persisted before dream');
      const res = await store.dreamConsolidate();
      assert.equal(res.merged, 1, 'exactly one merge');
      assert.equal(res.archived, 0, 'nothing stale to archive');
      assert.equal(await store.semanticCount(), 1, 'one survivor remains');
      store.close();
    });

    it('returns the {merged, archived, reinforced} shape', async () => {
      const store = freshStore();
      const res = await store.dreamConsolidate();
      assert.deepEqual(Object.keys(res).sort(), ['archived', 'merged', 'reinforced']);
      store.close();
    });
  });

  // --- adjustTrust (escalation/decay math) ---

  describe('adjustTrust', () => {
    it('adds +0.1 on success and -0.15 on failure', async () => {
      const store = freshStore();
      await store.learn('tm', 'completely unique trust calibration sentence alpha', 'observed', 'fact', '');
      const start = store.db.prepare('SELECT trust_score FROM semantic WHERE key=?').get('tm').trust_score;
      assert.equal(start, 0.5, 'default trust starts at 0.5');
      const ok = await store.adjustTrust(['tm'], 'success');
      assert.deepEqual(ok, { adjusted: 1, delta: 0.1 });
      assert.ok(Math.abs(store.db.prepare('SELECT trust_score FROM semantic WHERE key=?').get('tm').trust_score - 0.6) < 1e-9);
      await store.adjustTrust(['tm'], 'failure');
      assert.ok(Math.abs(store.db.prepare('SELECT trust_score FROM semantic WHERE key=?').get('tm').trust_score - 0.45) < 1e-9);
      store.close();
    });

    it('is a no-op for neutral outcome and empty key list', async () => {
      const store = freshStore();
      await store.learn('n', 'neutral outcome unique entry text here', 'observed', 'fact', '');
      assert.deepEqual(await store.adjustTrust(['n'], 'neutral'), { adjusted: 0 });
      assert.deepEqual(await store.adjustTrust([], 'success'), { adjusted: 0 });
      store.close();
    });

    it('caps at the observed source ceiling (0.85) and floors at 0.2', async () => {
      const store = freshStore();
      await store.learn('ceil', 'unique ceiling observed source entry text', 'observed', 'fact', '');
      for (let i = 0; i < 10; i++) await store.adjustTrust(['ceil'], 'success');
      assert.equal(store.db.prepare('SELECT trust_score FROM semantic WHERE key=?').get('ceil').trust_score, 0.85);

      await store.learn('floor', 'unique floor observed entry sentence beta', 'observed', 'fact', '');
      for (let i = 0; i < 10; i++) await store.adjustTrust(['floor'], 'failure');
      assert.equal(store.db.prepare('SELECT trust_score FROM semantic WHERE key=?').get('floor').trust_score, 0.2);
      store.close();
    });

    it('blocks positive adjustments past the per-session budget of 5', async () => {
      const store = freshStore();
      for (let i = 0; i < 6; i++) await store.learn(`bud-${i}`, `budget entry number ${i} unique text`, 'observed', 'fact', '');
      for (let i = 0; i < 5; i++) {
        const r = await store.adjustTrust([`bud-${i}`], 'success');
        assert.equal(r.adjusted, 1, `adjustment ${i} allowed`);
      }
      const blocked = await store.adjustTrust(['bud-5'], 'success');
      assert.deepEqual(blocked, { adjusted: 0, budgetExceeded: true });
      store.close();
    });
  });

  // --- detectContradictions (sync near-similar flagging) ---

  describe('detectContradictions', () => {
    it('flags similar-but-not-identical same-type memories', async () => {
      const store = freshStore();
      await store.learn('code.tabs', 'the codebase follows a strict tabs-only indentation policy', 'user_explicit', 'preference');
      await store.learn('code.spaces', 'all code must use four-space indentation without exception', 'user_explicit', 'preference');
      const flagged = store.detectContradictions(0.5);
      const pair = flagged.find(f =>
        (f.a === 'code.tabs' && f.b === 'code.spaces') ||
        (f.a === 'code.spaces' && f.b === 'code.tabs'));
      assert.ok(pair, 'flags the tabs/spaces conflict');
      assert.equal(pair.type, 'preference');
      assert.ok(typeof pair.sim === 'number' && pair.sim >= 0.5, 'reports similarity');
      assert.ok('trust_a' in pair && 'trust_b' in pair, 'includes both trust scores');
      store.close();
    });

    it('does not flag identical values (merge candidates, not conflicts)', async () => {
      const store = freshStore();
      await store.learn('id.one', 'always run tests before committing', 'observed', 'policy');
      await store.learn('id.two', 'always run tests before committing', 'observed', 'policy');
      const flagged = store.detectContradictions(0.8);
      assert.ok(!flagged.some(f =>
        (f.a === 'id.one' && f.b === 'id.two') || (f.a === 'id.two' && f.b === 'id.one')));
      store.close();
    });

    it('does not flag across different types', async () => {
      const store = freshStore();
      await store.learn('t.fact', 'the service runs on port 8080', 'observed', 'fact');
      await store.learn('t.policy', 'the service runs on port 9090', 'observed', 'policy');
      const flagged = store.detectContradictions(0.7);
      assert.ok(!flagged.some(f =>
        (f.a === 't.fact' && f.b === 't.policy') || (f.a === 't.policy' && f.b === 't.fact')));
      store.close();
    });

    it('ignores seeded knowledge entries (knowledge./kb_ prefixes)', async () => {
      const store = freshStore();
      await store.learn('knowledge.dp.strategy', 'strategy pattern swaps algorithms', 'observed', 'architecture');
      await store.learn('knowledge.dp.state', 'strategy pattern swaps algorithm behavior', 'observed', 'architecture');
      const flagged = store.detectContradictions(0.7);
      assert.ok(!flagged.some(f => f.a.startsWith('knowledge.') || f.b.startsWith('knowledge.')));
      store.close();
    });
  });
});
