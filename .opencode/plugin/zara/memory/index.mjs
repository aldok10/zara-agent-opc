// Memory module — 3-layer episodic/semantic/procedural memory + reflection + knowledge
// Ported from: zara-memory, zara-reflection, zara-knowledge

import fs from 'fs';
import path from 'path';
import { tool } from '@opencode-ai/plugin';
import { FileStore, HOME, ensure, atomicWrite, loadJson } from '../infra/store.mjs';

const z = tool.schema;

// ─── Constants ──────────────────────────────────────────────────────────────

const MEM_DIR = path.join(HOME, 'memory');
const EPISODIC_FILE = path.join(MEM_DIR, 'episodic.jsonl');
const SEMANTIC_FILE = path.join(MEM_DIR, 'semantic.json');
const PROCEDURAL_FILE = path.join(MEM_DIR, 'procedural.json');
const ENTITIES_FILE = path.join(MEM_DIR, 'entities.json');

const REFLECT_DIR = path.join(HOME, 'reflections');
const REFLECT_FILE = path.join(REFLECT_DIR, 'log.jsonl');
const PATTERNS_FILE = path.join(REFLECT_DIR, 'patterns.json');

const MAX_EPISODIC = 200;
const MAX_PROCEDURAL = 50;
const MAX_LOG = 100;
const DECAY_DAYS = 90;
const DECAY_RATE = 0.05;
const PROMOTE_THRESHOLD = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadJsonl(file, max) {
  try {
    const lines = fs.readFileSync(file, 'utf-8').trim().split('\n').filter(Boolean);
    return lines.slice(-max).map(l => JSON.parse(l));
  } catch { return []; }
}

let _episodicCount = -1;

function appendJsonl(file, entry) {
  ensure(path.dirname(file));
  fs.appendFileSync(file, JSON.stringify(entry) + '\n', 'utf-8');
  _episodicCount++;
  if (_episodicCount > MAX_EPISODIC + 20) {
    const lines = fs.readFileSync(file, 'utf-8').trim().split('\n').filter(Boolean);
    if (lines.length > MAX_EPISODIC) {
      atomicWrite(file, lines.slice(-MAX_EPISODIC).join('\n') + '\n');
      _episodicCount = MAX_EPISODIC;
    }
  }
}

// ─── Cached Loaders ──────────────────────────────────────────────────────────

let _semanticCache = null;
let _semanticMtime = 0;
let _proceduralCache = null;
let _proceduralMtime = 0;

function loadSemanticCached() {
  try {
    const stat = fs.statSync(SEMANTIC_FILE);
    if (_semanticCache && stat.mtimeMs === _semanticMtime) return _semanticCache;
    _semanticCache = JSON.parse(fs.readFileSync(SEMANTIC_FILE, 'utf-8'));
    _semanticMtime = stat.mtimeMs;
    return _semanticCache;
  } catch { return {}; }
}

function loadProceduralCached() {
  try {
    const stat = fs.statSync(PROCEDURAL_FILE);
    if (_proceduralCache && stat.mtimeMs === _proceduralMtime) return _proceduralCache;
    _proceduralCache = JSON.parse(fs.readFileSync(PROCEDURAL_FILE, 'utf-8'));
    _proceduralMtime = stat.mtimeMs;
    return _proceduralCache;
  } catch { return []; }
}

function saveJson(file, data) {
  ensure(path.dirname(file));
  atomicWrite(file, JSON.stringify(data, null, 2));
  if (file === SEMANTIC_FILE) { _semanticCache = data; try { _semanticMtime = fs.statSync(file).mtimeMs; } catch {} }
  if (file === PROCEDURAL_FILE) { _proceduralCache = data; try { _proceduralMtime = fs.statSync(file).mtimeMs; } catch {} }
}

// ─── Memory Maintenance (v2.1) ──────────────────────────────────────────────

function decaySemantic() {
  const semantic = loadJson(SEMANTIC_FILE, {});
  const now = Date.now();
  let changed = false;

  for (const [key, entry] of Object.entries(semantic)) {
    const age = (now - new Date(entry.learnedAt || 0).getTime()) / 86_400_000;
    if (age > DECAY_DAYS && entry.reinforced <= 1) {
      entry.confidence = Math.max(0.1, (entry.confidence || 0.7) - DECAY_RATE);
      changed = true;
    }
    if (entry.confidence < 0.15) {
      delete semantic[key];
      changed = true;
    }
  }
  if (changed) saveJson(SEMANTIC_FILE, semantic);
}

function consolidateEpisodic() {
  const episodes = loadJsonl(EPISODIC_FILE, MAX_EPISODIC);
  if (episodes.length < PROMOTE_THRESHOLD) return;

  const semantic = loadJson(SEMANTIC_FILE, {});
  const tagCounts = {};

  for (const ep of episodes) {
    for (const tag of (ep.tags || [])) {
      const k = `pattern.${tag}.${ep.outcome}`;
      tagCounts[k] = (tagCounts[k] || 0) + 1;
    }
  }

  let promoted = 0;
  for (const [pattern, count] of Object.entries(tagCounts)) {
    if (count >= PROMOTE_THRESHOLD && !semantic[pattern]) {
      semantic[pattern] = {
        value: `Observed ${count} times in episodic history`,
        confidence: Math.min(0.9, 0.5 + count * 0.1),
        learnedAt: new Date().toISOString(),
        reinforced: count,
        source: 'episodic-promotion',
      };
      promoted++;
    }
  }
  if (promoted > 0) saveJson(SEMANTIC_FILE, semantic);
}

