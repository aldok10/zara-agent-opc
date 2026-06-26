// Zara Memory Store — SQLite-backed cognitive memory with OOP design
//
// Architecture:
//   MemoryStore (singleton) — manages SQLite DB, FTS5 indexes, decay, consolidation
//   Layers: semantic (facts), episodic (events), procedural (workflows)
//   Features: type classification, scoped recall, token budget, trigram similarity, dreamer consolidation
//
// SOLID principles applied:
//   S: Each method has one responsibility
//   O: New memory types/features added without modifying existing methods
//   L: All recall methods return consistent shape
//   I: Exported functions expose minimal needed interface
//   D: DB operations abstracted behind class methods

import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { TrigramEmbedder, SemanticEmbedder } from './embedder.mjs';

// --- Value Objects ---

const VALID_TYPES = ['policy', 'workflow', 'pitfall', 'architecture', 'decision', 'preference', 'fact'];
const TYPE_BOOST = { policy: 1.5, pitfall: 1.4, architecture: 1.3, decision: 1.2, workflow: 1.1, preference: 1.0, fact: 0.9 };

function getSourceCeiling(source) {
  if (source === 'user_explicit') return 1.0;
  if (source === 'observed') return 0.85;
  if (source === 'inferred') return 0.7;
  return 0.5;
}

function escapeLike(s) { return s.replace(/[%_]/g, c => `\\${c}`); }

// Embedder selection: ZARA_EMBED=semantic|trigram (default: semantic with lazy init)
// Sync operations (learn dedup) always use TrigramEmbedder.
// Async operations (recallAsync) prefer SemanticEmbedder when ZARA_EMBED=semantic.
function createEmbedder() {
  const mode = process.env.ZARA_EMBED || 'semantic';
  // For sync paths (learn, recall), trigram is used regardless.
  // SemanticEmbedder is used in recallAsync path automatically.
  if (mode === 'trigram') return new TrigramEmbedder();
  // Even in semantic mode, return TrigramEmbedder for sync operations.
  // The recallAsync path already imports SemanticEmbedder dynamically.
  return new TrigramEmbedder();
}

// Export whether semantic mode is active (for recallAsync to decide)
export const SEMANTIC_MODE = (process.env.ZARA_EMBED || 'semantic') === 'semantic';

// --- MemoryStore Class ---

class MemoryStore {
  #db = null;
  #home;
  #dbPath;
  #embedder;
  #trustBudget = 0;

  constructor(home = path.join(os.homedir(), '.zara'), embedder = createEmbedder()) {
    this.#home = home;
    this.#dbPath = path.join(home, 'memory.db');
    this.#embedder = embedder;
  }

  // --- Lifecycle ---

