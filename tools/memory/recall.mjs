// tools/memory/recall.mjs — SQLite semantic recall internals (extracted from
// memory-db.mjs): FTS5 + trigram sync recall, hybrid async fusion, and the
// simple baseline/scoped/count/getAll queries.
//
// The sync `embedder` is always trigram-capable. The async fusion takes a
// separate `asyncEmbedder` (the resolved strategy: injected or MiniLM) so store
// and query use the same vectors — no internal embedder probing here.

import { TYPE_BOOST, relevanceScore, applyTokenBudget, escapeLike } from './semantic-store.mjs';

const today = () => new Date().toISOString().split('T')[0];

// --- Low-level search primitives ---

function ftsSearch(db, query, limit) {
  try {
    const fts = query.split(/\s+/).filter(t => t.length > 1).map(t => `"${t.replace(/"/g, '')}"`).join(' OR ');
    if (!fts) throw new Error('empty');
    return db.prepare(`
      SELECT s.key, s.value, s.confidence, s.source, s.type, s.scope, s.updated, s.reinforced, s.decay_score, s.trust_score, s.grounded, rank
      FROM semantic_fts f JOIN semantic s ON f.rowid = s.rowid WHERE semantic_fts MATCH ? ORDER BY rank LIMIT ?
    `).all(fts, limit);
  } catch {
    const terms = query.toLowerCase().split(/\s+/);
    const where = terms.map(() => "(LOWER(key) LIKE ? ESCAPE '\\' OR LOWER(value) LIKE ? ESCAPE '\\')").join(' OR ');
    return db.prepare(`SELECT key, value, confidence, source, type, scope, updated, reinforced, decay_score, trust_score, grounded FROM semantic WHERE ${where} ORDER BY decay_score DESC LIMIT ?`).all(...terms.flatMap(t => { const e = `%${escapeLike(t)}%`; return [e, e]; }), limit);
  }
}

function trigramSearch(db, embedder, query, limit) {
  const queryVec = embedder.embed(query);
  // Cap at 500 rows to prevent memory/latency issues at scale
  return db.prepare('SELECT key, value, confidence, source, type, scope, updated, reinforced, decay_score, trust_score, grounded, embedding FROM semantic ORDER BY decay_score DESC LIMIT 500').all()
    .map(r => ({ ...r, trigramSim: embedder.cosineSim(queryVec, embedder.embed(`${r.key} ${r.value}`)) }))
    .filter(r => r.trigramSim > 0.15)
    .sort((a, b) => b.trigramSim - a.trigramSim)
    .slice(0, limit);
}

// --- Sync recall (FTS + trigram, grounded/decay/trust-aware scoring) ---

export function recall(db, embedder, query, limit = 5, options = {}) {
  const now = today();
  const { scope, type, tokenBudget } = options;

  let results = ftsSearch(db, query, limit * 3);

  // Trigram semantic fallback when FTS/LIKE finds nothing
  if (!results.length) {
    results = trigramSearch(db, embedder, query, limit * 3);
  }

  const score = (r) => {
    const typeBoost = TYPE_BOOST[r.type] || 1.0;
    const decayFactor = r.decay_score || 0.5;
    const reinforceFactor = Math.min(2.0, 1 + Math.log2((r.reinforced || 1) + 1) * 0.2);
    const scopeBoost = (scope && r.scope && r.scope === scope) ? 1.5 : 1.0;
    const trustFactor = 0.5 + (r.trust_score ?? 0.5);
    const groundedFactor = r.grounded ? 1.25 : 1.0;
    const ftsScore = r.rank ? Math.abs(1 / (r.rank || 1)) : (r.trigramSim || 0.5);
    return ftsScore * typeBoost * decayFactor * reinforceFactor * scopeBoost * trustFactor * groundedFactor;
  };
  results = results.map(r => ({ ...r, relevance: score(r) }));

  // Adaptive depth: FTS matched but the best hit is weak → widen with a
  // semantic trigram pass and merge, deduping by key. Cheap, no LLM.
  const WEAK = 0.4;
  const topRelevance = results.length ? Math.max(...results.map(r => r.relevance)) : 0;
  if (results.length && topRelevance < WEAK) {
    const extra = trigramSearch(db, embedder, query, limit * 3).map(r => {
      const typeBoost = TYPE_BOOST[r.type] || 1.0;
      const decayFactor = r.decay_score || 0.5;
      const reinforceFactor = Math.min(2.0, 1 + Math.log2((r.reinforced || 1) + 1) * 0.2);
      const scopeBoost = (scope && r.scope && r.scope === scope) ? 1.5 : 1.0;
      const groundedFactor = r.grounded ? 1.25 : 1.0;
      return { ...r, relevance: (r.trigramSim || 0.5) * typeBoost * decayFactor * reinforceFactor * scopeBoost * groundedFactor };
    });
    const seen = new Set(results.map(r => r.key));
    for (const e of extra) if (!seen.has(e.key)) { results.push(e); seen.add(e.key); }
  }

  if (type) results = results.filter(r => r.type === type);
  results.sort((a, b) => b.relevance - a.relevance);
  results = results.slice(0, limit);

  if (tokenBudget) {
    let tokens = 0;
    results = results.filter(r => {
      tokens += Math.ceil((r.key.length + r.value.length) / 4);
      return tokens <= tokenBudget;
    });
  }

  // Update access stats
  if (results.length) {
    const stmt = db.prepare('UPDATE semantic SET accessed = ?, access_count = access_count + 1 WHERE key = ?');
    for (const r of results) stmt.run(now, r.key);
  }

  return results;
}

