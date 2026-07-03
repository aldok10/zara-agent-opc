// tools/memory/semantic-store.mjs — Adapter pattern for Zara's semantic memory.
//
// One interface, two backends. The active backend is chosen by ZARA_VECTOR:
//   'sqlite' (default) → SqliteSemanticStore  (FTS5 + trigram + in-DB vectors)
//   'chroma'           → ChromaSemanticStore  (KNN + metadata in Chroma)
//
// Both adapters implement the SAME async contract, so callers never branch on
// backend. Whatever SQLite does — dedup, trust calibration, decay, contradiction
// detection, pattern delete — Chroma does too, reimplemented against its API.
//
// Episodic, procedural, and knowledge layers are NOT part of this adapter; they
// stay in SQLite regardless of backend (they don't use vector similarity).
//
// Contract (all methods async):
//   learn(key, value, {source,type,scope,agent,grounded})  → {key,value,reinforced,type,deduped?}
//   recall(query, limit, {scope,type,tokenBudget})          → [row]
//   baseline(tokenBudget)                                    → [row]
//   scoped(filePath, limit)                                  → [row]
//   getAll()                                                 → [row]
//   count()                                                  → number
//   deleteByPattern(pattern)                                 → {semantic, error?}
//   countByPattern(pattern)                                  → number
//   adjustTrust(keys, outcome)                               → {adjusted, delta?}
//   detectContradictions(threshold)                          → [{a,b,type,sim,...}]
//   applyDecay()                                             → {total, decayed}
//   dreamConsolidateSemantic()                               → {merged, archived}
//   exportAll()                                              → {key: {...}}
//
// A `row` is: {key, value, confidence, source, type, scope, updated, reinforced,
//              decay_score, trust_score, grounded, vecScore?}

import fs from 'node:fs';
import path from 'node:path';
import { CHROMA_ENABLED, getVectorStore } from '../vector-store.mjs';
import { SemanticEmbedder } from '../embedder.mjs';

// --- Shared domain constants (single source of truth) ---

export const VALID_TYPES = ['policy', 'workflow', 'pitfall', 'architecture', 'decision', 'preference', 'fact'];
export const TYPE_BOOST = { policy: 1.5, pitfall: 1.4, architecture: 1.3, decision: 1.2, workflow: 1.1, preference: 1.0, fact: 0.9 };
const POLICY_TYPES = new Set(['policy', 'architecture', 'preference']);

export function sourceCeiling(source) {
  if (source === 'user_explicit') return 1.0;
  if (source === 'observed') return 0.85;
  if (source === 'inferred') return 0.7;
  return 0.5;
}

export function confidenceForSource(source) {
  return source === 'user_explicit' ? 1.0 : source === 'external_unverified' ? 0.5 : 0.8;
}

export function escapeLike(s) { return s.replace(/[%_]/g, c => `\\${c}`); }

const today = () => new Date().toISOString().split('T')[0];

// Relevance score shared by both backends so ranking stays identical.
// `sim` is the raw similarity (FTS rank-derived or cosine); the rest come from metadata.
export function relevanceScore(sim, { type, decay_score, reinforced, scope, trust_score, grounded } = {}, queryScope = null) {
  const typeBoost = TYPE_BOOST[type] || 1.0;
  const decayFactor = decay_score || 0.5;
  const reinforceFactor = Math.min(2.0, 1 + Math.log2((reinforced || 1) + 1) * 0.2);
  const scopeBoost = (queryScope && scope && scope === queryScope) ? 1.5 : 1.0;
  const trustFactor = 0.5 + (trust_score ?? 0.5);
  const groundedFactor = grounded ? 1.25 : 1.0;
  return sim * typeBoost * decayFactor * reinforceFactor * scopeBoost * trustFactor * groundedFactor;
}

// Apply a token budget filter to an ordered result list.
export function applyTokenBudget(results, tokenBudget) {
  if (!tokenBudget) return results;
  let tokens = 0;
  return results.filter(r => {
    tokens += Math.ceil((r.key.length + r.value.length) / 4);
    return tokens <= tokenBudget;
  });
}

