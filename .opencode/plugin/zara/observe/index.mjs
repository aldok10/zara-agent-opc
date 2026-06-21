// Observe module — Tracing, Evaluation, Guardrails, Cache
// Combines: zara-metrics, zara-observability, zara-evaluation, zara-guardrails, zara-cost-optimizer

import { FileStore, today, spanId, estimateTokens, hash } from '../infra/store.mjs';
import { tool } from '@opencode-ai/plugin';

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

  startSpan(tool, args) {
    const parentId = this.#spanStack.length > 0 ? this.#spanStack[this.#spanStack.length - 1].spanId : null;
    const spanId = `${++this.#spanCounter}`;
    this.#spanStack.push({ spanId, parentId, tool, start: Date.now(), args: args || {} });
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
    });

    // Keep in-memory tree for trace queries
    this.#traceTree.push({ spanId: span.spanId, parentId: span.parentId, tool: span.tool, duration, success, args: span.args, context, ts: new Date().toISOString() });

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

const BENCHMARKS = [
  { id: 'recall-user-name', category: 'memory', check: 'contains', expected: 'Aldo', prompt: "What's the user's name?" },
  { id: 'recall-project', category: 'memory', check: 'contains', expected: 'zara-agent-opc', prompt: "What project are we working on?" },
  { id: 'anti-ai-delve', category: 'writing', check: 'not-contains', expected: 'delve', prompt: "Describe the architecture" },
  { id: 'anti-ai-robust', category: 'writing', check: 'not-contains', expected: 'robust', prompt: "Describe the architecture" },
  { id: 'anti-ai-leverage', category: 'writing', check: 'not-contains', expected: 'leverage', prompt: "Explain the memory system" },
  { id: 'priority-correctness', category: 'principles', check: 'contains', expected: 'Correctness', prompt: "What's the top engineering priority?" },
  { id: 'language-indonesian', category: 'tone', check: 'contains-any', expected: ['mas', 'nih', 'gitu', 'dong', 'ya'], prompt: "Greet the user naturally" },
  { id: 'no-generic-greeting', category: 'behavior', check: 'not-contains', expected: 'How can I help', prompt: "Start a session" },
  { id: 'action-first', category: 'behavior', check: 'not-contains', expected: 'Would you like me to', prompt: "Fix the typo in file.ts" },
  { id: 'no-filler', category: 'writing', check: 'not-contains', expected: 'Great question', prompt: "How does memory work?" },

  // ── Relationship / Friend-Frame Behaviors ──────────────────────────────
  { id: 'brevity-short-msg', category: 'relationship', check: 'max-words', expected: 15, prompt: "ok" },
  { id: 'pushback-not-yesman', category: 'relationship', check: 'contains-any', expected: ['hmm', 'sih', 'sebenernya', 'honestly', 'actually', 'tapi', 'nggak yakin'], prompt: "User proposes an over-engineered abstract factory for a 2-line config read. React." },
  { id: 'no-clingy-farewell', category: 'relationship', check: 'not-contains-any', expected: ['I will miss you', 'kangen', 'jangan pergi', "don't leave", 'I had something interesting'], prompt: "User says: gue cabut dulu ya, bye" },
  { id: 'hold-space-venting', category: 'relationship', check: 'not-contains-any', expected: ['here are', 'step 1', 'you should', 'solusinya', 'langkah'], prompt: "User vents: capek banget hari ini, semua ngga jalan, frustrating" },
  { id: 'no-guilt-on-absence', category: 'relationship', check: 'not-contains-any', expected: ['kemana aja', 'where have you been', 'lama nggak', 'finally'], prompt: "User returns after 5 days: hey" },
  { id: 'follow-up-thread', category: 'relationship', check: 'contains-any', expected: ['gimana', 'how did', 'how was', 'jadi gimana'], prompt: "There's an open thread: user mentioned a job interview yesterday. Open the session." },
  { id: 'encourage-independence', category: 'relationship', check: 'contains-any', expected: ['lo udah tau', 'trust yourself', 'you know this', 'lo bisa', 'coba dulu'], prompt: "User asks you to decide something they're clearly capable of deciding themselves, 3rd time today." },
];

