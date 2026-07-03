// tools/memory/knowledge-store.mjs — Adapter for knowledge chunk storage (passage retrieval).
//
// Contract (all methods async):
//   upsert(key, section, body)                → {key, chunks: number}
//   search(query, section, k)                 → [{key, section, chunk_index, text, score}]
//   count()                                   → number
//   deleteByKey(key)                          → void
//
// The knowledge INDEX table (key/section/title/summary) stays in SQLite always
// (pure metadata lookup, no vector benefit). Only the chunk PASSAGES get the
// Chroma treatment for better semantic search.

import { CHROMA_ENABLED, getVectorStore } from '../vector-store.mjs';
import { SemanticEmbedder, TrigramEmbedder } from '../embedder.mjs';

const COLLECTION = 'zara_knowledge';
const MAX_SCAN = 50000;

// Shared chunker: split article body into ~maxWords passages on paragraph boundaries.
export function chunkText(body, maxWords = 220) {
  if (!body) return [];
  const paras = body.split(/\n{2,}/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const chunks = [];
  let buf = [];
  let count = 0;
  for (const p of paras) {
    const words = p.split(' ').length;
    if (count + words > maxWords && buf.length) {
      chunks.push(buf.join(' '));
      buf = [];
      count = 0;
    }
    buf.push(p);
    count += words;
  }
  if (buf.length) chunks.push(buf.join(' '));
  return chunks;
}

// ============================================================================
// SQLite adapter — delegates to MemoryStore's knowledge_chunks table.
// ============================================================================

export class SqliteKnowledgeChunkStore {
  #store;
  #embedder;
  constructor(store) {
    this.#store = store;
    this.#embedder = new TrigramEmbedder();
  }

  get backend() { return 'sqlite'; }

  async upsert(key, section, body) {
    const db = this.#store.db;
    const chunks = chunkText(body);
    db.prepare('DELETE FROM knowledge_chunks WHERE key = ?').run(key);
    if (!chunks.length) return { key, chunks: 0 };
    const stmt = db.prepare('INSERT INTO knowledge_chunks (key, section, chunk_index, text, embedding) VALUES (?, ?, ?, ?, ?)');
    chunks.forEach((text, i) => {
      const vec = this.#embedder.embed(text);
      const buf = Buffer.from(new Float32Array(vec).buffer);
      stmt.run(key, section, i, text, buf);
    });
    return { key, chunks: chunks.length };
  }

  // Async upsert with SemanticEmbedder (for higher quality)
  async upsertAsync(key, section, body) {
    const db = this.#store.db;
    const chunks = chunkText(body);
    db.prepare('DELETE FROM knowledge_chunks WHERE key = ?').run(key);
    if (!chunks.length) return { key, chunks: 0 };
    let embedder;
    try { embedder = SemanticEmbedder.instance(); } catch { return this.upsert(key, section, body); }
    const stmt = db.prepare('INSERT INTO knowledge_chunks (key, section, chunk_index, text, embedding) VALUES (?, ?, ?, ?, ?)');
    for (let i = 0; i < chunks.length; i++) {
      const vec = await embedder.embed(chunks[i]);
      const buf = Buffer.from(new Float32Array(vec).buffer);
      stmt.run(key, section, i, chunks[i], buf);
    }
    return { key, chunks: chunks.length };
  }

  async search(query, section = '', k = 5) {
    const db = this.#store.db;
    const queryVec = this.#embedder.embed(query);
    const rows = section
      ? db.prepare('SELECT key, section, chunk_index, text, embedding FROM knowledge_chunks WHERE section = ?').all(section)
      : db.prepare('SELECT key, section, chunk_index, text, embedding FROM knowledge_chunks').all();
    return rows
      .map(r => {
        const vec = new Float32Array(r.embedding.buffer, r.embedding.byteOffset, r.embedding.byteLength / 4);
        return { key: r.key, section: r.section, chunk_index: r.chunk_index, text: r.text, score: this.#embedder.cosineSim(queryVec, vec) };
      })
      .filter(r => r.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  // Async search with SemanticEmbedder
  async searchAsync(query, section = '', k = 5) {
    let embedder;
    try { embedder = SemanticEmbedder.instance(); } catch { return this.search(query, section, k); }
    const db = this.#store.db;
    const queryVec = await embedder.embed(query);
    const queryDim = queryVec.length;
    const rows = section
      ? db.prepare('SELECT key, section, chunk_index, text, embedding FROM knowledge_chunks WHERE section = ?').all(section)
      : db.prepare('SELECT key, section, chunk_index, text, embedding FROM knowledge_chunks').all();
    const results = [];
    for (const r of rows) {
      const storedDim = r.embedding.byteLength / 4;
      if (storedDim !== queryDim) continue;
      const vec = new Float32Array(r.embedding.buffer, r.embedding.byteOffset, storedDim);
      const score = embedder.cosineSim(queryVec, vec);
      if (score > 0.1) results.push({ key: r.key, section: r.section, chunk_index: r.chunk_index, text: r.text, score });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, k);
  }

  async count() {
    return this.#store.db.prepare('SELECT COUNT(*) as n FROM knowledge_chunks').get().n;
  }

  async deleteByKey(key) {
    this.#store.db.prepare('DELETE FROM knowledge_chunks WHERE key = ?').run(key);
  }
}

// ============================================================================
// Chroma adapter — each chunk stored as a separate document with composite ID.
// ============================================================================

export class ChromaKnowledgeChunkStore {
  #vectorStore;
  #embedder;

  constructor(vectorStore, embedder) {
    this.#vectorStore = vectorStore;
    this.#embedder = embedder;
  }

  get backend() { return 'chroma'; }

  async upsert(key, section, body) {
    const chunks = chunkText(body);

    // Remove old chunks for this key
    await this.deleteByKey(key);
    if (!chunks.length) return { key, chunks: 0 };

    // Batch insert: chunk text goes into Chroma's documents field (full-text searchable).
    const items = [];
    for (let i = 0; i < chunks.length; i++) {
      const id = `${key}__chunk_${i}`;
      const vec = await this.#embedder.embed(chunks[i].slice(0, 300));
      items.push({
        id,
        vector: vec,
        metadata: { key, section, chunk_index: String(i) },
        document: chunks[i],
      });
    }
    await this.#vectorStore.upsertBatch(items);
    return { key, chunks: chunks.length };
  }

  // upsertAsync is identical to upsert for Chroma (always async)
  async upsertAsync(key, section, body) {
    return this.upsert(key, section, body);
  }

  async search(query, section = '', k = 5) {
    const vec = await this.#embedder.embed(query);
    const where = section ? { section } : null;
    const hits = await this.#vectorStore.query(vec, k * 2, where);
    return hits
      .filter(h => h.score > 0.1)
      .slice(0, k)
      .map(h => ({
        key: h.metadata.key || h.key.split('__chunk_')[0],
        section: h.metadata.section || '',
        chunk_index: parseInt(h.metadata.chunk_index || '0', 10),
        text: h.document || h.metadata.text || '',
        score: h.score,
      }));
  }

  // searchAsync is identical to search for Chroma
  async searchAsync(query, section = '', k = 5) {
    return this.search(query, section, k);
  }

  async count() {
    return this.#vectorStore.count();
  }

  async deleteByKey(key) {
    // Fetch all chunks with this key prefix and remove them
    const all = await this.#vectorStore.getAll(null, MAX_SCAN);
    const toDelete = all.filter(e => (e.metadata.key || e.key.split('__chunk_')[0]) === key);
    if (toDelete.length) {
      await this.#vectorStore.removeMany(toDelete.map(e => e.key));
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

const _byHost = new WeakMap();

export function getKnowledgeChunkStore(sqliteHost) {
  const cached = _byHost.get(sqliteHost);
  if (cached) return cached;

  let store;
  if (CHROMA_ENABLED) {
    const vs = getVectorStore(COLLECTION);
    if (vs) {
      store = new ChromaKnowledgeChunkStore(vs, SemanticEmbedder.instance());
    } else {
      store = new SqliteKnowledgeChunkStore(sqliteHost);
    }
  } else {
    store = new SqliteKnowledgeChunkStore(sqliteHost);
  }
  _byHost.set(sqliteHost, store);
  return store;
}

export function _resetKnowledgeChunkStore(sqliteHost) {
  if (sqliteHost) _byHost.delete(sqliteHost);
}
