// Growth module — three feedback loops (self, agent, user)
// 1. Zara self-growth: synthesize failure reflections into learned lessons
// 2. Agent growth: track dispatch outcomes, warn before repeat failures
// 3. User growth: track topic exposure, build a progressive skill map
//
// File-based state + simple heuristics only. No ML, no embeddings.

import fs from 'fs';
import path from 'path';
import { tool } from '@opencode-ai/plugin';
import { HOME, loadJson, saveJson, ensure } from '../infra/store.mjs';

const z = tool.schema;

// ─── Constants ───────────────────────────────────────────────────────────────

const GROWTH_DIR = path.join(HOME, 'growth');
const SELF_LESSONS_FILE = path.join(GROWTH_DIR, 'self-lessons.json');
const AGENT_HISTORY_FILE = path.join(GROWTH_DIR, 'agent-history.json');
const USER_PROGRESS_FILE = path.join(GROWTH_DIR, 'user-progress.json');

const REFLECT_LOG = path.join(HOME, 'reflections', 'log.jsonl');

const REVIEW_EVERY = 5;        // synthesize lessons every N sessions
const REFLECT_WINDOW = 20;     // reflections scanned per review
const MAX_LESSONS = 3;
const LESSON_MAX_CHARS = 200;

const AGENT_FAIL_THRESHOLD = 0.30; // >30% failure rate triggers a warning
const AGENT_MIN_SAMPLES = 3;       // need at least this many dispatches
const AGENT_RECENT_CAP = 30;

// Level thresholds by exposure count
const LEVEL_GROWING = 4;      // 4-15
const LEVEL_COMFORTABLE = 16; // 16+
function levelFor(exposures) {
  if (exposures >= LEVEL_COMFORTABLE) return 'comfortable';
  if (exposures >= LEVEL_GROWING) return 'growing';
  return 'new';
}

// ─── Topic keywords (mirrors the skill routing signals in zara.md) ────────────
// topic key -> { label, keywords[] }. Keyword matching is word-boundary based.
const TOPICS = {
  golang:                 { label: 'Go',                    keywords: ['go', 'golang', 'goroutine', 'gofmt'] },
  php:                    { label: 'PHP',                   keywords: ['php', 'laravel', 'composer'] },
  typescript:             { label: 'TypeScript',            keywords: ['typescript', 'ts', 'react', 'tsx', 'node'] },
  python:                 { label: 'Python',                keywords: ['python', 'fastapi', 'torch', 'pytorch', 'pandas'] },
  'ai-agents':            { label: 'AI agents',             keywords: ['rag', 'llm', 'agent', 'agents', 'eval', 'mcp', 'embedding', 'prompt'] },
  'system-design':        { label: 'system design',         keywords: ['architecture', 'scale', 'distributed', 'platform', 'slo', 'throughput', 'latency'] },
  'security-engineering': { label: 'security engineering',  keywords: ['security', 'auth', 'owasp', 'zero-trust', 'vulnerability', 'exploit', 'threat'] },
  'testing-strategy':     { label: 'testing',               keywords: ['test', 'tdd', 'review', 'chaos', 'mutation', 'coverage'] },
  'engineering-workflow': { label: 'workflow',              keywords: ['plan', 'brainstorm', 'execute', 'dispatch', 'orchestrate'] },
  'career-leadership':    { label: 'leadership',            keywords: ['career', 'interview', 'rfc', 'adr', 'leadership', 'mentoring'] },
  git:                    { label: 'git',                   keywords: ['git', 'branch', 'commit', 'worktree', 'rebase', 'merge'] },
  'systematic-debugging': { label: 'debugging',             keywords: ['bug', 'debug', 'hypothesis', 'stacktrace', 'repro'] },
  docker:                 { label: 'Docker',                keywords: ['docker', 'container', 'compose', 'kubernetes', 'k8s'] },
};

