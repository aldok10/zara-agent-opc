// Knowledge Graph module — entity extraction + relationship inference
// Lightweight: JSONL storage with materialized adjacency index

import fs from 'fs';
import path from 'path';
import { HOME, ensure, atomicWrite, SECRET_PATTERN } from '../infra/store.mjs';

// ─── Constants ───────────────────────────────────────────────────────────────

const MEM_DIR = path.join(HOME, 'memory');
const ENTITIES_FILE = path.join(MEM_DIR, 'entities.jsonl');
const RELATIONSHIPS_FILE = path.join(MEM_DIR, 'relationships.jsonl');
const GRAPH_INDEX_FILE = path.join(MEM_DIR, 'graph-index.json');
const ARCHIVE_FILE = path.join(MEM_DIR, 'graph-archive.jsonl');

const DECAY_HALFLIFE_DAYS = 30;
const PRUNE_FREQUENCY = 50;   // prune after every N messages
const MIN_ENTITY_FREQ = 3;    // prune entities with fewer mentions
const MIN_RELATIONSHIP_WEIGHT = 0.15;
const ARCHIVE_AFTER_DAYS = 90;

let _messageCounter = 0;

// ─── Entity Types ────────────────────────────────────────────────────────────

const ENTITY_TYPES = ['person', 'technology', 'project', 'organization', 'domain', 'platform', 'tool', 'concept', 'language', 'repository', 'url'];

// ─── File Helpers ────────────────────────────────────────────────────────────

function appendJsonl(file, entry) {
  ensure(path.dirname(file));
  fs.appendFileSync(file, JSON.stringify(entry) + '\n', 'utf-8');
}

function readJsonl(file) {
  try {
    return fs.readFileSync(file, 'utf-8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  } catch { return []; }
}

function writeJson(file, data) {
  ensure(path.dirname(file));
  atomicWrite(file, JSON.stringify(data, null, 2));
}

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9._/-]/g, '').slice(0, 100);
}

// ─── Entity Extraction ───────────────────────────────────────────────────────

export function extractEntities(text) {
  if (!text || typeof text !== 'string' || text.length < 10) return [];

  const entities = [];
  const seen = new Set();

  function add(type, name, sourceText) {
    const key = `${type}:${normalizeName(name)}`;
    if (seen.has(key)) return;
    seen.add(key);
    entities.push({ type, name: name.trim().slice(0, 80), source: sourceText?.slice(0, 120) || '' });
  }

  // Technology mentions (known tech names)
  const techPattern = /(?:\b(?:using|with|in|for|pakai|pake|belajar|stack-nya)\s+)?\b(Go|Python|TypeScript|JavaScript|Rust|React|Vue|Angular|Node\.?js|Deno|Bun|Postgres(?:SQL)?|MySQL|MongoDB|Redis|Docker|Kubernetes|AWS|GCP|Azure|GraphQL|gRPC|Next\.?js|Express|Fastify|Prisma|Drizzle|Tailwind|Swift|Kotlin|Flutter|React\s*Native)\b/gi;
  let m;
  while ((m = techPattern.exec(text)) !== null) {
    const name = m[1].replace(/\./g, '');  // normalize Node.js → Nodejs
    add('technology', name === 'Nodejs' ? 'Node.js' : name === 'Nextjs' ? 'Next.js' : name === 'ReactNative' ? 'React Native' : name, m[0]);
  }

  // Project/repo references (org/repo pattern)
  const repoPattern = /[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+/g;
  while ((m = repoPattern.exec(text)) !== null) {
    if (!m[0].includes('/') || m[0].startsWith('http')) continue;  // avoid false positives
    add('repository', m[0], m[0]);
  }

  // URLs
  const urlPattern = /https?:\/\/[^\s,)]+/g;
  while ((m = urlPattern.exec(text)) !== null) {
    add('url', m[0].replace(/[.,;:]+$/, ''), m[0]);
  }

  // @mentions (people)
  const mentionPattern = /@[a-zA-Z0-9_-]+/g;
  while ((m = mentionPattern.exec(text)) !== null) {
    add('person', m[0].slice(1), m[0]);
  }

  // Framework/library patterns ("using X framework" or "X library")
  const fwPattern = /([A-Z][a-zA-Z]+)\s+(framework|library|tool|database|language|platform)/g;
  while ((m = fwPattern.exec(text)) !== null) {
    add('concept', m[1], m[0]);
  }

  return entities;
}

// ─── Relationship Inference ──────────────────────────────────────────────────

