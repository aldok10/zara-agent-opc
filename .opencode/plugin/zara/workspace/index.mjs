// Workspace Memory — project-scoped shared context between agents
// Stores tagged entries as JSONL, with TTL, FIFO eviction, and secret filtering

import fs from 'fs';
import path from 'path';
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
      const nudge = `## Workspace Memory\n${recent.length} shared entries (${summary}). Use workspace_read to check context from other agents.`;
      const last = messages[messages.length - 1];
      if (last && last.role === 'system') {
        last.content += '\n\n' + nudge;
      } else {
        messages.push({ role: 'system', content: nudge });
      }
      return messages;
    },

    tools: {
      workspace_write: {
        description: 'Store a tagged entry in workspace memory (project-scoped, shared between agents). Use for decisions, context, discoveries that other agents should see. Filters secrets automatically.',
        parameters: {
          type: 'object',
          required: ['agent', 'type', 'key', 'value'],
          properties: {
            agent: { type: 'string', description: 'Which agent is writing (e.g. atlas, lens, shield)' },
            type: { type: 'string', enum: ['decision', 'context', 'discovery', 'constraint', 'reference'], description: 'Entry type' },
            key: { type: 'string', description: 'Short key (e.g. "auth-strategy", "db-choice")' },
            value: { type: 'string', description: 'The content to store' },
            confidence: { type: 'number', description: 'Confidence 0-1 (default 0.8)' },
            refs: { type: 'array', items: { type: 'string' }, description: 'Related file paths' },
            ttl: { type: 'string', enum: ['session', '1d', '7d', 'permanent'], description: 'Time to live (default 7d)' },
            supersedes: { type: 'string', description: 'ID of entry this replaces' },
          },
        },
        async execute(args) {
          if (!args || !args.key || !args.value) return 'Error [workspace_write]: key and value are required.';

          if (SECRET_PATTERN.test(args.value) || SECRET_PATTERN.test(args.key)) {
            return 'Error [workspace_write]: value contains potential secret/credential. Blocked.';
          }

          try {
            const entries = getEntries();
            const filtered = args.supersedes
              ? entries.filter(e => e.id !== args.supersedes)
              : entries;

            const entry = {
              id: genId(),
              agent: args.agent || 'unknown',
              type: args.type || 'context',
              key: args.key,
              value: args.value,
              confidence: typeof args.confidence === 'number' ? Math.max(0, Math.min(1, args.confidence)) : 0.8,
              refs: Array.isArray(args.refs) ? args.refs : [],
              ts: new Date().toISOString(),
              ttl: TTL_MS[args.ttl] !== undefined ? args.ttl : '7d',
              supersedes: args.supersedes || null,
            };

            filtered.push(entry);
            const final = filtered.length > MAX_ENTRIES
              ? filtered.slice(filtered.length - MAX_ENTRIES)
              : filtered;

            saveEntries(wsFile, final);
            invalidateCache();
            return `Stored [${entry.id}]: ${args.key} (${args.type}, ttl=${entry.ttl})`;
          } catch (err) {
            return `Error [workspace_write]: ${err.message}`;
          }
        },
      },

      workspace_read: {
        description: 'Query workspace memory. Filter by key, agent, type, or free text search. Returns most recent entries matching criteria.',
        parameters: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Filter by exact key' },
            agent: { type: 'string', description: 'Filter by agent name' },
            type: { type: 'string', enum: ['decision', 'context', 'discovery', 'constraint', 'reference'], description: 'Filter by type' },
            query: { type: 'string', description: 'Free text search across keys and values' },
            limit: { type: 'number', description: 'Max results (default 20)' },
          },
        },
        async execute(args) {
          try {
            let entries = getEntries();
            const a = args || {};

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

            if (!results.length) return 'No workspace entries found.';

            const lines = results.map(e =>
              `[${e.id}] (${e.agent}/${e.type}) ${e.key}: ${(e.value || '').slice(0, 200)}${e.refs?.length ? ` refs:${e.refs.join(',')}` : ''} [${e.ttl}, conf:${e.confidence}]`
            );
            return `${results.length} entries:\n${lines.join('\n')}`;
          } catch (err) {
            return `Error [workspace_read]: ${err.message}`;
          }
        },
      },

      workspace_clear: {
        description: 'Clear workspace entries. Remove expired, a specific entry by ID, or all entries.',
        parameters: {
          type: 'object',
          properties: {
            all: { type: 'boolean', description: 'Clear ALL entries' },
            id: { type: 'string', description: 'Clear a specific entry by ID' },
          },
        },
        async execute(args) {
          try {
            const a = args || {};
            if (a.all) {
              saveEntries(wsFile, []);
              invalidateCache();
              return 'Workspace cleared.';
            }

            const entries = loadEntries(wsFile);
            if (a.id) {
              const kept = entries.filter(e => e.id !== a.id);
              saveEntries(wsFile, kept);
              invalidateCache();
              return kept.length < entries.length ? `Removed entry ${a.id}.` : `Entry ${a.id} not found.`;
            }

            const kept = entries.filter(e => !isExpired(e));
            const removed = entries.length - kept.length;
            saveEntries(wsFile, kept);
            invalidateCache();
            return `Cleared ${removed} expired entries. ${kept.length} remaining.`;
          } catch (err) {
            return `Error [workspace_clear]: ${err.message}`;
          }
        },
      },


    },
  };
}
