// scripts/backfill-chroma.mjs — One-time migration of SQLite semantic memory to Chroma.
//
// Reads every semantic row from ~/.zara/memory.db, ensures each has a 384-dim
// MiniLM embedding (generating any that are missing), and upserts the vector +
// metadata into the configured Chroma collection. Idempotent: safe to re-run.
//
// Usage:
//   ZARA_VECTOR=chroma ZARA_CHROMA_URL=http://localhost:8000 \
//     node --experimental-sqlite scripts/backfill-chroma.mjs [--generate-missing]
//
//   --generate-missing   also embed rows that have no stored vector yet
//                         (slower: runs MiniLM for each). Without it, only rows
//                         that already carry an embedding are migrated.

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import os from 'node:os';
import { getVectorStore, CHROMA_ENABLED } from '../tools/vector-store.mjs';
import { SemanticEmbedder } from '../tools/embedder.mjs';

const GENERATE_MISSING = process.argv.includes('--generate-missing');

async function main() {
  if (!CHROMA_ENABLED) {
    console.error('ZARA_VECTOR is not "chroma". Set: ZARA_VECTOR=chroma ZARA_CHROMA_URL=http://localhost:8000');
    process.exit(1);
  }
  const store = getVectorStore();
  if (!store) { console.error('Chroma backend unavailable.'); process.exit(1); }

  // Validate the server is reachable before doing any work (Chroma skill guidance).
  if (!(await store.reachable())) {
    console.error(`Chroma not reachable at ${process.env.ZARA_CHROMA_URL || 'http://localhost:8000'}.`);
    console.error('Start it with: docker compose up -d chroma');
    process.exit(1);
  }

  const dbPath = path.join(os.homedir(), '.zara', 'memory.db');
  const db = new DatabaseSync(dbPath, { readOnly: !GENERATE_MISSING });
  console.log(`Reading ${dbPath}`);

  const rows = db.prepare(
    'SELECT key, value, type, scope, embedding FROM semantic ORDER BY updated DESC'
  ).all();
  console.log(`${rows.length} semantic rows found.`);

  const embedder = GENERATE_MISSING ? SemanticEmbedder.instance() : null;

  let generated = 0, skipped = 0, failed = 0;
  const total = rows.length;
  const batch = [];

  for (let i = 0; i < total; i++) {
    const r = rows[i];
    let vec = null;

    if (r.embedding && r.embedding.byteLength >= 4) {
      const dim = r.embedding.byteLength / 4;
      if (dim === 384) {
        vec = new Float32Array(r.embedding.buffer, r.embedding.byteOffset, dim);
      }
    }

    if (!vec) {
      if (!GENERATE_MISSING) { skipped++; continue; }
      try {
        vec = await embedder.embed(`${r.key}: ${r.value}`.slice(0, 200));
        const buf = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
        db.prepare('UPDATE semantic SET embedding = ? WHERE key = ?').run(buf, r.key);
        generated++;
      } catch {
        failed++;
        continue;
      }
    }

    // Copy the vector: the SQLite-backed Float32Array view is transient.
    batch.push({ id: r.key, vector: Float32Array.from(vec), metadata: { type: r.type || 'fact', scope: r.scope || '' } });

    if ((i + 1) % 50 === 0 || i + 1 === total) {
      process.stdout.write(`\r  prepared: ${i + 1}/${total} (generated ${generated}, skipped ${skipped}, failed ${failed})`);
    }
  }

  process.stdout.write('\n');
  console.log(`Pushing ${batch.length} vectors to Chroma in batches...`);
  try {
    await store.upsertBatch(batch);
  } catch (e) {
    console.error('Batch upsert failed:', e.message);
    process.exit(1);
  }

  console.log(`Chroma collection now holds ${await store.count()} vectors.`);
  db.close();

  if (skipped > 0 && !GENERATE_MISSING) {
    console.log(`\n${skipped} rows had no embedding and were skipped.`);
    console.log('Re-run with --generate-missing to embed and migrate them too.');
  }
  console.log('Done.');
}

main().catch(e => { console.error('Backfill failed:', e.message); process.exit(1); });
