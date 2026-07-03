// tools/vector-store.mjs — Chroma vector backend for Zara memory.
//
// ZARA_VECTOR controls which backend is active:
//   'sqlite' (default) — all metadata + search in SQLite
//   'chroma'           — all metadata + vector search in Chroma
//
// When Chroma is the active backend it stores EVERYTHING: vectors, key,
// metadata. Collections:
//   zara_semantic      — semantic (facts, decisions, preferences)
//   zara_episodic      — episodic (events + outcomes)
//   zara_procedural    — procedural (workflows + steps)
//   zara_knowledge     — knowledge chunks (passage retrieval)
//
// The chromadb client is an OPTIONAL peer dependency, dynamically imported so
// it costs nothing unless the feature is turned on.
//
// Env:
//   ZARA_VECTOR=chroma              enable Chroma backend (default: sqlite)
//   ZARA_CHROMA_URL=http://localhost:8000  server address
//   ZARA_CHROMA_COLLECTION=zara_semantic  collection prefix (backward compat)

export const VECTOR_BACKEND = (process.env.ZARA_VECTOR || 'sqlite').toLowerCase();
export const CHROMA_ENABLED = VECTOR_BACKEND === 'chroma';

const CHROMA_URL = process.env.ZARA_CHROMA_URL || 'http://localhost:8000';
const DEFAULT_COLLECTION = process.env.ZARA_CHROMA_COLLECTION || 'zara_semantic';
const AUTH_TOKEN = process.env.ZARA_CHROMA_AUTH_TOKEN || '';

class ChromaStore {
  #collectionName;
  #collection = null;
  #ready = null;
  #available = true;

  constructor(collectionName = DEFAULT_COLLECTION) {
    this.#collectionName = collectionName;
  }

  async #init() {
    if (this.#collection) return this.#collection;
    if (this.#ready) return this.#ready;
    this.#ready = (async () => {
      let ChromaClient;
      try {
        ({ ChromaClient } = await import('chromadb'));
      } catch {
        this.#available = false;
        throw new Error('chromadb not installed');
      }
      const u = new URL(CHROMA_URL);
      const client = new ChromaClient({
        ssl: u.protocol === 'https:',
        host: u.hostname,
        port: u.port ? Number(u.port) : (u.protocol === 'https:' ? 443 : 8000),
        headers: AUTH_TOKEN ? { 'x-chroma-token': AUTH_TOKEN } : undefined,
      });
      this.#collection = await client.getOrCreateCollection({
        name: this.#collectionName,
        embeddingFunction: null,
        metadata: { 'hnsw:space': 'cosine' },
      });
      return this.#collection;
    })();
    return this.#ready;
  }

  get available() { return this.#available; }

  // Probe the server before assuming collections exist (per Chroma skill
  // guidance). Returns true if the v2 heartbeat responds.
  async reachable() {
    try {
      const res = await fetch(`${CHROMA_URL}/api/v2/heartbeat`, { signal: AbortSignal.timeout(5000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Store or replace a vector. metadata is a flat object of scalar fields.
  async upsert(id, vector, metadata = {}) {
    const col = await this.#init();
    await col.upsert({
      ids: [id],
      embeddings: [Array.from(vector)],
      metadatas: [metadata],
    });
  }

  // Batch upsert for bulk sync. `items` is [{ id, vector, metadata }].
  // Chunked to keep request sizes sane (Chroma rejects very large batches).
  async upsertBatch(items, chunkSize = 200) {
    const col = await this.#init();
    for (let i = 0; i < items.length; i += chunkSize) {
      const slice = items.slice(i, i + chunkSize);
      await col.upsert({
        ids: slice.map(x => x.id),
        embeddings: slice.map(x => Array.from(x.vector)),
        metadatas: slice.map(x => x.metadata || {}),
      });
    }
  }

  // KNN search. Returns [{ key, score, metadata }] sorted by similarity desc.
  // `where` is an optional Chroma metadata filter, e.g. { type: 'fact' }.
  async query(vector, k = 15, where = null) {
    const col = await this.#init();
    const args = { queryEmbeddings: [Array.from(vector)], nResults: k };
    if (where && Object.keys(where).length) args.where = where;
    const res = await col.query(args);
    const ids = res.ids?.[0] || [];
    const distances = res.distances?.[0] || [];
    const metadatas = res.metadatas?.[0] || [];
    return ids.map((key, i) => ({
      key,
      // cosine space: distance in [0,2]; convert to similarity in [-1,1]
      score: 1 - (distances[i] ?? 1),
      metadata: metadatas[i] || {},
    }));
  }

  // Update metadata only, without re-supplying the vector. Used for trust
  // adjustment, decay scoring, and reinforcement counters.
  async updateMetadata(id, metadata) {
    const col = await this.#init();
    await col.update({ ids: [id], metadatas: [metadata] });
  }

  async remove(id) {
    const col = await this.#init();
    await col.delete({ ids: [id] });
  }

  // Remove multiple IDs in a single call.
  async removeMany(ids) {
    if (!ids.length) return;
    const col = await this.#init();
    // Chroma v3.x delete accepts up to 50k ids per call; chunk defensively.
    for (let i = 0; i < ids.length; i += 1000) {
      await col.delete({ ids: ids.slice(i, i + 1000) });
    }
  }

  async count() {
    const col = await this.#init();
    return col.count();
  }

  // List entries with metadata. Supports optional `where` filter and can
  // include stored embeddings (needed for contradiction detection).
  // Returns [{ key, metadata, embedding? }].
  async getAll(where = null, limit = 1000, offset = 0, withEmbeddings = false) {
    const col = await this.#init();
    const include = withEmbeddings ? ['metadatas', 'embeddings'] : ['metadatas'];
    const args = { limit, offset, include };
    if (where && Object.keys(where).length) args.where = where;
    const res = await col.get(args);
    const ids = res.ids || [];
    const metadatas = res.metadatas || [];
    const embeddings = res.embeddings || [];
    return ids.map((key, i) => ({
      key,
      metadata: metadatas[i] || {},
      embedding: withEmbeddings && embeddings[i] ? Float32Array.from(embeddings[i]) : null,
    }));
  }
}

let _instance = null;
const _instances = new Map();

// Returns the shared ChromaStore for a given collection name, or null when not enabled.
// Default collection = zara_semantic (backward compat with existing semantic adapter).
export function getVectorStore(collectionName = DEFAULT_COLLECTION) {
  if (!CHROMA_ENABLED) return null;
  // Legacy single-instance path (no arg) for backward compat
  if (collectionName === DEFAULT_COLLECTION) {
    if (!_instance) _instance = new ChromaStore(DEFAULT_COLLECTION);
    return _instance;
  }
  if (!_instances.has(collectionName)) {
    _instances.set(collectionName, new ChromaStore(collectionName));
  }
  return _instances.get(collectionName);
}
