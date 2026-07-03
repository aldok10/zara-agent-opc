// tools/memory/procedural-store.mjs — Adapter pattern for procedural memory.
//
// Contract (all methods async):
//   save(name, steps, context)  → {name, steps: number}
//   recall(query, limit)        → [{id, name, context, steps, uses}]
//   count()                     → number
//   export()                    → [{name, context, steps, uses, updated}]
//   incrementUse(name)          → void

import { CHROMA_ENABLED, getVectorStore } from '../vector-store.mjs';
import { SemanticEmbedder } from '../embedder.mjs';

const COLLECTION = 'zara_procedural';
const MAX_SCAN = 10000;

function escapeLike(s) { return s.replace(/[%_]/g, c => `\\${c}`); }

// ============================================================================
// SQLite adapter
// ============================================================================

export class SqliteProceduralStore {
  #store;
  constructor(store) { this.#store = store; }

  get backend() { return 'sqlite'; }

  async save(name, steps, context = '') {
    const db = this.#store.db;
    const now = new Date().toISOString().split('T')[0];
    const existing = db.prepare('SELECT uses FROM procedural WHERE name = ?').get(name);
    if (existing) {
      db.prepare('UPDATE procedural SET context = ?, steps = ?, updated = ? WHERE name = ?').run(context, JSON.stringify(steps), now, name);
    } else {
      db.prepare('INSERT INTO procedural (name, context, steps, uses, created, updated) VALUES (?, ?, ?, 0, ?, ?)').run(name, context, JSON.stringify(steps), now, now);
    }

    // Async embed (fire-and-forget)
    try {
      const text = `${name} ${context} ${steps.slice(0, 3).join(' ')}`.slice(0, 200);
      const embedder = SemanticEmbedder.instance();
      const vec = await embedder.embed(text);
      const buf = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
      db.prepare('UPDATE procedural SET embedding = ? WHERE name = ?').run(buf, name);
    } catch {}

    return { name, steps: steps.length };
  }

  async recall(query, limit = 3) {
    const db = this.#store.db;
    try {
      const fts = query.split(/\s+/).map(t => `"${t.replace(/"/g, '')}"`).join(' OR ');
      return db.prepare(`SELECT p.id, p.name, p.context, p.steps, p.uses FROM procedural_fts f JOIN procedural p ON f.rowid = p.id WHERE procedural_fts MATCH ? ORDER BY rank LIMIT ?`).all(fts, limit);
    } catch {
      const terms = query.toLowerCase().split(/\s+/);
      const where = terms.map(() => "(LOWER(name) LIKE ? ESCAPE '\\' OR LOWER(context) LIKE ? ESCAPE '\\')").join(' OR ');
      return db.prepare(`SELECT id, name, context, steps, uses FROM procedural WHERE ${where} ORDER BY uses DESC LIMIT ?`).all(...terms.flatMap(t => { const e = `%${escapeLike(t)}%`; return [e, e]; }), limit);
    }
  }

  async count() {
    return this.#store.db.prepare('SELECT COUNT(*) as n FROM procedural').get().n;
  }

  async export() {
    return this.#store.db.prepare('SELECT name, context, steps, uses, updated FROM procedural').all().map(r => ({ ...r, steps: JSON.parse(r.steps) }));
  }

  async incrementUse(name) {
    this.#store.db.prepare('UPDATE procedural SET uses = uses + 1 WHERE name = ?').run(name);
  }

  async deleteByPattern(pattern) {
    const db = this.#store.db;
    const like = `%${escapeLike(pattern)}%`;
    const rows = db.prepare('SELECT id FROM procedural WHERE name LIKE ? OR context LIKE ?').all(like, like);
    for (const r of rows) db.prepare('DELETE FROM procedural WHERE id = ?').run(r.id);
    return rows.length;
  }

  async countByPattern(pattern) {
    const like = `%${escapeLike(pattern)}%`;
    return this.#store.db.prepare('SELECT COUNT(*) as n FROM procedural WHERE name LIKE ? OR context LIKE ?').get(like, like).n;
  }
}

// ============================================================================
// Chroma adapter
// ============================================================================

export class ChromaProceduralStore {
  #vectorStore;
  #embedder;

  constructor(vectorStore, embedder) {
    this.#vectorStore = vectorStore;
    this.#embedder = embedder;
  }

