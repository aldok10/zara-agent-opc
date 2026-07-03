// tools/memory/maintenance.mjs — Decay, consolidation, contradiction detection,
// pattern delete/count (extracted from memory-db.mjs).
//
// All functions are pure over an explicit `db` handle (plus `home`/`embedder`
// where side effects or similarity are needed). This keeps the SQLite backend
// logic in one focused place; MemoryStore delegates to it via thin `_sqlite*`
// methods that the semantic-store adapter calls.

import fs from 'fs';
import path from 'path';
import { escapeLike } from './semantic-store.mjs';

const HALF_LIFE = { policy: Infinity, architecture: Infinity, workflow: 180, decision: 90, preference: 90, pitfall: 90, fact: 60 };
const TRUST_DECAY_RATE = { fact: 0.03, decision: 0.02, workflow: 0.02, preference: 0.01, pitfall: 0.01 };
const TRUST_FLOOR = 0.2;
const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();

// --- Decay ---

// Recompute decay_score (and trust decay for 30+ day stale) for every semantic row.
export function applyDecay(db) {
  const now = Date.now();
  const rows = db.prepare('SELECT key, type, updated, accessed, access_count, reinforced, trust_score FROM semantic').all();
  const stmt = db.prepare('UPDATE semantic SET decay_score = ? WHERE key = ?');
  const trustStmt = db.prepare('UPDATE semantic SET trust_score = ? WHERE key = ?');
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
    const trustRate = TRUST_DECAY_RATE[row.type] || 0;
    if (trustRate > 0 && daysSince >= 30) {
      const newTrust = Math.max(TRUST_FLOOR, (row.trust_score ?? 0.5) - trustRate);
      trustStmt.run(newTrust, row.key);
    }
  }
  return { total: rows.length, decayed };
}

// --- Consolidation ---

// Archive semantic memories below `minDecayScore` to jsonl, then delete them.
export function consolidate(db, home, minDecayScore = 0.05) {
  const weak = db.prepare('SELECT key, value, decay_score FROM semantic WHERE decay_score < ?').all(minDecayScore);
  if (!weak.length) return { archived: 0 };
  const archiveFile = path.join(home, 'memory-archive.jsonl');
  fs.appendFileSync(archiveFile, weak.map(w => JSON.stringify({ key: w.key, value: w.value, archived: new Date().toISOString() })).join('\n') + '\n');
  // Rotate archive: keep last 2000 entries
  try {
    const lines = fs.readFileSync(archiveFile, 'utf-8').trim().split('\n');
    if (lines.length > 2000) fs.writeFileSync(archiveFile, lines.slice(-2000).join('\n') + '\n');
  } catch {}
  const stmt = db.prepare('DELETE FROM semantic WHERE key = ?');
  for (const w of weak) stmt.run(w.key);
  return { archived: weak.length };
}

// SQLite semantic dream consolidation: merge exact-normalized dupes + archive stale.
export function dreamSemantic(db, home) {
  const results = { merged: 0, archived: 0 };

  // Merge duplicates
  const all = db.prepare('SELECT key, value, reinforced, decay_score, type FROM semantic ORDER BY reinforced DESC').all();
  const seen = new Map();
  const toDelete = [];
  for (const row of all) {
    const key = norm(row.value);
    if (seen.has(key)) {
      db.prepare('UPDATE semantic SET reinforced = reinforced + ? WHERE key = ?').run(row.reinforced || 1, seen.get(key).key);
      toDelete.push(row.key);
      results.merged++;
    } else { seen.set(key, row); }
  }
  const delStmt = db.prepare('DELETE FROM semantic WHERE key = ?');
  for (const k of toDelete) delStmt.run(k);

  // Archive stale
  const stale = db.prepare(`SELECT key, value FROM semantic WHERE decay_score < 0.1 AND type NOT IN ('policy','architecture','preference') AND (accessed IS NULL OR julianday('now') - julianday(accessed) > 60)`).all();
  if (stale.length) {
    fs.appendFileSync(path.join(home, 'memory-archive.jsonl'), stale.map(s => JSON.stringify({ key: s.key, value: s.value, archived: new Date().toISOString(), reason: 'dreamer-stale' })).join('\n') + '\n');
    for (const s of stale) delStmt.run(s.key);
    results.archived = stale.length;
  }
  return results;
}