function inferRelationship(entityA, entityB, text) {
  const t = text.toLowerCase();

  // uses/depends_on patterns
  if (/uses|pakai|belajar|stack/i.test(t)) return 'uses';
  if (/depends\s+on|built\s+(with|on)|runs\s+on/i.test(t)) return 'depends_on';

  // migration/switch
  if (/switched\s+(to|from)|migrated\s+(to|from)|pindah\s+(ke|dari)|ganti\s+(ke|dari)/i.test(t)) return 'alternative_to';

  // deployment
  if (/deployed\s+(to|on|at)|hosted\s+(on|at)|deploy\s+ke/i.test(t)) return 'deployed_on';

  // part_of
  if (/part\s+of|bagian\s+dari|is\s+a\s+project\s+of|di\s+bawah/i.test(t)) return 'part_of';

  // co-occurs (default)
  return 'related_to';
}

// ─── Core API ────────────────────────────────────────────────────────────────

export function appendEntity(type, name, source) {
  if (!name || !type) return;
  const normalized = normalizeName(name);
  if (!normalized) return;
  const existing = readJsonl(ENTITIES_FILE);
  const idx = existing.findIndex(e => normalizeName(e.name) === normalized && e.type === type);

  if (idx >= 0) {
    existing[idx].last_seen = new Date().toISOString();
    existing[idx].frequency = (existing[idx].frequency || 0) + 1;
    if (source) existing[idx].last_source = source;
    writeJson(ENTITIES_FILE, existing);  // rewrite with updated entity
  } else {
    appendJsonl(ENTITIES_FILE, {
      id: `ent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      name,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      frequency: 1,
      source: source || 'extraction',
    });
  }
}

export function appendRelationship(sourceName, targetName, relationType, context) {
  if (!sourceName || !targetName) return;
  const s = normalizeName(sourceName);
  const t = normalizeName(targetName);
  if (s === t) return;  // no self-relationships

  const existing = readJsonl(RELATIONSHIPS_FILE);
  const key = `${s}__${relationType || 'related_to'}__${t}`;
  const idx = existing.findIndex(e => `${normalizeName(e.source)}__${e.type}__${normalizeName(e.target)}` === key);

  if (idx >= 0) {
    existing[idx].last_observed = new Date().toISOString();
    existing[idx].observation_count = (existing[idx].observation_count || 1) + 1;
    existing[idx].weight = Math.min(1.0, (existing[idx].weight || 0.5) + 0.1);
    if (context) existing[idx].context_snippet = context;
    writeJson(RELATIONSHIPS_FILE, existing);
  } else {
    appendJsonl(RELATIONSHIPS_FILE, {
      id: `rel_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      source: sourceName,
      target: targetName,
      type: relationType || 'related_to',
      weight: 0.5,
      first_observed: new Date().toISOString(),
      last_observed: new Date().toISOString(),
      observation_count: 1,
      context_snippet: context || '',
    });
  }
}

export function materializeGraphIndex() {
  const entities = readJsonl(ENTITIES_FILE);
  const relationships = readJsonl(RELATIONSHIPS_FILE);

  const index = {
    entities_by_name: {},
    entities_by_type: {},
    adjacency: {},
    last_materialized: new Date().toISOString(),
  };

  // Build entity lookups
  for (const e of entities) {
    const n = normalizeName(e.name);
    index.entities_by_name[n] = { id: e.id, type: e.type, name: e.name, frequency: e.frequency, last_seen: e.last_seen };

    if (!index.entities_by_type[e.type]) index.entities_by_type[e.type] = [];
    if (!index.entities_by_type[e.type].find(x => x.id === e.id)) {
      index.entities_by_type[e.type].push({ id: e.id, name: e.name, frequency: e.frequency });
    }
  }

  // Build adjacency list
  for (const r of relationships) {
    const sn = normalizeName(r.source);
    const tn = normalizeName(r.target);

    if (!index.adjacency[sn]) index.adjacency[sn] = [];
    index.adjacency[sn].push({
      target: tn,
      targetName: r.target,
      type: r.type,
      weight: r.weight,
      lastObserved: r.last_observed,
    });

    // Bidirectional
    if (!index.adjacency[tn]) index.adjacency[tn] = [];
    index.adjacency[tn].push({
      target: sn,
      targetName: r.source,
      type: r.type,
      weight: r.weight,
      lastObserved: r.last_observed,
    });
  }

  writeJson(GRAPH_INDEX_FILE, index);
  return index;
}

function loadGraphIndex() {
  try {
    const data = JSON.parse(fs.readFileSync(GRAPH_INDEX_FILE, 'utf-8'));
    if (data.last_materialized) return data;
  } catch {}
  return materializeGraphIndex();
}

// ─── Graph Query ─────────────────────────────────────────────────────────────

