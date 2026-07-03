// Zara Memory Store — SQLite-backed cognitive memory with OOP design
//
// Architecture (Facade):
//   MemoryStore (singleton) — owns the SQLite connection and delegates focused
//   responsibilities to modules under tools/memory/:
//     schema.mjs        — DDL, migrations, skill-route seeding
//     recall.mjs        — FTS/trigram sync recall + hybrid async fusion
//     trust.mjs         — trust calibration math + per-session budget
//     maintenance.mjs   — decay, dream consolidation, contradiction detection, delete/count
//     knowledge-ops.mjs — knowledge INDEX metadata table
//   Backend adapters (semantic/episodic/procedural/knowledge-store) implement a
//   uniform async contract; the SQLite adapter delegates back into the thin
//   `_sqlite*` methods here, so callers never branch on backend.
//
// Layers: semantic (facts), episodic (events), procedural (workflows)
//
// NOTE on `_sqlite*` methods: they stay PUBLIC (not #private) because the
// SqliteSemanticStore adapter calls them cross-instance. They are now thin
// delegators to the extracted modules — the Facade seam.

import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { TrigramEmbedder, SemanticEmbedder } from './embedder.mjs';
import {
  getSemanticStore, VALID_TYPES,
  sourceCeiling as getSourceCeiling, confidenceForSource,
} from './memory/semantic-store.mjs';
import { getEpisodicStore } from './memory/episodic-store.mjs';
import { getProceduralStore } from './memory/procedural-store.mjs';
import { getKnowledgeChunkStore, chunkText } from './memory/knowledge-store.mjs';
import { initSchema, migrate } from './memory/schema.mjs';
import * as recallOps from './memory/recall.mjs';
import * as trustOps from './memory/trust.mjs';
import * as maint from './memory/maintenance.mjs';
import * as knowledgeOps from './memory/knowledge-ops.mjs';

// --- Embedder strategy ---
//
// Two roles, one injected strategy:
//   sync role  — dedup, sync recall, sync contradiction detection call embed()
//                synchronously, so they REQUIRE a sync embedder (TrigramEmbedder).
//                This is `this.#embedder`, the constructor parameter.
//   async role — the vector store/query path (recallAsync, #embedAsync) resolves
//                a semantic-capable embedder ONCE via #resolveAsyncEmbedder():
//                the injected embedder when it is non-trigram (tests inject their
//                own; production may inject SemanticEmbedder), otherwise the shared
//                MiniLM model in semantic mode. Store and query use the SAME
//                resolved embedder, so injected strategies actually drive vectors.

// Export whether semantic mode is active (for the async embedder resolver).
export const SEMANTIC_MODE = (process.env.ZARA_EMBED || 'semantic') === 'semantic';

// --- MemoryStore Class (Facade) ---

class MemoryStore {
  #db = null;
  #home;
  #dbPath;
  #embedder;
  #trustBudget = { value: 0 };
  #semantic = null;
  #episodic = null;
  #procedural = null;
  #knowledgeChunks = null;

  constructor(home = path.join(os.homedir(), '.zara'), embedder = new TrigramEmbedder()) {
    this.#home = home;
    this.#dbPath = path.join(home, 'memory.db');
    this.#embedder = embedder;
  }