// --- Contradiction detection ---

// Group same-type memories and flag pairs that are highly similar but not
// identical (likely conflicts). `simFn(a, b)` returns cosine similarity.
function flagPairs(byType, threshold, simFn) {
  const flagged = [];
  for (const group of byType.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i], b = group[j];
        if (a.norm === b.norm) continue; // identical → handled by dream merge
        if (a.norm.includes(b.norm) || b.norm.includes(a.norm)) continue; // subset → not a conflict
        const sim = simFn(a, b);
        if (sim >= threshold) flagged.push({ a: a.key, b: b.key, type: a.type, sim, trust_a: a.trust_score ?? 0.5, trust_b: b.trust_score ?? 0.5 });
      }
    }
  }
  return flagged;
}

// Sync contradiction detection using the injected (trigram) embedder.
export function detectContradictionsSync(db, embedder, threshold = 0.85) {
  // Exclude seeded knowledge entries — only user/agent facts matter here.
  const rows = db.prepare(`
    SELECT key, value, type, trust_score FROM semantic
    WHERE key NOT LIKE 'knowledge.%' AND key NOT LIKE 'kb_%'
  `).all();

  const byType = new Map();
  for (const r of rows) {
    if (!byType.has(r.type)) byType.set(r.type, []);
    byType.get(r.type).push({ ...r, vec: embedder.embed(r.value), norm: norm(r.value) });
  }
  return flagPairs(byType, threshold, (a, b) => embedder.cosineSim(a.vec, b.vec));
}

// Async contradiction detection: prefer stored embeddings, fall back to live
// SemanticEmbedder computation. Degrades to the sync path if the model is absent.
export async function detectContradictions(db, threshold = 0.92, syncFallback) {
  const rows = db.prepare(`
    SELECT key, value, type, trust_score, embedding FROM semantic
    WHERE key NOT LIKE 'knowledge.%' AND key NOT LIKE 'kb_%' AND key NOT LIKE 'auto.%'
  `).all();

  let embedder;
  try {
    const { SemanticEmbedder } = await import('../embedder.mjs');
    embedder = SemanticEmbedder.instance();
  } catch { return syncFallback(threshold); }

  const byType = new Map();
  for (const r of rows) {
    if (!byType.has(r.type)) byType.set(r.type, []);
    let vec;
    if (r.embedding && r.embedding.byteLength >= 4) {
      vec = new Float32Array(r.embedding.buffer, r.embedding.byteOffset, r.embedding.byteLength / 4);
    } else {
      vec = await embedder.embed(r.value.slice(0, 200));
    }
    byType.get(r.type).push({ key: r.key, type: r.type, trust_score: r.trust_score, vec, norm: norm(r.value) });
  }
  return flagPairs(byType, threshold, (a, b) => embedder.cosineSim(a.vec, b.vec));
}

// --- Pattern delete / count ---

// SQLite-only semantic delete: audit log + broad-pattern guard (>50 = refuse).
export function deleteSemantic(db, home, pattern) {
  const like = `%${escapeLike(pattern)}%`;
  const semantic = db.prepare("SELECT key FROM semantic WHERE key LIKE ? ESCAPE '\\' OR value LIKE ? ESCAPE '\\'").all(like, like);
  if (semantic.length > 50) return { error: 'Pattern too broad', semantic: semantic.length, total: semantic.length };
  try {
    const auditFile = path.join(home, 'memory-deletes.jsonl');
    fs.appendFileSync(auditFile, JSON.stringify({ pattern, ts: new Date().toISOString(), backend: 'sqlite', semantic: semantic.map(r => r.key) }) + '\n');
  } catch {}
  for (const r of semantic) db.prepare('DELETE FROM semantic WHERE key = ?').run(r.key);
  return { semantic: semantic.length };
}

export function countSemantic(db, pattern) {
  const like = `%${escapeLike(pattern)}%`;
  return db.prepare('SELECT COUNT(*) as n FROM semantic WHERE key LIKE ? OR value LIKE ?').get(like, like).n;
}
