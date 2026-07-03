// Proactive module — moves the "LLM must remember to call blindspot_check"
// burden into an automatic hook.
//
// Replaces the blindspot_check MCP tool: instead of the model having to invoke
// it, every user message is scanned against known blindspots and a gentle
// reminder is injected into the system context automatically.
//
// READ-ONLY and gated to avoid noise: at most one reminder per blindspot per
// session. Blindspots are still WRITTEN via the MCP blindspot_log tool.
//
// Data source (shared with MCP reflection domain — single source of truth):
//   ~/.zara/blindspots.json

import path from 'path';
import { HOME, loadJson } from '../infra/store.mjs';

const BLINDSPOTS_FILE = path.join(HOME, 'blindspots.json');
const MAX_REMINDER_CHARS = 480;

function lastUserText(messages) {
  if (!Array.isArray(messages)) return '';
  const u = [...messages].reverse().find(m => m?.role === 'user');
  if (!u?.content) return '';
  return typeof u.content === 'string'
    ? u.content
    : Array.isArray(u.content) ? u.content.map(c => c?.text || '').join(' ') : '';
}

export default function createProactive() {
  // De-dupe: don't re-surface the same blindspot within a session.
  const shown = new Set();

  return {
    // AUTO blindspot-check: scan each user message against known blindspots and
    // surface a gentle reminder without the model needing to call a tool.
    inject(messages) {
      const text = lastUserText(messages).toLowerCase();
      if (!text || text.length < 8) return messages;

      const blindspots = loadJson(BLINDSPOTS_FILE, []);
      if (!blindspots.length) return messages;

      const terms = text.split(/\s+/).filter(t => t.length >= 4);
      const match = blindspots.find(b => {
        const hay = `${b.area} ${b.observation}`.toLowerCase();
        return terms.some(t => hay.includes(t));
      });
      if (!match || shown.has(match.area)) return messages;
      shown.add(match.area);

      const sys = messages.find(m => m.role === 'system');
      if (!sys || typeof sys.content !== 'string') return messages;
      const line = `- ${match.area}: ${match.observation}${match.suggestion ? ` → ${match.suggestion}` : ''}`;
      if (!sys.content.includes('## Blindspot Watch')) sys.content += '\n\n## Blindspot Watch';
      sys.content += `\n${line.slice(0, MAX_REMINDER_CHARS)}`;
      return messages;
    },

    dispose() { shown.clear(); },

    tools: {},
  };
}