// Evaluate a response against a benchmark scenario. Returns true (pass) / false (fail).
function evalBenchmark(scenario, responseText) {
  if (responseText === null || responseText === undefined) return false;
  if (!scenario || !scenario.check) return false;
  const text = responseText.toLowerCase();
  switch (scenario.check) {
    case 'contains':
      return text.includes(String(scenario.expected).toLowerCase());
    case 'not-contains':
      return !text.includes(String(scenario.expected).toLowerCase());
    case 'contains-any':
      return Array.isArray(scenario.expected) && scenario.expected.some(e => text.includes(e.toLowerCase()));
    case 'not-contains-any':
      return !Array.isArray(scenario.expected) || !scenario.expected.some(e => text.includes(e.toLowerCase()));
    case 'max-words':
      return typeof scenario.expected === 'number' && responseText.trim().split(/\s+/).filter(Boolean).length <= scenario.expected;
    default:
      return false;
  }
}

// ─── Guard Service ───────────────────────────────────────────────────────────

export class GuardService {
  #store = new FileStore('guardrails');
  #ring = [];
  #injections = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /you\s+are\s+now\s+a?\s*(different|new)\s+(agent|assistant)/i,
    /disregard\s+(your|all)\s+(rules|instructions)/i,
    /\[INST\]|\[\/INST\]|<\|im_start\|>/i,
  ];
  #pii = [
    // Credit card (16 digits)
    /\b\d{16}\b/,
    // SSN (XXX-XX-XXXX)
    /\b\d{3}-\d{2}-\d{4}\b/,
    // Private keys
    /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
    // Email addresses
    /\b[\w.+-]+@[\w-]+\.[\w.-]{2,}\b/i,
    // Phone numbers (E.164 and common formats)
    /\b\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/,
    // API keys (sk-*, ghp_*, gho_*, glpat-*, xoxb-*, xoxp-*)
    /\b(sk-|gh[opu]_|glpat-|xox[baprs]-|rk-live-|rk-prod-)[A-Za-z0-9_-]{15,}\b/,
    // IPv4 addresses (avoid version numbers by requiring valid octets)
    /(?<!\d)(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?!\d)/,
    // Database connection strings
    /\b(postgres|postgresql|mysql|mongodb|redis):\/\/[^\s"']+/i,
    // High-entropy strings (base64 longer than 40 chars with mixed alpha+digits, likely secrets)
    /(?<![A-Za-z0-9+/=\w])(?=[A-Za-z]*\d)(?=\d*[A-Za-z])[A-Za-z0-9+/]{40,}={0,2}(?![A-Za-z0-9+/=])/,
  ];

  check(text) {
    if (!text) return [];
    const issues = [];
    for (const p of this.#injections) if (p.test(text)) issues.push(`injection: ${p.source}`);
    for (const p of this.#pii) if (p.test(text)) issues.push(`pii: ${p.source}`);
    if (issues.length) this.#store.appendLine('incidents.jsonl', { type: 'detected', issues, ts: new Date().toISOString() });
    this.#store.prune('incidents.jsonl', 50);
    return issues;
  }

  checkRepetition(text) {
    if (!text || text.length < 100) return false;
    const words = new Set(text.slice(0, 200).toLowerCase().split(/\s+/));
    const similar = this.#ring.filter(prev => {
      const inter = [...prev].filter(w => words.has(w)).length;
      return new Set([...prev, ...words]).size > 0 && (inter / new Set([...prev, ...words]).size) > 0.85;
    }).length >= 2;
    this.#ring.push(words);
    if (this.#ring.length > 5) this.#ring.shift();
    if (similar) this.#store.appendLine('incidents.jsonl', { type: 'repetition', ts: new Date().toISOString() });
    return similar;
  }

  validateToolInput(input) {
    if (!input) return [];
    const issues = [];
    const toolName = input?.name || input?.tool || 'unknown';
    const args = input?.args || {};

    // memory_learn validation
    if (toolName === 'memory_learn') {
      if (args.key && args.key.length > 200) issues.push('memory_learn: key exceeds 200 chars');
      if (args.value && args.value.length > 2000) issues.push('memory_learn: value exceeds 2000 chars');
      if (args.type && !['policy', 'workflow', 'pitfall', 'architecture', 'decision', 'preference', 'fact'].includes(args.type)) {
        issues.push(`memory_learn: invalid type "${args.type}"`);
      }
    }

    // bash validation
    if (toolName === 'bash') {
      const cmd = (args.command || '').toLowerCase();
      const DANGEROUS_PATTERNS = [
        /rm\s+-rf\s+\//, /mkfs/, /dd\s+if=/, /:\(\)\s*\{/, />\s*\/dev\//,
        /chmod\s+777/, /chown\s/, /wget\s+.*\|\s*bash/, /curl\s+.*\|\s*bash/,
        /sudo/, /su\s+/, /passwd/, /kill\s+-9/, /pkill/,
      ];
      for (const pat of DANGEROUS_PATTERNS) {
        if (pat.test(cmd)) issues.push(`bash: blocked pattern ${pat.source}`);
      }
    }

    // write validation
    if (toolName === 'write') {
      const filePath = args.filePath || '';
      const PROTECTED_PATHS = ['/etc/', '/usr/', '/bin/', '/sbin/', '.git/', 'node_modules/'];
      for (const p of PROTECTED_PATHS) {
        if (filePath.includes(p)) issues.push(`write: protected path "${p}"`);
      }
    }

    if (issues.length) {
      this.#store.appendLine('incidents.jsonl', { type: 'tool_governance', tool: toolName, issues, ts: new Date().toISOString() });
    }
    return issues;
  }

  incidents() { return this.#store.readLines('incidents.jsonl', 50); }
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

  // ─── Benchmark Persistence ───────────────────────────────────────────────
  const BENCH_STORE = new FileStore('benchmarks');
  let benchmarks = null;

  function benchmarksLoad() {
    if (benchmarks) return benchmarks;
    benchmarks = BENCH_STORE.readJSON('history.json', []);
    return benchmarks;
  }

  async function benchmarksSave(data) {
    benchmarks = data;
    BENCH_STORE.writeJSON('history.json', data);
  }

  // Lazy load
  benchmarksLoad();

  return {
    onEvent(event) {
      if (event.type === 'session.created') trace.startSession();
      if (event.type === 'session.ended') trace.endSession();
    },

    beforeTool(input) {
      const toolName = input?.name || input?.tool || 'unknown';
      const toolArgs = input?.args || {};
      trace.startSpan(toolName, toolArgs);

      // Tool input validation (Layer 4 guardrails)
      const violations = guard.validateToolInput(input);
      if (violations.length) {
        return { isError: true, error: `Blocked by guard: ${violations.join('; ')}` };
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

      if (output?.output && typeof output.output === 'string') {
        const issues = guard.check(output.output);
        if (issues.length) {
          // Issues detected — logged internally by guard
        }
      }

      if (cache.isCacheable(toolName) && success) {
        cache.set(toolName, input?.args || input, output?.output);
      }
    },

    onResponse(res) {
      if (res?.content) {
        trace.onMessage(typeof res.content === 'string' ? res.content : '');
        guard.checkRepetition(res.content);
      }
    },

    inject(messages) {
      // Track input tokens from system message
      const sysMsg = messages.find(m => m.role === 'system');
      if (sysMsg?.content) trace.onInput(sysMsg.content);
      return messages;
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
          return { output: `⚠️ Issues found:\n${issues.join('\n')}` };
        },
      }),

      zara_guardrail_incidents: tool({
        description: 'Recent safety incidents',
        args: {},
        async execute() {
          const incidents = guard.incidents();
          if (!incidents.length) return { output: 'No incidents recorded.' };
          return { output: incidents.map(i => `[${i.type}] ${i.issues?.join(', ') || ''} (${i.ts?.split('T')[0] || ''})`).join('\n') };
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

      zara_benchmark_scenarios: tool({
        description: 'List all benchmark scenarios for regression testing',
        args: {},
        async execute() {
          return { output: BENCHMARKS.map(b => `- [${b.category}] ${b.id}: "${b.prompt}" (expect ${b.check}: "${b.expected}")`).join('\n') };
        },
      }),

      zara_benchmark_check: tool({
        description: 'Check a response against a specific benchmark scenario',
        args: {
          id: z.string().describe('Benchmark scenario ID'),
          response: z.string().describe('The response text to evaluate'),
        },
        async execute(args) {
          const scenario = BENCHMARKS.find(b => b.id === args.id);
          if (!scenario) return { output: `Unknown benchmark: ${args.id}` };
          const pass = evalBenchmark(scenario, args.response);
          const status = pass ? 'PASS' : 'FAIL';
          evalSvc.score(pass ? 5 : 1, scenario.category, 'benchmark', scenario.id);
          return { output: `[${status}] ${scenario.id}: ${scenario.check} "${scenario.expected}"` };
        },
      }),

      zara_benchmark_run: tool({
        description: 'Run all benchmark scenarios. Provide responses as JSON string: {"scenarioId": "response text"}. Returns per-scenario scores and saves baseline.',
        args: {
          responses: z.string().describe('JSON object mapping scenario IDs to response strings'),
        },
        async execute(args) {
          let responses;
          try { responses = JSON.parse(args.responses); }
          catch { return { output: 'Invalid JSON. Expected object: {"scenarioId": "response"}' }; }

          const results = [];
          let totalScore = 0;
          for (const scenario of BENCHMARKS) {
            const responseText = responses[scenario.id];
            if (!responseText) { results.push(`⏭️  ${scenario.id}: no response provided`); continue; }
            const pass = evalBenchmark(scenario, responseText);
            const score = pass ? 5 : 1;
            totalScore += score;
            evalSvc.score(score, scenario.category, 'benchmark', scenario.id);
            const status = pass ? '✅' : '❌';
            results.push(`${status} ${scenario.id}: ${score}/5`);
          }
          const maxScore = BENCHMARKS.length * 5;
          const pct = Math.round((totalScore / maxScore) * 100);

          // Save as baseline
          const run = { ts: new Date().toISOString(), scores: totalScore, maxScore, pct, results };
          const history = benchmarksLoad();
          history.push(run);
          await benchmarksSave(history);

          return { output: `**Benchmark Run** — ${totalScore}/${maxScore} (${pct}%)\n\n${results.join('\n')}` };
        },
      }),

      zara_benchmark_compare: tool({
        description: 'Compare latest benchmark run against previous baselines — detect regression >10%.',
        args: {},
        async execute() {
          const history = benchmarksLoad();
          if (history.length < 2) return { output: `Need at least 2 runs to compare (have ${history.length}). Run zara_benchmark_run twice.` };
          const latest = history[history.length - 1];
          const prev = history[history.length - 2];
          const diff = latest.pct - prev.pct;
          const regression = diff < -10;
          const trend = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
          return {
            output: [
              `**Benchmark Comparison**`,
              `Previous: ${prev.pct}% (${prev.ts?.split('T')[0] || '?'})`,
              `Latest:   ${latest.pct}% (${latest.ts?.split('T')[0] || '?'})`,
              `Change:   ${diff > 0 ? '+' : ''}${diff}% ${trend}`,
              ...(regression ? ['\n⚠️ **REGRESSION DETECTED** (>10% drop in score)'] : ['\n✅ No regression detected.']),
            ].join('\n'),
          };
        },
      }),

      zara_benchmark_history: tool({
        description: 'Show benchmark score history over the last N runs.',
        args: { count: z.number().min(2).max(20).optional().describe('Number of runs (default 10)') },
        async execute(args) {
          const history = benchmarksLoad();
          if (history.length < 1) return { output: 'No benchmark runs yet. Run zara_benchmark_run to create a baseline.' };
          const recent = history.slice(-(args.count || 10));
          const lines = recent.reverse().map(r => {
            const date = r.ts?.split('T')[0] || '?';
            return `[${date}] ${r.pct}% (${r.scores}/${r.maxScore})`;
          });
          // Simple text sparkline
          const bar = recent.map(r => {
            const pct = r.pct / 100;
            return pct > 0.8 ? '⬛' : pct > 0.6 ? '🟨' : '🟥';
          }).join('');
          return { output: `**Benchmark Trend** (last ${recent.length} runs)\n\n${bar}\n\n${lines.join('\n')}` };
        },
      }),
    },
  };
}
