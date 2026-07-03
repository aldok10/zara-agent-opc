// tools/memory/episodic-store.mjs — Adapter pattern for episodic memory.
//
// Contract (all methods async):
//   record(event, outcome, tags)  → {event, ts}
//   recall(query, limit)          → [{id, event, outcome, tags, ts}]
//   count()                       → number
//   export()                      → [{event, outcome, tags, ts}]
//   decayOld()                    → number (deleted count)

import { CHROMA_ENABLED, getVectorStore } from '../vector-store.mjs';
import { SemanticEmbedder } from '../embedder.mjs';

const COLLECTION = 'zara_episodic';
const MAX_SCAN = 10000;

function escapeLike(s) { return s.replace(/[%_]/g, c => `\\${c}`); }

// ============================================================================
// SQLite adapter — delegates to MemoryStore's SQLite DB.
// ============================================================================

export class SqliteEpisodicStore {
  #store;
  constructor(store) { this.#store = store; }

  get backend() { return 'sqlite'; }

  async record(event, outcome = '', tags = []) {
    const ts = new Date().toISOString();
    const db = this.#store.db;
    db.prepare('INSERT INTO episodic (event, outcome, tags, ts) VALUES (?, ?, ?, ?)').run(event, outcome, JSON.stringify(tags), ts);

    // Async embed for hybrid recall (fire-and-forget)
    try {
      const id = db.prepare('SELECT last_insert_rowid() as id').get().id;
      const text = outcome ? `${event} ${outcome}` : event;
      const embedder = SemanticEmbedder.instance();
      const vec = await embedder.embed(text);
      const buf = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
      db.prepare('UPDATE episodic SET embedding = ? WHERE id = ?').run(buf, id);
    } catch {}

    return { event, ts };
  }

  async recall(query, limit = 5) {
    const db = this.#store.db;
    try {
      const fts = query.split(/\s+/).map(t => `"${t.replace(/"/g, '')}"`).join(' OR ');
      return db.prepare(`SELECT e.id, e.event, e.outcome, e.tags, e.ts FROM episodic_fts f JOIN episodic e ON f.rowid = e.id WHERE episodic_fts MATCH ? ORDER BY rank LIMIT ?`).all(fts, limit);
    } catch {
      const terms = query.toLowerCase().split(/\s+/);
      const where = terms.map(() => "(LOWER(event) LIKE ? ESCAPE '\\' OR LOWER(outcome) LIKE ? ESCAPE '\\' OR LOWER(tags) LIKE ? ESCAPE '\\')").join(' OR ');
      return db.prepare(`SELECT id, event, outcome, tags, ts FROM episodic WHERE ${where} ORDER BY ts DESC LIMIT ?`).all(...terms.flatMap(t => { const e = `%${escapeLike(t)}%`; return [e, e, e]; }), limit);
    }
  }

  async count() {
    return this.#store.db.prepare('SELECT COUNT(*) as n FROM episodic').get().n;
  }

  async export() {
    return this.#store.db.prepare('SELECT event, outcome, tags, ts FROM episodic ORDER BY ts').all().map(r => ({ ...r, tags: JSON.parse(r.tags) }));
  }

  async decayOld() {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    const result = this.#store.db.prepare("DELETE FROM episodic WHERE ts < ? AND access_count = 0").run(cutoff);
    return result.changes || 0;
  }

  async deleteByPattern(pattern) {
    const db = this.#store.db;
    const like = `%${escapeLike(pattern)}%`;
    const rows = db.prepare('SELECT id FROM episodic WHERE event LIKE ? OR outcome LIKE ?').all(like, like);
    for (const r of rows) db.prepare('DELETE FROM episodic WHERE id = ?').run(r.id);
    return rows.length;
  }

  async countByPattern(pattern) {
    const like = `%${escapeLike(pattern)}%`;
    return this.#store.db.prepare('SELECT COUNT(*) as n FROM episodic WHERE event LIKE ? OR outcome LIKE ?').get(like, like).n;
  }
}

// ============================================================================
// Chroma adapter — stores episodes as vectors for semantic recall.
// ============================================================================

export class ChromaEpisodicStore {
  #vectorStore;
  #embedder;

