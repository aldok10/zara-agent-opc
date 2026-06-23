// Memory module — hooks only (tools handled by MCP)

import fs from 'fs';
import path from 'path';
import { HOME, ensure, atomicWrite, loadJson, SECRET_PATTERN } from '../infra/store.mjs';
import { processMessage, queryGraph, graphStats } from './graph.mjs';
import { tool } from '@opencode-ai/plugin';
const z = tool.schema;

// ─── Constants ──────────────────────────────────────────────────────────────

const MEM_DIR = path.join(HOME, 'memory');
const EPISODIC_FILE = path.join(MEM_DIR, 'episodic.jsonl');
const SEMANTIC_FILE = path.join(MEM_DIR, 'semantic.json');
const PROCEDURAL_FILE = path.join(MEM_DIR, 'procedural.json');

const MAX_EPISODIC = 200;

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

// ─── Module Export ───────────────────────────────────────────────────────────

export default function createMemory({ client, directory } = {}) {
  return {
    onEvent(event) {},

    inject(messages) {
      const TOKEN_BUDGET = 800;
      let tokensUsed = 0;
      const parts = [];

      let entries = [], procs = [];

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

      // Layer D: Knowledge graph context for entity mentions in user message
      if (tokensUsed < TOKEN_BUDGET - 200) {
        const userMsg = messages.filter(m => m.role === 'user').pop();
        if (userMsg?.content) {
          const text = typeof userMsg.content === 'string' ? userMsg.content : '';
          // Check for known entities in the last user message
          const words = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
          const searchTerms = words.slice(0, 5).map(w => w.trim());
          for (const term of searchTerms) {
            if (term.length < 3) continue;
            const result = queryGraph(term, { maxDepth: 1, minWeight: 0.3 });
            if (result.entity && result.neighbors.length > 0) {
              const ctxLine = `[graph] ${term}: ${result.neighbors.map(n => `${n.target} (${n.type})`).join(', ')}`;
              const tokens = Math.ceil(ctxLine.length / 4);
              if (tokensUsed + tokens <= TOKEN_BUDGET) {
                // Append to the last system message or create a graph block
                const sysMsg = messages.find(m => m.role === 'system');
                if (sysMsg) {
                  if (!sysMsg.content.includes('## Knowledge Context')) {
                    sysMsg.content += '\n\n## Knowledge Context';
                  }
                  sysMsg.content += '\n' + ctxLine;
                  tokensUsed += tokens;
                }
              }
              break; // one entity per inject cycle to stay within budget
            }
          }
        }
      }

      return messages;
    },

    onMessage(msg) {
      if (msg.role !== 'user' || !msg.content) return;
      const text = typeof msg.content === 'string' ? msg.content : '';
      if (text.length < 20 || text.length > 2000) return;

      if (SECRET_PATTERN.test(text)) return;

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

      // Pattern: technology/architecture facts
      const factPatterns = [
        /(?:we use|we're using|kita pakai|project ini pakai|stack-nya)\s+(.{3,60})/i,
        /(?:switched to|migrated to|pindah ke|ganti ke)\s+(.{3,60})/i,
        /(?:our (?:api|service|app|backend|frontend|db|database) (?:is|uses|runs on))\s+(.{3,60})/i,
        /(?:the (?:repo|project|codebase) (?:is|lives|sits) (?:at|in|on))\s+(.{5,80})/i,
        /(?:deployed (?:to|on|at)|deploy ke)\s+(.{3,60})/i,
      ];
      for (const pat of factPatterns) {
        const m = text.match(pat);
        if (m) {
          const key = `fact.${m[1].slice(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${Date.now().toString(36).slice(-4)}`;
          if (!Object.values(semantic).some(v => v.value && v.value.toLowerCase().includes(m[1].toLowerCase().slice(0, 20)))) {
            semantic[key] = { value: m[0].trim(), confidence: 0.6, type: 'fact', learnedAt: new Date().toISOString(), reinforced: 1 };
            captured = true;
          }
        }
      }

      if (captured) saveJson(SEMANTIC_FILE, semantic);

      // Knowledge graph: entity extraction + relationship inference
      processMessage(text);
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

    tools: {
      zara_graph_query: tool({
        description: 'Query knowledge graph for entities and relationships connected to a topic',
        args: {
          query: z.string().describe('Entity name or topic to search for'),
          depth: z.number().min(1).max(5).optional().describe('Traversal depth (default 1)'),
          minWeight: z.number().min(0).max(1).optional().describe('Minimum relationship weight (default 0.3)'),
        },
        async execute(args) {
          const result = queryGraph(args.query, { maxDepth: args.depth || 1, minWeight: args.minWeight || 0.3 });
          if (!result.entity) return { output: `No entities found for "${args.query}".` };
          const lines = [`## Knowledge Graph: ${args.query}`];
          lines.push(`Type: ${result.entity.type} | Mentioned ${result.entity.frequency}x | Last seen: ${(result.entity.last_seen || '').split('T')[0] || 'unknown'}`);
          if (result.neighbors.length) {
            lines.push(`\n**Connected (${result.neighbors.length}):**`);
            for (const n of result.neighbors) {
              lines.push(`- ${n.target} (${n.type}, weight ${n.weight.toFixed(2)})`);
            }
          } else {
            lines.push('\nNo connected entities found.');
          }
          return { output: lines.join('\n') };
        },
      }),

      zara_graph_stats: tool({
        description: 'Knowledge graph statistics — entity/relationship counts and health',
        args: {},
        async execute() {
          const stats = graphStats();
          return { output: `**Knowledge Graph**\nEntities: ${stats.entities}\nRelationships: ${stats.relationships}\nIndex loaded: ${stats.indexLoaded}\nMessages processed: ${stats.messageCounter}` };
        },
      }),
    },
  };
}
