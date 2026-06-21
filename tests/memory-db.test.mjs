import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DatabaseSync } from 'node:sqlite';

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