function dreamerConsolidate() {
  const semantic = loadJson(SEMANTIC_FILE, {});
  const entries = Object.entries(semantic);
  if (entries.length < 10) return;

  const merged = new Set();
  let changed = false;

  for (let i = 0; i < entries.length; i++) {
    if (merged.has(entries[i][0])) continue;
    const [k1, v1] = entries[i];
    const words1 = new Set(k1.toLowerCase().split(/[.\-_\s]+/));

    for (let j = i + 1; j < entries.length; j++) {
      if (merged.has(entries[j][0])) continue;
      const [k2, v2] = entries[j];
      if (v1.type !== v2.type) continue;

      const words2 = new Set(k2.toLowerCase().split(/[.\-_\s]+/));
      const inter = [...words1].filter(w => words2.has(w)).length;
      const union = new Set([...words1, ...words2]).size;
      const sim = inter / union;

      if (sim >= 0.7) {
        const keeper = (v1.reinforced || 1) >= (v2.reinforced || 1) ? k1 : k2;
        const loser = keeper === k1 ? k2 : k1;
        semantic[keeper].reinforced = (semantic[keeper].reinforced || 1) + (semantic[loser].reinforced || 1);
        semantic[keeper].confidence = Math.min(1.0, (semantic[keeper].confidence || 0.7) + 0.05);
        if (semantic[loser].value !== semantic[keeper].value) {
          semantic[keeper].value += ` | ${semantic[loser].value}`;
        }
        delete semantic[loser];
        merged.add(loser);
        changed = true;
      }
    }
  }
  if (changed) saveJson(SEMANTIC_FILE, semantic);
}

// ─── Reflection Helpers ──────────────────────────────────────────────────────

let _patternsCache = null;
let _patternsMtime = 0;

function loadPatterns() {
  try {
    const stat = fs.statSync(PATTERNS_FILE);
    if (_patternsCache && stat.mtimeMs === _patternsMtime) return _patternsCache;
    const data = JSON.parse(fs.readFileSync(PATTERNS_FILE, 'utf-8'));
    data.sort((a, b) => b.occurrences - a.occurrences);
    _patternsCache = data;
    _patternsMtime = stat.mtimeMs;
    return _patternsCache;
  } catch { return []; }
}

function savePatterns(patterns) {
  ensure(REFLECT_DIR);
  atomicWrite(PATTERNS_FILE, JSON.stringify(patterns, null, 2));
  _patternsCache = patterns;
  try { _patternsMtime = fs.statSync(PATTERNS_FILE).mtimeMs; } catch {}
}

// ─── Knowledge Helpers ──────────────────────────────────────────────────────

function buildIndex(entries) {
  const N = entries.length;
  const docs = entries.map(e => {
    const text = [
      e.title, e.title, e.title,
      e.section, e.section,
      ...(e.keywords || []),
      ...(e.keywords || []),
      e.description || '',
    ].join(' ').toLowerCase();
    return text.split(/\s+/).filter(w => w.length >= 2);
  });

  const df = {};
  for (const doc of docs) {
    const seen = new Set(doc);
    for (const term of seen) df[term] = (df[term] || 0) + 1;
  }

  const idf = {};
  for (const [term, count] of Object.entries(df)) idf[term] = Math.log(N / count);

  return { docs, idf, N };
}

function trigrams(str) {
  const s = `  ${str.toLowerCase()}  `;
  const grams = new Set();
  for (let i = 0; i < s.length - 2; i++) grams.add(s.slice(i, i + 3));
  return grams;
}

function trigramSimilarity(a, b) {
  const gramsA = trigrams(a);
  const gramsB = trigrams(b);
  let intersection = 0;
  for (const g of gramsA) if (gramsB.has(g)) intersection++;
  return intersection / Math.max(gramsA.size, gramsB.size, 1);
}

function search(index, entries, query, limit) {
  const terms = query.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
  const { docs, idf } = index;

  const scores = docs.map((doc, i) => {
    let score = 0;
    const docLen = doc.length || 1;
    for (const term of terms) {
      const tf = doc.filter(w => w === term || w.startsWith(term)).length / docLen;
      const termIdf = idf[term] || Math.log(index.N);
      score += tf * termIdf;
    }
    return { idx: i, score };
  });

  let results = scores
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => entries[s.idx]);

  if (results.length === 0) {
    const fuzzy = entries.map((e, i) => {
      const text = `${e.title} ${e.section} ${(e.keywords || []).join(' ')}`;
      const sim = trigramSimilarity(query, text);
      return { idx: i, score: sim };
    })
      .filter(s => s.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    results = fuzzy.map(s => entries[s.idx]);
  }

  return results;
}

// ─── Entity Graph ───────────────────────────────────────────────────────────

let _entitiesCache = null;
let _entitiesMtime = 0;

function loadEntities() {
  try {
    const stat = fs.statSync(ENTITIES_FILE);
    if (_entitiesCache && stat.mtimeMs === _entitiesMtime) return _entitiesCache;
    _entitiesCache = JSON.parse(fs.readFileSync(ENTITIES_FILE, 'utf-8'));
    _entitiesMtime = stat.mtimeMs;
    return _entitiesCache;
  } catch { return { nodes: {}, edges: [] }; }
}

function saveEntities(data) {
  ensure(MEM_DIR);
  atomicWrite(ENTITIES_FILE, JSON.stringify(data, null, 2));
  _entitiesCache = data;
  try { _entitiesMtime = fs.statSync(ENTITIES_FILE).mtimeMs; } catch {}
}

function findConnected(graph, entityLabel, depth = 1) {
  const label = entityLabel.toLowerCase();
  const results = [];
  for (const edge of graph.edges) {
    if (edge.source.toLowerCase() === label || edge.target.toLowerCase() === label) {
      results.push(edge);
    }
  }
  return results;
}

// ─── Module Export ───────────────────────────────────────────────────────────

