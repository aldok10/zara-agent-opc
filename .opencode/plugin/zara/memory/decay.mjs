// Biological memory — confidence decay/boost for semantic memories
// Memories accessed frequently strengthen. Unused ones fade. Dead ones archive.

import fs from 'fs';
import path from 'path';
import { HOME, atomicWrite, ensure } from '../infra/store.mjs';

const SEMANTIC_FILE = path.join(HOME, 'memory', 'semantic.json');
const ARCHIVE_FILE = path.join(HOME, 'memory', 'archived.json');

const DECAY_RATE = 0.02;       // -0.02 per day since last access
const BOOST_AMOUNT = 0.15;     // +0.15 on access
const ARCHIVE_THRESHOLD = 0.2; // archive below this
const MAX_CONFIDENCE = 1.0;

function daysSince(isoDate) {
  if (!isoDate) return 30;
  return Math.max(0, (Date.now() - new Date(isoDate).getTime()) / 86400000);
}

function loadSemantic() {
  try { return JSON.parse(fs.readFileSync(SEMANTIC_FILE, 'utf-8')); }
  catch { return {}; }
}

function saveSemantic(data) {
  ensure(path.dirname(SEMANTIC_FILE));
  atomicWrite(SEMANTIC_FILE, JSON.stringify(data, null, 2));
}

function loadArchive() {
  try { return JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf-8')); }
  catch { return {}; }
}

function saveArchive(data) {
  ensure(path.dirname(ARCHIVE_FILE));
  atomicWrite(ARCHIVE_FILE, JSON.stringify(data, null, 2));
}

/** Boost a memory's confidence on access */
export function boostMemory(key) {
  const mem = loadSemantic();
  if (!mem[key]) return;
  mem[key].confidence = Math.min(MAX_CONFIDENCE, (mem[key].confidence || 0.5) + BOOST_AMOUNT);
  mem[key].lastAccessed = new Date().toISOString();
  mem[key].reinforced = (mem[key].reinforced || 0) + 1;
  saveSemantic(mem);
}

/** Apply decay to all memories based on time since last access. Returns count of archived. */
export function decayAll() {
  const mem = loadSemantic();
  const archive = loadArchive();
  let archived = 0;

  for (const [key, entry] of Object.entries(mem)) {
    // Skip policy/architecture — these don't decay
    if (entry.type === 'policy' || entry.type === 'architecture') continue;
    if (entry.confidence >= 1.0 && entry.source === 'user_explicit') continue;

    const days = daysSince(entry.lastAccessed || entry.learnedAt);
    const decay = days * DECAY_RATE;
    entry.confidence = Math.max(0, (entry.confidence || 0.5) - decay);

    if (entry.confidence < ARCHIVE_THRESHOLD) {
      archive[key] = { ...entry, archivedAt: new Date().toISOString() };
      delete mem[key];
      archived++;
    }
  }

  saveSemantic(mem);
  if (archived > 0) saveArchive(archive);
  return { archived, remaining: Object.keys(mem).length };
}

/** Get memory health stats */
export function memoryHealth() {
  const mem = loadSemantic();
  const entries = Object.values(mem);
  if (!entries.length) return { total: 0, healthy: 0, fading: 0, critical: 0 };

  let healthy = 0, fading = 0, critical = 0;
  for (const e of entries) {
    const conf = e.confidence || 0.5;
    if (conf >= 0.6) healthy++;
    else if (conf >= ARCHIVE_THRESHOLD) fading++;
    else critical++;
  }
  return { total: entries.length, healthy, fading, critical };
}
