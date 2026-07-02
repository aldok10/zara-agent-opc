// tools/vector-store.mjs — Optional Chroma vector backend for Zara memory.
//
// SQLite stays the default and owns all metadata, FTS, trust, and decay.
// When ZARA_VECTOR=chroma, KNN similarity search routes here instead of the
// in-SQLite vector scan. Embeddings are still produced by Zara's own embedder
// (MiniLM-L6-v2, 384-dim) and passed in precomputed — Chroma only stores and
// ranks vectors.
//
// The chromadb client is an OPTIONAL peer dependency, dynamically imported so
// it costs nothing unless the feature is turned on. If the flag is set but the
// package or server is unavailable, callers fall back to SQLite.
//
// Env:
//   ZARA_VECTOR=chroma          enable this backend (default: sqlite)
//   ZARA_CHROMA_URL=http://localhost:8000   server address
//   ZARA_CHROMA_COLLECTION=zara_semantic    collection name

export const VECTOR_BACKEND = (process.env.ZARA_VECTOR || 'sqlite').toLowerCase();
export const CHROMA_ENABLED = VECTOR_BACKEND === 'chroma';

const CHROMA_URL = process.env.ZARA_CHROMA_URL || 'http://localhost:8000';
const COLLECTION = process.env.ZARA_CHROMA_COLLECTION || 'zara_semantic';

class ChromaStore {
  #collection = null;
  #ready = null;
  #available = true;

  async #init() {
    if (this.#collection) return this.#collection;
    if (this.#ready) return this.#ready;
    this.#ready = (async () => {
      let ChromaClient;
      try {
        ({ ChromaClient } = await import('chromadb'));
      } catch {
        this.#available = false;
        throw new Error('chromadb not installed — run: npm install chromadb');
      }
      // Parse ZARA_CHROMA_URL into ssl/host/port (chromadb 3.x dropped `path`).
      const u = new URL(CHROMA_URL);
      const client = new ChromaClient({
        ssl: u.protocol === 'https:',
        host: u.hostname,
        port: u.port ? Number(u.port) : (u.protocol === 'https:' ? 443 : 8000),
      });
      // Zara supplies its own vectors; disable Chroma's server-side embedding.
      this.#collection = await client.getOrCreateCollection({
        name: COLLECTION,
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

  async remove(id) {
    const col = await this.#init();
    await col.delete({ ids: [id] });
  }

  async count() {
    const col = await this.#init();
    return col.count();
  }
}

let _instance = null;

// Returns the shared ChromaStore, or null when the backend is not enabled.
export function getVectorStore() {
  if (!CHROMA_ENABLED) return null;
  if (!_instance) _instance = new ChromaStore();
  return _instance;
}
