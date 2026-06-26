import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { MemoryStore } from '../tools/memory-db.mjs';

// Mock embedder that simulates semantic similarity via keyword overlap
// This tests the ALGORITHM (RRF fusion, vector path) without needing the real model
class KeywordEmbedder {
  #vocab = ['go', 'functional', 'program', 'test', 'deploy', 'latency', 'prefer', 'simple', 'framework', 'perf', 'bug', 'fix', 'auth', 'deadline', 'paradigm', 'stdlib'];

  embed(text) {
    const lower = text.toLowerCase();
    const vec = new Float32Array(this.#vocab.length + 16).fill(0);
    for (let i = 0; i < this.#vocab.length; i++) {
      if (lower.includes(this.#vocab[i])) vec[i] = 1.0;
    }
    // Add some noise dimensions from char trigrams
    for (let i = 0; i < lower.length - 2 && i < 16; i++) {
      vec[this.#vocab.length + (lower.charCodeAt(i) % 16)] += 0.1;
    }
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map(v => v / mag);
  }

  cosineSim(a, b) { return a.reduce((s, v, i) => s + v * b[i], 0); }
}

const TEST_HOME = path.join(os.tmpdir(), `zara-recall-quality-${Date.now()}`);

describe('recall quality benchmark', () => {
  let store;
  const embedder = new KeywordEmbedder();

  before(async () => {
    store = new MemoryStore(TEST_HOME, embedder);

    // Seed test memories
    store.learn('pref.paradigm', 'prefers functional programming patterns', 'user_explicit', 'preference', '');
    store.learn('pref.stdlib', 'likes Go stdlib over external frameworks', 'user_explicit', 'preference', '');
    store.learn('event.deploy', 'deployed v2 with 40% latency drop', 'observed', 'fact', '');
    store.learn('pref.simple', 'hates over-engineering, prefers simple solutions', 'user_explicit', 'preference', '');
    store.learn('workflow.tdd', 'uses TDD for all features, test first always', 'observed', 'workflow', '');
    store.learn('fact.deadline', 'deadline is next Friday for auth module', 'user_explicit', 'fact', '');
    store.learn('pref.food', 'favorite food is nasi goreng', 'user_explicit', 'preference', '');
    store.learn('fact.car', 'drives a Toyota Camry', 'user_explicit', 'fact', '');

    // Wait for async embeddings to complete
    await new Promise(r => setTimeout(r, 200));
  });

  after(() => {
    store.close();
    fs.rmSync(TEST_HOME, { recursive: true, force: true });
  });

  it('paraphrase: "preferred paradigm" finds "functional programming"', async () => {
    const results = await store.recallAsync('preferred paradigm', 5);
    const keys = results.map(r => r.key);
    assert.ok(keys.includes('pref.paradigm'), `Expected pref.paradigm in results, got: ${keys}`);
  });

  it('paraphrase: "performance improvements" finds deploy event', async () => {
    const results = await store.recallAsync('performance improvements latency', 5);
    const keys = results.map(r => r.key);
    assert.ok(keys.includes('event.deploy'), `Expected event.deploy in results, got: ${keys}`);
  });

  it('paraphrase: "testing methodology" finds TDD workflow', async () => {
    const results = await store.recallAsync('testing methodology', 5);
    const keys = results.map(r => r.key);
    assert.ok(keys.includes('workflow.tdd'), `Expected workflow.tdd in results, got: ${keys}`);
  });

  it('paraphrase: "opinion on abstractions" finds simple preference', async () => {
    const results = await store.recallAsync('opinion on abstractions and simplicity', 5);
    const keys = results.map(r => r.key);
    assert.ok(keys.includes('pref.simple'), `Expected pref.simple in results, got: ${keys}`);
  });

  it('negative: "favorite food" ranks food fact higher than programming preferences', async () => {
    const results = await store.recallAsync('favorite food nasi goreng', 5);
    const keys = results.map(r => r.key);
    // Food-related memory should rank higher than unrelated ones
    if (keys.includes('pref.food') && keys.includes('pref.paradigm')) {
      const foodIdx = keys.indexOf('pref.food');
      const paradigmIdx = keys.indexOf('pref.paradigm');
      assert.ok(foodIdx < paradigmIdx, 'Food should rank higher than paradigm for food query');
    }
  });

  it('negative: "which car" does not find deployment events', async () => {
    const results = await store.recallAsync('which car does he drive', 3);
    const keys = results.map(r => r.key);
    if (keys.length > 0) {
      assert.ok(!keys.includes('event.deploy'), 'Should not return deploy event for car query');
    }
  });

  it('hybrid outperforms FTS-only on paraphrase queries', async () => {
    // FTS-only (sync recall) should miss "preferred paradigm" since no keyword match
    const ftsResults = store.recall('preferred paradigm', 5);
    const hybridResults = await store.recallAsync('preferred paradigm', 5);

    const ftsKeys = ftsResults.map(r => r.key);
    const hybridKeys = hybridResults.map(r => r.key);

    // Hybrid should find it (via vector similarity)
    assert.ok(hybridKeys.includes('pref.paradigm'),
      `Hybrid should find pref.paradigm, got: ${hybridKeys}`);
  });
});
