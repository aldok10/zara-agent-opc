#!/usr/bin/env node
// Backfill MiniLM-L6-v2 embeddings for all memory layers.
// Usage:
//   node scripts/migrate-embeddings.mjs [--all|--semantic|--episodic|--procedural|--knowledge] [--force]

import { SemanticEmbedder } from '../tools/embedder.mjs';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DB_PATH = path.join(os.homedir(), '.zara', 'memory.db');
if (!fs.existsSync(DB_PATH)) { console.log('No memory.db found. Nothing to migrate.'); process.exit(0); }

const args = process.argv.slice(2);
const force = args.includes('--force');
const targets = args.filter(a => a !== '--force');
const doAll = !targets.length || targets.includes('--all');
const doSemantic = doAll || targets.includes('--semantic');
const doEpisodic = doAll || targets.includes('--episodic');
const doProcedural = doAll || targets.includes('--procedural');
const doKnowledge = doAll || targets.includes('--knowledge');

const db = new DatabaseSync(DB_PATH);

// Ensure embedding columns exist
try { db.exec('ALTER TABLE semantic ADD COLUMN embedding BLOB'); } catch {}
try { db.exec('ALTER TABLE episodic ADD COLUMN embedding BLOB'); } catch {}
try { db.exec('ALTER TABLE procedural ADD COLUMN embedding BLOB'); } catch {}

console.log('Initializing embedder (first run downloads model ~90MB)...');
const embedder = SemanticEmbedder.instance();
// Warm up
await embedder.embed('warmup');
console.log('Embedder ready.\n');

async function backfillTable(table, selectSql, textFn, updateSql, label) {
  const whereClause = force ? '' : ' WHERE embedding IS NULL';
  const rows = db.prepare(selectSql + whereClause).all();
  if (!rows.length) { console.log(`${label}: nothing to backfill.`); return 0; }
  console.log(`${label}: backfilling ${rows.length} rows...`);
  const stmt = db.prepare(updateSql);
  let count = 0;
  for (const row of rows) {
    const text = textFn(row);
    const vec = await embedder.embed(text);
    const buf = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
    stmt.run(buf, row._id);
    count++;
    if (count % 50 === 0) console.log(`  ${label}: ${count}/${rows.length}`);
  }
  console.log(`  ${label}: done (${count} embedded).`);
  return count;
}

let total = 0;

if (doSemantic) {
  total += await backfillTable('semantic',
    'SELECT key as _id, value FROM semantic',
    r => r.value.slice(0, 200),
    'UPDATE semantic SET embedding = ? WHERE key = ?',
    'semantic'
  );
}

if (doEpisodic) {
  total += await backfillTable('episodic',
    'SELECT id as _id, event, outcome FROM episodic',
    r => `${r.event} ${r.outcome || ''}`.slice(0, 200),
    'UPDATE episodic SET embedding = ? WHERE id = ?',
    'episodic'
  );
}

if (doProcedural) {
  total += await backfillTable('procedural',
    'SELECT name as _id, name, context, steps FROM procedural',
    r => {
      const steps = JSON.parse(r.steps || '[]').slice(0, 3).join(' ');
      return `${r.name} ${r.context || ''} ${steps}`.slice(0, 200);
    },
    'UPDATE procedural SET embedding = ? WHERE name = ?',
    'procedural'
  );
}

if (doKnowledge) {
  try {
    const whereClause = force ? '' : ' WHERE embedding IS NULL';
    const chunks = db.prepare(`SELECT id as _id, text FROM knowledge_chunks${whereClause}`).all();
    if (chunks.length) {
      console.log(`knowledge_chunks: backfilling ${chunks.length} rows...`);
      const stmt = db.prepare('UPDATE knowledge_chunks SET embedding = ? WHERE id = ?');
      let count = 0;
      for (const chunk of chunks) {
        const vec = await embedder.embed(chunk.text.slice(0, 300));
        stmt.run(Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength), chunk._id);
        count++;
        if (count % 50 === 0) console.log(`  knowledge_chunks: ${count}/${chunks.length}`);
      }
      console.log(`  knowledge_chunks: done (${count} embedded).`);
      total += count;
    } else {
      console.log('knowledge_chunks: nothing to backfill.');
    }
  } catch { console.log('knowledge_chunks: table not found, skipping.'); }
}

db.close();
console.log(`\nComplete. ${total} total rows embedded.`);