  constructor(vectorStore, embedder) {
    this.#vectorStore = vectorStore;
    this.#embedder = embedder;
  }

  get backend() { return 'chroma'; }

  async record(event, outcome = '', tags = []) {
    const ts = new Date().toISOString();
    const id = `ep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const text = outcome ? `${event} ${outcome}` : event;
    const vec = await this.#embedder.embed(text.slice(0, 300));

    // Store event+outcome as document (full-text searchable); metadata is lean.
    await this.#vectorStore.upsert(id, vec, {
      tags: JSON.stringify(tags),
      ts,
      access_count: '0',
    }, text);
    return { event, ts };
  }

  async recall(query, limit = 5) {
    const vec = await this.#embedder.embed(query);
    const hits = await this.#vectorStore.query(vec, limit * 2);
    return hits
      .filter(h => h.score > 0.2)
      .slice(0, limit)
      .map(h => {
        // Reconstruct event/outcome from document field
        const doc = h.document || h.metadata.event || '';
        const event = h.metadata.event || doc;
        const outcome = h.metadata.outcome || '';
        return {
          id: h.key,
          event,
          outcome,
          tags: h.metadata.tags || '[]',
          ts: h.metadata.ts || '',
          score: h.score,
        };
      });
  }

  async count() {
    return this.#vectorStore.count();
  }

  async export() {
    const all = await this.#vectorStore.getAll(null, MAX_SCAN);
    return all.map(e => ({
      event: e.document || e.metadata.event || '',
      outcome: e.metadata.outcome || '',
      tags: JSON.parse(e.metadata.tags || '[]'),
      ts: e.metadata.ts || '',
    })).sort((a, b) => (a.ts || '').localeCompare(b.ts || ''));
  }

  async decayOld() {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    const all = await this.#vectorStore.getAll(null, MAX_SCAN);
    const old = all.filter(e => {
      const ts = e.metadata.ts || '';
      const accessCount = parseInt(e.metadata.access_count || '0', 10);
      return ts < cutoff && accessCount === 0;
    });
    if (old.length) {
      await this.#vectorStore.removeMany(old.map(e => e.key));
    }
    return old.length;
  }

  async deleteByPattern(pattern) {
    const all = await this.#vectorStore.getAll(null, MAX_SCAN);
    const match = all.filter(e =>
      (e.document || e.metadata.event || '').includes(pattern) || (e.metadata.outcome || '').includes(pattern)
    );
    if (match.length) {
      await this.#vectorStore.removeMany(match.map(e => e.key));
    }
    return match.length;
  }

  async countByPattern(pattern) {
    const all = await this.#vectorStore.getAll(null, MAX_SCAN);
    return all.filter(e =>
      (e.document || e.metadata.event || '').includes(pattern) || (e.metadata.outcome || '').includes(pattern)
    ).length;
  }
}

// ============================================================================
// Factory
// ============================================================================

const _byHost = new WeakMap();

export function getEpisodicStore(sqliteHost) {
  const cached = _byHost.get(sqliteHost);
  if (cached) return cached;

  let store;
  if (CHROMA_ENABLED) {
    const vs = getVectorStore(COLLECTION);
    if (vs) {
      store = new ChromaEpisodicStore(vs, SemanticEmbedder.instance());
    } else {
      store = new SqliteEpisodicStore(sqliteHost);
    }
  } else {
    store = new SqliteEpisodicStore(sqliteHost);
  }
  _byHost.set(sqliteHost, store);
  return store;
}

export function _resetEpisodicStore(sqliteHost) {
  if (sqliteHost) _byHost.delete(sqliteHost);
}
