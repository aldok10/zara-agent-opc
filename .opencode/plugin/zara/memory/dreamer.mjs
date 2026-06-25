// Memory Dreamer — automatic maintenance at session end
// Runs: decay, dedup, promote, digest

import fs from 'fs';
import path from 'path';
import { HOME, atomicWrite, ensure } from '../infra/store.mjs';
import { decayAll, memoryHealth } from './decay.mjs';

const SEMANTIC_FILE = path.join(HOME, 'memory', 'semantic.json');
const DIGEST_FILE = path.join(HOME, 'memory', 'digests.jsonl');

function loadSemantic() {
  try { return JSON.parse(fs.readFileSync(SEMANTIC_FILE, 'utf-8')); }
  catch { return {}; }
}

function saveSemantic(data) {
  ensure(path.dirname(SEMANTIC_FILE));
  atomicWrite(SEMANTIC_FILE, JSON.stringify(data, null, 2));
}

/** Simple string similarity (bigram overlap) */
function similarity(a, b) {
  if (!a || !b) return 0;
  const bigrams = s => { const r = []; for (let i = 0; i < s.length - 1; i++) r.push(s.slice(i, i + 2)); return r; };
  const ba = bigrams(a.toLowerCase()), bb = bigrams(b.toLowerCase());
  const set = new Set(ba);
  const overlap = bb.filter(x => set.has(x)).length;
  return (2 * overlap) / (ba.length + bb.length);
}

/** Merge duplicate memories (similarity > 0.85) */
function dedup() {
  const mem = loadSemantic();
  const keys = Object.keys(mem);
  const toDelete = new Set();
  let merged = 0;

  for (let i = 0; i < keys.length; i++) {
    if (toDelete.has(keys[i])) continue;
    for (let j = i + 1; j < keys.length; j++) {
      if (toDelete.has(keys[j])) continue;
      const sim = similarity(mem[keys[i]].value, mem[keys[j]].value);
      if (sim > 0.85) {
        const keepIdx = (mem[keys[i]].confidence || 0.5) >= (mem[keys[j]].confidence || 0.5) ? i : j;
        const dropIdx = keepIdx === i ? j : i;
        mem[keys[keepIdx]].reinforced = (mem[keys[keepIdx]].reinforced || 1) + (mem[keys[dropIdx]].reinforced || 1);
        toDelete.add(keys[dropIdx]);
        merged++;
      }
    }
  }

  if (merged > 0) {
    for (const k of toDelete) delete mem[k];
    saveSemantic(mem);
  }
  return merged;
}

/** Promote frequently-accessed inferred facts to higher confidence */
function promote() {
  const mem = loadSemantic();
  let promoted = 0;

  for (const [, entry] of Object.entries(mem)) {
    if (entry.source === 'inferred' && (entry.reinforced || 0) >= 5 && (entry.confidence || 0.5) < 0.8) {
      entry.confidence = 0.8;
      promoted++;
    }
  }

  if (promoted > 0) saveSemantic(mem);
  return promoted;
}

/** Run full maintenance cycle. Returns summary. */
export function dream() {
  const before = memoryHealth();
  const { archived } = decayAll();
  const merged = dedup();
  const promoted = promote();
  const after = memoryHealth();

  const digest = {
    ts: new Date().toISOString(),
    before: before.total,
    after: after.total,
    archived,
    merged,
    promoted,
    health: after,
  };

  ensure(path.dirname(DIGEST_FILE));
  fs.appendFileSync(DIGEST_FILE, JSON.stringify(digest) + '\n', 'utf-8');

  return digest;
}