  // Home directory (exposed for the semantic adapter's audit/archive files).
  get home() { return this.#home; }

  // Active semantic backend (SQLite or Chroma), chosen by ZARA_VECTOR.
  // Lazily resolved so tests can construct a store before Chroma is reachable.
  get semantic() {
    if (!this.#semantic) this.#semantic = getSemanticStore(this);
    return this.#semantic;
  }

  get episodic() {
    if (!this.#episodic) this.#episodic = getEpisodicStore(this);
    return this.#episodic;
  }

  get procedural() {
    if (!this.#procedural) this.#procedural = getProceduralStore(this);
    return this.#procedural;
  }

  get knowledgeChunks() {
    if (!this.#knowledgeChunks) this.#knowledgeChunks = getKnowledgeChunkStore(this);
    return this.#knowledgeChunks;
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
    initSchema(this.#db);
    migrate(this.#db, this.#home);
    return this.#db;
  }

  close() {
    if (this.#db) { this.#db.close(); this.#db = null; }
  }

  // --- Semantic Layer (public API delegates to the active backend adapter) ---

  // Accepts either positional (legacy) or options-object form:
  //   learn(key, value, source, type, scope, opts)   ← legacy signature
  //   learn(key, value, { source, type, scope, agent, grounded })
  learn(key, value, source, type, scope, opts = {}) {
    const options = (source && typeof source === 'object')
      ? source
      : { source, type, scope, ...opts };
    return this.semantic.learn(key, value, options);
  }

  recall(query, limit = 5, options = {}) {
    return this.semantic.recall(query, limit, options);
  }

  // Hybrid recall (FTS + vector fusion on SQLite; KNN on Chroma).
  recallAsync(query, limit = 5, options = {}) {
    return this.semantic.recallHybrid(query, limit, options);
  }

  baseline(tokenBudget = 500) {
    return this.semantic.baseline(tokenBudget);
  }

  scoped(filePath, limit = 5) {
    return this.semantic.scoped(filePath, limit);
  }

  semanticCount() {
    return this.semantic.count();
  }

  semanticGetAll() {
    return this.semantic.getAll();
  }

  adjustTrust(keys, outcome) {
    return this.semantic.adjustTrust(keys, outcome);
  }

  // --- Semantic Layer: SQLite delegates (called by SqliteSemanticStore) ---
  // These stay public so the adapter can reach them cross-instance. Bodies are
  // thin delegators to the extracted modules.

  _sqliteLearn(key, value, opts = {}) {
    // SECURITY (Constitution P6): `grounded` grants a recall-ranking boost and MUST be
    // set by internal trusted code only — NEVER threaded from agent-supplied tool args.
    const { source = 'observed', type = 'fact', scope = '', agent = '', grounded = false } = opts;
    const memType = VALID_TYPES.includes(type) ? type : 'fact';
    const db = this.db;
    const now = new Date().toISOString().split('T')[0];
    const existing = db.prepare('SELECT reinforced FROM semantic WHERE key = ?').get(key);
    const reinforced = (existing?.reinforced || 0) + 1;
    const confidence = confidenceForSource(source);

    // Dedup: if a semantically similar entry exists (same type, trigram sim > 0.95), reinforce it.
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

    // Async embed: store MiniLM-L6-v2 vector for hybrid recall (non-blocking)
    if (SEMANTIC_MODE) {
      this.#embedAsync(key, value).catch(() => {});
    }

    // User-reconfirms: boost trust when overwriting with an explicit statement.
    if (existing && source === 'user_explicit') {
      const ceiling = getSourceCeiling('user_explicit');
      const cur = db.prepare('SELECT trust_score FROM semantic WHERE key = ?').get(key);
      const boosted = Math.max(0.2, Math.min(ceiling, (cur?.trust_score ?? 0.5) + 0.15));
      db.prepare('UPDATE semantic SET trust_score = ? WHERE key = ?').run(boosted, key);
    }

    return { key, value, reinforced, type: memType };
  }

  _sqliteRecall(query, limit = 5, options = {}) {
    return recallOps.recall(this.db, this.#embedder, query, limit, options);
  }

  _sqliteRecallAsync(query, limit = 5, options = {}) {
    return recallOps.recallAsync(this.db, this.#embedder, this.#resolveAsyncEmbedder(), query, limit, options);
  }

  _sqliteBaseline(tokenBudget = 500) {
    return recallOps.baseline(this.db, tokenBudget);
  }

  _sqliteScoped(filePath, limit = 5) {
    return recallOps.scoped(this.db, filePath, limit);
  }

  _sqliteCount() {
    return recallOps.count(this.db);
  }

  _sqliteGetAll() {
    return recallOps.getAll(this.db);
  }

  // Resolve the embedder for async/vector operations. The injected embedder is
  // the strategy: use it when it is semantic-capable (non-trigram). Otherwise,
  // in semantic mode, use the shared MiniLM model; in trigram mode, keep the
  // injected trigram embedder (async recall degrades to keyword+trigram).
  #resolveAsyncEmbedder() {
    if (this.#embedder.constructor.name !== 'TrigramEmbedder') return this.#embedder;
    return SEMANTIC_MODE ? SemanticEmbedder.instance() : this.#embedder;
  }

  // Async helper: compute and store embedding for a semantic memory. Uses the
  // SAME resolved embedder as recallAsync so store/query vectors are consistent.
  async #embedAsync(key, text) {
    const embedder = this.#resolveAsyncEmbedder();
    const vec = await embedder.embed(text);
    const buf = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
    this.db.prepare('UPDATE semantic SET embedding = ? WHERE key = ?').run(buf, key);
  }

  // --- Episodic Layer (delegated to active backend adapter) ---

  recordEpisode(event, outcome = '', tags = []) {
    return this.episodic.record(event, outcome, tags);
  }

  recallEpisodes(query, limit = 5) {
    return this.episodic.recall(query, limit);
  }

  episodicCount() {
    return this.episodic.count();
  }

  // --- Procedural Layer (delegated to active backend adapter) ---

  saveProcedure(name, steps, context = '') {
    return this.procedural.save(name, steps, context);
  }

  recallProcedures(query, limit = 3) {
    return this.procedural.recall(query, limit);
  }

  proceduralCount() {
    return this.procedural.count();
  }

  // --- Knowledge INDEX Layer (metadata lookup) ---

  knowledgeUpsert(key, section, title, summary, file, memType) {
    return knowledgeOps.upsert(this.db, key, section, title, summary, file, memType);
  }

  knowledgeBySection(section) {
    return knowledgeOps.bySection(this.db, section);
  }

  knowledgeSearch(query) {
    return knowledgeOps.search(this.db, query);
  }

  knowledgeSections() {
    return knowledgeOps.sections(this.db);
  }

  knowledgeCount() { return knowledgeOps.count(this.db); }

  // --- Knowledge Chunk Layer (delegated to active backend adapter) ---

  // Keep chunkText as a public method for backward compat (knowledge seeder uses it).
  chunkText(body, maxWords = 220) {
    return chunkText(body, maxWords);
  }

  knowledgeChunkUpsert(key, section, body) {
    return this.knowledgeChunks.upsert(key, section, body);
  }

  knowledgeChunkSearch(query, section = '', k = 5) {
    return this.knowledgeChunks.search(query, section, k);
  }

  knowledgeChunkCount() { return this.knowledgeChunks.count(); }

  async knowledgeChunkUpsertAsync(key, section, body, embedder) {
    // embedder param ignored: adapter handles its own embedder selection
    return this.knowledgeChunks.upsertAsync(key, section, body);
  }

  async knowledgeChunkSearchAsync(query, embedder, section = '', k = 5) {
    // embedder param ignored: adapter handles its own embedder selection
    return this.knowledgeChunks.searchAsync(query, section, k);
  }

  // --- Contradiction Detection ---

  // Sync path retained for callers that cannot await (SQLite trigram version).
  detectContradictions(threshold = 0.85) {
    return this._sqliteDetectContradictionsSync(threshold);
  }

  // Public delegate → active adapter (async, works for both backends).
  detectContradictionsAsync(threshold = 0.92) {
    return this.semantic.detectContradictions(threshold);
  }

  _sqliteDetectContradictionsSync(threshold = 0.85) {
    return maint.detectContradictionsSync(this.db, this.#embedder, threshold);
  }

  _sqliteDetectContradictions(threshold = 0.92) {
    return maint.detectContradictions(this.db, threshold, (t) => this._sqliteDetectContradictionsSync(t));
  }

  // --- Maintenance ---

  // Public: decay semantic memories via the active adapter, then decay episodic too.
  async applyDecay() {
    const result = await this.semantic.applyDecay();
    await this.episodic.decayOld();
    return result;
  }

  _sqliteApplyDecay() {
    return maint.applyDecay(this.db);
  }

  consolidate(minDecayScore = 0.05) {
    return maint.consolidate(this.db, this.#home, minDecayScore);
  }

  // Public: consolidate semantic via adapter (merge dupes + archive stale),
  // then promote recurring episodic topics (SQLite regardless of backend).
  async dreamConsolidate() {
    const sem = await this.semantic.dreamConsolidateSemantic();
    const results = { merged: sem.merged || 0, archived: sem.archived || 0, reinforced: 0 };

    // Promote recurring episodic topics (pull last 100 episodes from active backend)
    let episodes;
    try {
      const all = await this.episodic.export();
      episodes = all.slice(-100).map(e => ({ event: e.event || '', outcome: e.outcome || '' }));
    } catch {
      episodes = [];
    }

    const freq = new Map();
    for (const ep of episodes) {
      for (const w of new Set(`${ep.event} ${ep.outcome}`.toLowerCase().split(/\s+/).filter(w => w.length > 4))) {
        freq.set(w, (freq.get(w) || 0) + 1);
      }
    }
    for (const [topic, count] of freq) {
      if (count >= 5) {
        const dup = await this.semantic.countByPattern(`auto.${topic}`);
        if (!dup) {
          const best = episodes.find(ep => `${ep.event} ${ep.outcome}`.toLowerCase().includes(topic));
          if (best) { await this.semantic.learn(`auto.${topic}`, `Recurring: ${best.event}`, { source: 'inferred', type: 'fact' }); results.reinforced++; }
        }
      }
    }
    return results;
  }

  _sqliteDreamSemantic() {
    return maint.dreamSemantic(this.db, this.#home);
  }

  // --- Delete / Count ---

  // Public: delete across all layers via active backend adapters.
  async deleteByPattern(pattern) {
    const sem = await this.semantic.deleteByPattern(pattern);
    if (sem.error) {
      return { ...sem, episodic: 0, procedural: 0, total: sem.total ?? sem.semantic };
    }
    const episodic = await this.episodic.deleteByPattern(pattern);
    const procedural = await this.procedural.deleteByPattern(pattern);
    return { semantic: sem.semantic, episodic, procedural };
  }

  _sqliteDeleteSemantic(pattern) {
    return maint.deleteSemantic(this.db, this.#home, pattern);
  }

  // Public: count matches across all layers.
  async countByPattern(pattern) {
    return {
      semantic: await this.semantic.countByPattern(pattern),
      episodic: await this.episodic.countByPattern(pattern),
      procedural: await this.procedural.countByPattern(pattern),
    };
  }

  _sqliteCountSemantic(pattern) {
    return maint.countSemantic(this.db, pattern);
  }

  // Adjust trust score for memories recalled in a session (adapter delegate).
  _sqliteAdjustTrust(keys, outcome) {
    return trustOps.adjustTrust(this.db, keys, outcome, this.#trustBudget);
  }

  // --- Stats & Export ---

  // Public: async so semantic count works for both backends.
  async stats() {
    return {
      semantic: await this.semantic.count(),
      episodic: await this.episodic.count(),
      procedural: await this.procedural.count(),
      dbSize: fs.existsSync(this.#dbPath) ? Math.round(fs.statSync(this.#dbPath).size / 1024) + 'KB' : '0KB',
      backend: this.semantic.backend,
    };
  }

  async exportToJson() {
    const semantic = await this.semantic.exportAll();
    const episodic = await this.episodic.export();
    const procedural = await this.procedural.export();
    return { semantic, episodic, procedural };
  }

  _sqliteExportSemantic() {
    const semantic = {};
    for (const row of this.db.prepare('SELECT * FROM semantic').all()) {
      semantic[row.key] = { value: row.value, confidence: row.confidence, source: row.source, type: row.type, updated: row.updated, reinforced: row.reinforced };
    }
    return semantic;
  }

  // Legacy methods for backward compat with tests that call directly.
  episodicExport() {
    return this.db.prepare('SELECT event, outcome, tags, ts FROM episodic ORDER BY ts').all().map(r => ({ ...r, tags: JSON.parse(r.tags) }));
  }

  proceduralExport() {
    return this.db.prepare('SELECT name, context, steps, uses, updated FROM procedural').all().map(r => ({ ...r, steps: JSON.parse(r.steps) }));
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