export function queryGraph(query, { maxDepth = 1, minWeight = 0.3 } = {}) {
  if (!query || typeof query !== 'string') return { entity: null, neighbors: [] };

  const index = loadGraphIndex();
  const normalized = normalizeName(query);

  // Find matching entity
  const entity = index.entities_by_name[normalized];
  if (!entity) return { entity: null, neighbors: [] };

  // BFS traversal
  const visited = new Set();
  const result = { entity, neighbors: [], path: [[entity.name]] };
  visited.add(normalized);

  let queue = [{ name: normalized, depth: 0, path: [entity.name] }];
  let currentDepth = 0;

  while (queue.length > 0) {
    const { name, depth, path } = queue.shift();
    if (depth >= maxDepth) continue;

    const connections = index.adjacency[name] || [];
    for (const conn of connections) {
      if (conn.weight < minWeight) continue;
      if (visited.has(conn.target)) continue;
      visited.add(conn.target);

      result.neighbors.push({
        source: index.entities_by_name[normalized]?.name || query,
        target: conn.targetName || conn.target,
        type: conn.type,
        weight: conn.weight,
        depth: depth + 1,
        lastObserved: conn.lastObserved,
      });

      const targetEntity = index.entities_by_name[conn.target];
      if (targetEntity && depth + 1 < maxDepth) {
        queue.push({ name: conn.target, depth: depth + 1, path: [...path, targetEntity.name] });
      }
    }
  }

  return result;
}

// ─── Pruning ─────────────────────────────────────────────────────────────────

export function pruneEntities() {
  const entities = readJsonl(ENTITIES_FILE);
  const relationships = readJsonl(RELATIONSHIPS_FILE);
  const now = Date.now();
  const archiveEntries = [];
  const keepEntities = [];
  const keepRelationships = [];
  const keptEntityNames = new Set();

  // Prune stale/low-frequency entities
  for (const e of entities) {
    const daysSinceLastSeen = (now - new Date(e.last_seen).getTime()) / (1000 * 86400);
    if ((e.frequency || 0) < MIN_ENTITY_FREQ && daysSinceLastSeen > 14) {
      archiveEntries.push({ type: 'entity', ...e, archived_at: new Date().toISOString() });
    } else if (daysSinceLastSeen > ARCHIVE_AFTER_DAYS) {
      archiveEntries.push({ type: 'entity', ...e, archived_at: new Date().toISOString() });
    } else {
      keepEntities.push(e);
      keptEntityNames.add(normalizeName(e.name));
    }
  }

  // Prune stale relationships and those connected to pruned entities
  for (const r of relationships) {
    const sn = normalizeName(r.source);
    const tn = normalizeName(r.target);
    if (!keptEntityNames.has(sn) || !keptEntityNames.has(tn)) {
      archiveEntries.push({ type: 'relationship', ...r, archived_at: new Date().toISOString() });
      continue;
    }
    const daysSinceLastObs = (now - new Date(r.last_observed).getTime()) / (1000 * 86400);
    const decayedWeight = r.weight * Math.exp(-daysSinceLastObs / DECAY_HALFLIFE_DAYS);
    if (decayedWeight < MIN_RELATIONSHIP_WEIGHT) {
      archiveEntries.push({ type: 'relationship', ...r, archived_at: new Date().toISOString() });
      continue;
    }
    keepRelationships.push(r);
  }

  // Write kept data
  writeJson(ENTITIES_FILE, keepEntities);
  writeJson(RELATIONSHIPS_FILE, keepRelationships);

  // Append archives
  if (archiveEntries.length > 0) {
    ensure(path.dirname(ARCHIVE_FILE));
    for (const entry of archiveEntries) {
      fs.appendFileSync(ARCHIVE_FILE, JSON.stringify(entry) + '\n', 'utf-8');
    }
  }

  return { pruned: archiveEntries.length, kept: { entities: keepEntities.length, relationships: keepRelationships.length } };
}

// ─── Process entities from user message ──────────────────────────────────────

export function processMessage(text) {
  if (!text || text.length < 10 || text.length > 3000) return;

  _messageCounter++;

  // Skip messages that look like secrets
  if (SECRET_PATTERN?.test?.(text)) return;

  const entities = extractEntities(text);
  if (entities.length === 0) return;

  // Store entities
  for (const e of entities) {
    appendEntity(e.type, e.name, e.source);
  }

  // Create co-occurrence relationships
  if (entities.length >= 2) {
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const relType = inferRelationship(entities[i].name, entities[j].name, text);
        appendRelationship(entities[i].name, entities[j].name, relType, text.slice(0, 150));
      }
    }
  }

  // Periodic pruning
  if (_messageCounter % PRUNE_FREQUENCY === 0) {
    pruneEntities();
  }
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export function graphStats() {
  return {
    entities: readJsonl(ENTITIES_FILE).length,
    relationships: readJsonl(RELATIONSHIPS_FILE).length,
    indexLoaded: fs.existsSync(GRAPH_INDEX_FILE),
    archiveExists: fs.existsSync(ARCHIVE_FILE),
    messageCounter: _messageCounter,
  };
}
