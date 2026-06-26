#!/usr/bin/env node
// Migration: re-embed existing memories with SemanticEmbedder (Issue #23)
// Run once after switching ZARA_EMBED=semantic:
//   ZARA_EMBED=semantic node scripts/migrate-embeddings.mjs

import { SemanticEmbedder } from '../tools/embedder.mjs';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DB_PATH = path.join(os.homedir(), '.zara', 'memory.db');
if (!fs.existsSync(DB_PATH)) { console.log('No memory.db found. Nothing to migrate.'); process.exit(0); }

const db = new DatabaseSync(DB_PATH);

// Ensure embedding column exists
try { db.exec('ALTER TABLE semantic ADD COLUMN embedding BLOB'); } catch { /* already exists */ }

const embedder = SemanticEmbedder.instance();
const rows = db.prepare('SELECT key, value FROM semantic').all();
console.log(`Migrating ${rows.length} memories to semantic embeddings...`);

const stmt = db.prepare('UPDATE semantic SET embedding = ? WHERE key = ?');
let count = 0;
for (const row of rows) {
  const text = `${row.key}: ${row.value}`.slice(0, 200);
  const vec = await embedder.embed(text);
  const buf = Buffer.from(vec.buffer);
  stmt.run(buf, row.key);
  count++;
  if (count % 50 === 0) console.log(`  ${count}/${rows.length}`);
}

// Also re-embed knowledge chunks if they exist
try {
  const chunks = db.prepare('SELECT id, content FROM knowledge_chunks').all();
  if (chunks.length) {
    console.log(`Re-embedding ${chunks.length} knowledge chunks...`);
    const chunkStmt = db.prepare('UPDATE knowledge_chunks SET embedding = ? WHERE id = ?');
    for (const chunk of chunks) {
      const vec = await embedder.embed(chunk.content.slice(0, 300));
      chunkStmt.run(Buffer.from(vec.buffer), chunk.id);
    }
  }
} catch { /* no knowledge_chunks table */ }

db.close();
console.log(`Done. ${count} memories re-embedded.`);
