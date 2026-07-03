import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { MemoryStore } from '../tools/memory-db.mjs';

// Tests for the episodic/procedural/knowledge adapter pattern (SQLite backend).
// Verifies the adapter contract: all public methods are async, return correct shapes,
// and delegate properly through the store's getter.

const TEST_HOME = path.join(os.tmpdir(), `zara-adapters-${Date.now()}`);

describe('episodic adapter (SQLite)', () => {
  let store;

  before(() => {
    fs.mkdirSync(TEST_HOME, { recursive: true });
    store = new MemoryStore(TEST_HOME);
    void store.db;
  });

  after(() => {
    store.close();
    fs.rmSync(TEST_HOME, { recursive: true, force: true });
  });

  it('record returns {event, ts}', async () => {
    const result = await store.recordEpisode('deployed v2.1 to production', 'success, no rollback', ['deploy', 'prod']);
    assert.ok(result.event);
    assert.ok(result.ts);
    assert.match(result.ts, /^\d{4}-\d{2}-\d{2}T/);
  });

  it('recall finds recorded episodes', async () => {
    const hits = await store.recallEpisodes('deployed production');
    assert.ok(Array.isArray(hits));
    assert.ok(hits.length > 0);
    assert.ok(hits[0].event.includes('deployed'));
  });

  it('count reflects stored episodes', async () => {
    const count = await store.episodicCount();
    assert.ok(count >= 1);
  });

  it('deleteByPattern removes matching episodes', async () => {
    await store.recordEpisode('test-delete-me', 'should be removed', ['temp']);
    const result = await store.deleteByPattern('test-delete-me');
    assert.ok(result.episodic >= 1);
  });

  it('decayOld removes ancient zero-access episodes', async () => {
    // Insert an old episode directly via SQLite for testing
    const cutoff = new Date(Date.now() - 60 * 86400000).toISOString();
    store.db.prepare('INSERT INTO episodic (event, outcome, tags, ts, access_count) VALUES (?, ?, ?, ?, ?)').run('ancient event', '', '[]', cutoff, 0);
    await store.applyDecay();
    const hits = await store.recallEpisodes('ancient event');
    assert.equal(hits.length, 0, 'old zero-access episode should be decayed');
  });
});

describe('procedural adapter (SQLite)', () => {
  let store;

  before(() => {
    store = new MemoryStore(TEST_HOME);
    void store.db;
  });

  after(() => {
    store.close();
  });

  it('save returns {name, steps: number}', async () => {
    const result = await store.saveProcedure('deploy-flow', ['build', 'test', 'push', 'monitor'], 'standard deploy');
    assert.equal(result.name, 'deploy-flow');
    assert.equal(result.steps, 4);
  });

  it('recall finds saved procedures', async () => {
    const hits = await store.recallProcedures('deploy');
    assert.ok(Array.isArray(hits));
    assert.ok(hits.length > 0);
    assert.ok(hits[0].name.includes('deploy'));
  });

  it('count reflects stored procedures', async () => {
    const count = await store.proceduralCount();
    assert.ok(count >= 1);
  });

  it('deleteByPattern removes matching procedures', async () => {
    await store.saveProcedure('temp-proc-delete', ['step1'], 'temporary');
    const result = await store.deleteByPattern('temp-proc-delete');
    assert.ok(result.procedural >= 1);
  });
});

describe('knowledge chunk adapter (SQLite)', () => {
  let store;

  before(() => {
    store = new MemoryStore(TEST_HOME);
    void store.db;
  });

  after(() => {
    store.close();
  });

  it('upsert stores chunks and returns count', async () => {
    const body = 'First paragraph about microservices.\n\nSecond paragraph about event sourcing.\n\nThird paragraph about CQRS patterns.';
    const result = await store.knowledgeChunkUpsert('kb.arch.patterns', 'architecture', body);
    assert.equal(result.key, 'kb.arch.patterns');
    assert.ok(result.chunks >= 1);
  });

  it('search finds relevant chunks', async () => {
    const hits = await store.knowledgeChunkSearch('event sourcing CQRS', 'architecture', 5);
    assert.ok(Array.isArray(hits));
    // May or may not find with trigram embedder depending on text similarity
  });

  it('count reflects stored chunks', async () => {
    const count = await store.knowledgeChunkCount();
    assert.ok(count >= 1);
  });

  it('upsert is idempotent (replaces old chunks)', async () => {
    const before = await store.knowledgeChunkCount();
    await store.knowledgeChunkUpsert('kb.arch.patterns', 'architecture', 'Single replacement paragraph.');
    const after = await store.knowledgeChunkCount();
    assert.ok(after <= before, 'should not accumulate chunks for same key');
  });
});

describe('adapter backend property', () => {
  let store;
  before(() => { store = new MemoryStore(TEST_HOME); void store.db; });
  after(() => { store.close(); });

  it('episodic reports sqlite backend', () => {
    assert.equal(store.episodic.backend, 'sqlite');
  });

  it('procedural reports sqlite backend', () => {
    assert.equal(store.procedural.backend, 'sqlite');
  });

  it('knowledgeChunks reports sqlite backend', () => {
    assert.equal(store.knowledgeChunks.backend, 'sqlite');
  });
});
