import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DatabaseSync } from 'node:sqlite';
import { MemoryStore } from '../tools/memory-db.mjs';

const TEST_HOME = path.join(os.tmpdir(), `zara-test-${Date.now()}`);
fs.mkdirSync(TEST_HOME, { recursive: true });
const dbPath = path.join(TEST_HOME, 'memory.db');

describe('memory-db', () => {
  let db;

  before(() => {
    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode=WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS semantic (
        key TEXT PRIMARY KEY, value TEXT NOT NULL, confidence REAL DEFAULT 0.8,
        source TEXT DEFAULT 'observed', type TEXT DEFAULT 'fact', scope TEXT DEFAULT '',
        created TEXT NOT NULL, updated TEXT NOT NULL, accessed TEXT,
        access_count INTEGER DEFAULT 0, reinforced INTEGER DEFAULT 1, decay_score REAL DEFAULT 1.0
      );
      CREATE TABLE IF NOT EXISTS episodic (
        id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, outcome TEXT DEFAULT '',
        tags TEXT DEFAULT '[]', ts TEXT NOT NULL, accessed TEXT, access_count INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS procedural (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, context TEXT DEFAULT '',
        steps TEXT NOT NULL, uses INTEGER DEFAULT 0, created TEXT NOT NULL, updated TEXT NOT NULL
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS semantic_fts USING fts5(key, value, content=semantic, content_rowid=rowid);
      CREATE VIRTUAL TABLE IF NOT EXISTS episodic_fts USING fts5(event, outcome, tags, content=episodic, content_rowid=id);
      CREATE VIRTUAL TABLE IF NOT EXISTS procedural_fts USING fts5(name, context, steps, content=procedural, content_rowid=id);
      CREATE TRIGGER IF NOT EXISTS semantic_ai AFTER INSERT ON semantic BEGIN INSERT INTO semantic_fts(rowid, key, value) VALUES (new.rowid, new.key, new.value); END;
      CREATE TRIGGER IF NOT EXISTS semantic_ad AFTER DELETE ON semantic BEGIN INSERT INTO semantic_fts(semantic_fts, rowid, key, value) VALUES('delete', old.rowid, old.key, old.value); END;
      CREATE TRIGGER IF NOT EXISTS semantic_au AFTER UPDATE ON semantic BEGIN INSERT INTO semantic_fts(semantic_fts, rowid, key, value) VALUES('delete', old.rowid, old.key, old.value); INSERT INTO semantic_fts(rowid, key, value) VALUES (new.rowid, new.key, new.value); END;
      CREATE TRIGGER IF NOT EXISTS episodic_ai AFTER INSERT ON episodic BEGIN INSERT INTO episodic_fts(rowid, event, outcome, tags) VALUES (new.id, new.event, new.outcome, new.tags); END;
      CREATE TRIGGER IF NOT EXISTS procedural_ai AFTER INSERT ON procedural BEGIN INSERT INTO procedural_fts(rowid, name, context, steps) VALUES (new.id, new.name, new.context, new.steps); END;
    `);
  });

  after(() => {
    db.close();
    fs.rmSync(TEST_HOME, { recursive: true, force: true });
  });

  describe('semantic layer', () => {
    it('inserts and retrieves a fact', () => {
      const now = new Date().toISOString().split('T')[0];
      db.prepare('INSERT INTO semantic (key, value, confidence, source, type, scope, created, updated, reinforced, decay_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('user_name', 'Aldo', 1.0, 'user_explicit', 'preference', '', now, now, 1, 1.0);
      const row = db.prepare('SELECT * FROM semantic WHERE key = ?').get('user_name');
      assert.equal(row.value, 'Aldo');
      assert.equal(row.type, 'preference');
      assert.equal(row.confidence, 1.0);
    });

    it('FTS search finds matching memories', () => {
      const results = db.prepare("SELECT key, value FROM semantic_fts WHERE semantic_fts MATCH ? LIMIT 5").all('"Aldo"');
      assert.ok(results.length > 0);
      assert.equal(results[0].key, 'user_name');
    });

    it('reinforces existing key on update', () => {
      const now = new Date().toISOString().split('T')[0];
      db.prepare('UPDATE semantic SET reinforced = reinforced + 1, updated = ? WHERE key = ?').run(now, 'user_name');
      const row = db.prepare('SELECT reinforced FROM semantic WHERE key = ?').get('user_name');
      assert.equal(row.reinforced, 2);
    });

    it('type validation accepts valid types', () => {
      const now = new Date().toISOString().split('T')[0];
      for (const type of ['policy', 'workflow', 'pitfall', 'architecture', 'decision', 'preference', 'fact']) {
        db.prepare('INSERT OR REPLACE INTO semantic (key, value, type, created, updated) VALUES (?, ?, ?, ?, ?)').run(`type_${type}`, 'test', type, now, now);
      }
      const count = db.prepare("SELECT COUNT(*) as n FROM semantic WHERE key LIKE 'type_%'").get().n;
      assert.equal(count, 7);
    });

    it('decay_score affects ordering', () => {
      const now = new Date().toISOString().split('T')[0];
      db.prepare('INSERT INTO semantic (key, value, created, updated, decay_score) VALUES (?, ?, ?, ?, ?)').run('fresh', 'new item', now, now, 1.0);
      db.prepare('INSERT INTO semantic (key, value, created, updated, decay_score) VALUES (?, ?, ?, ?, ?)').run('stale', 'old item', now, now, 0.1);
      const results = db.prepare('SELECT key FROM semantic WHERE key IN (?, ?) ORDER BY decay_score DESC').all('fresh', 'stale');
      assert.equal(results[0].key, 'fresh');
    });
  });

  describe('episodic layer', () => {
    it('records and recalls episodes', () => {
      const ts = new Date().toISOString();
      db.prepare('INSERT INTO episodic (event, outcome, tags, ts) VALUES (?, ?, ?, ?)').run('deployed v2 to production', 'success, zero downtime', '["deploy","prod"]', ts);
      const row = db.prepare('SELECT * FROM episodic WHERE event LIKE ?').get('%deployed%');
      assert.equal(row.outcome, 'success, zero downtime');
      assert.deepEqual(JSON.parse(row.tags), ['deploy', 'prod']);
    });

    it('FTS search finds episodes', () => {
      const results = db.prepare("SELECT event FROM episodic_fts WHERE episodic_fts MATCH ? LIMIT 5").all('"deployed"');
      assert.ok(results.length > 0);
    });
  });

  describe('procedural layer', () => {
    it('saves and recalls procedures', () => {
      const now = new Date().toISOString().split('T')[0];
      db.prepare('INSERT INTO procedural (name, context, steps, uses, created, updated) VALUES (?, ?, ?, ?, ?, ?)').run('deploy-flow', 'when deploying to prod', '["build","test","push","verify"]', 0, now, now);
      const row = db.prepare('SELECT * FROM procedural WHERE name = ?').get('deploy-flow');
      assert.equal(row.name, 'deploy-flow');
      assert.deepEqual(JSON.parse(row.steps), ['build', 'test', 'push', 'verify']);
    });

    it('FTS search finds procedures', () => {
      const results = db.prepare("SELECT name FROM procedural_fts WHERE procedural_fts MATCH ? LIMIT 5").all('"deploy"');
      assert.ok(results.length > 0);
    });
  });
});

// --- Memory Provenance (agent + grounded) ---

// Build a pre-provenance "old schema" semantic DB at the given home dir,
// matching the canonical schema BEFORE agent/grounded columns existed.
// Returns the home dir path. Caller triggers migration by opening a MemoryStore.
function buildOldSchemaDb(home, rows = []) {
  fs.mkdirSync(home, { recursive: true });
  const p = path.join(home, 'memory.db');
  const old = new DatabaseSync(p);
  old.exec('PRAGMA journal_mode=WAL');
  old.exec(`
    CREATE TABLE semantic (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, confidence REAL DEFAULT 0.8,
      source TEXT DEFAULT 'observed', type TEXT DEFAULT 'fact', scope TEXT DEFAULT '',
      created TEXT NOT NULL, updated TEXT NOT NULL, accessed TEXT,
      access_count INTEGER DEFAULT 0, reinforced INTEGER DEFAULT 1, decay_score REAL DEFAULT 1.0,
      trust_score REAL DEFAULT 0.5
    );
    CREATE VIRTUAL TABLE semantic_fts USING fts5(key, value, content=semantic, content_rowid=rowid);
    CREATE TRIGGER semantic_ai AFTER INSERT ON semantic BEGIN INSERT INTO semantic_fts(rowid, key, value) VALUES (new.rowid, new.key, new.value); END;
    CREATE TRIGGER semantic_ad AFTER DELETE ON semantic BEGIN INSERT INTO semantic_fts(semantic_fts, rowid, key, value) VALUES('delete', old.rowid, old.key, old.value); END;
    CREATE TRIGGER semantic_au AFTER UPDATE ON semantic BEGIN INSERT INTO semantic_fts(semantic_fts, rowid, key, value) VALUES('delete', old.rowid, old.key, old.value); INSERT INTO semantic_fts(rowid, key, value) VALUES (new.rowid, new.key, new.value); END;
  `);
  const now = new Date().toISOString().split('T')[0];
  const stmt = old.prepare('INSERT INTO semantic (key, value, confidence, source, type, scope, created, updated, reinforced, decay_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const r of rows) stmt.run(r.key, r.value, r.confidence ?? 0.8, r.source ?? 'observed', r.type ?? 'fact', r.scope ?? '', now, now, r.reinforced ?? 1, r.decay_score ?? 1.0);
  old.close();
  return home;
}

function freshHome(tag) {
  return path.join(os.tmpdir(), `zara-prov-${tag}-${process.hrtime.bigint()}`);
}

describe('memory provenance', () => {
  const homes = [];
  function track(h) { homes.push(h); return h; }
  after(() => {
    for (const h of homes) fs.rmSync(h, { recursive: true, force: true });
  });

  it('pre-existing DB without new columns survives migration', () => {
    const home = buildOldSchemaDb(track(freshHome('survive')), [
      { key: 'legacy.one', value: 'first legacy fact about widgets', type: 'fact' },
      { key: 'legacy.two', value: 'second legacy fact about gadgets', type: 'preference' },
    ]);
    const store = new MemoryStore(home);
    const db = store.db; // triggers #initSchema + #migrate
    const cols = db.prepare("PRAGMA table_info(semantic)").all().map(c => c.name);
    assert.ok(cols.includes('agent'), 'agent column should exist after migration');
    assert.ok(cols.includes('grounded'), 'grounded column should exist after migration');
    assert.equal(store.semanticCount(), 2, 'row count unchanged');
    const row = db.prepare('SELECT value, type FROM semantic WHERE key = ?').get('legacy.one');
    assert.equal(row.value, 'first legacy fact about widgets', 'original value intact');
    assert.equal(row.type, 'fact', 'original type intact');
    store.close();
  });

  it('migration is idempotent (triggered twice, no throw, data unchanged)', () => {
    const home = buildOldSchemaDb(track(freshHome('idem')), [
      { key: 'legacy.a', value: 'alpha legacy value', type: 'fact' },
    ]);
    const store1 = new MemoryStore(home);
    void store1.db; // first migration
    store1.close();
    const store2 = new MemoryStore(home);
    assert.doesNotThrow(() => { void store2.db; }, 'second migration should not throw');
    assert.equal(store2.semanticCount(), 1, 'data unchanged after second migration');
    const cols = store2.db.prepare("PRAGMA table_info(semantic)").all().map(c => c.name);
    assert.ok(cols.includes('agent') && cols.includes('grounded'));
    store2.close();
  });

  it('legacy rows read defaults: agent="" and grounded=0 (not NULL)', () => {
    const home = buildOldSchemaDb(track(freshHome('defaults')), [
      { key: 'legacy.def', value: 'a legacy default-bearing value', type: 'fact' },
    ]);
    const store = new MemoryStore(home);
    const row = store.db.prepare('SELECT agent, grounded FROM semantic WHERE key = ?').get('legacy.def');
    assert.equal(row.agent, '', 'agent defaults to empty string');
    assert.equal(row.grounded, 0, 'grounded defaults to 0');
    assert.notEqual(row.agent, null);
    assert.notEqual(row.grounded, null);
    store.close();
  });

  it('FTS5 integrity intact post-migration', () => {
    const home = buildOldSchemaDb(track(freshHome('fts')), [
      { key: 'legacy.fts', value: 'searchable pineapple content', type: 'fact' },
    ]);
    const store = new MemoryStore(home);
    const db = store.db;
    const hits = db.prepare("SELECT key FROM semantic_fts WHERE semantic_fts MATCH ? LIMIT 5").all('"pineapple"');
    assert.ok(hits.length > 0, 'legacy row still returns via FTS MATCH');
    assert.equal(hits[0].key, 'legacy.fts');
    assert.doesNotThrow(() => {
      db.prepare("INSERT INTO semantic_fts(semantic_fts) VALUES('integrity-check')").run();
    }, 'FTS integrity-check must not throw');
    store.close();
  });

  it('old learn() 5-arg call still works (agent="", grounded=0)', () => {
    const store = new MemoryStore(track(freshHome('5arg')));
    store.learn('compat.key', 'a five-arg compatibility value', 'observed', 'fact', '');
    const row = store.db.prepare('SELECT agent, grounded, value FROM semantic WHERE key = ?').get('compat.key');
    assert.equal(row.value, 'a five-arg compatibility value');
    assert.equal(row.agent, '');
    assert.equal(row.grounded, 0);
    store.close();
  });

  it('new learn() with opts {agent, grounded} round-trips both values', () => {
    const store = new MemoryStore(track(freshHome('opts')));
    store.learn('prov.key', 'a grounded value from forge', 'user_explicit', 'fact', '', { agent: 'forge', grounded: true });
    const row = store.db.prepare('SELECT agent, grounded FROM semantic WHERE key = ?').get('prov.key');
    assert.equal(row.agent, 'forge');
    assert.equal(row.grounded, 1);
    store.close();
  });

  it('grounded boost does NOT overpower type (grounded fact < policy)', () => {
    const store = new MemoryStore(track(freshHome('vstype')));
    // Same searchable token in both so FTS returns both with comparable rank.
    store.learn('pol.key', 'orchestration policy directive', 'user_explicit', 'policy', '');
    store.learn('fact.key', 'orchestration grounded fact', 'user_explicit', 'fact', '', { grounded: true });
    const results = store.recall('orchestration', 5);
    const keys = results.map(r => r.key);
    assert.ok(keys.includes('pol.key') && keys.includes('fact.key'), 'both should be recalled');
    const polIdx = keys.indexOf('pol.key');
    const factIdx = keys.indexOf('fact.key');
    assert.ok(polIdx < factIdx, `policy (idx ${polIdx}) should outrank grounded fact (idx ${factIdx})`);
    store.close();
  });

  it('grounded fact outranks identical non-grounded fact (same type)', () => {
    const store = new MemoryStore(track(freshHome('boost')));
    store.learn('plain.fact', 'kubernetes deployment rollback strategy notes', 'user_explicit', 'fact', '');
    store.learn('grounded.fact', 'kubernetes ingress tls termination details', 'user_explicit', 'fact', '', { grounded: true });
    const results = store.recall('kubernetes', 5);
    const keys = results.map(r => r.key);
    const gIdx = keys.indexOf('grounded.fact');
    const pIdx = keys.indexOf('plain.fact');
    assert.ok(gIdx !== -1 && pIdx !== -1, 'both facts recalled');
    assert.ok(gIdx < pIdx, `grounded fact (idx ${gIdx}) should outrank plain fact (idx ${pIdx})`);
    store.close();
  });
});

// --- recallAsync (semantic re-ranker) ---

describe('recallAsync', () => {
  const homes = [];
  function track(h) { homes.push(h); return h; }
  after(() => {
    for (const h of homes) fs.rmSync(h, { recursive: true, force: true });
  });

  it('returns results re-ranked by semantic similarity', async () => {
    // Mock embedder that gives higher similarity to "deployment" concepts
    class RankEmbedder {
      embed(text) {
        const vec = new Float32Array(128).fill(0);
        // "deploy" keyword presence drives the vector
        const hasDeploy = text.toLowerCase().includes('deploy');
        vec[0] = hasDeploy ? 0.9 : 0.1;
        vec[1] = hasDeploy ? 0.1 : 0.9;
        const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
        return vec.map(v => v / mag);
      }
      cosineSim(a, b) { return a.reduce((s, v, i) => s + v * b[i], 0); }
    }
    const home = track(path.join(os.tmpdir(), `zara-async-rank-${process.hrtime.bigint()}`));
    const store = new MemoryStore(home, new RankEmbedder());
    store.learn('k8s.pods', 'kubernetes pod scaling strategy', 'observed', 'fact', '');
    store.learn('k8s.deploy', 'kubernetes deployment rollout process', 'observed', 'fact', '');
    store.learn('k8s.svc', 'kubernetes service mesh configuration', 'observed', 'fact', '');
    const results = await store.recallAsync('kubernetes deployment', 5);
    assert.ok(results.length > 0, 'should return results');
    // The deploy-related one should rank first due to mock embedder
    assert.equal(results[0].key, 'k8s.deploy', 'deploy fact should rank first via semantic re-rank');
    store.close();
  });

  it('falls back to sync recall on embedder failure', async () => {
    // Embedder that works for learn/recall (sync) but we override for recallAsync
    class LimitedEmbedder {
      #callCount = 0;
      #failAfter;
      constructor(failAfter) { this.#failAfter = failAfter; }
      embed(text) {
        this.#callCount++;
        if (this.#callCount > this.#failAfter) throw new Error('embedder unavailable');
        const vec = new Float32Array(128).fill(1 / Math.sqrt(128));
        return vec;
      }
      cosineSim(a, b) { return a.reduce((s, v, i) => s + v * b[i], 0); }
    }
    const home = track(path.join(os.tmpdir(), `zara-async-fail-${process.hrtime.bigint()}`));
    // Allow enough calls for learn + recall, then fail on recallAsync's re-rank
    const store = new MemoryStore(home, new LimitedEmbedder(50));
    store.learn('fallback.fact', 'short', 'observed', 'fact', '');
    // Now replace embedder behavior by creating a new store that will fail
    const store2 = new MemoryStore(home, new LimitedEmbedder(0));
    const results = await store2.recallAsync('fallback', 5);
    assert.ok(results.length > 0, 'should still return results on embedder failure');
    assert.ok(results.some(r => r.key === 'fallback.fact'));
    store.close();
    store2.close();
  });
});

// --- Embedder Dependency Injection ---

describe('embedder DIP seam', () => {
  const homes = [];
  function track(h) { homes.push(h); return h; }
  after(() => {
    for (const h of homes) fs.rmSync(h, { recursive: true, force: true });
  });

  it('accepts a custom embedder and uses it for recall', () => {
    class MockEmbedder {
      embed(text) { return new Float32Array(128).fill(1 / Math.sqrt(128)); }
      cosineSim(a, b) { return a.reduce((s, v, i) => s + v * b[i], 0); }
    }
    const home = track(path.join(os.tmpdir(), `zara-embed-${process.hrtime.bigint()}`));
    const store = new MemoryStore(home, new MockEmbedder());
    store.learn('embed.test', 'custom embedder value', 'observed', 'fact', '');
    const results = store.recall('anything', 5);
    assert.ok(results.length > 0, 'recall should return results with mock embedder');
    assert.ok(results.some(r => r.key === 'embed.test'), 'stored key should be found');
    store.close();
  });
});
