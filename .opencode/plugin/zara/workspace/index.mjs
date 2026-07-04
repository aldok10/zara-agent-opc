// Workspace Memory — project-scoped shared context between agents
// Stores tagged entries as JSONL, with TTL, FIFO eviction, and secret filtering

import fs from 'fs';
import path from 'path';
import { tool } from '@opencode-ai/plugin';

const z = tool.schema;
import { ensure, atomicWrite, SECRET_PATTERN } from '../infra/store.mjs';

const MAX_ENTRIES = 200;

const TTL_MS = {
  session: 12 * 3600_000,
  '1d': 86_400_000,
  '7d': 7 * 86_400_000,
  permanent: Infinity,
};

function loadEntries(file) {
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    if (!raw || !raw.trim()) return [];
    return raw.trim().split('\n').filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

function saveEntries(file, entries) {
  ensure(path.dirname(file));
  atomicWrite(file, entries.map(e => JSON.stringify(e)).join('\n') + '\n');
}

function isExpired(entry) {
  if (!entry || !entry.ts) return true;
  if (entry.ttl === 'permanent') return false;
  const ms = TTL_MS[entry.ttl] || TTL_MS['7d'];
  const ts = new Date(entry.ts).getTime();
  // Guard against invalid dates
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > ms;
}

function genId() {
  return `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function createWorkspace({ directory } = {}) {
  const wsDir = path.join(directory || process.cwd(), '.opencode', 'workspace');
  const wsFile = path.join(wsDir, 'entries.jsonl');

  // In-memory cache with file-mtime invalidation
  let cache = null;
  let cacheMtime = 0;

  function getEntries() {
    try {
      const stat = fs.statSync(wsFile);
      if (cache && stat.mtimeMs === cacheMtime) {
        return cache.filter(e => !isExpired(e));
      }
      const entries = loadEntries(wsFile).filter(e => !isExpired(e));
      cache = entries;
      cacheMtime = stat.mtimeMs;
      return entries;
    } catch {
      // File doesn't exist yet
      cache = [];
      cacheMtime = 0;
      return [];
    }
  }

  function invalidateCache() {
    cache = null;
    cacheMtime = 0;
  }

  const typeSummary = (entries) => Object.entries(entries.reduce((c, e) => (c[e.type] = (c[e.type] || 0) + 1, c), {})).map(([t, n]) => `${n} ${t}`).join(', ');

  return {
    onEvent(event) {
      const type = typeof event === 'string' ? event : event?.type;
      if (type === 'session.end') {
        try {
          const entries = loadEntries(wsFile);
          const kept = entries.filter(e => e.ttl !== 'session' && !isExpired(e));
          if (kept.length !== entries.length) {
            saveEntries(wsFile, kept);
            invalidateCache();
          }
        } catch { /* non-critical cleanup */ }
      }
    },

    inject(messages) {
      if (!messages || !Array.isArray(messages)) return messages || [];
      const entries = getEntries();
      if (!entries.length) return messages;
      const fourHoursAgo = Date.now() - 4 * 3600_000;
      const recent = entries.filter(e => {
        const ts = new Date(e.ts).getTime();
        return !Number.isNaN(ts) && ts > fourHoursAgo;
      });
      if (!recent.length) return messages;

      const summary = typeSummary(recent);
      const nudge = `## Workspace Memory\n${recent.length} shared entries (${summary}). Use zara_workspace (action:query) to check context from other agents.`;
      const last = messages[messages.length - 1];
      if (last && last.role === 'system') {
        last.content += '\n\n' + nudge;
      } else {
        messages.push({ role: 'system', content: nudge });
      }
      return messages;
    },

    tools: {
      zara_workspace: tool({
        description: 'Workspace memory. action: query|store|clear',
        args: {
          action: z.enum(['query', 'store', 'clear']).describe('Action to perform'),
          // store args
          agent: z.string().optional().describe('Which agent is writing (e.g. atlas, lens, shield); also filters query by agent'),
          type: z.enum(['decision', 'context', 'discovery', 'constraint', 'reference']).optional().describe('Entry type (store); also filters query by type'),
          key: z.string().optional().describe('Short key (e.g. "auth-strategy", "db-choice"); also filters query by exact key'),
          value: z.string().optional().describe('The content to store'),
          confidence: z.number().optional().describe('Confidence 0-1 (default 0.8)'),
          refs: z.array(z.string()).optional().describe('Related file paths'),
          ttl: z.enum(['session', '1d', '7d', 'permanent']).optional().describe('Time to live (default 7d)'),
          supersedes: z.string().optional().describe('ID of entry this replaces'),
          // query args
          query: z.string().optional().describe('Free text search across keys and values'),
          limit: z.number().optional().describe('Max results (default 20)'),
          // clear args
          all: z.boolean().optional().describe('Clear ALL entries'),
          id: z.string().optional().describe('Clear a specific entry by ID'),
        },
        async execute(args) {
          const a = args || {};
          switch (a.action) {
            case 'store': {
              if (!a.key || !a.value) return { output: 'Error [workspace_write]: key and value are required.' };

              if (SECRET_PATTERN.test(a.value) || SECRET_PATTERN.test(a.key)) {
                return { output: 'Error [workspace_write]: value contains potential secret/credential. Blocked.' };
              }

              try {
                const entries = getEntries();
                const filtered = a.supersedes
                  ? entries.filter(e => e.id !== a.supersedes)
                  : entries;

                const entry = {
                  id: genId(),
                  agent: a.agent || 'unknown',
                  type: a.type || 'context',
                  key: a.key,
                  value: a.value,
                  confidence: typeof a.confidence === 'number' ? Math.max(0, Math.min(1, a.confidence)) : 0.8,
                  refs: Array.isArray(a.refs) ? a.refs : [],
                  ts: new Date().toISOString(),
                  ttl: TTL_MS[a.ttl] !== undefined ? a.ttl : '7d',
                  supersedes: a.supersedes || null,
                };

                filtered.push(entry);
                const final = filtered.length > MAX_ENTRIES
                  ? filtered.slice(filtered.length - MAX_ENTRIES)
                  : filtered;

                saveEntries(wsFile, final);
                invalidateCache();
                return { output: `Stored [${entry.id}]: ${a.key} (${entry.type}, ttl=${entry.ttl})` };
              } catch (err) {
                return { output: `Error [workspace_write]: ${err.message}` };
              }
            }

            case 'query': {
              try {
                let entries = getEntries();

                if (a.key) entries = entries.filter(e => e.key === a.key);
                if (a.agent) entries = entries.filter(e => e.agent === a.agent);
                if (a.type) entries = entries.filter(e => e.type === a.type);
                if (a.query) {
                  const terms = a.query.toLowerCase().split(/\s+/).filter(Boolean);
                  entries = entries.filter(e => {
                    const text = `${e.key || ''} ${e.value || ''} ${e.agent || ''}`.toLowerCase();
                    return terms.every(t => text.includes(t));
                  });
                }

                const limit = Math.max(1, Math.min(a.limit || 20, 100));
                const results = entries.slice(-limit);

                if (!results.length) return { output: 'No workspace entries found.' };

                const lines = results.map(e =>
                  `[${e.id}] (${e.agent}/${e.type}) ${e.key}: ${(e.value || '').slice(0, 200)}${e.refs?.length ? ` refs:${e.refs.join(',')}` : ''} [${e.ttl}, conf:${e.confidence}]`
                );
                return { output: `${results.length} entries:\n${lines.join('\n')}` };
              } catch (err) {
                return { output: `Error [workspace_read]: ${err.message}` };
              }
            }

            case 'clear': {
              try {
                if (a.all) {
                  saveEntries(wsFile, []);
                  invalidateCache();
                  return { output: 'Workspace cleared.' };
                }

                const entries = loadEntries(wsFile);
                if (a.id) {
                  const kept = entries.filter(e => e.id !== a.id);
                  saveEntries(wsFile, kept);
                  invalidateCache();
                  return { output: kept.length < entries.length ? `Removed entry ${a.id}.` : `Entry ${a.id} not found.` };
                }

                const kept = entries.filter(e => !isExpired(e));
                const removed = entries.length - kept.length;
                saveEntries(wsFile, kept);
                invalidateCache();
                return { output: `Cleared ${removed} expired entries. ${kept.length} remaining.` };
              } catch (err) {
                return { output: `Error [workspace_clear]: ${err.message}` };
              }
            }

            default:
              return { output: `Error [zara_workspace]: unknown action "${a.action}".` };
          }
        },
      }),
    },
  };
}