  get backend() { return 'chroma'; }

  async save(name, steps, context = '') {
    const now = new Date().toISOString().split('T')[0];
    const text = `${name} ${context} ${steps.slice(0, 3).join(' ')}`.slice(0, 200);
    const vec = await this.#embedder.embed(text);

    // Check for existing to preserve uses count
    const existing = await this.#getOne(name);
    const uses = existing?.uses || 0;

    // Store steps as document (full-text searchable), metadata stays lean.
    const document = `${name}: ${steps.join(' -> ')}`;
    await this.#vectorStore.upsert(name, vec, {
      name,
      context,
      uses: String(uses),
      created: existing?.created || now,
      updated: now,
    }, document);
    return { name, steps: steps.length };
  }

  async recall(query, limit = 3) {
    const vec = await this.#embedder.embed(query);
    const hits = await this.#vectorStore.query(vec, limit * 2);
    return hits
      .filter(h => h.score > 0.2)
      .slice(0, limit)
      .map(h => ({
        id: h.key,
        name: h.metadata.name || h.key,
        context: h.metadata.context || '',
        // Reconstruct steps from document or fallback to metadata
        steps: h.metadata.steps || JSON.stringify(this.#stepsFromDocument(h.document)),
        uses: parseInt(h.metadata.uses || '0', 10),
        score: h.score,
      }));
  }

  async count() {
    return this.#vectorStore.count();
  }

  async export() {
    const all = await this.#vectorStore.getAll(null, MAX_SCAN);
    return all.map(e => ({
      name: e.metadata.name || e.key,
      context: e.metadata.context || '',
      steps: e.metadata.steps ? JSON.parse(e.metadata.steps) : this.#stepsFromDocument(e.document),
      uses: parseInt(e.metadata.uses || '0', 10),
      updated: e.metadata.updated || '',
    }));
  }

  async incrementUse(name) {
    const row = await this.#getOne(name);
    if (!row) return;
    const uses = (row.uses || 0) + 1;
    await this.#vectorStore.updateMetadata(name, { ...row._meta, uses: String(uses) });
  }

  // Parse steps from document string format "name: step1 -> step2 -> step3"
  #stepsFromDocument(doc) {
    if (!doc) return [];
    const colonIdx = doc.indexOf(':');
    const body = colonIdx >= 0 ? doc.slice(colonIdx + 1).trim() : doc;
    return body.split(' -> ').map(s => s.trim()).filter(Boolean);
  }

  async #getOne(name) {
    try {
      const entries = await this.#vectorStore.getAll({ name }, 1);
      if (entries.length) {
        const m = entries[0].metadata;
        return {
          name: m.name || name,
          context: m.context || '',
          steps: m.steps || '[]',
          uses: parseInt(m.uses || '0', 10),
          created: m.created || '',
          updated: m.updated || '',
          _meta: m,
        };
      }
    } catch {}
    return null;
  }

  async deleteByPattern(pattern) {
    const all = await this.#vectorStore.getAll(null, MAX_SCAN);
    const match = all.filter(e =>
      (e.metadata.name || e.key).includes(pattern) || (e.metadata.context || '').includes(pattern)
    );
    if (match.length) {
      await this.#vectorStore.removeMany(match.map(e => e.key));
    }
    return match.length;
  }

  async countByPattern(pattern) {
    const all = await this.#vectorStore.getAll(null, MAX_SCAN);
    return all.filter(e =>
      (e.metadata.name || e.key).includes(pattern) || (e.metadata.context || '').includes(pattern)
    ).length;
  }
}

// ============================================================================
// Factory
// ============================================================================

const _byHost = new WeakMap();

export function getProceduralStore(sqliteHost) {
  const cached = _byHost.get(sqliteHost);
  if (cached) return cached;

  let store;
  if (CHROMA_ENABLED) {
    const vs = getVectorStore(COLLECTION);
    if (vs) {
      store = new ChromaProceduralStore(vs, SemanticEmbedder.instance());
    } else {
      store = new SqliteProceduralStore(sqliteHost);
    }
  } else {
    store = new SqliteProceduralStore(sqliteHost);
  }
  _byHost.set(sqliteHost, store);
  return store;
}

export function _resetProceduralStore(sqliteHost) {
  if (sqliteHost) _byHost.delete(sqliteHost);
}
