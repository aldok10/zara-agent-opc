// Observe module — Tracing, Evaluation, Guardrails, Cache
// Combines: zara-metrics, zara-observability, zara-evaluation, zara-guardrails, zara-cost-optimizer
//
// This file is a composition root: it wires the extracted services
// (TraceService, GuardService, ContextCompressor, CacheService, ProactiveMonitor)
// into the plugin hook lifecycle. Service logic lives in sibling files.

import { tool } from '@opencode-ai/plugin';
import { checkEnvAccess } from './env-guard.mjs';
import { TraceService } from './trace-service.mjs';
import { GuardService } from './guard-service.mjs';
import { ContextCompressor } from './context-compressor.mjs';
import { CacheService } from './cache-service.mjs';
import { ProactiveMonitor } from './proactive-monitor.mjs';

const z = tool.schema;

// Re-export extracted services for backward compatibility
export { TraceService } from './trace-service.mjs';
export { GuardService } from './guard-service.mjs';
export { ContextCompressor } from './context-compressor.mjs';
export { CacheService } from './cache-service.mjs';

// ─── Module Export ───────────────────────────────────────────────────────────

export default function createObserve({ client, directory } = {}) {
  const trace = new TraceService();
  const guard = new GuardService();
  const cache = new CacheService();
  const compressor = new ContextCompressor();
  const monitor = new ProactiveMonitor();

  return {
    onEvent(event) {
      if (event.type === 'session.created') {
        trace.startSession();
        monitor.reset();
      }
      if (event.type === 'session.ended') trace.endSession();
    },

    // Reset per-session ProactiveMonitor state (nudge budget, edit/verify
    // counters, stuck-loop history, skill gates). The parent may call this
    // directly on session.created; onEvent also invokes it.
    reset() { monitor.reset(); },

    getCompressor() { return compressor; },

    // tool.execute.before — real API (@opencode-ai/plugin 1.17.x):
    //   (input: {tool, sessionID, callID}, output: {args})
    // The hook returns void; there is NO way to short-circuit or block a tool by
    // return value. Consequences:
    //   - Tool name comes from input.tool; args live in output.args.
    //   - We always startSpan here and let afterTool call the single matching
    //     endSpan. We must NOT call endSpan here or the span stack double-pops.
    //   - Env access is "blocked" by neutralizing output.args (empty the args)
    //     so the underlying tool call has nothing to act on and fails cleanly.
    //   - Injection cannot be blocked; we only screen/log it (guard.check
    //     persists incidents). Cache cannot short-circuit, so no cache-get here.
    beforeTool(input, output) {
      const toolName = input?.tool || 'unknown';
      const toolArgs = (output && output.args) || {};
      trace.startSpan(toolName, toolArgs);

      // Guard: neutralize .env file access. We can't block via return, so we
      // strip the args — the read/edit/write then has no target and no-ops.
      const envBlock = checkEnvAccess(toolName, toolArgs);
      if (envBlock) {
        if (output && output.args && typeof output.args === 'object') {
          for (const k of Object.keys(output.args)) delete output.args[k];
        }
        try { console.warn(`[zara/observe] env-guard neutralized ${toolName}: ${envBlock.output.split('\n')[0]}`); } catch { /* noop */ }
        return;
      }

      // Guard: screen tool inputs for injection. Log-only — cannot block.
      const inputText = Object.values(toolArgs).filter(v => typeof v === 'string').join(' ');
      if (inputText) {
        const issues = guard.check(inputText);
        if (issues.some(i => i.risk === 'high')) {
          try { console.warn(`[zara/observe] prompt-injection screened in ${toolName} input: ${issues.map(i => i.label).join(',')}`); } catch { /* noop */ }
        }
      }
    },

    // tool.execute.after — real API:
    //   (input: {tool, sessionID, callID, args}, output: {title, output, metadata})
    // Tool name = input.tool, args = input.args, result = output.output.
    // We mutate output.output directly for shell filtering and secret redaction.
    afterTool(input, output) {
      const toolName = input?.tool || 'unknown';
      const success = !(output?.isError || output?.error);
      const execContext = output?.output && typeof output.output === 'string' ? output.output.slice(0, 60) : '';
      trace.endSpan(toolName, success, execContext);

      // Shell output filtering (snip-style)
      if (toolName === 'bash' && output?.output && typeof output.output === 'string') {
        output.output = compressor.filterShellOutput(output.output);
        output.output = compressor.truncateOutput(output.output);
      }

      if (output?.output && typeof output.output === 'string') {
        const issues = guard.check(output.output);
        if (issues.length > 0) {
          // Redact secrets (always) even if only injection detected
          if (guard.hasSecret(output.output)) {
            output.output = guard.redact(output.output);
          }
        }
      }

      if (cache.isCacheable(toolName) && success) {
        cache.set(toolName, input?.args || {}, output?.output);
      }

      // Proactive monitoring: repetition detection, verify/skill gates, trust scoring
      monitor.recordTool(toolName, input, output, success);
    },

    // tool.definition — compress verbose tool descriptions to save context tokens.
    // Mutates output.description in place. Conservative: only trims when clearly
    // over budget so we never strip meaning from short descriptions.
    compressToolDefinition(input, output) {
      if (!output || typeof output.description !== 'string') return;
      const desc = output.description;
      if (desc.length <= 500) return;
      // Keep the first paragraph / sentence cluster; drop long trailing prose.
      const firstBlock = desc.split(/\n\s*\n/)[0];
      const compact = firstBlock.length <= 500 ? firstBlock : firstBlock.slice(0, 500);
      output.description = compact.trim();
    },

    onResponse(res) {
      if (res?.content) {
        const text = typeof res.content === 'string' ? res.content : '';
        trace.onMessage(text);
        // Detect responses without tool calls (potential premature stop)
        if (!res.tool_calls?.length && text.length > 0) {
          monitor.recordResponseWithoutTools(text);
        }
      }
    },

    inject(messages) {
      // Track input tokens from system message
      const sysMsg = messages.find(m => m.role === 'system');
      if (sysMsg?.content) trace.onInput(sysMsg.content);

      // Read agent context from last user message metadata if available
      const lastMsg = messages.filter(m => m.role === 'user' || m.role === 'assistant').pop();
      if (lastMsg?.metadata?.agent) {
        trace.setCurrentAgent(lastMsg.metadata.agent);
      }

      // Proactive nudges (repetition, skill routing, verification gates)
      const parts = monitor.collectNudges(messages);
      if (parts.length) {
        const last = messages[messages.length - 1];
        if (last?.role === 'system') last.content += '\n\n' + parts.join('\n');
        else messages.push({ role: 'system', content: parts.join('\n') });
      }

      return messages;
    },

    // transformMessages — bridged by the parent from experimental.chat.messages
    // .transform, whose output.messages is `{ info, parts }[]`. The compressor
    // operates on that parts-shape. Safety: if the incoming array doesn't look
    // like the parts-shape, skip the transform and return it untouched so we
    // never corrupt an unexpected message format.
    transformMessages(messages) {
      if (!Array.isArray(messages)) return messages;
      const looksLikePartsShape = messages.length === 0
        || messages.some(m => m && Array.isArray(m.parts));
      if (!looksLikePartsShape) return messages;
      try {
        // Normal transform (always applied)
        let result = compressor.transform(messages);

        // If message count is high, apply pre-compaction layer
        if (result.length > 30) {
          const { messages: preCompacted } = compressor.preCompact(result);
          result = preCompacted;
        }

        return result;
      }
      catch { return messages; }
    },

    dispose() {},

    tools: {
      zara_trace_summary: tool({
        description: 'Trace summary (sessions, cost).',
        args: { days: z.number().optional().describe('Days (default 1)') },
        async execute(args) {
          const s = trace.summary(args.days || 1);
          return { output: `**Trace (${args.days || 1}d)** Sessions:${s.sessions} Tools:${s.tools} Latency:${s.avgLatency}ms Cost:$${s.cost.toFixed(4)}` };
        },
      }),

      zara_guardrail_check: tool({
        description: 'Scan text for injection/PII.',
        args: { text: z.string().describe('Text to check') },
        async execute(args) {
          const issues = guard.check(args.text);
          if (!issues.length) return { output: 'No issues detected.' };
          const lines = issues.map(i => `- [${i.risk}] ${i.label}: ${i.matched?.slice(0, 80)}`);
          return { output: `${issues.length} issue(s)\n${lines.join('\n')}` };
        },
      }),

      zara_cache_stats: tool({
        description: 'Cache stats.',
        args: {},
        async execute() {
          const s = cache.stats();
          return { output: `Cache: ${s.entries} entries | ${s.hitRate}% hit (${s.hits}/${s.hits + s.misses})` };
        },
      }),

      zara_cache_clear: tool({
        description: 'Clear cache.',
        args: {},
        async execute() { cache.clear(); return { output: 'Cleared.' }; },
      }),
    },
  };
}
