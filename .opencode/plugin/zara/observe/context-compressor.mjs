// Context Compressor — message dedup, truncation, reasoning stripping, pre-compaction trimming
// Multi-layer strategy: tool result trimming (free) > message dedup > reasoning strip > truncation
//
// Operates on OpenCode's transform message format: { info: Message, parts: Part[] }[].
// Tool results live in ToolPart.state.output (status === 'completed'). Reasoning
// lives in ReasoningPart.text. Text lives in TextPart.text.

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

// Tools whose old results can be aggressively pruned (they can be re-read)
const PRUNEABLE_TOOLS = new Set(['read', 'bash', 'grep', 'glob', 'webfetch', 'web_search']);
// Tools whose results should NEVER be pruned
const PROTECTED_TOOLS = new Set(['skill', 'Orchestrator_memory', 'todowrite']);

export class ContextCompressor {
  #totalPruned = 0;

  get totalPruned() { return this.#totalPruned; }

  // ─── String helpers (format-agnostic) ──────────────────────────────────────

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

  // ─── Part accessors ─────────────────────────────────────────────────────────

  #toolOutput(part) {
    // Completed tool parts carry the result string in state.output
    const out = part?.state?.output;
    return typeof out === 'string' ? out : '';
  }

  #setToolOutput(part, value) {
    if (part?.state) part.state.output = value;
  }

  // ─── Layers ───────────────────────────────────────────────────────────────

  /**
   * Remove duplicate tool result parts. Two tool parts are duplicates when they
   * share the same (tool, callID). Requires a NON-EMPTY callID before deduping —
   * parts without a callID are skipped so empty ids never collide. Keeps the
   * latest occurrence, drops earlier ones.
   */
  deduplicateMessages(messages) {
    if (!Array.isArray(messages) || messages.length < 4) return messages || [];
    const lastIndexByKey = new Map(); // key -> { i, j }
    // First pass: find the latest occurrence of each key.
    for (let i = 0; i < messages.length; i++) {
      const parts = messages[i]?.parts;
      if (!Array.isArray(parts)) continue;
      for (let j = 0; j < parts.length; j++) {
        const p = parts[j];
        if (!p || p.type !== 'tool') continue;
        const callID = p.callID || '';
        if (!callID) continue; // require non-empty tool_call_id before deduping
        lastIndexByKey.set(`${p.tool || ''}:${callID}`, { i, j });
      }
    }
    // Second pass: drop earlier duplicate parts.
    let mutated = false;
    for (let i = 0; i < messages.length; i++) {
      const entry = messages[i];
      const parts = entry?.parts;
      if (!Array.isArray(parts)) continue;
      const kept = parts.filter((p, j) => {
        if (!p || p.type !== 'tool') return true;
        const callID = p.callID || '';
        if (!callID) return true;
        const latest = lastIndexByKey.get(`${p.tool || ''}:${callID}`);
        return !(latest && (latest.i !== i || latest.j !== j));
      });
      if (kept.length !== parts.length) {
        entry.parts = kept;
        mutated = true;
      }
    }
    void mutated;
    return messages;
  }

  /**
   * Prune verbose tool-call input args on OLD tool parts whose result errored.
   * Keeps the tool metadata but replaces bulky inputs with a marker.
   */
  purgeErrorInputs(messages) {
    if (!Array.isArray(messages) || messages.length < ERROR_PURGE_AGE) return messages || [];
    const tail = messages.length - ERROR_PURGE_AGE;
    for (let i = 0; i < messages.length; i++) {
      if (i >= tail) break;
      const parts = messages[i]?.parts;
      if (!Array.isArray(parts)) continue;
      for (const p of parts) {
        if (!p || p.type !== 'tool') continue;
        const errored = p.state?.status === 'error';
        const input = p.state?.input;
        if (errored && input && JSON.stringify(input).length > 1000) {
          p.state.input = { __pruned: true };
        }
      }
    }
    return messages;
  }

  /**
   * Layer 1: Aggressive tool result pruning for old messages.
   * Replaces old tool outputs with a concise summary, keeping tool call metadata.
   * Preserves recent messages (tail) and protected tools.
   */
  pruneOldToolResults(messages) {
    if (!Array.isArray(messages) || messages.length < 8) return messages;
    const tail = messages.length - 6; // protect last 6 messages
    for (let i = 0; i < messages.length; i++) {
      if (i >= tail) break;
      const parts = messages[i]?.parts;
      if (!Array.isArray(parts)) continue;
      for (const p of parts) {
        if (!p || p.type !== 'tool') continue;
        if (PROTECTED_TOOLS.has(p.tool)) continue;
        const out = this.#toolOutput(p);
        if (out.length > 500) {
          const firstLine = out.split('\n')[0].slice(0, 120);
          const tokens = estimateTokens(out);
          this.#totalPruned += tokens;
          this.#setToolOutput(p, `[cleared ${tokens}tok] ${firstLine}...`);
        }
      }
    }
    return messages;
  }

  /**
   * Pre-compaction pass: more aggressive than regular transform.
   * Called when context is approaching limits but before full LLM compaction.
   * Returns { messages, tokensSaved }.
   */
  preCompact(messages) {
    if (!Array.isArray(messages)) return { messages: messages || [], tokensSaved: 0 };
    let saved = 0;
    const tail = messages.length - 4; // protect only last 4 in pre-compaction

    for (let i = 0; i < messages.length; i++) {
      if (i >= tail) break;
      const parts = messages[i]?.parts;
      if (!Array.isArray(parts)) continue;

      for (const p of parts) {
        if (!p) continue;

        // Aggressively clear ALL old tool results (except protected)
        if (p.type === 'tool') {
          if (PROTECTED_TOOLS.has(p.tool)) continue;
          const out = this.#toolOutput(p);
          if (out.length > 200) {
            const tokens = estimateTokens(out);
            saved += tokens;
            this.#setToolOutput(p, `[pre-compact cleared - was ${tokens}tok]`);
          }
          continue;
        }

        // Strip reasoning parts entirely
        if (p.type === 'reasoning' && typeof p.text === 'string' && p.text) {
          saved += estimateTokens(p.text);
          p.text = '[reasoning stripped]';
          continue;
        }

        // Strip <thinking> from text parts, truncate very long ones
        if (p.type === 'text' && typeof p.text === 'string') {
          if (p.text.includes('<thinking>')) {
            const stripped = this.stripReasoning(p.text);
            saved += estimateTokens(p.text) - estimateTokens(stripped);
            p.text = stripped;
          } else if (p.text.length > 3000) {
            const tokens = estimateTokens(p.text);
            const truncated = p.text.slice(0, 2000) + '\n[...truncated in pre-compaction...]';
            saved += tokens - estimateTokens(truncated);
            p.text = truncated;
          }
        }
      }
    }

    return { messages, tokensSaved: saved };
  }

  transform(messages) {
    if (!Array.isArray(messages)) return messages || [];
    let result = this.deduplicateMessages(messages);
    result = this.purgeErrorInputs(result);
    result = this.pruneOldToolResults(result);

    const tail = result.length - 3;
    for (let i = 0; i < result.length; i++) {
      if (i >= tail) break;
      const parts = result[i]?.parts;
      if (!Array.isArray(parts)) continue;
      for (const p of parts) {
        if (!p) continue;
        if (p.type === 'reasoning' && typeof p.text === 'string') {
          p.text = this.stripReasoning(p.text);
        } else if (p.type === 'text' && typeof p.text === 'string' && p.text.includes('<thinking>')) {
          p.text = this.stripReasoning(p.text);
        } else if (p.type === 'tool') {
          const out = this.#toolOutput(p);
          if (out) this.#setToolOutput(p, this.truncateOutput(out));
        }
      }
    }
    return result;
  }
}