export default function createMemory({ client, directory } = {}) {
  let maintained = false;
  function runMaintenance() {
    if (maintained) return;
    maintained = true;
    try { decaySemantic(); consolidateEpisodic(); dreamerConsolidate(); } catch {}
  }

  // Knowledge index (lazy)
  const indexPath = directory ? path.join(directory, 'knowledge', 'search-index.json') : null;
  let _entries = null;
  let _tfidfIndex = null;

  function getIndex() {
    if (!indexPath) return { entries: [], tfidfIndex: null };
    if (_tfidfIndex) return { entries: _entries, tfidfIndex: _tfidfIndex };
    try {
      _entries = JSON.parse(fs.readFileSync(indexPath, 'utf8')).entries || [];
      _tfidfIndex = buildIndex(_entries);
    } catch { _entries = []; }
    return { entries: _entries, tfidfIndex: _tfidfIndex };
  }

  const refDocs = {
    'leadership': directory ? path.join(directory, 'knowledge', 'leadership-comprehensive.md') : null,
    'leadership-frameworks': directory ? path.join(directory, '.opencode', 'skills', 'leadership-expert', 'knowledge', 'frameworks.md') : null,
    'orchestration': directory ? path.join(directory, '.opencode', 'skills', 'leadership-expert', 'knowledge', 'orchestration.md') : null,
    'empathy': directory ? path.join(directory, '.opencode', 'skills', 'leadership-expert', 'knowledge', 'empathy.md') : null,
    'ai-leadership-research': directory ? path.join(directory, '.opencode', 'skills', 'leadership-expert', 'knowledge', 'ai-leadership-research.md') : null,
    'owasp': directory ? path.join(directory, 'knowledge', 'owasp-aisvs-compliance.md') : null,
    'antipatterns': directory ? path.join(directory, 'knowledge', 'ANTIPATTERNS_QUICKREF.md') : null,
  };

  const sections = {
    'antipatterns': 'antipatterns',
    'architecture': 'architecture',
    'code-smells': 'code-smells',
    'design-patterns': 'design-patterns',
    'ddd': 'domain-driven-design',
    'laws': 'laws',
    'practices': 'practices',
    'principles': 'principles',
    'testing': 'testing',
    'values': 'values',
  };

  return {
    // ── Hooks ──────────────────────────────────────────────────────────────

    onEvent(event) {
      // No specific session handling needed for memory
    },

    inject(messages) {
      const TOKEN_BUDGET = 800;
      let tokensUsed = 0;
      const parts = [];

      let entries = [], procs = [];

      // Load from JSON cache (sync, no deps)
      try {
        const semantic = loadSemanticCached();
        entries = Object.entries(semantic);
      } catch { entries = []; }
      try { procs = loadProceduralCached(); } catch { procs = []; }

      if (!entries.length && !procs.length) return messages;

      // Layer A: Baseline — policy/architecture/preference
      const baseline = entries
        .filter(([, v]) => ['policy', 'architecture', 'preference'].includes(v.type) || v.confidence >= 1.0)
        .slice(0, 8);

      if (baseline.length) {
        const lines = baseline.map(([k, v]) => `- [${v.type || 'fact'}] ${k}: ${v.value}`);
        const block = `## Core Memory\n${lines.join('\n')}`;
        tokensUsed += Math.ceil(block.length / 4);
        if (tokensUsed <= TOKEN_BUDGET) parts.push(block);
      }

      // Layer B: Context-relevant — reinforced facts
      const baselineKeys = new Set(baseline.map(([k]) => k));
      const contextual = entries
        .filter(([k, v]) => !baselineKeys.has(k) && (v.reinforced || 1) >= 2)
        .slice(0, 6);

      if (contextual.length) {
        const lines = contextual.map(([k, v]) => `- ${k}: ${v.value}`);
        const block = lines.join('\n');
        tokensUsed += Math.ceil(block.length / 4);
        if (tokensUsed <= TOKEN_BUDGET) parts.push(block);
      }

      // Layer C: Procedures
      if (procs.length > 0 && tokensUsed < TOKEN_BUDGET - 100) {
        const block = `## Learned Procedures\n${procs.map(p => `- **${p.name}**: ${p.steps.slice(0, 3).join(' → ')}${p.steps.length > 3 ? '...' : ''}`).join('\n')}`;
        tokensUsed += Math.ceil(block.length / 4);
        if (tokensUsed <= TOKEN_BUDGET) parts.push(block);
      }

      if (parts.length) {
        const last = messages[messages.length - 1];
        if (last && last.role === 'system') {
          last.content += '\n\n' + parts.join('\n\n');
        } else {
          messages.push({ role: 'system', content: parts.join('\n\n') });
        }
      }
      return messages;
    },

    onMessage(msg) {
      if (msg.role !== 'user' || !msg.content) return;
      const text = typeof msg.content === 'string' ? msg.content : '';
      if (text.length < 20 || text.length > 2000) return;

      // Security: skip messages containing potential secrets
      const SECRET_PATTERNS = /(?:sk-|ghp_|gho_|glpat-|xoxb-|xoxp-|api[_-]?key|password|passwd|secret|token|bearer|authorization)[=:\s]\S{8,}/i;
      if (SECRET_PATTERNS.test(text)) return;

      const semantic = loadJson(SEMANTIC_FILE, {});
      let captured = false;

      // Pattern: explicit preferences
      const prefPatterns = [
        /(?:i prefer|i like|i want|always use|never use|don't use|jangan pakai|selalu pakai|aku suka|aku mau)\s+(.{5,80})/i,
        /(?:gunakan|pakai|use)\s+(.{3,40})\s+(?:aja|saja|always|selalu)/i,
        /(?:aku|saya|gue)\s+(?:lebih\s+suka|memilih|sering)\s+(.{5,60})/i,
        /(?:lebih\s+baik|lebih\s+enak|lebih\s+mudah)\s+(.{5,60})/i,
      ];
      for (const pat of prefPatterns) {
        const m = text.match(pat);
        if (m) {
          const key = `user.pref.${m[1].slice(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          if (!semantic[key]) {
            semantic[key] = { value: m[0].trim(), confidence: 0.6, type: 'preference', learnedAt: new Date().toISOString(), reinforced: 1 };
            captured = true;
          }
        }
      }

      // Pattern: corrections
      const corrPatterns = [/ (?:actually|correction|no,|bukan.*tapi|sebenarnya)\s+(.{5,100})/i];
      for (const pat of corrPatterns) {
        const m = text.match(pat);
        if (m) {
          const key = `correction.${Date.now().toString(36)}`;
          if (!semantic[key]) {
            semantic[key] = { value: m[0].trim(), confidence: 0.7, type: 'decision', learnedAt: new Date().toISOString(), reinforced: 1 };
            captured = true;
          }
        }
      }

      // Pattern: constraints
      const constraintPatterns = [
        / (?:must|harus|wajib|don't ever|never ever|jangan pernah)\s+(.{5,80})/i,
        /(?:tolong|mohon)\s+(?:jangan|nggak\s+usah)\s+(.{5,60})/i,
        /(?:kalau\s+bisa|usahakan|coba)\s+(.{5,60})/i,
      ];
      for (const pat of constraintPatterns) {
        const m = text.match(pat);
        if (m) {
          const key = `policy.${m[1].slice(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          if (!semantic[key]) {
            semantic[key] = { value: m[0].trim(), confidence: 0.8, type: 'policy', learnedAt: new Date().toISOString(), reinforced: 1 };
            captured = true;
          }
        }
      }

      if (captured) saveJson(SEMANTIC_FILE, semantic);
    },

    onResponse(res) {
      if (!res?.content) return;
      const text = typeof res.content === 'string' ? res.content : '';
      if (text.length < 50) return;

      const errorSignals = /(?:error:|failed:|cannot |can't |unable to |doesn't work|broke|bug:|issue:|mistake)/i;
      const retrySignals = /(?:let me try|trying again|different approach|step back|fundamentally different)/i;

      if (errorSignals.test(text) || retrySignals.test(text)) {
        const sentences = text.split(/[.\n]/).filter(s => s.length > 20 && s.length < 200);
        const errorSentence = sentences.find(s => errorSignals.test(s) || retrySignals.test(s));
        if (errorSentence) {
          const episode = {
            event: `self-error: ${errorSentence.trim().slice(0, 120)}`,
            outcome: retrySignals.test(text) ? 'learning' : 'failure',
            tags: ['auto-detect', 'self-improvement'],
            ts: new Date().toISOString(),
          };
          appendJsonl(EPISODIC_FILE, episode);
        }
      }
    },

    dispose() {},

    // ── Tools ──────────────────────────────────────────────────────────────

    tools: {
      // ── Memory Tools ────────────────────────────────────────────────────

      memory_episode: tool({
        description: 'Record an episodic memory — something that happened. Use for task outcomes, user reactions, errors encountered, successes.',
        args: {
          event: z.string().describe('What happened'),
          outcome: z.enum(['success', 'failure', 'partial', 'learning']).describe('How it went'),
          context: z.string().optional().describe('Relevant context (project, task type)'),
          tags: z.array(z.string()).optional().describe('Tags for retrieval'),
        },
        async execute(args) {
          const episode = { ...args, ts: new Date().toISOString() };
          appendJsonl(EPISODIC_FILE, episode);
          return { output: `Episode recorded: ${args.event} [${args.outcome}]` };
        },
      }),

      memory_learn: tool({
        description: 'Store a semantic memory — a learned fact, preference, decision, or constraint. Types: policy, workflow, pitfall, architecture, decision, preference, fact.',
        args: {
          key: z.string().describe('What this is about (e.g. "user.prefers-go-stdlib", "project.uses-sqlc")'),
          value: z.string().describe('The learned fact'),
          confidence: z.number().min(0).max(1).optional().describe('How confident (0-1, default 0.7)'),
          type: z.enum(['policy', 'workflow', 'pitfall', 'architecture', 'decision', 'preference', 'fact']).optional().describe('Memory type — determines injection priority'),
        },
        async execute(args) {
          const semantic = loadJson(SEMANTIC_FILE, {});
          const existing = semantic[args.key];
          const now = new Date().toISOString();

          if (existing) {
            // Contradiction detection: value changed significantly
            const oldVal = (existing.value || '').toLowerCase().trim();
            const newVal = args.value.toLowerCase().trim();
            const hasConflict = oldVal && newVal !== oldVal &&
              oldVal.length > 5 && newVal.length > 5 &&
              !oldVal.includes(newVal) && !newVal.includes(oldVal);

            semantic[args.key] = {
              ...existing,
              value: args.value,
              confidence: args.confidence || existing.confidence,
              type: args.type || existing.type,
              reinforced: (existing.reinforced || 0) + 1,
              lastAccessedAt: now,
              maturity: hasConflict ? -1 : (existing.maturity ?? 1),
              ...(hasConflict ? { conflict_with: [...(existing.conflict_with || []), existing.value.slice(0, 80)] } : {}),
            };
          } else {
            semantic[args.key] = {
              value: args.value,
              confidence: args.confidence || 0.7,
              type: args.type || 'fact',
              learnedAt: now,
              lastAccessedAt: now,
              reinforced: 1,
              maturity: 0,
            };
          }

          saveJson(SEMANTIC_FILE, semantic);
          return { output: `Learned [${args.type || 'fact'}]: ${args.key} = ${args.value}` };
        },
      }),

      memory_procedure: tool({
        description: 'Record a procedural memory — a workflow or approach that worked. Used to repeat successful patterns.',
        args: {
          name: z.string().describe('Procedure name (e.g. "debug-go-race-condition", "review-pr-checklist")'),
          steps: z.array(z.string()).describe('Steps in order'),
          context: z.string().optional().describe('When to use this procedure'),
          successRate: z.number().min(0).max(1).optional().describe('How often this works (0-1)'),
        },
        async execute(args) {
          const procs = loadJson(PROCEDURAL_FILE, []);
          const existing = procs.findIndex(p => p.name === args.name);
          const proc = {
            name: args.name,
            steps: args.steps,
            context: args.context || '',
            successRate: args.successRate || 0.8,
            uses: existing >= 0 ? (procs[existing].uses || 0) + 1 : 1,
            updatedAt: new Date().toISOString(),
          };
          if (existing >= 0) procs[existing] = proc;
          else procs.push(proc);
          procs.sort((a, b) => (b.uses * b.successRate) - (a.uses * a.successRate));
          saveJson(PROCEDURAL_FILE, procs.slice(0, MAX_PROCEDURAL));
          return { output: `Procedure saved: ${args.name} (${args.steps.length} steps)` };
        },
      }),

      memory_recall: tool({
        description: 'Recall memories relevant to a query. Searches across all 3 layers with recency weighting.',
        args: {
          query: z.string().describe('What to recall (topic, situation, or keyword)'),
          layer: z.enum(['all', 'episodic', 'semantic', 'procedural']).optional().describe('Which layer to search (default: all)'),
        },
        async execute(args) {
          runMaintenance();
          const terms = args.query.toLowerCase().split(/\s+/);
          const layer = args.layer || 'all';
          const now = Date.now();
          const results = [];

          const recency = (ts) => {
            if (!ts) return 0.5;
            const days = (now - new Date(ts).getTime()) / 86_400_000;
            return Math.max(0.3, 1.0 - days * 0.023);
          };

          const matchScore = (text) => {
            const lower = text.toLowerCase();
            const hits = terms.filter(t => lower.includes(t)).length;
            return hits / terms.length;
          };

          if (layer === 'all' || layer === 'episodic') {
            const episodes = loadJsonl(EPISODIC_FILE, MAX_EPISODIC);
            const scored = episodes
              .map(e => {
                const text = `${e.event} ${e.context || ''} ${(e.tags || []).join(' ')}`;
                const ms = matchScore(text);
                return ms > 0 ? { e, score: ms * recency(e.ts) } : null;
              })
              .filter(Boolean)
              .sort((a, b) => b.score - a.score)
              .slice(0, 5);
            if (scored.length) results.push(`## Episodic\n${scored.map(({ e }) => `- [${e.outcome}] ${e.event} (${e.ts?.split('T')[0] || '?'})`).join('\n')}`);
          }

          if (layer === 'all' || layer === 'semantic') {
            const semantic = loadJson(SEMANTIC_FILE, {});
            const scored = Object.entries(semantic)
              .map(([k, v]) => {
                const text = `${k} ${v.value}`;
                const ms = matchScore(text);
                if (ms === 0) return null;
                const typeBoost = { policy: 1.5, architecture: 1.4, preference: 1.2, decision: 1.1, pitfall: 1.3 }[v.type] || 1.0;
                const maturityPenalty = (v.maturity === -1) ? 0.5 : 1.0;
                return { k, v, score: ms * recency(v.learnedAt) * typeBoost * (v.confidence || 0.7) * maturityPenalty };
              })
              .filter(Boolean)
              .sort((a, b) => b.score - a.score)
              .slice(0, 7);
            // Reconsolidation: reinforce recalled entries, promote maturity
            if (scored.length) {
              for (const { k } of scored) {
                const entry = semantic[k];
                if (entry) {
                  entry.reinforced = (entry.reinforced || 1) + 1;
                  entry.lastAccessedAt = new Date().toISOString();
                  if ((entry.maturity ?? 1) === 0 && entry.reinforced >= 3) {
                    entry.maturity = 1;
                  }
                }
              }
              saveJson(SEMANTIC_FILE, semantic);
            }
            if (scored.length) results.push(`## Semantic\n${scored.map(({ k, v }) => `- **${k}**: ${v.value} (conf: ${v.confidence})`).join('\n')}`);
          }

          if (layer === 'all' || layer === 'procedural') {
            const procs = loadJson(PROCEDURAL_FILE, []);
            const scored = procs
              .map(p => {
                const text = `${p.name} ${p.context || ''} ${p.steps.join(' ')}`;
                const ms = matchScore(text);
                return ms > 0 ? { p, score: ms * recency(p.updatedAt) * (p.successRate || 0.8) } : null;
              })
              .filter(Boolean)
              .sort((a, b) => b.score - a.score)
              .slice(0, 3);
            if (scored.length) results.push(`## Procedural\n${scored.map(({ p }) => `- **${p.name}**: ${p.steps.join(' → ')} (used ${p.uses}x)`).join('\n')}`);
          }

          // Entity graph traversal
          if (layer === 'all' || layer === 'semantic') {
            const graph = loadEntities();
            const connected = findConnected(graph, args.query);
            if (connected.length) {
              results.push(`## Graph\n${connected.map(e => `- ${e.source} --${e.relationship}--> ${e.target}`).join('\n')}`);
            }
          }

          return { output: results.length ? results.join('\n\n') : `No memories found for "${args.query}"` };
        },
      }),

      memory_export: tool({
        description: 'Export procedural memories as JSON (for sharing between projects or backing up).',
        args: {
          filter: z.string().optional().describe('Filter procedures by name keyword'),
        },
        async execute(args) {
          const procs = loadJson(PROCEDURAL_FILE, []);
          const filtered = args.filter
            ? procs.filter(p => p.name.toLowerCase().includes(args.filter.toLowerCase()))
            : procs;
          if (!filtered.length) return { output: 'No procedures to export.' };
          return { output: JSON.stringify(filtered, null, 2) };
        },
      }),

      memory_import: tool({
        description: 'Import procedural memories from JSON (merge with existing, no duplicates).',
        args: {
          procedures: z.string().describe('JSON array of procedures to import'),
        },
        async execute(args) {
          let imported;
          try { imported = JSON.parse(args.procedures); }
          catch { return { output: 'Invalid JSON. Expected array of procedures.' }; }
          if (!Array.isArray(imported)) return { output: 'Expected array.' };

          const procs = loadJson(PROCEDURAL_FILE, []);
          let added = 0;
          for (const p of imported) {
            if (!p.name || !p.steps) continue;
            const exists = procs.findIndex(x => x.name === p.name);
            if (exists < 0) {
              procs.push({ name: p.name, steps: p.steps, context: p.context || '', uses: p.uses || 1, successRate: p.successRate || 0.8, updatedAt: new Date().toISOString() });
              added++;
            }
          }
          procs.sort((a, b) => (b.uses * (b.successRate || 0.8)) - (a.uses * (a.successRate || 0.8)));
          saveJson(PROCEDURAL_FILE, procs.slice(0, MAX_PROCEDURAL));
          return { output: `Imported ${added} procedures (${procs.length} total).` };
        },
      }),

      memory_stats: tool({
        description: 'Show memory statistics — counts, health, decay status.',
        args: {},
        async execute() {
          const episodes = loadJsonl(EPISODIC_FILE, MAX_EPISODIC);
          const semantic = loadJson(SEMANTIC_FILE, {});
          const procs = loadJson(PROCEDURAL_FILE, []);
          const graph = loadEntities();
          const semEntries = Object.entries(semantic);
          const lowConf = semEntries.filter(([, v]) => v.confidence < 0.4).length;
          const promoted = semEntries.filter(([, v]) => v.source === 'episodic-promotion').length;
          const provisional = semEntries.filter(([, v]) => (v.maturity ?? 1) === 0).length;
          const confirmed = semEntries.filter(([, v]) => (v.maturity ?? 1) === 1).length;
          const conflicting = semEntries.filter(([, v]) => v.maturity === -1).length;
          const matured = semEntries.filter(([, v]) => v.lastAccessedAt).length;

          return {
            output: [
              `**Episodic**: ${episodes.length}/${MAX_EPISODIC} episodes`,
              `**Semantic**: ${semEntries.length} facts (${provisional} provisional, ${confirmed} confirmed, ${conflicting} conflicting)`,
              `  ├ ${lowConf} low-confidence, ${promoted} auto-promoted, ${matured} with reconsolidation`,
              `**Procedural**: ${procs.length}/${MAX_PROCEDURAL} procedures`,
              `**Graph**: ${Object.keys(graph.nodes).length} entities, ${graph.edges.length} relationships`,
              `**Decay**: entries older than ${DECAY_DAYS}d with low reinforcement lose ${DECAY_RATE * 100}%/cycle`,
            ].join('\n'),
          };
        },
      }),

      memory_contradictions: tool({
        description: 'List unresolved memory conflicts where facts contradict each other — use this to resolve conflicts manually.',
        args: {},
        async execute() {
          const semantic = loadJson(SEMANTIC_FILE, {});
          const conflicts = Object.entries(semantic)
            .filter(([, v]) => v.maturity === -1 || v.conflict_with?.length)
            .map(([k, v]) => `- **${k}**: ${v.value} (conflicts: ${(v.conflict_with || []).join(' | ')})`);
          if (!conflicts.length) return { output: 'No memory conflicts detected.' };
          return { output: `${conflicts.length} conflict(s) found:\n${conflicts.join('\n\n')}` };
        },
      }),

      // ── Entity Graph Tools ─────────────────────────────────────────────

      memory_link: tool({
        description: 'Create a relationship between two entities (person, project, tool, concept). Builds a knowledge graph for cross-entity queries.',
        args: {
          source: z.string().describe('Source entity (e.g. "Aldo", "zara-agent-opc")'),
          relationship: z.string().describe('Relationship type (e.g. "uses", "works-on", "knows", "leads", "depends-on")'),
          target: z.string().describe('Target entity (e.g. "Go", "OpenCode")'),
        },
        async execute(args) {
          const graph = loadEntities();
          // Ensure nodes exist
          const srcKey = args.source.toLowerCase();
          const tgtKey = args.target.toLowerCase();
          if (!graph.nodes[srcKey]) graph.nodes[srcKey] = { label: args.source, createdAt: new Date().toISOString() };
          if (!graph.nodes[tgtKey]) graph.nodes[tgtKey] = { label: args.target, createdAt: new Date().toISOString() };

          // Check for duplicate edge
          const exists = graph.edges.find(e =>
            e.source.toLowerCase() === srcKey && e.target.toLowerCase() === tgtKey && e.relationship === args.relationship
          );
          if (exists) {
            exists.reinforced = (exists.reinforced || 1) + 1;
            saveEntities(graph);
            return { output: `Link reinforced: ${args.source} --${args.relationship}--> ${args.target} (${exists.reinforced}x)` };
          }

          graph.edges.push({
            source: args.source, relationship: args.relationship, target: args.target,
            createdAt: new Date().toISOString(), reinforced: 1,
          });
          // Cap at 500 edges
          if (graph.edges.length > 500) graph.edges = graph.edges.slice(-500);
          saveEntities(graph);
          return { output: `Linked: ${args.source} --${args.relationship}--> ${args.target}` };
        },
      }),

      memory_entities: tool({
        description: 'Query the entity knowledge graph. Show connections for an entity, or list all entities.',
        args: {
          entity: z.string().optional().describe('Entity to query connections for (omit for full list)'),
        },
        async execute(args) {
          const graph = loadEntities();
          if (!args.entity) {
            const nodes = Object.values(graph.nodes).map(n => n.label);
            if (!nodes.length) return { output: 'No entities in graph yet. Use memory_link to add relationships.' };
            return { output: `**${nodes.length} entities**: ${nodes.join(', ')}\n**${graph.edges.length} relationships**` };
          }
          const connected = findConnected(graph, args.entity);
          if (!connected.length) return { output: `No connections found for "${args.entity}"` };
          const lines = connected.map(e => `- ${e.source} --${e.relationship}--> ${e.target}`);
          return { output: `**${args.entity}** connections:\n${lines.join('\n')}` };
        },
      }),

      // ── Reflection Tools ─────────────────────────────────────────────────

      zara_reflect: tool({
        description: 'Reflect on a completed task. Call this AFTER finishing work to extract learnings. This is how you self-improve.',
        args: {
          task: z.string().describe('What was the task'),
          approach: z.string().describe('What approach did you take'),
          outcome: z.enum(['success', 'partial', 'failure']).describe('How did it go'),
          whatWorked: z.array(z.string()).optional().describe('What went well'),
          whatFailed: z.array(z.string()).optional().describe('What went wrong or was suboptimal'),
          nextTime: z.string().optional().describe('What would you do differently next time'),
          pattern: z.string().optional().describe('If a reusable pattern emerged, name it'),
        },
        async execute(args) {
          ensure(REFLECT_DIR);
          const entry = { ...args, ts: new Date().toISOString() };

          fs.appendFileSync(REFLECT_FILE, JSON.stringify(entry) + '\n', 'utf-8');

          try {
            const lines = fs.readFileSync(REFLECT_FILE, 'utf-8').trim().split('\n').filter(Boolean);
            if (lines.length > MAX_LOG) {
              atomicWrite(REFLECT_FILE, lines.slice(-MAX_LOG).join('\n') + '\n');
            }
          } catch {}

          if (args.pattern) {
            const patterns = loadPatterns();
            const existing = patterns.findIndex(p => p.name === args.pattern);
            if (existing >= 0) {
              patterns[existing].occurrences++;
              patterns[existing].lastSeen = new Date().toISOString();
            } else {
              patterns.push({
                name: args.pattern,
                context: args.task,
                approach: args.approach,
                occurrences: 1,
                lastSeen: new Date().toISOString(),
              });
            }
            savePatterns(patterns.slice(0, 30));
          }

          return { output: `Reflection recorded. Outcome: ${args.outcome}. ${args.pattern ? `Pattern: "${args.pattern}"` : ''}` };
        },
      }),

      zara_patterns: tool({
        description: 'Recall learned patterns from past reflections. Use at task start to check if you have a known approach.',
        args: {
          query: z.string().optional().describe('Filter patterns by keyword'),
        },
        async execute(args) {
          const patterns = loadPatterns();
          if (!patterns.length) return { output: 'No patterns learned yet.' };

          let filtered = patterns;
          if (args.query) {
            const terms = args.query.toLowerCase().split(/\s+/);
            filtered = patterns.filter(p => {
              const text = `${p.name} ${p.context} ${p.approach}`.toLowerCase();
              return terms.some(t => text.includes(t));
            });
          }

          if (!filtered.length) return { output: `No patterns match "${args.query}"` };

          const lines = filtered
            .sort((a, b) => b.occurrences - a.occurrences)
            .slice(0, 10)
            .map(p => `- **${p.name}** (${p.occurrences}x): ${p.approach}`);
          return { output: lines.join('\n') };
        },
      }),

      // ── Knowledge Tools ──────────────────────────────────────────────────

      knowledge_search: tool({
        description: "Search Zara's DevIQ knowledge base (254 articles: antipatterns, architecture, code-smells, design-patterns, DDD, laws, practices, principles, testing, values). Uses TF-IDF for relevance ranking.",
        args: {
          query: z.string().describe('Search query (e.g. "strategy pattern", "technical debt", "SOLID")'),
          limit: z.number().optional().describe('Max results (default 5)'),
        },
        async execute(args) {
          const { entries, tfidfIndex } = getIndex();
          if (!entries.length || !tfidfIndex) {
            return { output: 'Knowledge index not built. Run: node scripts/build-knowledge-index.mjs' };
          }
          const limit = args.limit || 5;
          const results = search(tfidfIndex, entries, args.query, limit);
          if (!results.length) return { output: `No articles found for "${args.query}"` };
          const lines = results.map(r =>
            `- **${r.title}** (${r.section}) — ${(r.description || '').slice(0, 80)}  \n  Path: ${r.path}`
          );
          return { output: lines.join('\n') };
        },
      }),

      knowledge_load: tool({
        description: 'Load knowledge on demand. Use "section" for topic overviews. Use "doc" for specific reference documents.',
        args: {
          doc: z.enum(['leadership', 'leadership-frameworks', 'orchestration', 'empathy', 'ai-leadership-research', 'owasp', 'antipatterns']).optional().describe('Load a specific reference doc'),
          section: z.enum(['antipatterns', 'architecture', 'code-smells', 'design-patterns', 'ddd', 'laws', 'practices', 'principles', 'testing', 'values']).optional().describe('List articles in a knowledge section'),
        },
        async execute(args) {
          if (args.doc) {
            const filepath = refDocs[args.doc];
            if (!filepath || !fs.existsSync(filepath)) return { output: `Doc "${args.doc}" not found.` };
            return { output: fs.readFileSync(filepath, 'utf8').slice(0, 8000) };
          }
          if (args.section) {
            if (!directory) return { output: 'No project directory available.' };
            const dir = path.join(directory, 'knowledge', sections[args.section] || args.section);
            if (!fs.existsSync(dir)) return { output: `Section "${args.section}" not found.` };
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort();
            const listing = files.map(f => `- ${f.replace('.md', '').replace(/-/g, ' ')}`).join('\n');
            return { output: `## ${args.section} (${files.length} articles)\n\n${listing}\n\nUse knowledge_read to load specific articles.` };
          }
          return { output: 'Provide either "doc" or "section" parameter.' };
        },
      }),

      knowledge_read: tool({
        description: 'Read a specific knowledge article by path. Searches: knowledge/, .opencode/skills/*/knowledge/. Use for just-in-time deep-dive.',
        args: {
          path: z.string().describe('Article path (e.g. "design-patterns/strategy-pattern.md" or "golang-expert/uber-style.md")'),
        },
        async execute(args) {
          if (!directory) return { output: 'No project directory available.' };
          // Prevent path traversal
          if (args.path.includes('..')) return { output: 'Invalid path: must not contain ".."' };
          let filepath = path.resolve(directory, 'knowledge', args.path);
          const allowedBases = [path.resolve(directory, 'knowledge'), path.resolve(directory, '.opencode', 'skills')];
          if (!allowedBases.some(b => filepath.startsWith(b + path.sep) || filepath === b)) {
            filepath = path.resolve(directory, '.opencode', 'skills', args.path.replace('/', '/knowledge/'));
          }
          if (!fs.existsSync(filepath)) {
            filepath = path.resolve(directory, '.opencode', 'skills', args.path.replace('/', '/knowledge/'));
            if (!fs.existsSync(filepath)) {
              filepath = path.resolve(directory, '.opencode', 'skills', args.path);
              if (!fs.existsSync(filepath)) {
                return { output: `Article not found: ${args.path}` };
              }
            }
          }
          // Final check: resolved path must be within allowed bases
          if (!allowedBases.some(b => filepath.startsWith(b + path.sep) || filepath === b)) {
            return { output: 'Access denied: path outside allowed directories' };
          }
          try {
            const content = fs.readFileSync(filepath, 'utf8');
            return { output: content.slice(0, 6000) };
          } catch (err) {
            return { output: `Error reading article: ${err.message}` };
          }
        },
      }),

      knowledge_load_init: tool({
        description: 'Load ALL knowledge from project into memory. Scans knowledge/ dirs (project + global skills), reads every .md file, groups by section, and stores summaries to semantic memory. Run on fresh install or when knowledge is missing. Returns count of articles loaded per section.',
        args: {
          force: z.boolean().optional().describe('Force re-seed even if already done (default false)'),
        },
        async execute(args) {
          if (!directory) return { output: 'No project directory available.' };

          // Check if already seeded
          const semantic = loadSemanticCached();
          if (!args.force && semantic.knowledge_seeded) {
            return { output: `Already seeded: ${semantic.knowledge_seeded.value}. Use force=true to re-run.` };
          }

          const knowledgeDirs = [];
          // Project knowledge
          const projKnowledge = path.join(directory, 'knowledge');
          if (fs.existsSync(projKnowledge)) knowledgeDirs.push({ base: projKnowledge, label: 'project' });
          // Skills knowledge (local)
          const skillsDir = path.join(directory, '.opencode', 'skills');
          if (fs.existsSync(skillsDir)) {
            for (const skill of fs.readdirSync(skillsDir)) {
              const kDir = path.join(skillsDir, skill, 'knowledge');
              if (fs.existsSync(kDir)) knowledgeDirs.push({ base: kDir, label: `skill:${skill}` });
            }
          }
          // Global skills knowledge
          const globalSkills = path.join(HOME, '..', 'skills');
          if (fs.existsSync(globalSkills)) {
            for (const skill of fs.readdirSync(globalSkills)) {
              const kDir = path.join(globalSkills, skill, 'knowledge');
              if (fs.existsSync(kDir)) knowledgeDirs.push({ base: kDir, label: `global:${skill}` });
            }
          }

          const results = {};
          let totalLoaded = 0;

          function scanDir(dir, section) {
            const files = [];
            try {
              for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
                if (f.isDirectory() && f.name !== 'images') {
                  files.push(...scanDir(path.join(dir, f.name), f.name));
                } else if (f.name.endsWith('.md')) {
                  files.push({ path: path.join(dir, f.name), section: section || 'root' });
                }
              }
            } catch {}
            return files;
          }

          for (const { base, label } of knowledgeDirs) {
            const files = scanDir(base, null);
            for (const { path: filepath, section } of files) {
              try {
                const content = fs.readFileSync(filepath, 'utf8');
                const name = path.basename(filepath, '.md').replace(/-/g, ' ');
                if (name.startsWith('_index') || name === 'INDEX' || name === 'SUMMARY') continue;

                // Extract first meaningful line as summary
                const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('---') && !l.startsWith('|'));
                const summary = (lines[0] || '').slice(0, 200);
                const key = `kb_${label}_${section}_${name}`.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 80);

                // Determine memory type from section
                let memType = 'fact';
                if (['principles', 'values'].includes(section)) memType = 'policy';
                else if (['architecture', 'design-patterns', 'ddd', 'domain-driven-design'].includes(section)) memType = 'architecture';
                else if (['antipatterns', 'code-smells'].includes(section)) memType = 'pitfall';
                else if (['practices', 'testing'].includes(section)) memType = 'workflow';
                else if (section === 'natural-voice') memType = 'policy';

                // Store to semantic memory
                const sem = loadSemanticCached();
                sem[key] = {
                  value: `[${section}/${name}] ${summary}`,
                  source: 'user_explicit',
                  type: memType,
                  ts: new Date().toISOString(),
                  hits: 0,
                };
                _semanticCache = sem;

                if (!results[section]) results[section] = 0;
                results[section]++;
                totalLoaded++;
              } catch {}
            }
          }

          // Flush semantic memory
          const sem = loadSemanticCached();
          sem.knowledge_seeded = {
            value: `true, seeded on ${new Date().toISOString().slice(0, 10)}, ${totalLoaded} articles loaded`,
            source: 'user_explicit',
            type: 'fact',
            ts: new Date().toISOString(),
            hits: 0,
          };
          _semanticCache = sem;
          atomicWrite(SEMANTIC_FILE, JSON.stringify(sem, null, 2));

          const summary = Object.entries(results)
            .sort((a, b) => b[1] - a[1])
            .map(([section, count]) => `- ${section}: ${count} articles`)
            .join('\n');

          return { output: `Knowledge seeded: ${totalLoaded} articles loaded.\n\n${summary}` };
        },
      }),
    },
  };
}
