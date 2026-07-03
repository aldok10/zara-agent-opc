// Trace Service — session + span tracing, cost/latency accounting

import { FileStore, today, spanId, estimateTokens } from '../infra/store.mjs';

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
  #spanCounter = 0;
  #currentAgent = null;   // optional agent context for tool call attribution

  get session() { return this.#session; }

  startSession() {
    this.#session = new Session();
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

    return duration;
  }

  onMessage(text) { if (this.#session) { this.#session.messages++; this.#session.outputTokens += estimateTokens(text); } }
  onInput(text) { if (this.#session) this.#session.inputTokens += estimateTokens(text); }

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
}
