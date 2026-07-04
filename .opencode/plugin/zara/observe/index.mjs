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
        monitor.resetSession();
      }
      if (event.type === 'session.ended') trace.endSession();
    },

    getCompressor() { return compressor; },

    // tool.execute.before — real API: args live in output.args, and the hook
    // returns void. To block a tool we cannot throw/return; instead we mutate
    // output.args so the blocked call becomes a no-op and record the block in
    // the trace. A `__zaraBlocked` marker + short-circuit output are attached
    // to output so afterTool / downstream can surface the reason.
    beforeTool(input, output) {
      const toolName = input?.tool || input?.name || 'unknown';
      const toolArgs = (output && output.args) || input?.args || {};
      trace.startSpan(toolName, toolArgs);

      const block = (reason, message) => {
        trace.endSpan(toolName, false, `blocked: ${reason}`);
        if (output) {
          output.__zaraBlocked = reason;
          if (message) output.__zaraMessage = message;
        }
      };

      // Guard: block .env file access
      const envBlock = checkEnvAccess(toolName, toolArgs);
      if (envBlock) {
        block('env-guard', envBlock.output);
        return envBlock;
      }

      // Guard: check tool inputs for injection
      const inputText = Object.values(toolArgs).filter(v => typeof v === 'string').join(' ');
      if (inputText) {
        const issues = guard.check(inputText);
        if (issues.some(i => i.risk === 'high')) {
          block(issues.map(i => i.label).join(','), '⚠️ Blocked: prompt injection detected in tool input.');
          return { isError: true, output: `⚠️ Blocked: prompt injection detected in tool input.` };
        }
      }

      // Cache check (read-only, safe tools only)
      if (cache.isCacheable(toolName)) {
        const cached = cache.get(toolName, toolArgs);
        if (cached) {
          if (output) output.__zaraCached = cached;
          return { cached: true, output: cached };
        }
      }
      return null;
    },

    afterTool(input, output) {
      const toolName = input?.tool || input?.name || 'unknown';
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
        cache.set(toolName, input?.args || input, output?.output);
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

    transformMessages(messages) {
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
