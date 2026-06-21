import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { MemoryStore } from '../tools/memory-db.mjs';

const TEST_HOME = path.join(os.tmpdir(), `zara-upgrades-${Date.now()}`);

describe('memory-db upgrades', () => {
  let store;

  before(() => {
    fs.mkdirSync(TEST_HOME, { recursive: true });
    store = new MemoryStore(TEST_HOME);
    store.db; // trigger init
  });

  after(() => {
    store.close();
    fs.rmSync(TEST_HOME, { recursive: true, force: true });
  });

  describe('knowledge chunking', () => {
    it('splits a body into passages on paragraph boundaries', () => {
      const body = Array.from({ length: 10 }, (_, i) =>
        `Paragraph ${i} ` + 'word '.repeat(50)
      ).join('\n\n');
      const chunks = store.chunkText(body, 220);
      assert.ok(chunks.length >= 2, 'should produce multiple chunks');
      assert.ok(chunks.every(c => c.length > 0));
    });

    it('returns empty for empty body', () => {
      assert.deepEqual(store.chunkText(''), []);
      assert.deepEqual(store.chunkText(null), []);
    });

    it('stores and retrieves passages by cosine similarity', () => {
      // Long paragraphs so each exceeds the word budget and becomes its own chunk
      const pad = (s) => s + ' ' + 'filler context detail example note '.repeat(45);
      const body = [
        pad('The strategy pattern lets you swap algorithms at runtime behind a common interface.'),
        pad('Saga pattern handles distributed transactions through compensating actions when a step fails partway.'),
        pad('Circuit breakers stop cascading failures by short-circuiting calls to a failing dependency.'),
      ].join('\n\n');
      const res = store.knowledgeChunkUpsert('kb.test.patterns', 'design-patterns', body);
      assert.equal(res.chunks, 3);
      assert.equal(store.knowledgeChunkCount(), 3);

      const hits = store.knowledgeChunkSearch('compensating distributed transaction failure', '', 3);
      assert.ok(hits.length > 0, 'should find matching passage');
      assert.match(hits[0].text.toLowerCase(), /saga|compensating/);
    });

    it('upsert replaces existing chunks for a key (idempotent)', () => {
      const before = store.knowledgeChunkCount();
      store.knowledgeChunkUpsert('kb.test.patterns', 'design-patterns', 'One single short paragraph now.');
      const after = store.knowledgeChunkCount();
      assert.equal(after, before - 2, 'should drop the 3 old chunks and add 1');
    });

    it('section filter restricts search candidates', () => {
      store.knowledgeChunkUpsert('kb.test.arch', 'architecture', 'Hexagonal architecture isolates the domain from infrastructure adapters.');
      const inSection = store.knowledgeChunkSearch('hexagonal domain adapters', 'architecture', 5);
      assert.ok(inSection.every(r => r.section === 'architecture'));
      const wrongSection = store.knowledgeChunkSearch('hexagonal domain adapters', 'testing', 5);
      assert.equal(wrongSection.length, 0);
    });
  });

  describe('adaptive-depth recall', () => {
    it('widens to trigram results when FTS top hit is weak', () => {
      // Seed a fact whose value shares no exact tokens with the query phrasing,
      // so FTS is weak/empty but trigram similarity can still surface it.
      store.learn('infra.queue.broker', 'message broker uses RabbitMQ for async job dispatch', 'observed', 'architecture');
      // Query with morphological variants ("brokering", "dispatching") that FTS
      // exact-token match misses but trigrams catch.
      const res = store.recall('brokering async dispatching', 10);
      assert.ok(Array.isArray(res), 'returns an array');
      // Should not throw and should still find the related entry via widening
      const hit = res.find(r => r.key === 'infra.queue.broker');
      assert.ok(hit, 'adaptive widening should surface the trigram-similar entry');
    });

    it('does not duplicate keys when widening', () => {
      store.learn('dedup.check.entry', 'kubernetes pod autoscaling horizontal metrics', 'observed', 'fact');
      const res = store.recall('kubernetes autoscaling', 10);
      const keys = res.map(r => r.key);
      assert.equal(keys.length, new Set(keys).size, 'no duplicate keys in results');
    });
  });

  describe('contradiction detection', () => {
    it('flags two same-type memories that are similar but not identical', () => {
      store.learn('user.database.primary', 'the user prefers PostgreSQL for the main datastore', 'user_explicit', 'preference');
      store.learn('user.datastore.main', 'the user prefers MySQL for the main datastore', 'user_explicit', 'preference');
      const flagged = store.detectContradictions(0.5);
      const pair = flagged.find(f =>
        (f.a === 'user.database.primary' && f.b === 'user.datastore.main') ||
        (f.a === 'user.datastore.main' && f.b === 'user.database.primary')
      );
      assert.ok(pair, 'should flag the postgres/mysql preference conflict');
      assert.equal(pair.type, 'preference');
    });

    it('does not flag identical values (those are merge candidates, not conflicts)', () => {
      store.learn('dup.one', 'always run tests before committing', 'observed', 'policy');
      store.learn('dup.two', 'always run tests before committing', 'observed', 'policy');
      const flagged = store.detectContradictions(0.8);
      assert.ok(!flagged.some(f =>
        (f.a === 'dup.one' && f.b === 'dup.two') || (f.a === 'dup.two' && f.b === 'dup.one')
      ));
    });

    it('does not flag different types as contradicting', () => {
      store.learn('fact.x', 'the service runs on port 8080', 'observed', 'fact');
      store.learn('policy.x', 'the service runs on port 9090', 'observed', 'policy');
      const flagged = store.detectContradictions(0.7);
      assert.ok(!flagged.some(f =>
        (f.a === 'fact.x' && f.b === 'policy.x') || (f.a === 'policy.x' && f.b === 'fact.x')
      ));
    });

    it('ignores seeded knowledge entries', () => {
      store.learn('knowledge.design-patterns.strategy', 'strategy pattern swaps algorithms', 'user_explicit', 'architecture');
      store.learn('knowledge.design-patterns.state', 'strategy pattern swaps algorithms behavior', 'user_explicit', 'architecture');
      const flagged = store.detectContradictions(0.7);
      assert.ok(!flagged.some(f => f.a.startsWith('knowledge.') || f.b.startsWith('knowledge.')));
    });
  });
});