// Precompiled matchers: topic -> RegExp
const TOPIC_MATCHERS = Object.fromEntries(
  Object.entries(TOPICS).map(([key, { keywords }]) => {
    const escaped = keywords.map(k => k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
    return [key, new RegExp(`\\b(?:${escaped.join('|')})\\b`, 'i')];
  })
);

// ─── Helpers ───────────────────────────────────────────────────────────────

function readReflections(max = REFLECT_WINDOW) {
  try {
    const lines = fs.readFileSync(REFLECT_LOG, 'utf-8').trim().split('\n').filter(Boolean);
    const out = [];
    for (const l of lines) {
      try { out.push(JSON.parse(l)); } catch { /* skip malformed */ }
    }
    return out;
  } catch { return []; }
}

function extractTopics(text) {
  if (!text || typeof text !== 'string') return [];
  const found = [];
  for (const [key, re] of Object.entries(TOPIC_MATCHERS)) {
    if (re.test(text)) found.push(key);
  }
  return found;
}

// Synthesize top failure patterns from recent reflections into learned lessons.
function synthesizeLessons() {
  const all = readReflections(500);
  // Ignore synthetic test fixtures.
  const real = all.filter(r => r && typeof r.pattern === 'string' && !r.pattern.startsWith('__test_'));
  const recent = real.slice(-REFLECT_WINDOW * 4); // wider net; failures are sparse
  const failures = recent.filter(r => r.outcome === 'partial' || r.outcome === 'failure');
  if (!failures.length) return [];

  // Group failures by pattern, tally frequency + collect tasks.
  const byPattern = new Map();
  for (const f of failures) {
    const key = f.pattern.trim();
    if (!byPattern.has(key)) byPattern.set(key, { pattern: key, count: 0, tasks: new Set() });
    const g = byPattern.get(key);
    g.count++;
    if (f.task) g.tasks.add(String(f.task));
  }

  // A "fix" hint: if the same pattern later succeeded, use what worked; else generic.
  const successesByPattern = new Map();
  for (const r of real) {
    if (r.outcome === 'success' && (r.worked || r.approach)) {
      successesByPattern.set(r.pattern.trim(), r.worked || r.approach);
    }
  }

  const ranked = [...byPattern.values()].sort((a, b) => b.count - a.count).slice(0, MAX_LESSONS);
  const now = new Date().toISOString();
  return ranked.map(g => {
    const fixRaw = successesByPattern.get(g.pattern)
      || 'slow down, re-read the failing context, and change approach instead of retrying the same fix';
    const clamp = (s) => (s.length > LESSON_MAX_CHARS ? s.slice(0, LESSON_MAX_CHARS - 1) + '…' : s);
    return {
      pattern: clamp(g.pattern),
      fix: clamp(fixRaw),
      source: `${g.count} episode${g.count === 1 ? '' : 's'} where this happened`,
      confidence: Math.min(0.9, 0.5 + g.count * 0.1),
      createdAt: now,
      appliedCount: 0,
    };
  });
}

// Derive a coarse task type from a dispatch prompt/description.
function taskTypeOf(text) {
  const topics = extractTopics(text || '');
  if (topics.length) return topics[0];
  const first = (text || '').toLowerCase().split(/\s+/).slice(0, 3).join(' ');
  return first || 'general';
}

// Identify a dispatch (subagent) tool call and resolve the target agent name.
function resolveDispatch(toolName, args) {
  if (!toolName || typeof toolName !== 'string') return null;
  if (!/task|agent|subagent|dispatch/i.test(toolName)) return null;
  const a = args || {};
  const agent = a.subagent_type || a.subagentType || a.agent || a.agentType || a.type;
  if (!agent || typeof agent !== 'string') return null;
  const promptText = [a.prompt, a.description, a.task].filter(v => typeof v === 'string').join(' ');
  return { agent: agent.toLowerCase(), taskType: taskTypeOf(promptText) };
}

// ─── Module Export ─────────────────────────────────────────────────────────

export default function createGrowth({ client, directory } = {}) {
  // Session-scoped flags (reset on session.created).
  let _userGrowthInjected = false;
  let _sessionTopics = new Set();

  function ensureSelfState() {
    return loadJson(SELF_LESSONS_FILE, () => ({ lessons: [], sessionCount: 0, lastReview: null }));
  }

  // ── Self-growth: run a synthesis pass and persist lessons.
  function runSelfReview() {
    const state = ensureSelfState();
    const lessons = synthesizeLessons();
    if (lessons.length) {
      state.lessons = lessons;
      state.lastReview = new Date().toISOString();
      saveJson(SELF_LESSONS_FILE, state);
    }
    return state;
  }

  // ── User-growth: bump exposure for topics seen in a message.
  function trackTopics(text) {
    const topics = extractTopics(text);
    if (!topics.length) return;
    const progress = loadJson(USER_PROGRESS_FILE, () => ({ topics: {}, milestones: [] }));
    const now = new Date().toISOString();
    let changed = false;
    for (const key of topics) {
      // Count at most one exposure per topic per turn.
      const t = progress.topics[key] || { exposures: 0, lastSeen: null, level: 'new' };
      const prevLevel = t.level;
      t.exposures += 1;
      t.lastSeen = now;
      t.level = levelFor(t.exposures);
      progress.topics[key] = t;
      if (t.level !== prevLevel) {
        progress.milestones.push({ topic: key, milestone: `reached ${t.level}`, date: now });
        if (progress.milestones.length > 100) progress.milestones = progress.milestones.slice(-100);
      }
      changed = true;
      _sessionTopics.add(key);
    }
    if (changed) saveJson(USER_PROGRESS_FILE, progress);
  }

  // ── Agent-growth: record a dispatch outcome.
  function recordAgentOutcome(agent, taskType, outcome) {
    const hist = loadJson(AGENT_HISTORY_FILE, () => ({}));
    const rec = hist[agent] || { successes: 0, failures: 0, patterns: [], recent: [] };
    if (outcome === 'success') rec.successes += 1;
    else rec.failures += 1;
    rec.recent.push({ task_type: taskType, outcome, timestamp: new Date().toISOString() });
    if (rec.recent.length > AGENT_RECENT_CAP) rec.recent = rec.recent.slice(-AGENT_RECENT_CAP);
    hist[agent] = rec;
    saveJson(AGENT_HISTORY_FILE, hist);
  }

  // ── Agent-growth: compute a warning if the agent struggles with this task type.
  function agentWarning(agent, taskType) {
    const hist = loadJson(AGENT_HISTORY_FILE, () => ({}));
    const rec = hist[agent];
    if (!rec) return null;

    // Prefer task-type-specific rate; fall back to overall.
    const sameType = (rec.recent || []).filter(e => e.task_type === taskType);
    let total, fails;
    if (sameType.length >= AGENT_MIN_SAMPLES) {
      total = sameType.length;
      fails = sameType.filter(e => e.outcome !== 'success').length;
    } else {
      total = rec.successes + rec.failures;
      fails = rec.failures;
    }
    if (total < AGENT_MIN_SAMPLES) return null;
    const rate = fails / total;
    if (rate <= AGENT_FAIL_THRESHOLD) return null;

    const known = (rec.patterns && rec.patterns[0]) || `tasks like "${taskType}"`;
    return `[Agent Growth] @${agent} has a ${Math.round(rate * 100)}% failure rate on ${taskType}. Known issue: ${known}. Consider a tighter spec, a different agent, or splitting the task.`;
  }

  return {
    // ── Hooks ────────────────────────────────────────────────────────────

    onEvent(event) {
      if (event?.type !== 'session.created') return;
      // Reset per-session gates.
      _userGrowthInjected = false;
      _sessionTopics = new Set();

      // Self-growth: increment session counter, review every Nth session.
      const state = ensureSelfState();
      state.sessionCount = (state.sessionCount || 0) + 1;
      saveJson(SELF_LESSONS_FILE, state);
      if (state.sessionCount % REVIEW_EVERY === 0) {
        try { runSelfReview(); } catch { /* non-fatal */ }
      }
    },

    inject(messages) {
      const parts = [];

      // 1. Self-growth lessons (top N, token-efficient).
      try {
        const state = ensureSelfState();
        const lessons = (state.lessons || []).slice(0, MAX_LESSONS);
        if (lessons.length) {
          const lines = lessons.map(l => `- ${l.pattern} → ${l.fix}`);
          parts.push(`[Self-Growth] Learned from past mistakes:\n${lines.join('\n')}`);
          // Mark applied (best-effort; cheap write).
          let bumped = false;
          for (const l of state.lessons.slice(0, MAX_LESSONS)) { l.appliedCount = (l.appliedCount || 0) + 1; bumped = true; }
          if (bumped) saveJson(SELF_LESSONS_FILE, state);
        }
      } catch { /* non-fatal */ }

      // 2. User-growth: one line, once per session.
      if (!_userGrowthInjected) {
        try {
          const progress = loadJson(USER_PROGRESS_FILE, () => ({ topics: {} }));
          const entries = Object.entries(progress.topics || {});
          if (entries.length) {
            const comfortable = entries.filter(([, t]) => t.level === 'comfortable').map(([k]) => TOPICS[k]?.label || k);
            const growing = entries.filter(([, t]) => t.level === 'growing').map(([k]) => TOPICS[k]?.label || k);
            // Suggest next: weakest non-comfortable topic (lowest exposure), else an untouched topic.
            let suggest = null;
            const nonComfortable = entries.filter(([, t]) => t.level !== 'comfortable').sort((a, b) => a[1].exposures - b[1].exposures);
            if (nonComfortable.length) suggest = TOPICS[nonComfortable[0][0]]?.label || nonComfortable[0][0];
            else {
              const untouched = Object.keys(TOPICS).find(k => !progress.topics[k]);
              if (untouched) suggest = TOPICS[untouched].label;
            }
            const seg = [];
            if (comfortable.length) seg.push(`comfortable: ${comfortable.slice(0, 5).join(', ')}`);
            if (growing.length) seg.push(`growing: ${growing.slice(0, 5).join(', ')}`);
            if (suggest) seg.push(`suggest next: ${suggest}`);
            if (seg.length) parts.push(`[User Growth] ${seg.join(' | ')}`);
          }
          _userGrowthInjected = true;
        } catch { _userGrowthInjected = true; }
      }

      if (parts.length) {
        const text = parts.join('\n\n');
        const last = messages[messages.length - 1];
        if (last && last.role === 'system') last.content += '\n\n' + text;
        else messages.push({ role: 'system', content: text });
      }
      return messages;
    },

    // Assistant responses can also mention topics (Zara teaching about X).
    onResponse(msg) {
      if (!msg) return;
      const text = typeof msg.content === 'string' ? msg.content : '';
      if (text) { try { trackTopics(text); } catch { /* non-fatal */ } }
    },

    // User messages are the primary topic-exposure signal.
    onMessage(msg) {
      if (!msg || msg.role !== 'user') return;
      const text = typeof msg.content === 'string' ? msg.content : '';
      if (text) { try { trackTopics(text); } catch { /* non-fatal */ } }
    },

    // Agent-growth: warn before dispatching to a struggling agent.
    // Mechanism: prepend a warning to the dispatched prompt (no system inject —
    // too noisy). Fires only on subagent/task tool calls.
    beforeTool(input, output) {
      try {
        const toolName = input?.tool;
        const args = (output && output.args) || {};
        const dispatch = resolveDispatch(toolName, args);
        if (!dispatch) return;
        const warning = agentWarning(dispatch.agent, dispatch.taskType);
        if (warning && output && output.args && typeof output.args.prompt === 'string') {
          output.args.prompt = `${warning}\n\n${output.args.prompt}`;
        }
      } catch { /* non-fatal */ }
    },

    // Agent-growth: record the dispatch outcome after it completes.
    afterTool(input, output) {
      try {
        const toolName = input?.tool;
        const args = input?.args || (output && output.args) || {};
        const dispatch = resolveDispatch(toolName, args);
        if (!dispatch) return;

        // Determine outcome. Respect the project's EXIT protocol when present in
        // the returned text, else fall back to the error flag.
        let outcome = (output?.isError || output?.error) ? 'failure' : 'success';
        const resultText = typeof output?.output === 'string' ? output.output : '';
        if (/EXIT:\s*(BLOCKED|ESCALATED|BUDGET_EXHAUSTED)/i.test(resultText)) outcome = 'failure';
        else if (/EXIT:\s*COMPLETED/i.test(resultText)) outcome = 'success';

        recordAgentOutcome(dispatch.agent, dispatch.taskType, outcome);
      } catch { /* non-fatal */ }
    },

    // Preserve growth state across compaction (surface a one-line snapshot).
    onCompact() {
      try {
        const self = ensureSelfState();
        const progress = loadJson(USER_PROGRESS_FILE, () => ({ topics: {} }));
        const comfortable = Object.entries(progress.topics || {})
          .filter(([, t]) => t.level === 'comfortable')
          .map(([k]) => TOPICS[k]?.label || k);
        const bits = [`sessions: ${self.sessionCount || 0}`, `lessons: ${(self.lessons || []).length}`];
        if (comfortable.length) bits.push(`user comfortable: ${comfortable.slice(0, 4).join(', ')}`);
        return { context: `[Growth] ${bits.join(' | ')}` };
      } catch { return null; }
    },

    dispose() {},

    // ── Tools ────────────────────────────────────────────────────────────

    tools: {
      growth_status: tool({
        description: 'Show all growth metrics: Zara self-lessons, agent dispatch reliability, and the user skill map.',
        args: {},
        async execute() {
          ensure(GROWTH_DIR);
          const self = loadJson(SELF_LESSONS_FILE, () => ({ lessons: [], sessionCount: 0, lastReview: null }));
          const agents = loadJson(AGENT_HISTORY_FILE, () => ({}));
          const progress = loadJson(USER_PROGRESS_FILE, () => ({ topics: {}, milestones: [] }));

          const out = [];

          // Self-growth
          out.push(`## Zara Self-Growth`);
          out.push(`Sessions: ${self.sessionCount || 0} | Next review in ${REVIEW_EVERY - ((self.sessionCount || 0) % REVIEW_EVERY)} session(s) | Last review: ${self.lastReview || 'never'}`);
          if ((self.lessons || []).length) {
            for (const l of self.lessons) {
              out.push(`- (${Math.round((l.confidence || 0) * 100)}%, applied ${l.appliedCount || 0}x) ${l.pattern} → ${l.fix}`);
            }
          } else {
            out.push('- No lessons synthesized yet (needs failure/partial reflections).');
          }

          // Agent-growth
          out.push(`\n## Agent Growth`);
          const agentKeys = Object.keys(agents);
          if (agentKeys.length) {
            for (const name of agentKeys) {
              const r = agents[name];
              const total = r.successes + r.failures;
              const rate = total ? Math.round((r.failures / total) * 100) : 0;
              out.push(`- @${name}: ${r.successes}✓ / ${r.failures}✗ (${rate}% fail)${r.patterns?.length ? ` — ${r.patterns[0]}` : ''}`);
            }
          } else {
            out.push('- No dispatch history yet.');
          }

          // User-growth
          out.push(`\n## User Growth`);
          const entries = Object.entries(progress.topics || {}).sort((a, b) => b[1].exposures - a[1].exposures);
          if (entries.length) {
            for (const [k, t] of entries) {
              out.push(`- ${TOPICS[k]?.label || k}: ${t.exposures} exposures → ${t.level}`);
            }
            const recentMilestones = (progress.milestones || []).slice(-3);
            if (recentMilestones.length) {
              out.push(`\nRecent milestones:`);
              for (const m of recentMilestones) out.push(`- ${TOPICS[m.topic]?.label || m.topic}: ${m.milestone} (${m.date?.split('T')[0]})`);
            }
          } else {
            out.push('- No topic exposure tracked yet.');
          }

          return { output: out.join('\n') };
        },
      }),

      growth_teach: tool({
        description: 'Proactively suggest the next thing the user should learn, based on their skill map and exposure gaps.',
        args: {
          topic: z.string().optional().describe('Optional: focus the suggestion around a specific area/keyword'),
        },
        async execute(args) {
          const progress = loadJson(USER_PROGRESS_FILE, () => ({ topics: {} }));
          const topics = progress.topics || {};

          // If a focus topic is given, report its status + a concrete next step.
          if (args.topic) {
            const focus = extractTopics(args.topic)[0];
            if (focus) {
              const t = topics[focus] || { exposures: 0, level: 'new' };
              const nextGoal = t.level === 'comfortable'
                ? 'You are comfortable here — consider teaching it or tackling an advanced edge case.'
                : t.level === 'growing'
                  ? `Keep going — ${LEVEL_COMFORTABLE - t.exposures} more focused sessions to reach "comfortable".`
                  : 'Early days — take on a small hands-on task to build a foundation.';
              return { output: `${TOPICS[focus].label}: ${t.exposures} exposures (${t.level}).\n${nextGoal}` };
            }
          }

          const entries = Object.entries(topics);
          // Candidate = a topic with some exposure but not yet comfortable (growth edge),
          // preferring the one closest to leveling up.
          const growing = entries
            .filter(([, t]) => t.level === 'growing')
            .sort((a, b) => b[1].exposures - a[1].exposures);
          if (growing.length) {
            const [k, t] = growing[0];
            return { output: `Suggest next: **${TOPICS[k]?.label || k}**. You're growing here (${t.exposures} exposures) — ${LEVEL_COMFORTABLE - t.exposures} more focused sessions to reach "comfortable". Want to go deeper on it?` };
          }

          // Otherwise suggest an untouched high-value area.
          const untouched = Object.keys(TOPICS).find(k => !topics[k]);
          if (untouched) {
            return { output: `Suggest next: **${TOPICS[untouched].label}** — a new frontier you haven't explored yet. Want an intro?` };
          }

          return { output: 'No obvious gap — you have broad exposure across tracked topics. Pick an advanced project to deepen mastery.' };
        },
      }),
    },
  };
}
