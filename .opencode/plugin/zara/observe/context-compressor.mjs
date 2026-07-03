// Context Compressor — message dedup, truncation, reasoning stripping

import { estimateTokens } from '../infra/store.mjs';

const MAX_TOOL_OUTPUT_TOKENS = 2000;
const ERROR_PURGE_AGE = 4;
const ANSI_RE = /\x1b\[[0-9;]*m/g;
const SHELL_NOISE = [
  /^(PASS|FAIL|ok)\s+\S+\s+\d+\.\d+s$/gm,
  /^\s*at\s+\S+\s+\(.*:\d+:\d+\)$/gm,
  /^(npm|yarn|bun)\s+(warn|notice)\s+/gm,
  /^Downloading\s+/gm,
];
// Matches <thinking>...</thinking> blocks (including multiline)
const THINKING_RE = /<thinking>[\s\S]*?<\/thinking>/gi;

export class ContextCompressor {
  truncateOutput(text) {
    if (!text || typeof text !== 'string') return text ?? '';
    const tokens = estimateTokens(text);
    if (tokens <= MAX_TOOL_OUTPUT_TOKENS) return text;
    const chars = Math.floor(MAX_TOOL_OUTPUT_TOKENS * 3.5);
    const head = Math.floor(chars * 0.7);
    const tail = Math.floor(chars * 0.3);
    return text.slice(0, head) + `\n[...${tokens - MAX_TOOL_OUTPUT_TOKENS} tokens truncated...]\n` + text.slice(-tail);
  }

  filterShellOutput(text) {
    if (!text || typeof text !== 'string') return text ?? '';
    let out = text.replace(ANSI_RE, '');
    for (const p of SHELL_NOISE) out = out.replace(p, '');
    return out.replace(/\n{3,}/g, '\n\n').trim();
  }

  // Strip <thinking> blocks from older messages to save context
  stripReasoning(text) {
    if (!text || typeof text !== 'string') return text ?? '';
    return text.replace(THINKING_RE, '[reasoning stripped]').trim();
  }

  deduplicateMessages(messages) {
    if (!Array.isArray(messages) || messages.length < 4) return messages || [];
    const seen = new Map();
    const remove = new Set();
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg || msg.role !== 'tool') continue;
      const key = `${msg.name || msg.tool || ''}:${msg.tool_call_id || ''}`;
      if (!key || key === ':') continue;
      if (seen.has(key)) remove.add(seen.get(key));
      seen.set(key, i);
    }
    return remove.size ? messages.filter((_, i) => !remove.has(i)) : messages;
  }

  purgeErrorInputs(messages) {
    if (!Array.isArray(messages) || messages.length < ERROR_PURGE_AGE) return messages || [];
    const tail = messages.length - ERROR_PURGE_AGE;
    return messages.map((msg, i) => {
      if (!msg || i >= tail) return msg;
      if (msg.role === 'assistant' && Array.isArray(msg.tool_calls)) {
        const callIds = msg.tool_calls.map(tc => tc?.id).filter(Boolean);
        const hasErr = messages.slice(i + 1, i + 4).some(m =>
          m && m.role === 'tool' && callIds.includes(m.tool_call_id) &&
          (m.content?.includes?.('Error') || m.isError)
        );
        if (hasErr && JSON.stringify(msg.tool_calls).length > 1000) {
          return { ...msg, tool_calls: msg.tool_calls.map(tc => ({
            ...tc, function: { ...(tc?.function || {}), arguments: '[pruned]' }
          }))};
        }
      }
      return msg;
    });
  }

  transform(messages) {
    if (!Array.isArray(messages)) return messages || [];
    let result = this.deduplicateMessages(messages);
    result = this.purgeErrorInputs(result);
    result = this.pruneOldToolResults(result);
    const tail = result.length - 3;
    return result.map((msg, i) => {
      if (!msg || i >= tail) return msg;
      if (msg.role === 'assistant' && typeof msg.content === 'string' && msg.content.includes('<thinking>')) {
        return { ...msg, content: this.stripReasoning(msg.content) };
      }
      if (msg.role === 'tool' && typeof msg.content === 'string') {
        return { ...msg, content: this.truncateOutput(msg.content) };
      }
      return msg;
    });
  }

  pruneOldToolResults(messages) {
    if (!Array.isArray(messages) || messages.length < 8) return messages;
    const tail = messages.length - 6;
    return messages.map((msg, i) => {
      if (!msg || i >= tail) return msg;
      if (msg.role === 'tool' && typeof msg.content === 'string' && msg.content.length > 500) {
        const firstLine = msg.content.split('\n')[0].slice(0, 100);
        const tokens = estimateTokens(msg.content);
        return { ...msg, content: `[pruned ${tokens} tokens] ${firstLine}...` };
      }
      return msg;
    });
  }
}
