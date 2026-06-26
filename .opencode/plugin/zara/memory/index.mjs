// Memory module — auto-capture hooks + knowledge graph (tools handled by MCP)
// Rewired to SQLite (memory-db.mjs) instead of dead JSON files.

import path from 'path';
import { fileURLToPath } from 'url';
import { SECRET_PATTERN } from '../infra/store.mjs';
import { processMessage, queryGraph, graphStats } from './graph.mjs';
import { tool } from '@opencode-ai/plugin';
const z = tool.schema;

const __dir = path.dirname(fileURLToPath(import.meta.url));
const MCP_ROOT = path.resolve(__dir, '../../../../tools');

// Lazy-load SQLite memory store (same instance MCP uses)
let _store = null;

function ensureStore() {
  if (_store) return;
  try {
    // Dynamic import is async but we fire-and-forget from sync hooks
    import(path.join(MCP_ROOT, 'memory-db.mjs')).then(mod => {
      _store = { learn: mod.semanticLearn, episode: mod.episodicRecord };
    }).catch(() => {});
  } catch {}
}

// ─── Module Export ───────────────────────────────────────────────────────────

export default function createMemory({ client, directory } = {}) {
  // Pre-load store
  ensureStore();

  return {
    onEvent(event) {
      // No-op: dreamer consolidation now handled by MCP memory_consolidate tool
    },

    inject(messages) {
      // Memory injection is handled by MCP Orchestrator (memory_recall in system.md Connection DNA).
      // Plugin no longer injects memory. Only knowledge graph context injection remains.

      const TOKEN_BUDGET = 200; // small budget for graph context only
      let tokensUsed = 0;

      const userMsg = messages.filter(m => m.role === 'user').pop();
      if (userMsg?.content) {
        const text = typeof userMsg.content === 'string' ? userMsg.content : '';
        const words = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
        const searchTerms = words.slice(0, 3).map(w => w.trim());
        for (const term of searchTerms) {
          if (term.length < 3) continue;
          const result = queryGraph(term, { maxDepth: 1, minWeight: 0.3 });
          if (result.entity && result.neighbors.length > 0) {
            const ctxLine = `[graph] ${term}: ${result.neighbors.map(n => `${n.target} (${n.type})`).join(', ')}`;
            const tokens = Math.ceil(ctxLine.length / 4);
            if (tokensUsed + tokens <= TOKEN_BUDGET) {
              const sys = messages.find(m => m.role === 'system');
              if (sys) {
                if (!sys.content.includes('## Knowledge Context')) sys.content += '\n\n## Knowledge Context';
                sys.content += '\n' + ctxLine;
                tokensUsed += tokens;
              }
            }
            break;
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

      // Knowledge graph entity extraction (still JSON-based, works)
      processMessage(text);

      // Auto-capture to SQLite (fire-and-forget)
      if (!_store) return;
      try {
        // Preferences
        const prefPatterns = [
          /(?:i prefer|i like|i want|always use|never use|don't use|jangan pakai|selalu pakai|aku suka|aku mau)\s+(.{5,80})/i,
          /(?:gunakan|pakai|use)\s+(.{3,40})\s+(?:aja|saja|always|selalu)/i,
        ];
        for (const pat of prefPatterns) {
          const m = text.match(pat);
          if (m) {
            const key = `auto.pref.${m[1].slice(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            _store.learn(key, m[0].trim(), 'observed', 'preference', '');
            return; // one capture per message
          }
        }

        // Corrections
        if (/(?:actually|correction|no,|bukan.*tapi|sebenarnya)\s+(.{5,100})/i.test(text)) {
          const m = text.match(/(?:actually|correction|no,|bukan.*tapi|sebenarnya)\s+(.{5,100})/i);
          if (m) {
            const key = `auto.correction.${Date.now().toString(36)}`;
            _store.learn(key, m[0].trim(), 'observed', 'fact', '');
            return;
          }
        }

        // Constraints
        const constraintPatterns = [
          /(?:must|harus|wajib|don't ever|never ever|jangan pernah)\s+(.{5,80})/i,
        ];
        for (const pat of constraintPatterns) {
          const m = text.match(pat);
          if (m) {
            const key = `auto.constraint.${m[1].slice(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            _store.learn(key, m[0].trim(), 'observed', 'pitfall', '');
            return;
          }
        }
      } catch (e) {
        process.stderr.write(`[zara-memory] auto-capture error: ${e.message}\n`);
      }
    },

    onResponse(res) {
      if (!res?.content) return;
      const text = typeof res.content === 'string' ? res.content : '';
      if (text.length < 50) return;
      if (!_store) return;

      const errorSignals = /(?:error:|failed:|cannot |can't |unable to |doesn't work|broke|bug:|issue:|mistake)/i;
      const retrySignals = /(?:let me try|trying again|different approach|step back|fundamentally different)/i;

      if (errorSignals.test(text) || retrySignals.test(text)) {
        const sentences = text.split(/[.\n]/).filter(s => s.length > 20 && s.length < 200);
        const errorSentence = sentences.find(s => errorSignals.test(s) || retrySignals.test(s));
        if (errorSentence) {
          try {
            _store.episode(
              `self-error: ${errorSentence.trim().slice(0, 120)}`,
              retrySignals.test(text) ? 'learning' : 'failure',
              ['auto-detect', 'self-improvement']
            );
          } catch {}
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
        description: 'Knowledge graph statistics',
        args: {},
        async execute() {
          const stats = graphStats();
          return { output: `**Knowledge Graph**\nEntities: ${stats.entities}\nRelationships: ${stats.relationships}\nIndex loaded: ${stats.indexLoaded}\nMessages processed: ${stats.messageCounter}` };
        },
      }),
    },
  };
}