// --- Hybrid async recall (FTS + vector RRF fusion) ---
//
// `embedder`      — sync trigram embedder (for the FTS candidate pass)
// `asyncEmbedder` — resolved strategy for the query/vector similarity
export async function recallAsync(db, embedder, asyncEmbedder, query, limit = 5, options = {}) {
  const { scope, type, tokenBudget } = options;

  try {
    const embed = asyncEmbedder;
    const queryVec = await embed.embed(query);

    // Path 1: FTS5 candidates (keyword match)
    const ftsCandidates = recall(db, embedder, query, limit * 3, options);

    // Path 2: Vector candidates (semantic match on stored embeddings)
    let vecCandidates = [];
    let vecSql = 'SELECT key, value, type, scope, decay_score, reinforced, trust_score, grounded, embedding FROM semantic WHERE embedding IS NOT NULL AND decay_score > 0.1';
    const params = [];
    if (type) { vecSql += ' AND type = ?'; params.push(type); }
    if (scope) { vecSql += ' AND scope = ?'; params.push(scope); }
    vecSql += ' ORDER BY decay_score DESC LIMIT 300';
    const vecRows = db.prepare(vecSql).all(...params);

    for (const r of vecRows) {
      if (!r.embedding || r.embedding.byteLength < 4) continue;
      const dim = r.embedding.byteLength / 4;
      if (dim !== queryVec.length) continue;
      const vec = new Float32Array(r.embedding.buffer, r.embedding.byteOffset, dim);
      const s = embed.cosineSim(queryVec, vec);
      if (s > 0.2) vecCandidates.push({ ...r, vecScore: s, embedding: undefined });
    }
    vecCandidates.sort((a, b) => b.vecScore - a.vecScore);

    // If no stored embeddings exist yet, fall back to reranking FTS candidates
    if (!vecCandidates.length && ftsCandidates.length) {
      const reranked = [];
      for (const c of ftsCandidates) {
        const cVec = await embed.embed(c.value.slice(0, 200));
        const semScore = embed.cosineSim(queryVec, cVec);
        reranked.push({ ...c, relevance: semScore * (TYPE_BOOST[c.type] || 1.0) * (c.decay_score || 0.5) * (c.grounded ? 1.25 : 1.0) });
      }
      reranked.sort((a, b) => b.relevance - a.relevance);
      let results = reranked.slice(0, limit);
      return applyTokenBudget(results, tokenBudget);
    }

    // RRF fusion: merge both ranked lists with vector score weighting
    const K = 60;
    const scoreMap = new Map();

    for (let i = 0; i < ftsCandidates.length; i++) {
      const key = ftsCandidates[i].key;
      scoreMap.set(key, (scoreMap.get(key) || 0) + 1 / (K + i + 1));
      if (!scoreMap.has(`_data_${key}`)) scoreMap.set(`_data_${key}`, ftsCandidates[i]);
    }
    for (let i = 0; i < Math.min(vecCandidates.length, limit * 3); i++) {
      const key = vecCandidates[i].key;
      const vecWeight = 1 + vecCandidates[i].vecScore;
      scoreMap.set(key, (scoreMap.get(key) || 0) + vecWeight / (K + i + 1));
      if (!scoreMap.has(`_data_${key}`)) scoreMap.set(`_data_${key}`, vecCandidates[i]);
    }

    const merged = [];
    for (const [k, s] of scoreMap) {
      if (k.startsWith('_data_')) continue;
      const data = scoreMap.get(`_data_${k}`);
      if (data) merged.push({ ...data, relevance: relevanceScore(s, data, scope) });
    }
    merged.sort((a, b) => b.relevance - a.relevance);

    let results = merged.slice(0, limit);
    return applyTokenBudget(results, tokenBudget);
  } catch {
    return recall(db, embedder, query, limit, options);
  }
}

// --- Simple queries ---

export function baseline(db, tokenBudget = 500) {
  const results = db.prepare(`
    SELECT key, value, type, scope FROM semantic
    WHERE (type IN ('policy', 'architecture', 'preference') OR confidence >= 1.0) AND decay_score > 0.3
    ORDER BY CASE type WHEN 'policy' THEN 1 WHEN 'architecture' THEN 2 WHEN 'preference' THEN 3 ELSE 4 END, reinforced DESC
  `).all();
  return applyTokenBudget(results, tokenBudget);
}

export function scoped(db, filePath, limit = 5) {
  if (!filePath) return [];
  const dir = filePath.split('/').slice(0, -1).join('/');
  return db.prepare(`
    SELECT key, value, type, scope FROM semantic
    WHERE scope != '' AND (scope = ? OR scope = ? OR ? LIKE scope || '%')
    ORDER BY decay_score DESC, reinforced DESC LIMIT ?
  `).all(filePath, dir, filePath, limit);
}

export function count(db) {
  return db.prepare('SELECT COUNT(*) as n FROM semantic').get().n;
}

export function getAll(db) {
  return db.prepare('SELECT key, value, confidence, source, type, scope, updated, reinforced, decay_score FROM semantic ORDER BY updated DESC').all();
}