// Half-lives (days) and per-type trust decay rates — shared decay policy.
const HALF_LIFE = { policy: Infinity, architecture: Infinity, workflow: 180, decision: 90, preference: 90, pitfall: 90, fact: 60 };
const TRUST_DECAY_RATE = { fact: 0.03, decision: 0.02, workflow: 0.02, preference: 0.01, pitfall: 0.01 };

export function computeDecay(row, now = Date.now()) {
  const hl = HALF_LIFE[row.type] || 60;
  if (hl === Infinity) return { decay_score: 1.0, trust_score: row.trust_score };
  const daysSince = (now - new Date(row.accessed || row.updated).getTime()) / 86400000;
  const rawDecay = Math.pow(0.5, daysSince / hl);
  const boost = Math.log2((row.access_count || 0) + (row.reinforced || 1) + 1);
  const decay_score = Math.min(1.0, rawDecay * (1 + boost * 0.1));
  let trust_score = row.trust_score;
  const trustRate = TRUST_DECAY_RATE[row.type] || 0;
  if (trustRate > 0 && daysSince >= 30) {
    trust_score = Math.max(0.2, (row.trust_score ?? 0.5) - trustRate);
  }
  return { decay_score, trust_score };
}

// ============================================================================
// SQLite adapter — thin delegate over the MemoryStore's existing SQLite logic.
// The concrete SQL lives in memory-db.mjs; this adapter exposes it through the
// async contract by wrapping the (mostly sync) store methods.
// ============================================================================

export class SqliteSemanticStore {
  #store;
  constructor(store) { this.#store = store; }

  get backend() { return 'sqlite'; }

  async learn(key, value, opts = {}) {
    return this.#store._sqliteLearn(key, value, opts);
  }

  async recall(query, limit = 5, options = {}) {
    // Primary recall: strict FTS5 + trigram with grounded/decay/trust-aware scoring.
    return this.#store._sqliteRecall(query, limit, options);
  }

  // Hybrid FTS + vector fusion (SQLite-only enhancement, used by recallAsync export).
  async recallHybrid(query, limit = 5, options = {}) {
    return this.#store._sqliteRecallAsync(query, limit, options);
  }

  async baseline(tokenBudget = 500) {
    return this.#store._sqliteBaseline(tokenBudget);
  }

  async scoped(filePath, limit = 5) {
    return this.#store._sqliteScoped(filePath, limit);
  }

  async getAll() {
    return this.#store._sqliteGetAll();
  }

  async count() {
    return this.#store._sqliteCount();
  }

  async deleteByPattern(pattern) {
    return this.#store._sqliteDeleteSemantic(pattern);
  }

  async countByPattern(pattern) {
    return this.#store._sqliteCountSemantic(pattern);
  }

  async adjustTrust(keys, outcome) {
    return this.#store._sqliteAdjustTrust(keys, outcome);
  }

  async detectContradictions(threshold = 0.92) {
    return this.#store._sqliteDetectContradictions(threshold);
  }

  async applyDecay() {
    return this.#store._sqliteApplyDecay();
  }

  async dreamConsolidateSemantic() {
    return this.#store._sqliteDreamSemantic();
  }

  async exportAll() {
    return this.#store._sqliteExportSemantic();
  }
}

// ============================================================================
// Chroma adapter — full parity implementation against the Chroma vector store.
// Metadata values are stored as strings (Chroma requires scalar metadata); we
// (de)serialize numeric/boolean fields at the boundary.
// ============================================================================

const MAX_SCAN = 10000; // upper bound when we must pull all entries client-side

export class ChromaSemanticStore {
  #vectorStore;
  #embedder;
  #home;
  #trustBudget = 0;

  constructor(vectorStore, embedder, home) {
    this.#vectorStore = vectorStore;
    this.#embedder = embedder;
    this.#home = home;
  }

  get backend() { return 'chroma'; }

  #embed(text) {
    return this.#embedder.embed(text);
  }