  get db() {
    if (this.#db) return this.#db;
    fs.mkdirSync(this.#home, { recursive: true });
    try {
      this.#db = new DatabaseSync(this.#dbPath);
      const check = this.#db.prepare('PRAGMA integrity_check').get();
      if (check.integrity_check !== 'ok') throw new Error(`integrity: ${check.integrity_check}`);
    } catch (err) {
      process.stderr.write(`[zara-memory] DB issue: ${err.message}. Resetting.\n`);
      try { this.#db?.close(); } catch {}
      const backup = `${this.#dbPath}.corrupt.${Date.now()}`;
      if (fs.existsSync(this.#dbPath)) fs.renameSync(this.#dbPath, backup);
      for (const ext of ['-wal', '-shm']) {
        const f = this.#dbPath + ext;
        if (fs.existsSync(f)) fs.renameSync(f, backup + ext);
      }
      this.#db = new DatabaseSync(this.#dbPath);
    }
    this.#db.exec('PRAGMA journal_mode=WAL');
    this.#db.exec('PRAGMA synchronous=NORMAL');
    this.#initSchema();
    this.#migrate();
    return this.#db;
  }

  close() {
    if (this.#db) { this.#db.close(); this.#db = null; }
  }

  // --- Semantic Layer ---

  learn(key, value, source = 'observed', type = 'fact', scope = '', opts = {}) {
    // SECURITY (Constitution P6): `grounded` grants a recall-ranking boost and MUST be
    // set by internal trusted code only — NEVER threaded from agent-supplied tool args.
    // Do not expose `grounded` in the memory_learn MCP schema. See ZARA_CONSTITUTION.md.
    const { agent = '', grounded = false } = opts;
    const db = this.db;
    const now = new Date().toISOString().split('T')[0];
    const existing = db.prepare('SELECT reinforced FROM semantic WHERE key = ?').get(key);
    const reinforced = (existing?.reinforced || 0) + 1;
    const confidence = source === 'user_explicit' ? 1.0 : source === 'external_unverified' ? 0.5 : 0.8;
    const memType = VALID_TYPES.includes(type) ? type : 'fact';

    // Dedup check: if a semantically similar entry already exists (same type, high trigram sim), reinforce it instead
    if (!existing && value.length > 10) {
      const queryVec = this.#embedder.embed(value);
      const candidates = db.prepare('SELECT key, value FROM semantic WHERE type = ? LIMIT 100').all(memType);
      for (const c of candidates) {
        const sim = this.#embedder.cosineSim(queryVec, this.#embedder.embed(c.value));
        if (sim > 0.95) {
          db.prepare('UPDATE semantic SET reinforced = reinforced + 1, updated = ?, decay_score = 1.0 WHERE key = ?').run(now, c.key);
          return { key: c.key, value: c.value, reinforced: -1, type: memType, deduped: true };
        }
      }
    }

    db.prepare(`
      INSERT INTO semantic (key, value, confidence, source, type, scope, created, updated, reinforced, decay_score, agent, grounded)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1.0, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value, confidence = excluded.confidence, source = excluded.source,
        type = excluded.type, scope = excluded.scope, updated = excluded.updated,
        reinforced = ?, decay_score = 1.0, agent = excluded.agent, grounded = excluded.grounded
    `).run(key, value, confidence, source, memType, scope, now, now, reinforced, agent, grounded ? 1 : 0, reinforced);

    // Async: compute and store embedding (fire-and-forget, non-blocking)
    if (SEMANTIC_MODE) {
      import('./embedder.mjs').then(async mod => {
        try {
          const emb = mod.SemanticEmbedder.instance();
          const vec = await emb.embed(`${key}: ${value}`.slice(0, 200));
          db.prepare('UPDATE semantic SET embedding = ? WHERE key = ?').run(Buffer.from(vec.buffer), key);
        } catch {}
      }).catch(() => {});
    }

    // Async embed: store MiniLM-L6-v2 vector for hybrid recall (non-blocking)
    if (SEMANTIC_MODE) {
      this.#embedAsync(key, value).catch(() => {});
    }

    // User-reconfirms: if updating existing key with user_explicit source, boost trust
    if (existing && source === 'user_explicit') {
      const ceiling = getSourceCeiling('user_explicit');
      const cur = db.prepare('SELECT trust_score FROM semantic WHERE key = ?').get(key);
      const boosted = Math.max(0.2, Math.min(ceiling, (cur?.trust_score ?? 0.5) + 0.15));
      db.prepare('UPDATE semantic SET trust_score = ? WHERE key = ?').run(boosted, key);
    }

    return { key, value, reinforced, type: memType };
  }

  recall(query, limit = 5, options = {}) {
    const db = this.db;
    const now = new Date().toISOString().split('T')[0];
    const { scope, type, tokenBudget } = options;

    let results = this.#ftsSearch(query, limit * 3);

    // Trigram semantic fallback when FTS/LIKE finds nothing
    if (!results.length) {
      results = this.#trigramSearch(query, limit * 3);
    }

    // Relevance scoring
    results = results.map(r => {
      const typeBoost = TYPE_BOOST[r.type] || 1.0;
      const decayFactor = r.decay_score || 0.5;
      const reinforceFactor = Math.min(2.0, 1 + Math.log2((r.reinforced || 1) + 1) * 0.2);
      const scopeBoost = (scope && r.scope && r.scope === scope) ? 1.5 : 1.0;
      const trustFactor = 0.5 + (r.trust_score ?? 0.5);
      const groundedFactor = r.grounded ? 1.25 : 1.0;
      const ftsScore = r.rank ? Math.abs(1 / (r.rank || 1)) : (r.trigramSim || 0.5);
      return { ...r, relevance: ftsScore * typeBoost * decayFactor * reinforceFactor * scopeBoost * trustFactor * groundedFactor };
    });

    // Adaptive depth: FTS matched but the best hit is weak → widen with a
    // semantic trigram pass and merge, deduping by key. Cheap, no LLM.
    const WEAK = 0.4;
    const topRelevance = results.length ? Math.max(...results.map(r => r.relevance)) : 0;
    if (results.length && topRelevance < WEAK) {
      const extra = this.#trigramSearch(query, limit * 3).map(r => {
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

  async recallAsync(query, limit = 5, options = {}) {
    const candidates = this.recall(query, limit * 3, options);
    if (!candidates.length) return candidates;
    try {
      // Always use SemanticEmbedder in async path when SEMANTIC_MODE is active
      let embedder = this.#embedder;
      if (SEMANTIC_MODE || embedder.constructor.name === 'TrigramEmbedder') {
        const mod = await import('./embedder.mjs');
        embedder = mod.SemanticEmbedder.instance();
      }
      const queryVec = await embedder.embed(query);
      const reranked = [];
      for (const c of candidates) {
        let semScore;
        // Use stored embedding if available (avoid re-computation)
        if (c.embedding && c.embedding.byteLength >= 4) {
          const cVec = new Float32Array(c.embedding.buffer, c.embedding.byteOffset, c.embedding.byteLength / 4);
          semScore = embedder.cosineSim(queryVec, cVec);
        } else {
          const cVec = await embedder.embed(c.value.slice(0, 200));
          semScore = embedder.cosineSim(queryVec, cVec);
        }
        reranked.push({ ...c, relevance: semScore * (TYPE_BOOST[c.type] || 1.0) * (c.decay_score || 0.5) * (c.grounded ? 1.25 : 1.0) });
      }
      return reranked.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
    } catch {
      return candidates.slice(0, limit);
    }
  }

  baseline(tokenBudget = 500) {
    const results = this.db.prepare(`
      SELECT key, value, type, scope FROM semantic
      WHERE (type IN ('policy', 'architecture', 'preference') OR confidence >= 1.0) AND decay_score > 0.3
      ORDER BY CASE type WHEN 'policy' THEN 1 WHEN 'architecture' THEN 2 WHEN 'preference' THEN 3 ELSE 4 END, reinforced DESC
    `).all();
    let tokens = 0;
    return results.filter(r => { tokens += Math.ceil((r.key.length + r.value.length) / 4); return tokens <= tokenBudget; });
  }

  scoped(filePath, limit = 5) {
    if (!filePath) return [];
    const dir = filePath.split('/').slice(0, -1).join('/');
    return this.db.prepare(`
      SELECT key, value, type, scope FROM semantic
      WHERE scope != '' AND (scope = ? OR scope = ? OR ? LIKE scope || '%')
      ORDER BY decay_score DESC, reinforced DESC LIMIT ?
    `).all(filePath, dir, filePath, limit);
  }

  semanticCount() { return this.db.prepare('SELECT COUNT(*) as n FROM semantic').get().n; }
  semanticGetAll() { return this.db.prepare('SELECT key, value, confidence, source, type, scope, updated, reinforced, decay_score FROM semantic ORDER BY updated DESC').all(); }

  // Async helper: compute and store embedding for a semantic memory
  async #embedAsync(key, text) {
    const embedder = SemanticEmbedder.instance();
    const vec = await embedder.embed(text);
    const buf = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
    this.db.prepare('UPDATE semantic SET embedding = ? WHERE key = ?').run(buf, key);
  }

  // Async helper: compute and store embedding for an episodic memory
  async #embedEpisodicAsync(id, text) {
    const embedder = SemanticEmbedder.instance();
    const vec = await embedder.embed(text);
    const buf = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
    this.db.prepare('UPDATE episodic SET embedding = ? WHERE id = ?').run(buf, id);
  }

  // --- Episodic Layer ---

  recordEpisode(event, outcome = '', tags = []) {
    const ts = new Date().toISOString();
    this.db.prepare('INSERT INTO episodic (event, outcome, tags, ts) VALUES (?, ?, ?, ?)').run(event, outcome, JSON.stringify(tags), ts);

    // Async embed for hybrid recall
    if (SEMANTIC_MODE) {
      const text = outcome ? `${event} ${outcome}` : event;
      const id = this.db.prepare('SELECT last_insert_rowid() as id').get().id;
      this.#embedEpisodicAsync(id, text).catch(() => {});
    }

    return { event, ts };
  }

  recallEpisodes(query, limit = 5) {
    try {
      const fts = query.split(/\s+/).map(t => `"${t.replace(/"/g, '')}"`).join(' OR ');
      return this.db.prepare(`SELECT e.id, e.event, e.outcome, e.tags, e.ts FROM episodic_fts f JOIN episodic e ON f.rowid = e.id WHERE episodic_fts MATCH ? ORDER BY rank LIMIT ?`).all(fts, limit);
    } catch {
      const terms = query.toLowerCase().split(/\s+/);
      const where = terms.map(() => "(LOWER(event) LIKE ? ESCAPE '\\' OR LOWER(outcome) LIKE ? ESCAPE '\\' OR LOWER(tags) LIKE ? ESCAPE '\\')").join(' OR ');
      return this.db.prepare(`SELECT id, event, outcome, tags, ts FROM episodic WHERE ${where} ORDER BY ts DESC LIMIT ?`).all(...terms.flatMap(t => { const e = `%${escapeLike(t)}%`; return [e, e, e]; }), limit);
    }
  }

  episodicCount() { return this.db.prepare('SELECT COUNT(*) as n FROM episodic').get().n; }

  // --- Procedural Layer ---

  saveProcedure(name, steps, context = '') {
    const now = new Date().toISOString().split('T')[0];
    const existing = this.db.prepare('SELECT uses FROM procedural WHERE name = ?').get(name);
    if (existing) {
      this.db.prepare('UPDATE procedural SET context = ?, steps = ?, updated = ? WHERE name = ?').run(context, JSON.stringify(steps), now, name);
    } else {
      this.db.prepare('INSERT INTO procedural (name, context, steps, uses, created, updated) VALUES (?, ?, ?, 0, ?, ?)').run(name, context, JSON.stringify(steps), now, now);
    }
    if (SEMANTIC_MODE) {
      import('./embedder.mjs').then(async mod => {
        try {
          const text = `${name}: ${context} ${steps.join(' ')}`.slice(0, 200);
          const vec = await mod.SemanticEmbedder.instance().embed(text);
          this.db.prepare('UPDATE procedural SET embedding = ? WHERE name = ?').run(Buffer.from(vec.buffer), name);
        } catch {}
      }).catch(() => {});
    }
    return { name, steps: steps.length };
  }

  recallProcedures(query, limit = 3) {
    try {
      const fts = query.split(/\s+/).map(t => `"${t.replace(/"/g, '')}"`).join(' OR ');
      return this.db.prepare(`SELECT p.id, p.name, p.context, p.steps, p.uses FROM procedural_fts f JOIN procedural p ON f.rowid = p.id WHERE procedural_fts MATCH ? ORDER BY rank LIMIT ?`).all(fts, limit);
    } catch {
      const terms = query.toLowerCase().split(/\s+/);
      const where = terms.map(() => "(LOWER(name) LIKE ? ESCAPE '\\' OR LOWER(context) LIKE ? ESCAPE '\\')").join(' OR ');
      return this.db.prepare(`SELECT id, name, context, steps, uses FROM procedural WHERE ${where} ORDER BY uses DESC LIMIT ?`).all(...terms.flatMap(t => { const e = `%${escapeLike(t)}%`; return [e, e]; }), limit);
    }
  }

  proceduralCount() { return this.db.prepare('SELECT COUNT(*) as n FROM procedural').get().n; }

  // --- Knowledge Layer ---

  knowledgeUpsert(key, section, title, summary, file, memType) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO knowledge (key, section, title, summary, file, mem_type, seeded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        section = excluded.section, title = excluded.title, summary = excluded.summary,
        file = excluded.file, mem_type = excluded.mem_type, seeded_at = excluded.seeded_at
    `).run(key, section, title, summary, file, memType, now);
  }

  knowledgeBySection(section) {
    return this.db.prepare('SELECT key, title, summary, file, mem_type FROM knowledge WHERE section = ? ORDER BY title').all(section);
  }

  knowledgeSearch(query) {
    const like = `%${escapeLike(query)}%`;
    return this.db.prepare("SELECT key, section, title, summary, file, mem_type FROM knowledge WHERE title LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\' OR key LIKE ? ESCAPE '\\' LIMIT 30").all(like, like, like);
  }

  knowledgeSections() {
    return this.db.prepare('SELECT section, COUNT(*) as count, MIN(mem_type) as mem_type FROM knowledge GROUP BY section ORDER BY section').all();
  }

  knowledgeCount() { return this.db.prepare('SELECT COUNT(*) as n FROM knowledge').get().n; }

  // --- Knowledge Chunk Layer (passage retrieval over article bodies) ---

  // Split an article body into ~maxWords-sized passages on paragraph boundaries.
  chunkText(body, maxWords = 220) {
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

  // Replace all chunks for an article key with freshly embedded passages.
  knowledgeChunkUpsert(key, section, body) {
    const db = this.db;
    const chunks = this.chunkText(body);
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

  // Cosine-search article passages. Optional section pre-filter (Minds-style metadata filter before ranking).
  knowledgeChunkSearch(query, section = '', k = 5) {
    const db = this.db;
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

  knowledgeChunkCount() { return this.db.prepare('SELECT COUNT(*) as n FROM knowledge_chunks').get().n; }

  // Async chunk upsert using any embedder (for SemanticEmbedder which is async)
  async knowledgeChunkUpsertAsync(key, section, body, embedder) {
    const db = this.db;
    const chunks = this.chunkText(body);
    db.prepare('DELETE FROM knowledge_chunks WHERE key = ?').run(key);
    if (!chunks.length) return { key, chunks: 0 };
    const stmt = db.prepare('INSERT INTO knowledge_chunks (key, section, chunk_index, text, embedding) VALUES (?, ?, ?, ?, ?)');
    for (let i = 0; i < chunks.length; i++) {
      const vec = await embedder.embed(chunks[i]);
      const buf = Buffer.from(new Float32Array(vec).buffer);
      stmt.run(key, section, i, chunks[i], buf);
    }
    return { key, chunks: chunks.length };
  }

  // Async chunk search using any embedder
  async knowledgeChunkSearchAsync(query, embedder, section = '', k = 5) {
    const db = this.db;
    const queryVec = await embedder.embed(query);
    const queryDim = queryVec.length;
    const rows = section
      ? db.prepare('SELECT key, section, chunk_index, text, embedding FROM knowledge_chunks WHERE section = ?').all(section)
      : db.prepare('SELECT key, section, chunk_index, text, embedding FROM knowledge_chunks').all();
    const results = [];
    for (const r of rows) {
      const storedDim = r.embedding.byteLength / 4;
      if (storedDim !== queryDim) continue; // skip dimension-mismatched chunks (need re-index)
      const vec = new Float32Array(r.embedding.buffer, r.embedding.byteOffset, storedDim);
      const score = embedder.cosineSim(queryVec, vec);
      if (score > 0.1) results.push({ key: r.key, section: r.section, chunk_index: r.chunk_index, text: r.text, score });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, k);
  }

  // --- Contradiction Detection (semantic, not just exact-string) ---

  // Find pairs of same-type memories that are highly similar but not identical —
  // likely contradictions (e.g. "prefers X" vs "switched to Y"). Flags, does not merge.
  detectContradictions(threshold = 0.85) {
    const db = this.db;
    // Exclude seeded knowledge entries — only user/agent facts matter here.
    const rows = db.prepare(`
      SELECT key, value, type, trust_score FROM semantic
      WHERE key NOT LIKE 'knowledge.%' AND key NOT LIKE 'kb_%'
    `).all();

    const byType = new Map();
    for (const r of rows) {
      if (!byType.has(r.type)) byType.set(r.type, []);
      byType.get(r.type).push({ ...r, vec: this.#embedder.embed(r.value), norm: r.value.toLowerCase().replace(/\s+/g, ' ').trim() });
    }

    const flagged = [];
    for (const group of byType.values()) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i], b = group[j];
          if (a.norm === b.norm) continue; // identical → handled by dreamConsolidate merge
          if (a.norm.includes(b.norm) || b.norm.includes(a.norm)) continue; // subset → not a conflict
          const sim = this.#embedder.cosineSim(a.vec, b.vec);
          if (sim >= threshold) flagged.push({ a: a.key, b: b.key, type: a.type, sim, trust_a: a.trust_score ?? 0.5, trust_b: b.trust_score ?? 0.5 });
        }
      }
    }
    return flagged;
  }

  // Async version using SemanticEmbedder for real semantic comparison (far fewer false positives)
  async detectContradictionsAsync(threshold = 0.92) {
    const db = this.db;
    const rows = db.prepare(`
      SELECT key, value, type, trust_score FROM semantic
      WHERE key NOT LIKE 'knowledge.%' AND key NOT LIKE 'kb_%' AND key NOT LIKE 'auto.%'
    `).all();

    let embedder;
    try {
      const { SemanticEmbedder } = await import('./embedder.mjs');
      embedder = SemanticEmbedder.instance();
    } catch { return this.detectContradictions(threshold); }

    const byType = new Map();
    for (const r of rows) {
      if (!byType.has(r.type)) byType.set(r.type, []);
      const vec = await embedder.embed(r.value.slice(0, 200));
      const norm = r.value.toLowerCase().replace(/\s+/g, ' ').trim();
      byType.get(r.type).push({ ...r, vec, norm });
    }

    const flagged = [];
    for (const group of byType.values()) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i], b = group[j];
          if (a.norm === b.norm) continue;
          if (a.norm.includes(b.norm) || b.norm.includes(a.norm)) continue;
          const sim = embedder.cosineSim(a.vec, b.vec);
          if (sim >= threshold) flagged.push({ a: a.key, b: b.key, type: a.type, sim, trust_a: a.trust_score ?? 0.5, trust_b: b.trust_score ?? 0.5 });
        }
      }
    }
    return flagged;
  }

  // --- Maintenance ---

  applyDecay() {
    const HALF_LIFE = { policy: Infinity, architecture: Infinity, workflow: 180, decision: 90, preference: 90, pitfall: 90, fact: 60 };
    const TRUST_DECAY_RATE = { fact: 0.03, decision: 0.02, workflow: 0.02, preference: 0.01, pitfall: 0.01 };
    const now = Date.now();
    const rows = this.db.prepare('SELECT key, type, updated, accessed, access_count, reinforced, trust_score FROM semantic').all();
    const stmt = this.db.prepare('UPDATE semantic SET decay_score = ? WHERE key = ?');
    const trustStmt = this.db.prepare('UPDATE semantic SET trust_score = ? WHERE key = ?');
    let decayed = 0;
    for (const row of rows) {
      const hl = HALF_LIFE[row.type] || 60;
      if (hl === Infinity) { stmt.run(1.0, row.key); continue; }
      const daysSince = (now - new Date(row.accessed || row.updated).getTime()) / 86400000;
      const rawDecay = Math.pow(0.5, daysSince / hl);
      const boost = Math.log2((row.access_count || 0) + (row.reinforced || 1) + 1);
      const score = Math.min(1.0, rawDecay * (1 + boost * 0.1));
      stmt.run(score, row.key);
      if (score < 0.1) decayed++;
      // Trust decay: subtract per-type rate for 30+ days untouched
      const trustRate = TRUST_DECAY_RATE[row.type] || 0;
      if (trustRate > 0 && daysSince >= 30) {
        const newTrust = Math.max(0.2, (row.trust_score ?? 0.5) - trustRate);
        trustStmt.run(newTrust, row.key);
      }
    }
    this.#decayEpisodic();
    return { total: rows.length, decayed };
  }

  #decayEpisodic() {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    this.db.prepare("DELETE FROM episodic WHERE ts < ? AND access_count = 0").run(cutoff);
  }

  consolidate(minDecayScore = 0.05) {
    const weak = this.db.prepare('SELECT key, value, decay_score FROM semantic WHERE decay_score < ?').all(minDecayScore);
    if (!weak.length) return { archived: 0 };
    const archiveFile = path.join(this.#home, 'memory-archive.jsonl');
    fs.appendFileSync(archiveFile, weak.map(w => JSON.stringify({ key: w.key, value: w.value, archived: new Date().toISOString() })).join('\n') + '\n');
    // Rotate archive: keep last 2000 entries
    try {
      const lines = fs.readFileSync(archiveFile, 'utf-8').trim().split('\n');
      if (lines.length > 2000) fs.writeFileSync(archiveFile, lines.slice(-2000).join('\n') + '\n');
    } catch {}
    const stmt = this.db.prepare('DELETE FROM semantic WHERE key = ?');
    for (const w of weak) stmt.run(w.key);
    return { archived: weak.length };
  }

  dreamConsolidate() {
    const db = this.db;
    const results = { merged: 0, archived: 0, reinforced: 0 };

    // Merge duplicates
    const all = db.prepare('SELECT key, value, reinforced, decay_score, type FROM semantic ORDER BY reinforced DESC').all();
    const seen = new Map();
    const toDelete = [];
    for (const row of all) {
      const norm = row.value.toLowerCase().replace(/\s+/g, ' ').trim();
      if (seen.has(norm)) {
        db.prepare('UPDATE semantic SET reinforced = reinforced + ? WHERE key = ?').run(row.reinforced || 1, seen.get(norm).key);
        toDelete.push(row.key);
        results.merged++;
      } else { seen.set(norm, row); }
    }
    const delStmt = db.prepare('DELETE FROM semantic WHERE key = ?');
    for (const k of toDelete) delStmt.run(k);

    // Archive stale
    const stale = db.prepare(`SELECT key, value FROM semantic WHERE decay_score < 0.1 AND type NOT IN ('policy','architecture','preference') AND (accessed IS NULL OR julianday('now') - julianday(accessed) > 60)`).all();
    if (stale.length) {
      fs.appendFileSync(path.join(this.#home, 'memory-archive.jsonl'), stale.map(s => JSON.stringify({ key: s.key, value: s.value, archived: new Date().toISOString(), reason: 'dreamer-stale' })).join('\n') + '\n');
      for (const s of stale) delStmt.run(s.key);
      results.archived = stale.length;
    }

    // Promote recurring episodic topics
    const episodes = db.prepare('SELECT event, outcome FROM episodic ORDER BY ts DESC LIMIT 100').all();
    const freq = new Map();
    for (const ep of episodes) {
      for (const w of new Set(`${ep.event} ${ep.outcome}`.toLowerCase().split(/\s+/).filter(w => w.length > 4))) {
        freq.set(w, (freq.get(w) || 0) + 1);
      }
    }
    for (const [topic, count] of freq) {
      if (count >= 5 && !db.prepare('SELECT key FROM semantic WHERE LOWER(key) LIKE ?').get(`%${topic}%`)) {
        const best = episodes.find(ep => `${ep.event} ${ep.outcome}`.toLowerCase().includes(topic));
        if (best) { this.learn(`auto.${topic}`, `Recurring: ${best.event}`, 'inferred', 'fact', ''); results.reinforced++; }
      }
    }
    return results;
  }

  // --- Delete ---

  deleteByPattern(pattern) {
    const db = this.db;
    const like = `%${escapeLike(pattern)}%`;
    const semantic = db.prepare('SELECT key FROM semantic WHERE key LIKE ? OR value LIKE ?').all(like, like);
    const episodic = db.prepare('SELECT id FROM episodic WHERE event LIKE ? OR outcome LIKE ?').all(like, like);
    const procedural = db.prepare('SELECT id FROM procedural WHERE name LIKE ? OR context LIKE ?').all(like, like);
    const total = semantic.length + episodic.length + procedural.length;
    if (total > 50) return { error: 'Pattern too broad', semantic: semantic.length, episodic: episodic.length, procedural: procedural.length, total };
    // Audit log (append-only, Constitution P7)
    const auditFile = path.join(this.#home, 'memory-deletes.jsonl');
    const entry = JSON.stringify({ pattern, ts: new Date().toISOString(), semantic: semantic.map(r => r.key), episodic: episodic.length, procedural: procedural.length });
    fs.appendFileSync(auditFile, entry + '\n');
    for (const r of semantic) db.prepare('DELETE FROM semantic WHERE key = ?').run(r.key);
    for (const r of episodic) db.prepare('DELETE FROM episodic WHERE id = ?').run(r.id);
    for (const r of procedural) db.prepare('DELETE FROM procedural WHERE id = ?').run(r.id);
    return { semantic: semantic.length, episodic: episodic.length, procedural: procedural.length };
  }

  countByPattern(pattern) {
    const db = this.db;
    const like = `%${escapeLike(pattern)}%`;
    return {
      semantic: db.prepare('SELECT COUNT(*) as n FROM semantic WHERE key LIKE ? OR value LIKE ?').get(like, like).n,
      episodic: db.prepare('SELECT COUNT(*) as n FROM episodic WHERE event LIKE ? OR outcome LIKE ?').get(like, like).n,
      procedural: db.prepare('SELECT COUNT(*) as n FROM procedural WHERE name LIKE ? OR context LIKE ?').get(like, like).n,
    };
  }

  // Adjust trust score for memories that were recalled in a session.
  // Call after reflect() with outcome to calibrate which memories are actually useful.
  adjustTrust(keys, outcome) {
    const db = this.db;
    const delta = outcome === 'success' ? 0.1 : outcome === 'failure' ? -0.15 : 0.0;
    if (!delta || !keys.length) return { adjusted: 0 };
    if (delta > 0 && this.#trustBudget >= 5) return { adjusted: 0, budgetExceeded: true };
    const getRow = db.prepare('SELECT source, trust_score FROM semantic WHERE key = ?');
    const stmt = db.prepare('UPDATE semantic SET trust_score = ? WHERE key = ?');
    let adjusted = 0;
    for (const key of keys) {
      const row = getRow.get(key);
      if (!row) continue;
      const ceiling = getSourceCeiling(row.source);
      const newScore = Math.max(0.2, Math.min(ceiling, (row.trust_score ?? 0.5) + delta));
      stmt.run(newScore, key);
      adjusted++;
    }
    if (delta > 0 && adjusted) this.#trustBudget++;
    return { adjusted, delta };
  }

  // --- Stats & Export ---

  stats() {
    return {
      semantic: this.semanticCount(),
      episodic: this.episodicCount(),
      procedural: this.proceduralCount(),
      dbSize: fs.existsSync(this.#dbPath) ? Math.round(fs.statSync(this.#dbPath).size / 1024) + 'KB' : '0KB',
    };
  }

  exportToJson() {
    const semantic = {};
    for (const row of this.db.prepare('SELECT * FROM semantic').all()) {
      semantic[row.key] = { value: row.value, confidence: row.confidence, source: row.source, type: row.type, updated: row.updated, reinforced: row.reinforced };
    }
    const episodic = this.db.prepare('SELECT event, outcome, tags, ts FROM episodic ORDER BY ts').all().map(r => ({ ...r, tags: JSON.parse(r.tags) }));
    const procedural = this.db.prepare('SELECT name, context, steps, uses, updated FROM procedural').all().map(r => ({ ...r, steps: JSON.parse(r.steps) }));
    return { semantic, episodic, procedural };
  }

  // --- Private Methods ---

  #ftsSearch(query, limit) {
    try {
      const fts = query.split(/\s+/).filter(t => t.length > 1).map(t => `"${t.replace(/"/g, '')}"`).join(' OR ');
      if (!fts) throw new Error('empty');
      return this.db.prepare(`
        SELECT s.key, s.value, s.confidence, s.source, s.type, s.scope, s.updated, s.reinforced, s.decay_score, s.trust_score, s.grounded, rank
        FROM semantic_fts f JOIN semantic s ON f.rowid = s.rowid WHERE semantic_fts MATCH ? ORDER BY rank LIMIT ?
      `).all(fts, limit);
    } catch {
      const terms = query.toLowerCase().split(/\s+/);
      const where = terms.map(() => "(LOWER(key) LIKE ? ESCAPE '\\' OR LOWER(value) LIKE ? ESCAPE '\\')").join(' OR ');
      return this.db.prepare(`SELECT key, value, confidence, source, type, scope, updated, reinforced, decay_score, trust_score, grounded FROM semantic WHERE ${where} ORDER BY decay_score DESC LIMIT ?`).all(...terms.flatMap(t => { const e = `%${escapeLike(t)}%`; return [e, e]; }), limit);
    }
  }

  #trigramSearch(query, limit) {
    const queryVec = this.#embedder.embed(query);
    // Cap at 500 rows to prevent memory/latency issues at scale
    return this.db.prepare('SELECT key, value, confidence, source, type, scope, updated, reinforced, decay_score, trust_score, grounded FROM semantic ORDER BY decay_score DESC LIMIT 500').all()
      .map(r => ({ ...r, trigramSim: this.#embedder.cosineSim(queryVec, this.#embedder.embed(`${r.key} ${r.value}`)) }))
      .filter(r => r.trigramSim > 0.15)
      .sort((a, b) => b.trigramSim - a.trigramSim)
      .slice(0, limit);
  }

  #initSchema() {
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS semantic (
        key TEXT PRIMARY KEY, value TEXT NOT NULL, confidence REAL DEFAULT 0.8,
        source TEXT DEFAULT 'observed', type TEXT DEFAULT 'fact', scope TEXT DEFAULT '',
        created TEXT NOT NULL, updated TEXT NOT NULL, accessed TEXT,
        access_count INTEGER DEFAULT 0, reinforced INTEGER DEFAULT 1, decay_score REAL DEFAULT 1.0,
        agent TEXT DEFAULT '', grounded INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS episodic (
        id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, outcome TEXT DEFAULT '',
        tags TEXT DEFAULT '[]', ts TEXT NOT NULL, accessed TEXT, access_count INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS procedural (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, context TEXT DEFAULT '',
        steps TEXT NOT NULL, uses INTEGER DEFAULT 0, created TEXT NOT NULL, updated TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS knowledge (
        key TEXT PRIMARY KEY, section TEXT NOT NULL, title TEXT NOT NULL,
        summary TEXT NOT NULL, file TEXT NOT NULL, mem_type TEXT NOT NULL,
        seeded_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_knowledge_section ON knowledge(section);
      CREATE INDEX IF NOT EXISTS idx_knowledge_title ON knowledge(title);
      CREATE TABLE IF NOT EXISTS knowledge_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL, section TEXT NOT NULL,
        chunk_index INTEGER NOT NULL, text TEXT NOT NULL, embedding BLOB NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_chunks_key ON knowledge_chunks(key);
      CREATE INDEX IF NOT EXISTS idx_chunks_section ON knowledge_chunks(section);
      CREATE TABLE IF NOT EXISTS skill_routes (
        id INTEGER PRIMARY KEY, skill TEXT NOT NULL, signal TEXT NOT NULL,
        weight REAL DEFAULT 1.0, source TEXT DEFAULT 'default',
        hits INTEGER DEFAULT 0, created TEXT NOT NULL,
        UNIQUE(skill, signal)
      );
    `);
      try {
        this.#db.exec("CREATE VIRTUAL TABLE IF NOT EXISTS semantic_fts USING fts5(key, value, content=semantic, content_rowid=rowid)");
        this.#db.exec("CREATE VIRTUAL TABLE IF NOT EXISTS episodic_fts USING fts5(event, outcome, tags, content=episodic, content_rowid=id)");
        this.#db.exec("CREATE VIRTUAL TABLE IF NOT EXISTS procedural_fts USING fts5(name, context, steps, content=procedural, content_rowid=id)");
        this.#db.exec("CREATE TRIGGER IF NOT EXISTS semantic_ai AFTER INSERT ON semantic BEGIN INSERT INTO semantic_fts(rowid, key, value) VALUES (new.rowid, new.key, new.value); END");
        this.#db.exec("CREATE TRIGGER IF NOT EXISTS semantic_ad AFTER DELETE ON semantic BEGIN INSERT INTO semantic_fts(semantic_fts, rowid, key, value) VALUES('delete', old.rowid, old.key, old.value); END");
        this.#db.exec("CREATE TRIGGER IF NOT EXISTS semantic_au AFTER UPDATE ON semantic BEGIN INSERT INTO semantic_fts(semantic_fts, rowid, key, value) VALUES('delete', old.rowid, old.key, old.value); INSERT INTO semantic_fts(rowid, key, value) VALUES (new.rowid, new.key, new.value); END");
        this.#db.exec("CREATE TRIGGER IF NOT EXISTS episodic_ai AFTER INSERT ON episodic BEGIN INSERT INTO episodic_fts(rowid, event, outcome, tags) VALUES (new.id, new.event, new.outcome, new.tags); END");
        this.#db.exec("CREATE TRIGGER IF NOT EXISTS episodic_ad AFTER DELETE ON episodic BEGIN INSERT INTO episodic_fts(episodic_fts, rowid, event, outcome, tags) VALUES('delete', old.id, old.event, old.outcome, old.tags); END");
        this.#db.exec("CREATE TRIGGER IF NOT EXISTS procedural_ai AFTER INSERT ON procedural BEGIN INSERT INTO procedural_fts(rowid, name, context, steps) VALUES (new.id, new.name, new.context, new.steps); END");
        this.#db.exec("CREATE TRIGGER IF NOT EXISTS procedural_au AFTER UPDATE ON procedural BEGIN INSERT INTO procedural_fts(procedural_fts, rowid, name, context, steps) VALUES('delete', old.id, old.name, old.context, old.steps); INSERT INTO procedural_fts(rowid, name, context, steps) VALUES (new.id, new.name, new.context, new.steps); END");
        this.#db.exec("CREATE INDEX IF NOT EXISTS idx_semantic_key ON semantic(key)");
        this.#db.exec("CREATE INDEX IF NOT EXISTS idx_episodic_event ON episodic(event)");
      } catch (e) {
        process.stderr.write("[zara-memory] FTS5 unavailable, using LIKE fallback: " + e.message + "\n");
      }
  }

  #migrate() {
    try { this.#db.exec("ALTER TABLE semantic ADD COLUMN type TEXT DEFAULT 'fact'"); } catch {}
    try { this.#db.exec("ALTER TABLE semantic ADD COLUMN scope TEXT DEFAULT ''"); } catch {}
    try { this.#db.exec("ALTER TABLE semantic ADD COLUMN trust_score REAL DEFAULT 0.5"); } catch {}
    try { this.#db.exec("ALTER TABLE semantic ADD COLUMN agent TEXT DEFAULT ''"); } catch {}
    try { this.#db.exec("ALTER TABLE semantic ADD COLUMN grounded INTEGER DEFAULT 0"); } catch {}
    try { this.#db.exec("ALTER TABLE semantic ADD COLUMN embedding BLOB"); } catch {}
    try { this.#db.exec("ALTER TABLE episodic ADD COLUMN embedding BLOB"); } catch {}
    try {
      this.#db.exec(`
        CREATE TABLE IF NOT EXISTS knowledge (
          key TEXT PRIMARY KEY, section TEXT NOT NULL, title TEXT NOT NULL,
          summary TEXT NOT NULL, file TEXT NOT NULL, mem_type TEXT NOT NULL,
          seeded_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_section ON knowledge(section);
        CREATE INDEX IF NOT EXISTS idx_knowledge_title ON knowledge(title);
      `);
    } catch {}
    try {
      this.#db.exec(`
        CREATE TABLE IF NOT EXISTS knowledge_chunks (
          id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL, section TEXT NOT NULL,
          chunk_index INTEGER NOT NULL, text TEXT NOT NULL, embedding BLOB NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_chunks_key ON knowledge_chunks(key);
        CREATE INDEX IF NOT EXISTS idx_chunks_section ON knowledge_chunks(section);
      `);
    } catch {}
    this.#migrateFromJson();
    this.#seedSkillRoutes();
  }

  #seedSkillRoutes() {
    const routes = [
      ['golang-expert', 'go'], ['golang-expert', '.go'], ['golang-expert', 'goroutine'], ['golang-expert', 'func'], ['golang-expert', 'defer'], ['golang-expert', 'channel'],
      ['php-expert', 'php'], ['php-expert', 'laravel'], ['php-expert', 'composer'], ['php-expert', 'artisan'],
      ['typescript-expert', '.ts'], ['typescript-expert', 'typescript'], ['typescript-expert', 'interface'], ['typescript-expert', 'type'],
      ['systematic-debugging', 'error'], ['systematic-debugging', 'fail'], ['systematic-debugging', 'bug'], ['systematic-debugging', 'broken'], ['systematic-debugging', 'crash'], ['systematic-debugging', 'unexpected'],
      ['tdd', 'test'], ['tdd', 'spec'], ['tdd', 'coverage'], ['tdd', 'assert'], ['tdd', 'expect'],
      ['docker', 'docker'], ['docker', 'container'], ['docker', 'dockerfile'], ['docker', 'compose'],
      ['kubernetes', 'kubectl'], ['kubernetes', 'pod'], ['kubernetes', 'deployment'], ['kubernetes', 'k8s'],
      ['react-expert', 'react'], ['react-expert', 'jsx'], ['react-expert', 'useState'], ['react-expert', 'useEffect'], ['react-expert', 'component'],
      ['python-expert', 'python'], ['python-expert', '.py'], ['python-expert', 'pip'], ['python-expert', 'django'], ['python-expert', 'flask'],
      ['redis-expert', 'redis'], ['redis-expert', 'cache'], ['redis-expert', 'HGET'], ['redis-expert', 'LPUSH'],
      ['postgres-expert', 'postgres'], ['postgres-expert', 'postgresql'], ['postgres-expert', 'pg_'], ['postgres-expert', 'psql'],
      ['nginx', 'nginx'], ['nginx', 'reverse proxy'], ['nginx', 'upstream'],
      ['security-audit', 'vulnerability'], ['security-audit', 'CVE'], ['security-audit', 'OWASP'], ['security-audit', 'injection'], ['security-audit', 'XSS'],
      // JavaScript/Node (this project is JS)
      ['javascript-expert', 'node'], ['javascript-expert', 'npm'], ['javascript-expert', 'esm'], ['javascript-expert', 'import'], ['javascript-expert', 'async'], ['javascript-expert', 'promise'],
      // SQLite (this project uses sqlite)
      ['sqlite-expert', 'sqlite'], ['sqlite-expert', 'pragma'], ['sqlite-expert', 'WAL'], ['sqlite-expert', '.db'],
      // Git operations
      ['git-expert', 'rebase'], ['git-expert', 'cherry-pick'], ['git-expert', 'reflog'], ['git-expert', 'merge conflict'],
      // Code review
      ['code-review', 'review'], ['code-review', 'PR'], ['code-review', 'pull request'], ['code-review', 'diff'],
      // API testing
      ['api-tester', 'curl'], ['api-tester', 'REST'], ['api-tester', 'endpoint'], ['api-tester', 'HTTP'],
      // Shell scripting
      ['shell-scripting', 'bash'], ['shell-scripting', 'script'], ['shell-scripting', 'sh'], ['shell-scripting', 'zsh'],
      // MongoDB
      ['mongodb', 'mongo'], ['mongodb', 'collection'], ['mongodb', 'aggregate'],
      // Elasticsearch
      ['elasticsearch', 'elastic'], ['elasticsearch', 'index'], ['elasticsearch', 'kibana'],
      // AWS
      ['aws', 'aws'], ['aws', 's3'], ['aws', 'lambda'], ['aws', 'ec2'], ['aws', 'IAM'],
      // Terraform
      ['terraform', 'terraform'], ['terraform', '.tf'], ['terraform', 'provider'], ['terraform', 'resource'],
      // CI/CD
      ['ci-cd', 'github actions'], ['ci-cd', 'pipeline'], ['ci-cd', 'workflow'], ['ci-cd', '.yml'],
      // Prompt engineering
      ['prompt-engineer', 'prompt'], ['prompt-engineer', 'few-shot'], ['prompt-engineer', 'chain of thought'],
      // Writing/docs
      ['technical-writer', 'documentation'], ['technical-writer', 'README'], ['technical-writer', 'ADR'],
      // Rust
      ['rust-expert', 'rust'], ['rust-expert', 'cargo'], ['rust-expert', '.rs'], ['rust-expert', 'ownership'],
      // GraphQL
      ['graphql-expert', 'graphql'], ['graphql-expert', 'mutation'], ['graphql-expert', 'resolver'], ['graphql-expert', 'schema'],
      // Next.js
      ['nextjs-expert', 'nextjs'], ['nextjs-expert', 'next.js'], ['nextjs-expert', 'app router'], ['nextjs-expert', 'getServerSideProps'],
      // Leadership/coaching
      ['leadership-expert', 'leadership'], ['leadership-expert', 'coaching'], ['leadership-expert', 'delegation'], ['leadership-expert', 'team'],
      // Brainstorming/planning
      ['brainstorming', 'brainstorm'], ['brainstorming', 'ideas'], ['brainstorming', 'explore options'],
      ['writing-plans', 'plan'], ['writing-plans', 'implementation plan'], ['writing-plans', 'roadmap'],
    ];
    const now = new Date().toISOString().split('T')[0];
    const stmt = this.#db.prepare('INSERT OR IGNORE INTO skill_routes (skill, signal, weight, source, hits, created) VALUES (?, ?, 1.0, ?, 0, ?)');
    for (const [skill, signal] of routes) stmt.run(skill, signal, 'default', now);
  }

  #migrateFromJson() {
    const count = this.#db.prepare('SELECT COUNT(*) as n FROM semantic').get();
    if (count.n > 0) return;
    const memDir = path.join(this.#home, 'memory');
    // Semantic
    const semFile = path.join(memDir, 'semantic.json');
    if (fs.existsSync(semFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(semFile, 'utf-8'));
        const stmt = this.#db.prepare('INSERT OR REPLACE INTO semantic (key, value, confidence, source, type, scope, created, updated, reinforced, decay_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1.0)');
        for (const [key, entry] of Object.entries(data)) {
          const date = entry.updated || new Date().toISOString().split('T')[0];
          stmt.run(key, entry.value, entry.confidence || 0.8, entry.source || 'observed', entry.type || 'fact', '', date, date, entry.reinforced || 1);
        }
      } catch {}
    }
    // Episodic
    const epiFile = path.join(memDir, 'episodic.jsonl');
    if (fs.existsSync(epiFile)) {
      try {
        const stmt = this.#db.prepare('INSERT INTO episodic (event, outcome, tags, ts) VALUES (?, ?, ?, ?)');
        for (const line of fs.readFileSync(epiFile, 'utf-8').trim().split('\n').filter(Boolean)) {
          const e = JSON.parse(line);
          stmt.run(e.event, e.outcome || '', JSON.stringify(e.tags || []), e.ts);
        }
      } catch {}
    }
    // Procedural
    const procFile = path.join(memDir, 'procedural.json');
    if (fs.existsSync(procFile)) {
      try {
        const stmt = this.#db.prepare('INSERT OR REPLACE INTO procedural (name, context, steps, uses, created, updated) VALUES (?, ?, ?, ?, ?, ?)');
        for (const p of JSON.parse(fs.readFileSync(procFile, 'utf-8'))) {
          const date = p.updated || new Date().toISOString().split('T')[0];
          stmt.run(p.name, p.context || '', JSON.stringify(p.steps), p.uses || 0, date, date);
        }
      } catch {}
    }
  }
}

// --- Singleton Instance ---

const store = new MemoryStore();

// --- Backward-Compatible Exports (same API as before) ---

export const getDb = () => store.db;
export const semanticLearn = (key, value, source, type, scope, opts) => store.learn(key, value, source, type, scope, opts);
export const semanticRecall = (query, limit, options) => store.recall(query, limit, options);
export const semanticBaseline = (budget) => store.baseline(budget);
export const semanticScoped = (filePath, limit) => store.scoped(filePath, limit);
export const semanticGetAll = () => store.semanticGetAll();
export const semanticCount = () => store.semanticCount();
export const episodicRecord = (event, outcome, tags) => store.recordEpisode(event, outcome, tags);
export const episodicRecall = (query, limit) => store.recallEpisodes(query, limit);
export const episodicCount = () => store.episodicCount();
export const proceduralSave = (name, steps, context) => store.saveProcedure(name, steps, context);
export const proceduralRecall = (query, limit) => store.recallProcedures(query, limit);
export const proceduralCount = () => store.proceduralCount();
export const applyDecay = () => store.applyDecay();
export const consolidate = (min) => store.consolidate(min);
export const dreamConsolidate = () => store.dreamConsolidate();
export const stats = () => store.stats();
export const exportToJson = () => store.exportToJson();
export const closeDb = () => store.close();
export const knowledgeUpsert = (key, section, title, summary, file, memType) => store.knowledgeUpsert(key, section, title, summary, file, memType);
export const knowledgeBySection = (section) => store.knowledgeBySection(section);
export const knowledgeSearch = (query) => store.knowledgeSearch(query);
export const knowledgeSections = () => store.knowledgeSections();
export const knowledgeCount = () => store.knowledgeCount();
export const knowledgeChunkUpsert = (key, section, body) => store.knowledgeChunkUpsert(key, section, body);
export const knowledgeChunkSearch = (query, section, k) => store.knowledgeChunkSearch(query, section, k);
export const knowledgeChunkUpsertAsync = (key, section, body, embedder) => store.knowledgeChunkUpsertAsync(key, section, body, embedder);
export const knowledgeChunkSearchAsync = (query, embedder, section, k) => store.knowledgeChunkSearchAsync(query, embedder, section, k);
export const knowledgeChunkCount = () => store.knowledgeChunkCount();
export const detectContradictions = (threshold) => store.detectContradictions(threshold);
export const detectContradictionsAsync = (threshold) => store.detectContradictionsAsync(threshold);
export const deleteByPattern = (pattern) => store.deleteByPattern(pattern);
export const countByPattern = (pattern) => store.countByPattern(pattern);
export const adjustTrust = (keys, outcome) => store.adjustTrust(keys, outcome);
export const semanticRecallAsync = (query, limit, options) => store.recallAsync(query, limit, options);

// Exported for testing with an isolated home directory
export { MemoryStore };

// --- Skill Routes ---
export const skillRoutesAll = () => store.db.prepare('SELECT skill, signal, weight FROM skill_routes ORDER BY weight DESC').all();
