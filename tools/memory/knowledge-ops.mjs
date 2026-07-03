// tools/memory/knowledge-ops.mjs — Knowledge INDEX table operations
// (key/section/title/summary metadata lookup). Extracted from memory-db.mjs.
//
// This is the pure-SQL metadata index — distinct from the knowledge CHUNK
// passages, which have their own backend adapter in knowledge-store.mjs.

import { escapeLike } from './semantic-store.mjs';

export function upsert(db, key, section, title, summary, file, memType) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO knowledge (key, section, title, summary, file, mem_type, seeded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      section = excluded.section, title = excluded.title, summary = excluded.summary,
      file = excluded.file, mem_type = excluded.mem_type, seeded_at = excluded.seeded_at
  `).run(key, section, title, summary, file, memType, now);
}

export function bySection(db, section) {
  return db.prepare('SELECT key, title, summary, file, mem_type FROM knowledge WHERE section = ? ORDER BY title').all(section);
}

export function search(db, query) {
  const like = `%${escapeLike(query)}%`;
  return db.prepare("SELECT key, section, title, summary, file, mem_type FROM knowledge WHERE title LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\' OR key LIKE ? ESCAPE '\\' LIMIT 30").all(like, like, like);
}

export function sections(db) {
  return db.prepare('SELECT section, COUNT(*) as count, MIN(mem_type) as mem_type FROM knowledge GROUP BY section ORDER BY section').all();
}

export function count(db) {
  return db.prepare('SELECT COUNT(*) as n FROM knowledge').get().n;
}