  // Serialize a full memory row into Chroma's string-scalar metadata map.
  #toMetadata(row) {
    return {
      key: row.key,
      value: row.value,
      confidence: String(row.confidence),
      source: row.source,
      type: row.type,
      scope: row.scope || '',
      agent: row.agent || '',
      grounded: row.grounded ? '1' : '0',
      trust_score: String(row.trust_score),
      decay_score: String(row.decay_score),
      reinforced: String(row.reinforced),
      access_count: String(row.access_count || 0),
      created: row.created,
      updated: row.updated,
      accessed: row.accessed || '',
    };
  }

  // Deserialize Chroma metadata back into a typed row.
  #fromMetadata(m, key) {
    return {
      key: m.key || key,
      value: m.value || '',
      confidence: parseFloat(m.confidence ?? '0.8'),
      source: m.source || 'observed',
      type: m.type || 'fact',
      scope: m.scope || '',
      agent: m.agent || '',
      grounded: m.grounded === '1',
      trust_score: parseFloat(m.trust_score ?? '0.5'),
      decay_score: parseFloat(m.decay_score ?? '1.0'),
      reinforced: parseInt(m.reinforced ?? '1', 10),
      access_count: parseInt(m.access_count ?? '0', 10),
      created: m.created || '',
      updated: m.updated || '',
      accessed: m.accessed || '',
    };
  }

  async learn(key, value, opts = {}) {
    const { source = 'observed', type = 'fact', scope = '', agent = '', grounded = false } = opts;
    const memType = VALID_TYPES.includes(type) ? type : 'fact';
    const now = today();
    const vec = await this.#embed(`${key}: ${value}`.slice(0, 200));

    // Fetch existing entry to reinforce counters / boost trust on reconfirm.
    const existing = await this.#getOne(key);

    // Dedup: KNN against the new value, same-type, sim > 0.95 → reinforce instead.
    if (!existing && value.length > 10) {
      const hits = await this.#vectorStore.query(vec, 5, { type: memType });
      for (const h of hits) {
        if (h.score > 0.95 && h.metadata && h.key !== key) {
          const dupRow = this.#fromMetadata(h.metadata, h.key);
          dupRow.reinforced += 1;
          dupRow.decay_score = 1.0;
          dupRow.updated = now;
          await this.#vectorStore.updateMetadata(h.key, this.#toMetadata(dupRow));
          return { key: h.key, value: dupRow.value, reinforced: -1, type: memType, deduped: true };
        }
      }
    }

    const reinforced = (existing?.reinforced || 0) + 1;
    let trust_score = existing?.trust_score ?? (source === 'user_explicit' ? 1.0 : 0.5);
    // User-reconfirms: boost trust when overwriting with an explicit statement.
    if (existing && source === 'user_explicit') {
      const ceiling = sourceCeiling('user_explicit');
      trust_score = Math.max(0.2, Math.min(ceiling, (existing.trust_score ?? 0.5) + 0.15));
    }

    const row = {
      key, value,
      confidence: confidenceForSource(source),
      source, type: memType, scope, agent, grounded,
      trust_score, decay_score: 1.0, reinforced,
      access_count: existing?.access_count || 0,
      created: existing?.created || now, updated: now, accessed: existing?.accessed || '',
    };
    await this.#vectorStore.upsert(key, vec, this.#toMetadata(row));
    return { key, value, reinforced, type: memType };
  }

  async #getOne(key) {
    try {
      const entries = await this.#vectorStore.getAll({ key }, 1);
      if (entries.length) return this.#fromMetadata(entries[0].metadata, entries[0].key);
    } catch {}
    return null;
  }

  async recall(query, limit = 5, options = {}) {
    const { scope, type, tokenBudget } = options;
    const queryVec = await this.#embed(query);
    const where = {};
    if (type) where.type = type;
    if (scope) where.scope = scope;
    const hits = await this.#vectorStore.query(queryVec, limit * 3, Object.keys(where).length ? where : null);

    let results = hits
      .filter(h => h.score > 0.2 && h.metadata)
      .map(h => {
        const row = this.#fromMetadata(h.metadata, h.key);
        return { ...row, vecScore: h.score, relevance: relevanceScore(h.score, row, scope) };
      });

    results.sort((a, b) => b.relevance - a.relevance);
    results = results.slice(0, limit);
    results = applyTokenBudget(results, tokenBudget);

    // Update access stats (fire-and-forget — never block recall).
    for (const r of results) {
      const meta = this.#toMetadata({ ...r, access_count: (r.access_count || 0) + 1, accessed: today() });
      this.#vectorStore.updateMetadata(r.key, meta).catch(() => {});
    }
    return results;
  }

  // Chroma has no separate hybrid path — KNN is already the primary retrieval.
  async recallHybrid(query, limit = 5, options = {}) {
    return this.recall(query, limit, options);
  }

  async baseline(tokenBudget = 500) {
    const all = await this.#vectorStore.getAll(null, MAX_SCAN);
    const rows = all
      .map(e => this.#fromMetadata(e.metadata, e.key))
      .filter(r => (POLICY_TYPES.has(r.type) || r.confidence >= 1.0) && r.decay_score > 0.3)
      .sort((a, b) => {
        const rank = { policy: 1, architecture: 2, preference: 3 };
        const ra = rank[a.type] || 4, rb = rank[b.type] || 4;
        return ra !== rb ? ra - rb : b.reinforced - a.reinforced;
      });
    return applyTokenBudget(rows, tokenBudget);
  }

  async scoped(filePath, limit = 5) {
    if (!filePath) return [];
    const dir = filePath.split('/').slice(0, -1).join('/');
    const all = await this.#vectorStore.getAll(null, MAX_SCAN);
    return all
      .map(e => this.#fromMetadata(e.metadata, e.key))
      .filter(r => r.scope && (r.scope === filePath || r.scope === dir || filePath.startsWith(r.scope)))
      .sort((a, b) => (b.decay_score - a.decay_score) || (b.reinforced - a.reinforced))
      .slice(0, limit);
  }

  async getAll() {
    const all = await this.#vectorStore.getAll(null, MAX_SCAN);
    return all.map(e => this.#fromMetadata(e.metadata, e.key));
  }

  async count() {
    return this.#vectorStore.count();
  }

  async deleteByPattern(pattern) {
    const all = await this.#vectorStore.getAll(null, MAX_SCAN);
    const match = all.filter(e =>
      (e.metadata.key || e.key).includes(pattern) || (e.metadata.value || '').includes(pattern)
    );
    if (match.length > 50) return { error: 'Pattern too broad', semantic: match.length, total: match.length };
    // Audit log (Constitution P7)
    try {
      const auditFile = path.join(this.#home, 'memory-deletes.jsonl');
      fs.appendFileSync(auditFile, JSON.stringify({ pattern, ts: new Date().toISOString(), backend: 'chroma', semantic: match.map(e => e.key) }) + '\n');
    } catch {}
    await this.#vectorStore.removeMany(match.map(e => e.key));
    return { semantic: match.length };
  }

  async countByPattern(pattern) {
    const all = await this.#vectorStore.getAll(null, MAX_SCAN);
    return all.filter(e =>
      (e.metadata.key || e.key).includes(pattern) || (e.metadata.value || '').includes(pattern)
    ).length;
  }

  async adjustTrust(keys, outcome) {
    const delta = outcome === 'success' ? 0.1 : outcome === 'failure' ? -0.15 : 0.0;
    if (!delta || !keys.length) return { adjusted: 0 };
    if (delta > 0 && this.#trustBudget >= 5) return { adjusted: 0, budgetExceeded: true };
    let adjusted = 0;
    for (const key of keys) {
      const row = await this.#getOne(key);
      if (!row) continue;
      const ceiling = sourceCeiling(row.source);
      row.trust_score = Math.max(0.2, Math.min(ceiling, (row.trust_score ?? 0.5) + delta));
      await this.#vectorStore.updateMetadata(key, this.#toMetadata(row));
      adjusted++;
    }
    if (delta > 0 && adjusted) this.#trustBudget++;
    return { adjusted, delta };
  }

  async detectContradictions(threshold = 0.92) {
    const all = await this.#vectorStore.getAll(null, MAX_SCAN, 0, true);
    const rows = all
      .filter(e => !/^(knowledge\.|kb_|auto\.)/.test(e.key))
      .map(e => {
        const row = this.#fromMetadata(e.metadata, e.key);
        return { ...row, vec: e.embedding, norm: row.value.toLowerCase().replace(/\s+/g, ' ').trim() };
      })
      .filter(r => r.vec);

    const byType = new Map();
    for (const r of rows) {
      if (!byType.has(r.type)) byType.set(r.type, []);
      byType.get(r.type).push(r);
    }

    const flagged = [];
    for (const group of byType.values()) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i], b = group[j];
          if (a.norm === b.norm) continue;
          if (a.norm.includes(b.norm) || b.norm.includes(a.norm)) continue;
          const sim = this.#embedder.cosineSim(a.vec, b.vec);
          if (sim >= threshold) {
            flagged.push({ a: a.key, b: b.key, type: a.type, sim, trust_a: a.trust_score, trust_b: b.trust_score });
          }
        }
      }
    }
    return flagged;
  }

  async applyDecay() {
    const all = await this.#vectorStore.getAll(null, MAX_SCAN);
    const now = Date.now();
    let decayed = 0;
    for (const e of all) {
      const row = this.#fromMetadata(e.metadata, e.key);
      const { decay_score, trust_score } = computeDecay(row, now);
      if (decay_score !== row.decay_score || trust_score !== row.trust_score) {
        row.decay_score = decay_score;
        row.trust_score = trust_score;
        await this.#vectorStore.updateMetadata(e.key, this.#toMetadata(row));
      }
      if (decay_score < 0.1) decayed++;
    }
    return { total: all.length, decayed };
  }

  async dreamConsolidateSemantic() {
    const all = await this.#vectorStore.getAll(null, MAX_SCAN);
    const rows = all.map(e => this.#fromMetadata(e.metadata, e.key)).sort((a, b) => b.reinforced - a.reinforced);
    const results = { merged: 0, archived: 0 };

    // Merge exact-normalized duplicates → reinforce the survivor, remove the rest.
    const seen = new Map();
    const toDelete = [];
    for (const row of rows) {
      const norm = row.value.toLowerCase().replace(/\s+/g, ' ').trim();
      if (seen.has(norm)) {
        const survivor = seen.get(norm);
        survivor.reinforced += (row.reinforced || 1);
        await this.#vectorStore.updateMetadata(survivor.key, this.#toMetadata(survivor));
        toDelete.push(row.key);
        results.merged++;
      } else {
        seen.set(norm, row);
      }
    }

    // Archive stale (low decay, non-policy) → jsonl + remove.
    const stale = rows.filter(r => r.decay_score < 0.1 && !POLICY_TYPES.has(r.type));
    if (stale.length) {
      try {
        fs.appendFileSync(
          path.join(this.#home, 'memory-archive.jsonl'),
          stale.map(s => JSON.stringify({ key: s.key, value: s.value, archived: new Date().toISOString(), reason: 'dreamer-stale' })).join('\n') + '\n'
        );
      } catch {}
      toDelete.push(...stale.map(s => s.key));
      results.archived = stale.length;
    }

    if (toDelete.length) await this.#vectorStore.removeMany([...new Set(toDelete)]);
    return results;
  }

  async exportAll() {
    const all = await this.#vectorStore.getAll(null, MAX_SCAN);
    const out = {};
    for (const e of all) {
      const r = this.#fromMetadata(e.metadata, e.key);
      out[r.key] = { value: r.value, confidence: r.confidence, source: r.source, type: r.type, updated: r.updated, reinforced: r.reinforced };
    }
    return out;
  }
}

// ============================================================================
// Factory — pick the backend once per host, based on ZARA_VECTOR. The SQLite
// adapter delegates back into the MemoryStore that owns the DB connection.
// ============================================================================

const _byHost = new WeakMap();

// `sqliteHost` is the MemoryStore instance exposing the `_sqlite*` delegate methods.
export function getSemanticStore(sqliteHost) {
  const cached = _byHost.get(sqliteHost);
  if (cached) return cached;

  let store;
  if (CHROMA_ENABLED) {
    const vs = getVectorStore();
    if (vs) {
      store = new ChromaSemanticStore(vs, SemanticEmbedder.instance(), sqliteHost.home);
    } else {
      // Chroma flagged but unavailable → fall back to SQLite so memory still works.
      process.stderr.write('[semantic-store] ZARA_VECTOR=chroma but vector store unavailable; using SQLite.\n');
      store = new SqliteSemanticStore(sqliteHost);
    }
  } else {
    store = new SqliteSemanticStore(sqliteHost);
  }
  _byHost.set(sqliteHost, store);
  return store;
}

// Test hook: reset the memoized adapter for a host (used when swapping backends).
export function _resetSemanticStore(sqliteHost) {
  if (sqliteHost) _byHost.delete(sqliteHost);
}

