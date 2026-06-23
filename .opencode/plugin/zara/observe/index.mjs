// Observe module — Tracing, Evaluation, Guardrails, Cache
// Combines: zara-metrics, zara-observability, zara-evaluation, zara-guardrails, zara-cost-optimizer

import { FileStore, today, spanId, estimateTokens, hash, SECRET_PATTERN } from '../infra/store.mjs';
import { tool } from '@opencode-ai/plugin';
import { matchInjection, PROMPT_INJECTION_PATTERNS } from './patterns.mjs';

const z = tool.schema;

// ─── Trace Service ───────────────────────────────────────────────────────────

class Session {
  constructor() {
    this.id = spanId();
    this.startedAt = Date.now();
    this.messages = 0;
    this.toolCalls = 0;
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.corrections = 0;
    this.errors = 0;
  }
  get duration() { return Date.now() - this.startedAt; }
  get cost() { return ((this.inputTokens * 3) + (this.outputTokens * 15)) / 1_000_000; }
}

export class TraceService {
  #store = new FileStore('traces');
  #session = null;
  #spanStack = [];
  #traceTree = [];        // in-memory trace tree for current session
  #spanCounter = 0;
  #currentAgent = null;   // optional agent context for tool call attribution

  get session() { return this.#session; }

  startSession() {
    this.#session = new Session();
    this.#traceTree = [];
    this.#spanCounter = 0;
    this.#store.pruneOldFiles(/^\d{4}-\d{2}-\d{2}\.jsonl$/, 14);
  }

  endSession() {
    const s = this.#session;
    if (!s) return;
    this.#store.appendLine(`${today()}.jsonl`, {
      type: 'session', id: s.id, duration: s.duration, messages: s.messages,
      toolCalls: s.toolCalls, inputTokens: s.inputTokens, outputTokens: s.outputTokens,
      cost: s.cost, corrections: s.corrections, errors: s.errors, ts: new Date().toISOString(),
    });
    this.#store.appendLine('costs.jsonl', { date: today(), cost: s.cost, inputTokens: s.inputTokens, outputTokens: s.outputTokens });
    this.#session = null;
  }

  setCurrentAgent(name) {
    this.#currentAgent = name || null;
  }

  clearCurrentAgent() {
    this.#currentAgent = null;
  }

  startSpan(tool, args, agent) {
    const parentId = this.#spanStack.length > 0 ? this.#spanStack[this.#spanStack.length - 1].spanId : null;
    const spanId = `${++this.#spanCounter}`;
    this.#spanStack.push({ spanId, parentId, tool, start: Date.now(), args: args || {}, agent: agent || this.#currentAgent || null });
  }

  endSpan(tool, success, context) {
    const span = this.#spanStack.pop();
    if (!span) return 0;
    const duration = Date.now() - span.start;
    if (this.#session) { this.#session.toolCalls++; if (!success) this.#session.errors++; }

    // Persist span with execution path context
    this.#store.appendLine(`${today()}.jsonl`, {
      type: 'tool', tool: span.tool, spanId: span.spanId, parentId: span.parentId,
      duration, success, ts: new Date().toISOString(), args: span.args, context,
      agent: span.agent || null,
    });

    // Keep in-memory tree for trace queries
    this.#traceTree.push({ spanId: span.spanId, parentId: span.parentId, tool: span.tool, duration, success, args: span.args, context, agent: span.agent || null, ts: new Date().toISOString() });

    return duration;
  }

  traceTree(depth = 3) {
    if (!this.#traceTree.length) return [];
    // Build tree from flat list
    const byId = {};
    const roots = [];
    for (const node of this.#traceTree) {
      byId[node.spanId] = { ...node, children: [] };
    }
    for (const node of Object.values(byId)) {
      if (node.parentId && byId[node.parentId]) {
        byId[node.parentId].children.push(node);
      } else {
        roots.push(node);
      }
    }
    // Format as tree string
    function format(n, level = 0) {
      if (level > depth) return '';
      const indent = '  '.repeat(level);
      const argStr = n.args?.name || n.args?.tool || '';
      const ctxStr = n.context ? ` ← ${n.context}` : '';
      let s = `${indent}${n.success ? '✓' : '✗'} ${n.tool} ${argStr} (${n.duration}ms)${ctxStr}`;
      for (const c of n.children) s += '\n' + format(c, level + 1);
      return s;
    }
    return roots.map(r => format(r)).join('\n');
  }

  onMessage(text) { if (this.#session) { this.#session.messages++; this.#session.outputTokens += estimateTokens(text); } }
  onInput(text) { if (this.#session) this.#session.inputTokens += estimateTokens(text); }
  addCorrection() { if (this.#session) this.#session.corrections++; }

  summary(days = 1) {
    let cost = 0, sessions = 0, tools = 0, latency = 0, n = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      for (const s of this.#store.readLines(`${d.toISOString().split('T')[0]}.jsonl`)) {
        if (s.type === 'session') { sessions++; cost += s.cost || 0; tools += s.toolCalls || 0; }
        if (s.type === 'tool') { latency += s.duration || 0; n++; }
      }
    }
    return { sessions, tools, avgLatency: n ? Math.round(latency / n) : 0, cost };
  }

  slowTools() {
    return this.#store.readLines(`${today()}.jsonl`)
      .filter(s => s.type === 'tool').sort((a, b) => b.duration - a.duration).slice(0, 10);
  }

  costByDay(days = 7) {
    const entries = this.#store.readLines('costs.jsonl');
    const byDate = {};
    for (const e of entries) {
      if (!byDate[e.date]) byDate[e.date] = { cost: 0, input: 0, output: 0 };
      byDate[e.date].cost += e.cost; byDate[e.date].input += e.inputTokens; byDate[e.date].output += e.outputTokens;
    }
    return Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).slice(0, days);
  }

  costByAgent(days = 7) {
    const agentData = {};
    let totalToolCalls = 0;
    // Collect tool spans with agent field
    for (let i = 0; i < days; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      for (const s of this.#store.readLines(`${d.toISOString().split('T')[0]}.jsonl`)) {
        if (s.type === 'tool') {
          const agent = s.agent || 'unattributed';
          if (!agentData[agent]) agentData[agent] = { toolCalls: 0, totalDuration: 0, successCount: 0, failCount: 0 };
          agentData[agent].toolCalls++;
          agentData[agent].totalDuration += s.duration || 0;
          if (s.success) agentData[agent].successCount++;
          else agentData[agent].failCount++;
          totalToolCalls++;
        }
      }
    }
    // Get total session cost for proportional attribution
    let totalCost = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      for (const s of this.#store.readLines(`${d.toISOString().split('T')[0]}.jsonl`)) {
        if (s.type === 'session') totalCost += s.cost || 0;
      }
    }
    // Attribute cost proportionally by tool call count
    const result = {};
    for (const [agent, data] of Object.entries(agentData)) {
      const proportion = totalToolCalls > 0 ? data.toolCalls / totalToolCalls : 0;
      result[agent] = {
        toolCalls: data.toolCalls,
        avgLatency: data.toolCalls > 0 ? Math.round(data.totalDuration / data.toolCalls) : 0,
        totalDuration: data.totalDuration,
        successCount: data.successCount,
        failCount: data.failCount,
        estimatedCost: +(totalCost * proportion).toFixed(4),
      };
    }
    return result;
  }

  latencyByAgent(days = 7) {
    const agentData = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      for (const s of this.#store.readLines(`${d.toISOString().split('T')[0]}.jsonl`)) {
        if (s.type === 'tool') {
          const agent = s.agent || 'unattributed';
          if (!agentData[agent]) agentData[agent] = { calls: 0, total: 0, max: 0, byTool: {} };
          agentData[agent].calls++;
          agentData[agent].total += s.duration || 0;
          if ((s.duration || 0) > agentData[agent].max) agentData[agent].max = s.duration || 0;
          const tool = s.tool || 'unknown';
          if (!agentData[agent].byTool[tool]) agentData[agent].byTool[tool] = { calls: 0, total: 0 };
          agentData[agent].byTool[tool].calls++;
          agentData[agent].byTool[tool].total += s.duration || 0;
        }
      }
    }
    const result = {};
    for (const [agent, data] of Object.entries(agentData)) {
      const toolBreakdown = {};
      for (const [tool, td] of Object.entries(data.byTool)) {
        toolBreakdown[tool] = { calls: td.calls, avgLatency: Math.round(td.total / td.calls) };
      }
      result[agent] = {
        calls: data.calls,
        avgLatency: Math.round(data.total / data.calls),
        maxLatency: data.max,
        totalDuration: data.total,
        byTool: toolBreakdown,
      };
    }
    return result;
  }
}

// ─── Eval Service ────────────────────────────────────────────────────────────

export class EvalService {
  #store = new FileStore('eval');
  #quality;

  constructor() { this.#quality = this.#store.readJSON('quality.json') || { overall: 0, total: 0, categories: {}, weekly: [], streak: 0 }; }

  score(score, category, source, context) {
    const q = this.#quality;
    q.total++;
    q.overall = ((q.overall * (q.total - 1)) + score) / q.total;
    if (!q.categories[category]) q.categories[category] = { avg: 0, count: 0 };
    const cat = q.categories[category];
    cat.count++;
    cat.avg = ((cat.avg * (cat.count - 1)) + score) / cat.count;
    q.streak = score >= 4 ? q.streak + 1 : 0;

    const week = today();
    const last = q.weekly[q.weekly.length - 1];
    if (last?.week === week) { last.scores.push(score); last.avg = last.scores.reduce((a, b) => a + b, 0) / last.scores.length; }
    else { q.weekly.push({ week, scores: [score], avg: score }); if (q.weekly.length > 12) q.weekly.shift(); }

    this.#store.appendLine('scores.jsonl', { score, category, source, context, ts: new Date().toISOString() });
    this.#store.prune('scores.jsonl', 200);
    this.#store.writeJSON('quality.json', q);
    return q;
  }

  report() { return this.#quality; }
  blindSpots() { return Object.entries(this.#quality.categories).filter(([, d]) => d.avg < 3.5 && d.count >= 3).sort((a, b) => a[1].avg - b[1].avg); }
}

// ─── Guard Service ───────────────────────────────────────────────────────────

export class GuardService {
  #store = new FileStore('guardrails');

  /**
   * Check text for security issues (secrets + prompt injection).
   * Returns structured issue objects with type, label, risk, and matched snippet.
   */
  check(text) {
    if (!text) return [];
    const issues = [];

    // Layer 1a: Secret detection
    if (SECRET_PATTERN.test(text)) {
      issues.push({ type: 'secret', label: 'credential_leak', risk: 'high', matched: text.match(SECRET_PATTERN)?.[0]?.slice(0, 80) || '' });
    }

    // Layer 1b: Prompt injection detection
    issues.push(...matchInjection(text));

    if (issues.length) {
      this.#store.appendLine('incidents.jsonl', {
        type: issues.map(i => i.type).join(','),
        risk: issues.some(i => i.risk === 'high') ? 'high' : issues.some(i => i.risk === 'medium') ? 'medium' : 'low',
        issues,
        textPreview: text.slice(0, 200),
        ts: new Date().toISOString(),
      });
    }
    return issues;
  }

  /**
   * Quick check that only tests for secrets (for redaction).
   * Doesn't log incidents — used in hot path for output filtering.
   */
  hasSecret(text) {
    return SECRET_PATTERN.test(text);
  }

  redact(text) {
    if (!text) return text;
    return text.replace(new RegExp(SECRET_PATTERN.source, 'gi'), '[REDACTED]');
  }

  incidents() { return this.#store.readLines('incidents.jsonl', 50); }
}

// ─── Context Compressor ──────────────────────────────────────────────────────

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
    const tail = result.length - 3;
    return result.map((msg, i) => {
      if (!msg || i >= tail) return msg;
      // Strip reasoning blocks from older assistant messages
      if (msg.role === 'assistant' && typeof msg.content === 'string' && msg.content.includes('<thinking>')) {
        return { ...msg, content: this.stripReasoning(msg.content) };
      }
      if (msg.role === 'tool' && typeof msg.content === 'string') {
        return { ...msg, content: this.truncateOutput(msg.content) };
      }
      return msg;
    });
  }
}

// ─── Cache Service ───────────────────────────────────────────────────────────

export class CacheService {
  #store = new FileStore('cache');
  #cache = null;
  #stats = null;
  #ttl = 4 * 3600000;
  #max = 100;
  #cacheable = new Set(['web_search', 'webfetch', 'context7_query-docs', 'context7_resolve-library-id']);

  isCacheable(tool) { return this.#cacheable.has(tool); }

  get(tool, args) {
    const c = this.#getCache();
    const key = hash(`${tool}:${JSON.stringify(args)}`);
    const entry = c[key];
    if (entry && (Date.now() - entry.ts) < this.#ttl) { this.#getStats().hits++; this.#save(); return entry.output; }
    this.#getStats().misses++;
    this.#save();
    return null;
  }

  set(tool, args, output) {
    if (!output || (typeof output === 'string' && output.startsWith('Error'))) return;
    const c = this.#getCache();
    c[hash(`${tool}:${JSON.stringify(args)}`)] = { output, ts: Date.now() };
    this.#evict();
    this.#save();
  }

  stats() {
    const s = this.#getStats();
    const total = s.hits + s.misses;
    return { hitRate: total ? Math.round((s.hits / total) * 100) : 0, ...s, entries: Object.keys(this.#getCache()).length };
  }

  clear() { this.#cache = {}; this.#save(); }

  #getCache() { if (!this.#cache) this.#cache = this.#store.readJSON('cache.json') || {}; return this.#cache; }
  #getStats() {
    if (!this.#stats) this.#stats = this.#store.readJSON('stats.json') || { hits: 0, misses: 0, today: '' };
    if (this.#stats.today !== today()) this.#stats = { hits: 0, misses: 0, today: today() };
    return this.#stats;
  }
  #evict() {
    const entries = Object.entries(this.#getCache()).filter(([, v]) => (Date.now() - v.ts) < this.#ttl)
      .sort((a, b) => b[1].ts - a[1].ts).slice(0, this.#max);
    this.#cache = Object.fromEntries(entries);
  }
  #save() { this.#store.writeJSON('cache.json', this.#cache); this.#store.writeJSON('stats.json', this.#stats); }
}

// ─── Module Export ───────────────────────────────────────────────────────────

export default function createObserve({ client, directory } = {}) {
  const trace = new TraceService();
  const evalSvc = new EvalService();
  const guard = new GuardService();
  const cache = new CacheService();
  const compressor = new ContextCompressor();

  return {
    onEvent(event) {
      if (event.type === 'session.created') trace.startSession();
      if (event.type === 'session.ended') trace.endSession();
    },

    beforeTool(input) {
      const toolName = input?.name || input?.tool || 'unknown';
      const toolArgs = input?.args || {};
      trace.startSpan(toolName, toolArgs);

      // Guard: check tool inputs for injection
      const inputText = Object.values(toolArgs).filter(v => typeof v === 'string').join(' ');
      if (inputText) {
        const issues = guard.check(inputText);
        if (issues.some(i => i.risk === 'high')) {
          trace.endSpan(toolName, false, `blocked: ${issues.map(i => i.label).join(',')}`);
          return { isError: true, output: `⚠️ Blocked: prompt injection detected in tool input.` };
        }
      }

      // Cache check (read-only, safe tools only)
      if (cache.isCacheable(toolName)) {
        const cached = cache.get(toolName, toolArgs);
        if (cached) return { cached: true, output: cached };
      }
      return null;
    },

    afterTool(input, output) {
      const toolName = input?.name || input?.tool || 'unknown';
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
    },

    onResponse(res) {
      if (res?.content) {
        trace.onMessage(typeof res.content === 'string' ? res.content : '');
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

      return messages;
    },

    transformMessages(messages) {
      try { return compressor.transform(messages); }
      catch { return messages; }
    },

    dispose() {},

    tools: {
      zara_trace_summary: tool({
        description: 'AI observability summary — sessions, tool latency, cost (last N days)',
        args: { days: z.number().optional().describe('Days to summarize (default 1, max 7)') },
        async execute(args) {
          const s = trace.summary(args.days || 1);
          return { output: `**Trace Summary (${args.days || 1}d)**\nSessions: ${s.sessions}\nTool calls: ${s.tools}\nAvg latency: ${s.avgLatency}ms\nCost: $${s.cost.toFixed(4)}` };
        },
      }),

      zara_slow_tools: tool({
        description: 'Show slowest tool calls today',
        args: {},
        async execute() {
          const slow = trace.slowTools();
          if (!slow.length) return { output: 'No slow tools today.' };
          return { output: slow.map(s => `- ${s.tool}: ${s.duration}ms (${s.success ? '✓' : '✗'})`).join('\n') };
        },
      }),

      zara_cost_report: tool({
        description: 'Daily cost breakdown (last N days)',
        args: { days: z.number().optional().describe('Days (default 7)') },
        async execute(args) {
          const report = trace.costByDay(args.days || 7);
          if (!report.length) return { output: 'No cost data.' };
          return { output: report.map(([date, d]) => `${date}: $${d.cost.toFixed(4)} (${d.input}+${d.output} tokens)`).join('\n') };
        },
      }),

      zara_cost_by_agent: tool({
        description: 'Cost breakdown by agent (last N days) — tool call counts and proportional cost attribution',
        args: { days: z.number().optional().describe('Days (default 7)') },
        async execute(args) {
          const report = trace.costByAgent(args.days || 7);
          if (!Object.keys(report).length) return { output: 'No agent cost data available. Start using agents first.' };
          const lines = Object.entries(report).sort((a, b) => b[1].estimatedCost - a[1].estimatedCost)
            .map(([agent, d]) => `${agent}: $${d.estimatedCost} (${d.toolCalls} calls, ${d.successCount}✓ ${d.failCount}✗, ${d.avgLatency}ms avg)`);
          return { output: `## Cost by Agent (${args.days || 7}d)\n${lines.join('\n')}` };
        },
      }),

      zara_latency_by_agent: tool({
        description: 'Latency breakdown by agent (last N days) — average, max, and per-tool latency',
        args: { days: z.number().optional().describe('Days (default 7)') },
        async execute(args) {
          const report = trace.latencyByAgent(args.days || 7);
          if (!Object.keys(report).length) return { output: 'No agent latency data available. Start using agents first.' };
          const lines = Object.entries(report).sort((a, b) => b[1].avgLatency - a[1].avgLatency)
            .map(([agent, d]) => {
              const toolLines = Object.entries(d.byTool).sort((a, b) => b[1].avgLatency - a[1].avgLatency)
                .map(([t, td]) => `  - ${t}: ${td.avgLatency}ms (${td.calls}x)`).join('\n');
              return `${agent}: ${d.avgLatency}ms avg / ${d.maxLatency}ms max (${d.calls} calls)\n${toolLines}`;
            });
          return { output: `## Latency by Agent (${args.days || 7}d)\n${lines.join('\n')}` };
        },
      }),

      zara_trace_tree: tool({
        description: 'Execution path tree — see decision chain, tool calls, and outcomes for the current session',
        args: { depth: z.number().min(1).max(5).optional().describe('Tree depth (default 3)') },
        async execute(args) {
          const tree = trace.traceTree(args.depth || 3);
          if (!tree) return { output: 'No trace tree available. Start a session first.' };
          return { output: `## Execution Path\n\`\`\`\n${tree}\n\`\`\`` };
        },
      }),

      zara_eval_score: tool({
        description: 'Record a quality score (1-5) for self-improvement tracking',
        args: {
          score: z.number().min(1).max(5).describe('Quality score 1-5'),
          category: z.enum(['accuracy', 'helpfulness', 'efficiency', 'tone', 'proactivity', 'language']).describe('Category'),
          source: z.enum(['self', 'user_explicit', 'user_implicit']).optional().describe('Source of evaluation'),
          context: z.string().optional().describe('Context for this score'),
        },
        async execute(args) {
          const q = evalSvc.score(args.score, args.category, args.source || 'self', args.context);
          return { output: `Score recorded: ${args.score}/5 in ${args.category}\nOverall: ${q.overall.toFixed(2)}/5 (${q.total} ratings)` };
        },
      }),

      zara_eval_report: tool({
        description: 'Quality report — overall, per-category, trends',
        args: {},
        async execute() {
          const q = evalSvc.report();
          const lines = [`**Overall**: ${q.overall.toFixed(2)}/5 (${q.total} ratings)`];
          for (const [cat, d] of Object.entries(q.categories || {})) {
            lines.push(`**${cat}**: ${d.avg.toFixed(2)}/5 (${d.count}x)`);
          }
          lines.push(`**Streak**: ${q.streak} high-quality in a row`);
          if (q.weekly?.length) {
            const last = q.weekly[q.weekly.length - 1];
            lines.push(`**This week**: ${last.avg.toFixed(2)}/5 (${last.scores.length} scores)`);
          }
          return { output: lines.join('\n') };
        },
      }),

      zara_eval_blind_spots: tool({
        description: 'Categories needing improvement (avg <3.5 with 3+ ratings)',
        args: {},
        async execute() {
          const spots = evalSvc.blindSpots();
          if (!spots.length) return { output: 'No blind spots detected.' };
          return { output: spots.map(([cat, d]) => `- **${cat}**: ${d.avg.toFixed(2)}/5 (${d.count} ratings)`).join('\n') };
        },
      }),

      zara_guardrail_check: tool({
        description: 'Check text for prompt injection or PII issues',
        args: { text: z.string().describe('Text to check') },
        async execute(args) {
          const issues = guard.check(args.text);
          if (!issues.length) return { output: 'No issues detected.' };
          const lines = issues.map(i =>
            `- [${i.risk}] ${i.label}: ${i.matched?.slice(0, 80)}`
          );
          return { output: `⚠️ **${issues.length} issue(s) detected**\n${lines.join('\n')}` };
        },
      }),

      zara_guardrail_incidents: tool({
        description: 'Recent safety incidents',
        args: {},
        async execute() {
          const incidents = guard.incidents();
          if (!incidents.length) return { output: 'No incidents recorded.' };
          return { output: incidents.map(i =>
            `[${i.risk || 'unknown'}] ${i.type}: ${i.issues?.map?.(x => `${x.label} (${x.risk})`).join(', ') || i.type} (${i.ts?.split('T')[0] || ''})`
          ).join('\n') };
        },
      }),

      zara_cache_stats: tool({
        description: 'Cache hit/miss stats and entry count',
        args: {},
        async execute() {
          const s = cache.stats();
          return { output: `Cache: ${s.entries} entries | ${s.hitRate}% hit rate (${s.hits} hits, ${s.misses} misses)` };
        },
      }),

      zara_cache_clear: tool({
        description: 'Clear the semantic cache',
        args: {},
        async execute() {
          cache.clear();
          return { output: 'Cache cleared.' };
        },
      }),
    },
  };
}
