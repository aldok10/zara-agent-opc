// Evolve module — Micro-tools, Swarm, Compaction, Scratchpad
// Ported from: zara-evolve, zara-swarm, zara-compaction, zara-scratchpad

import fs from 'fs';
import path from 'path';
import os from 'os';
import { tool } from '@opencode-ai/plugin';
import { FileStore, HOME, estimateTokens } from '../infra/store.mjs';

const z = tool.schema;

// ─── Constants ──────────────────────────────────────────────────────────────

const EVOLVE_DIR = path.join(HOME, 'evolve');
const MICRO_TOOLS_FILE = path.join(EVOLVE_DIR, 'micro-tools.json');
const PROMPT_SCORES_FILE = path.join(EVOLVE_DIR, 'prompt-scores.json');
const RULES_FILE = path.join(EVOLVE_DIR, 'workflow-rules.json');
const AUTO_CRYSTAL_LOG = path.join(EVOLVE_DIR, 'auto-crystallized.json');
const AB_TESTS_FILE = path.join(EVOLVE_DIR, 'ab-tests.json');

const COMPACT_DIR = path.join(HOME, 'compaction');

const BUDGET_RATIOS = { system: 0.20, memory: 0.10, conversation: 0.40, tools: 0.20, buffer: 0.10 };
const CONTEXT_WINDOW = 200000;
const PRESSURE_WARN = 0.70;
const PRESSURE_COMPACT = 0.85;

const SCRATCH_DIR = path.join(HOME, 'scratch');

const SWARM_DIR = path.join(HOME, 'swarm');
const EPICS_FILE = path.join(SWARM_DIR, 'epics.json');
const TASKS_FILE = path.join(SWARM_DIR, 'tasks.json');
const MAIL_FILE = path.join(SWARM_DIR, 'mail.json');
const RESERVATIONS_FILE = path.join(SWARM_DIR, 'reservations.json');
const OUTCOMES_FILE = path.join(SWARM_DIR, 'outcomes.jsonl');
const MAX_REVIEW = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensure(dir) { fs.mkdirSync(dir, { recursive: true }); }

function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch { return typeof fallback === 'function' ? fallback() : (Array.isArray(fallback) ? [...fallback] : { ...fallback }); }
}

function saveJson(file, data) {
  ensure(path.dirname(file));
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, file);
  }
}

function uid(prefix = 'sw') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Swarm Cached Loaders ───────────────────────────────────────────────────

let _epicsCache = null, _epicsMtime = 0;
let _tasksCache = null, _tasksMtime = 0;

function loadEpics() {
  try {
    const stat = fs.statSync(EPICS_FILE);
    if (_epicsCache && stat.mtimeMs === _epicsMtime) return _epicsCache;
    _epicsCache = JSON.parse(fs.readFileSync(EPICS_FILE, 'utf-8'));
    _epicsMtime = stat.mtimeMs;
    return _epicsCache;
  } catch { return []; }
}

function loadTasks() {
  try {
    const stat = fs.statSync(TASKS_FILE);
    if (_tasksCache && stat.mtimeMs === _tasksMtime) return _tasksCache;
    _tasksCache = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
    _tasksMtime = stat.mtimeMs;
    return _tasksCache;
  } catch { return []; }
}

function saveEpics(data) {
  saveJson(EPICS_FILE, data);
  _epicsCache = data;
  try { _epicsMtime = fs.statSync(EPICS_FILE).mtimeMs; } catch {}
}

function saveTasks(data) {
  saveJson(TASKS_FILE, data);
  _tasksCache = data;
  try { _tasksMtime = fs.statSync(TASKS_FILE).mtimeMs; } catch {}
}

// ─── Scratchpad Cache ───────────────────────────────────────────────────────

let _scratchCache = null;
let _scratchMtime = 0;
let _scratchFilePath = null;

function scratchFile(directory) {
  const hash = Buffer.from(directory || process.cwd()).toString('base64url').slice(0, 16);
  return path.join(SCRATCH_DIR, `${hash}.json`);
}

function loadScratch(file) {
  try {
    if (file === _scratchFilePath) {
      const stat = fs.statSync(file);
      if (_scratchCache && stat.mtimeMs === _scratchMtime) return _scratchCache;
    }
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (file === _scratchFilePath) { _scratchCache = data; try { _scratchMtime = fs.statSync(file).mtimeMs; } catch {} }
    return data;
  } catch { return { notes: [], plan: null }; }
}

function saveScratch(file, data) {
  ensure(SCRATCH_DIR);
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  if (file === _scratchFilePath) { _scratchCache = data; try { _scratchMtime = fs.statSync(file).mtimeMs; } catch {} }
}

// ─── Auto-Crystallize ──────────────────────────────────────────────────────

function autoCrystallize() {
  const reflectFile = path.join(HOME, 'reflections', 'patterns.json');
  const patterns = loadJson(reflectFile, []);
  const microTools = loadJson(MICRO_TOOLS_FILE, []);
  const log = loadJson(AUTO_CRYSTAL_LOG, []);

  let created = 0;
  for (const p of patterns) {
    if (p.occurrences >= 3 && !microTools.find(t => t.name === p.name) && !log.includes(p.name)) {
      microTools.push({
        name: p.name,
        trigger: p.context || p.name,
        steps: [p.approach],
        tools: [],
        notes: `Auto-crystallized from ${p.occurrences} reflections`,
        uses: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        autoGenerated: true,
      });
      log.push(p.name);
      created++;
    }
  }

  if (created > 0) {
    saveJson(MICRO_TOOLS_FILE, microTools);
    saveJson(AUTO_CRYSTAL_LOG, log);
  }
  return created;
}

// ─── Module Export ──────────────────────────────────────────────────────────

export default function createEvolve({ client, directory } = {}) {
  let _crystallized = false;
  function ensureCrystallized() {
    if (_crystallized) return;
    _crystallized = true;
    try { autoCrystallize(); } catch {}
  }

  const contextPressure = { estimatedTokens: 0, pressure: 0, lastCheck: null };

  const scratchFilepath = scratchFile(directory || process.cwd());
  _scratchFilePath = scratchFilepath;

  // Mtime-based transform cache
  let _transformCache = { text: null, mtimes: {} };

  return {
    // ── Hooks ──────────────────────────────────────────────────────────────

    inject(messages) {
      // 1. Evolve: micro-tools + rules + prompt adaptations + A/B tests
      const hasAny = [MICRO_TOOLS_FILE, RULES_FILE, PROMPT_SCORES_FILE, AB_TESTS_FILE].some(f => {
        try { fs.accessSync(f); return true; } catch { return false; }
      });

      if (hasAny) {
        try { ensureCrystallized(); } catch {}

        let stale = !_transformCache.text;
        for (const f of [MICRO_TOOLS_FILE, RULES_FILE, PROMPT_SCORES_FILE, AB_TESTS_FILE]) {
          try {
            const mt = fs.statSync(f).mtimeMs;
            if (_transformCache.mtimes[f] !== mt) { stale = true; _transformCache.mtimes[f] = mt; }
          } catch {
            if (_transformCache.mtimes[f]) { stale = true; delete _transformCache.mtimes[f]; }
          }
        }

        if (!stale && _transformCache.text) {
          const last = messages[messages.length - 1];
          if (last && last.role === 'system') {
            last.content += '\n\n' + _transformCache.text;
          } else {
            messages.push({ role: 'system', content: _transformCache.text });
          }
        } else if (stale) {
          const microTools = loadJson(MICRO_TOOLS_FILE, []);
          const rules = loadJson(RULES_FILE, []);
          const promptScores = loadJson(PROMPT_SCORES_FILE, {});
          const parts = [];

          if (microTools.length > 0) {
            const top = [...microTools]
              .sort((a, b) => b.uses - a.uses)
              .slice(0, 5)
              .map(t => `- **${t.name}**: ${t.trigger}${t.autoGenerated ? ' (auto)' : ''}`);
            parts.push(`## Your Micro-Tools\n${top.join('\n')}\nUse \`evolve_lookup\` for steps. Use \`evolve_check_rules\` at task start.`);
          }

          if (rules.length > 0) {
            const highRules = rules.filter(r => r.priority === 'high');
            if (highRules.length) {
              parts.push(`## Active Rules (high priority)\n${highRules.map(r => `- WHEN "${r.when}" → ${r.then}`).join('\n')}`);
            }
          }

          const adaptations = [];
          for (const [instruction, scores] of Object.entries(promptScores)) {
            const total = scores.helpful + scores.neutral + scores.harmful;
            if (total < 3) continue;
            const helpRate = scores.helpful / total;
            const harmRate = scores.harmful / total;
            if (harmRate > 0.5) adaptations.push(`- SUPPRESS: "${instruction}" (${Math.round(harmRate * 100)}% harmful)`);
            else if (helpRate > 0.7) adaptations.push(`- AMPLIFY: "${instruction}" (${Math.round(helpRate * 100)}% helpful)`);
          }
          if (adaptations.length) parts.push(`## Prompt Adaptations (learned)\n${adaptations.join('\n')}`);

          const abTests = loadJson(AB_TESTS_FILE, []);
          const activeTests = abTests.filter(t => t.active);
          if (activeTests.length) {
            const abLines = activeTests.map(t => {
              const variant = t.a.trials <= t.b.trials ? 'a' : 'b';
              return `[${t.name}:${variant.toUpperCase()}] ${t[variant].text}`;
            });
            parts.push(`## A/B Active\n${abLines.join('\n')}`);
          }

          _transformCache.text = parts.length ? parts.join('\n\n') : null;
          if (_transformCache.text) {
            const last = messages[messages.length - 1];
            if (last && last.role === 'system') {
              last.content += '\n\n' + _transformCache.text;
            } else {
              messages.push({ role: 'system', content: _transformCache.text });
            }
          }
        }
      }

      // 2. Compaction: token pressure estimation
      const totalTokens = messages.reduce((sum, m) => {
        const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '');
        return sum + estimateTokens(text);
      }, 0);
      contextPressure.estimatedTokens = totalTokens;
      contextPressure.pressure = totalTokens / CONTEXT_WINDOW;
      contextPressure.lastCheck = new Date().toISOString();

      if (contextPressure.pressure > PRESSURE_COMPACT) {
        const cutoff = messages.length - 10;
        for (let i = 0; i < cutoff; i++) {
          const msg = messages[i];
          if (msg?.role === 'tool' && typeof msg.content === 'string' && msg.content.length > 300) {
            msg.content = msg.content.slice(0, 150) + '\n...[auto-truncated: pressure ' + Math.round(contextPressure.pressure * 100) + '%]';
          }
        }
        const compactNudge = '## \u26a0\ufe0f Context pressure CRITICAL (' + Math.round(contextPressure.pressure * 100) + '%). Call `zara_compact` NOW to preserve state.';
        const last2 = messages[messages.length - 1];
        if (last2 && last2.role === 'system') { last2.content += '\n\n' + compactNudge; }
        else { messages.push({ role: 'system', content: compactNudge }); }
      } else if (contextPressure.pressure > PRESSURE_WARN) {
        const warnNudge = '## \u26a0\ufe0f Context growing large (' + Math.round(contextPressure.pressure * 100) + '%). Consider calling `zara_compact` soon.';
        const last2 = messages[messages.length - 1];
        if (last2 && last2.role === 'system') { last2.content += '\n\n' + warnNudge; }
        else { messages.push({ role: 'system', content: warnNudge }); }
      }

      // 3. Scratchpad: inject state (skip if stale >4h)
      const data = loadScratch(scratchFilepath);
      if (data.plan || data.notes.length) {
        const age = data.updatedAt ? (Date.now() - new Date(data.updatedAt).getTime()) / 3600000 : 999;
        if (age <= 4) {
          const sParts = ['## Scratchpad'];
          if (data.plan) sParts.push(`Plan: ${data.plan.content.slice(0, 200)}`);
          if (data.notes.length) {
            const last3 = data.notes.slice(-3);
            sParts.push(`Notes: ${last3.map(n => `[${n.tag}] ${n.content}`).join(' | ')}`);
          }
          const last = messages[messages.length - 1];
          if (last && last.role === 'system') {
            last.content += '\n\n' + sParts.join('\n');
          } else {
            messages.push({ role: 'system', content: sParts.join('\n') });
          }
        }
      }

      return messages;
    },

    transformMessages(messages) {
      if (!messages || messages.length < 20) return messages;

      const cutoff = messages.length - 10;
      for (let i = 0; i < cutoff; i++) {
        const msg = messages[i];
        if (!msg?.info?.parts) continue;
        for (const part of msg.info.parts) {
          if (part.type === 'tool-invocation' && part.result && part.result.length > 500) {
            part.result = part.result.slice(0, 200) + '\n...[truncated — call tool again if needed]';
          }
        }
      }
      return messages;
    },

    onCompact() {
      // Provide compaction snapshot
      ensure(COMPACT_DIR);
      const files = fs.readdirSync(COMPACT_DIR)
        .filter(f => f.startsWith('compact-') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length) {
        const latest = JSON.parse(fs.readFileSync(path.join(COMPACT_DIR, files[0]), 'utf-8'));
        // Return data for the composition root to use
        return { context: `Last compaction state: ${JSON.stringify(latest)}` };
      }
      return null;
    },

    dispose() {},

    // ── Tools ──────────────────────────────────────────────────────────────

    tools: {
      // ── Evolve Tools ────────────────────────────────────────────────────

      evolve_crystallize: tool({
        description: 'Crystallize a repeated pattern into a named micro-tool. When you notice you do the same sequence 3+ times, save it here so you can reference it instantly next time.',
        args: {
          name: z.string().describe('Micro-tool name (e.g. "go-test-debug", "pr-review-checklist")'),
          trigger: z.string().describe('When to use this (situation description)'),
          steps: z.array(z.string()).describe('Exact steps to follow'),
          tools: z.array(z.string()).optional().describe('Which tools to call in sequence'),
          notes: z.string().optional().describe('Additional context or caveats'),
        },
        async execute(args) {
          const microTools = loadJson(MICRO_TOOLS_FILE, []);
          const existing = microTools.findIndex(t => t.name === args.name);
          const entry = {
            name: args.name,
            trigger: args.trigger,
            steps: args.steps,
            tools: args.tools || [],
            notes: args.notes || '',
            uses: existing >= 0 ? (microTools[existing].uses || 0) + 1 : 0,
            createdAt: existing >= 0 ? microTools[existing].createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          if (existing >= 0) microTools[existing] = entry;
          else microTools.push(entry);

          saveJson(MICRO_TOOLS_FILE, microTools);
          return { output: `Micro-tool crystallized: "${args.name}" (${args.steps.length} steps). Will be suggested when trigger matches.` };
        },
      }),

      evolve_lookup: tool({
        description: 'Look up micro-tools for a situation. Call this at task start to check if you have a pre-built approach.',
        args: {
          situation: z.string().describe('Describe what you are about to do'),
        },
        async execute(args) {
          const microTools = loadJson(MICRO_TOOLS_FILE, []);
          if (!microTools.length) return { output: 'No micro-tools yet. Build them via evolve_crystallize after completing repeated tasks.' };

          const terms = args.situation.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
          const matched = microTools.filter(t => {
            const text = `${t.name} ${t.trigger} ${t.steps.join(' ')}`.toLowerCase();
            return terms.filter(term => text.includes(term)).length >= 2;
          });

          if (!matched.length) return { output: 'No matching micro-tools. Proceed manually and crystallize if it becomes a pattern.' };

          const lines = matched.map(t => [
            `### ${t.name} (used ${t.uses}x)`,
            `**When**: ${t.trigger}`,
            `**Steps**: ${t.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
            t.tools.length ? `**Tools**: ${t.tools.join(', ')}` : '',
            t.notes ? `**Notes**: ${t.notes}` : '',
          ].filter(Boolean).join('\n'));

          return { output: lines.join('\n\n') };
        },
      }),

      evolve_use: tool({
        description: 'Mark a micro-tool as used (tracks usage for ranking).',
        args: {
          name: z.string().describe('Micro-tool name that was used'),
        },
        async execute(args) {
          const microTools = loadJson(MICRO_TOOLS_FILE, []);
          const t = microTools.find(x => x.name === args.name);
          if (!t) return { output: `Micro-tool "${args.name}" not found.` };
          t.uses++;
          t.lastUsed = new Date().toISOString();
          saveJson(MICRO_TOOLS_FILE, microTools);
          return { output: `${args.name} used (${t.uses} total)` };
        },
      }),

      evolve_score_prompt: tool({
        description: 'Score how well a prompt instruction performed. Tracks over time to identify what helps vs hurts.',
        args: {
          instruction: z.string().describe('Which instruction or prompt section'),
          score: z.enum(['helpful', 'neutral', 'harmful']).describe('Did it help, do nothing, or hurt?'),
          reason: z.string().optional().describe('Why this score'),
        },
        async execute(args) {
          const scores = loadJson(PROMPT_SCORES_FILE, {});
          if (!scores[args.instruction]) {
            scores[args.instruction] = { helpful: 0, neutral: 0, harmful: 0, notes: [] };
          }
          scores[args.instruction][args.score]++;
          if (args.reason) scores[args.instruction].notes.push(args.reason);
          scores[args.instruction].notes = scores[args.instruction].notes.slice(-5);
          saveJson(PROMPT_SCORES_FILE, scores);

          const s = scores[args.instruction];
          const total = s.helpful + s.neutral + s.harmful;
          const effectiveness = total > 0 ? Math.round((s.helpful / total) * 100) : 0;

          return {
            output: `Prompt scored: "${args.instruction}" → ${args.score} (effectiveness: ${effectiveness}%, ${total} ratings)${effectiveness < 30 && total >= 3 ? '\n⚠️ Consider removing this instruction.' : ''}`,
          };
        },
      }),

      evolve_diagnose: tool({
        description: 'Self-diagnose agent health. Checks metrics, patterns, memory, and identifies areas of degradation.',
        args: {},
        async execute() {
          const parts = [];

          // Check metrics
          const metricsDir = path.join(HOME, 'metrics');
          try {
            if (fs.existsSync(metricsDir)) {
              const files = fs.readdirSync(metricsDir).filter(f => f.endsWith('.json')).sort().reverse().slice(0, 7);
              let totalCalls = 0, totalErrors = 0;
              for (const f of files) {
                const d = JSON.parse(fs.readFileSync(path.join(metricsDir, f), 'utf-8'));
                totalCalls += d.toolCalls?.total || 0;
                totalErrors += d.toolCalls?.error || 0;
              }
              const errorRate = totalCalls > 0 ? Math.round((totalErrors / totalCalls) * 100) : 0;
              parts.push(`**Tool health**: ${errorRate}% error rate (${totalCalls} calls, 7d)`);
              if (errorRate > 10) parts.push('  ⚠️ Error rate above 10% — investigate failing tools');
            }
          } catch {}

          // Check prompt scores
          const scores = loadJson(PROMPT_SCORES_FILE, {});
          const harmful = Object.entries(scores).filter(([, s]) => {
            const total = s.helpful + s.neutral + s.harmful;
            return total >= 3 && (s.harmful / total) > 0.5;
          });
          if (harmful.length) {
            parts.push(`**Prompt issues**: ${harmful.length} instructions scored harmful >50%`);
            harmful.forEach(([k]) => parts.push(`  - "${k}" — consider removing`));
          }

          // Check micro-tools
          const microTools = loadJson(MICRO_TOOLS_FILE, []);
          const unused = microTools.filter(t => t.uses === 0);
          if (unused.length) parts.push(`**Unused micro-tools**: ${unused.length} (crystallized but never applied)`);

          // Check memory
          const memDir = path.join(HOME, 'memory');
          const semantic = loadJson(path.join(memDir, 'semantic.json'), {});
          const lowConf = Object.entries(semantic).filter(([, v]) => v.confidence < 0.3).length;
          if (lowConf > 5) parts.push(`**Memory decay**: ${lowConf} semantic entries below 0.3 confidence`);

          if (!parts.length) parts.push('**All systems healthy.** No issues detected.');

          return { output: `## Self-Diagnosis\n\n${parts.join('\n')}` };
        },
      }),

      evolve_rule: tool({
        description: 'Create a workflow rule: "when X happens, do Y". Rules are checked at the start of every task and suggested when they match.',
        args: {
          when: z.string().describe('Trigger condition (natural language, e.g. "user asks about Go performance")'),
          then: z.string().describe('Action to take (e.g. "load golang-expert skill, check benchmarks first")'),
          priority: z.enum(['high', 'medium', 'low']).optional().describe('Rule priority (default medium)'),
        },
        async execute(args) {
          const rules = loadJson(RULES_FILE, []);
          rules.push({
            when: args.when,
            then: args.then,
            priority: args.priority || 'medium',
            createdAt: new Date().toISOString(),
            fired: 0,
          });
          saveJson(RULES_FILE, rules);
          return { output: `Rule created: WHEN "${args.when}" → THEN "${args.then}"` };
        },
      }),

      evolve_rules: tool({
        description: 'List all workflow rules.',
        args: {},
        async execute() {
          const rules = loadJson(RULES_FILE, []);
          if (!rules.length) return { output: 'No workflow rules defined yet.' };
          const lines = rules.map((r, i) =>
            `${i + 1}. [${r.priority}] WHEN "${r.when}" → THEN "${r.then}" (fired ${r.fired}x)`
          );
          return { output: lines.join('\n') };
        },
      }),

      evolve_check_rules: tool({
        description: 'Check which workflow rules match the current situation. Call at task start.',
        args: {
          situation: z.string().describe('Describe current task/context'),
        },
        async execute(args) {
          const rules = loadJson(RULES_FILE, []);
          if (!rules.length) return { output: 'No rules to check.' };

          const terms = args.situation.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
          const matched = rules.filter(r => {
            const text = r.when.toLowerCase();
            return terms.filter(t => text.includes(t)).length >= 2;
          });

          if (!matched.length) return { output: 'No rules match this situation.' };

          for (const m of matched) m.fired++;
          saveJson(RULES_FILE, rules);

          const lines = matched
            .sort((a, b) => ({ high: 3, medium: 2, low: 1 }[b.priority] || 2) - ({ high: 3, medium: 2, low: 1 }[a.priority] || 2))
            .map(r => `- [${r.priority}] **${r.then}** (because: ${r.when})`);
          return { output: `## Matching Rules\n${lines.join('\n')}` };
        },
      }),

      evolve_ab_create: tool({
        description: 'Create a prompt A/B test — two instruction variants. System randomly picks one per session and tracks which performs better.',
        args: {
          name: z.string().describe('Test name (e.g. "verbose-vs-concise-errors")'),
          variantA: z.string().describe('Variant A instruction text'),
          variantB: z.string().describe('Variant B instruction text'),
        },
        async execute(args) {
          const tests = loadJson(AB_TESTS_FILE, []);
          const existing = tests.findIndex(t => t.name === args.name);
          const test = {
            name: args.name,
            a: { text: args.variantA, wins: 0, trials: 0 },
            b: { text: args.variantB, wins: 0, trials: 0 },
            active: true,
            createdAt: new Date().toISOString(),
          };
          if (existing >= 0) tests[existing] = test;
          else tests.push(test);
          saveJson(AB_TESTS_FILE, tests);
          return { output: `A/B test "${args.name}" created. Will alternate between variants.` };
        },
      }),

      evolve_ab_result: tool({
        description: 'Record A/B test outcome — which variant won this round.',
        args: {
          name: z.string().describe('Test name'),
          winner: z.enum(['a', 'b']).describe('Which variant performed better'),
        },
        async execute(args) {
          const tests = loadJson(AB_TESTS_FILE, []);
          const test = tests.find(t => t.name === args.name);
          if (!test) return { output: `Test "${args.name}" not found.` };

          test[args.winner].wins++;
          test.a.trials++;
          test.b.trials++;

          const total = test.a.trials;
          if (total >= 10) {
            const aRate = test.a.wins / total;
            const bRate = test.b.wins / total;
            if (Math.abs(aRate - bRate) > 0.3) {
              test.active = false;
              test.winner = aRate > bRate ? 'a' : 'b';
              test.concludedAt = new Date().toISOString();
            }
          }

          saveJson(AB_TESTS_FILE, tests);
          const status = test.active ? `(A: ${test.a.wins}/${test.a.trials}, B: ${test.b.wins}/${test.b.trials})` : `CONCLUDED → ${test.winner.toUpperCase()} wins`;
          return { output: `Recorded: ${args.winner} wins. ${status}` };
        },
      }),

      evolve_ab_status: tool({
        description: 'Show all A/B test status and results.',
        args: {},
        async execute() {
          const tests = loadJson(AB_TESTS_FILE, []);
          if (!tests.length) return { output: 'No A/B tests running.' };
          const lines = tests.map(t => {
            const status = t.active ? 'ACTIVE' : `DONE → ${t.winner?.toUpperCase()}`;
            return `- **${t.name}** [${status}]: A=${t.a.wins}/${t.a.trials} vs B=${t.b.wins}/${t.b.trials}`;
          });
          return { output: lines.join('\n') };
        },
      }),

      evolve_share_tools: tool({
        description: 'Share your micro-tools with the team knowledge graph.',
        args: {
          names: z.array(z.string()).optional().describe('Specific micro-tool names to share (default: all with 2+ uses)'),
        },
        async execute(args) {
          const microTools = loadJson(MICRO_TOOLS_FILE, []);
          const teamFile = path.join(HOME, 'team', 'shared-knowledge.json');
          const shared = loadJson(teamFile, {});

          const toShare = args.names
            ? microTools.filter(t => args.names.includes(t.name))
            : microTools.filter(t => t.uses >= 2);

          if (!toShare.length) return { output: 'No micro-tools to share (need 2+ uses).' };

          for (const t of toShare) {
            shared[`micro-tool.${t.name}`] = {
              value: `${t.trigger} → ${t.steps.join('; ')}`,
              tags: ['micro-tool', ...t.tools],
              author: process.env.ZARA_USER || os.userInfo().username || 'unknown',
              updatedAt: new Date().toISOString(),
            };
          }

          saveJson(teamFile, shared);
          return { output: `Shared ${toShare.length} micro-tools with team graph.` };
        },
      }),

      // ── Swarm Tools ─────────────────────────────────────────────────────

      swarm_create_epic: tool({
        description: 'Create a swarm epic with subtasks for parallel coordination',
        args: {
          title: z.string().describe('Epic title'),
          description: z.string().optional().describe('Epic description'),
          subtasks: z.array(z.object({
            title: z.string(),
            description: z.string().optional(),
            scope: z.array(z.string()).optional().describe('File paths this worker owns'),
            acceptanceCriteria: z.array(z.string()).optional(),
            agent: z.string().optional().describe('Assigned agent (architect, testing-lead, etc)'),
          })).describe('Subtasks to create'),
        },
        async execute(args) {
          const epics = loadEpics();
          const tasks = loadTasks();

          const epic = {
            id: uid('epic'),
            title: args.title,
            description: args.description || '',
            status: 'active',
            createdAt: new Date().toISOString(),
            subtaskIds: [],
          };

          for (const st of args.subtasks) {
            const task = {
              id: uid('task'),
              epicId: epic.id,
              title: st.title,
              description: st.description || '',
              scope: st.scope || [],
              acceptanceCriteria: st.acceptanceCriteria || [],
              assignedAgent: st.agent || null,
              status: 'pending',
              reviewAttempts: 0,
              createdAt: new Date().toISOString(),
            };
            tasks.push(task);
            epic.subtaskIds.push(task.id);
          }

          epics.push(epic);
          saveEpics(epics);
          saveTasks(tasks);

          return {
            output: `Epic created: ${epic.id} — "${epic.title}" with ${args.subtasks.length} subtasks`,
            metadata: { epicId: epic.id, subtaskIds: epic.subtaskIds },
          };
        },
      }),

      swarm_status: tool({
        description: 'Get swarm progress for an epic',
        args: {
          epicId: z.string().describe('Epic ID'),
        },
        async execute(args) {
          const epics = loadEpics();
          const tasks = loadTasks();
          const epic = epics.find(e => e.id === args.epicId);
          if (!epic) return { output: `Epic not found: ${args.epicId}` };

          const epicTasks = tasks.filter(t => t.epicId === args.epicId);
          const summary = {
            epic: { id: epic.id, title: epic.title, status: epic.status },
            total: epicTasks.length,
            pending: epicTasks.filter(t => t.status === 'pending').length,
            active: epicTasks.filter(t => t.status === 'active').length,
            review: epicTasks.filter(t => t.status === 'review').length,
            done: epicTasks.filter(t => t.status === 'done').length,
            blocked: epicTasks.filter(t => t.status === 'blocked').length,
            tasks: epicTasks.map(t => ({ id: t.id, title: t.title, status: t.status, agent: t.assignedAgent })),
          };

          return { output: JSON.stringify(summary, null, 2) };
        },
      }),

      swarm_update_task: tool({
        description: 'Update a subtask status (pending, active, review, done, blocked)',
        args: {
          taskId: z.string().describe('Task ID'),
          status: z.enum(['pending', 'active', 'review', 'done', 'blocked']).describe('New status'),
          notes: z.string().optional().describe('Notes or reason'),
        },
        async execute(args) {
          const tasks = loadTasks();
          const task = tasks.find(t => t.id === args.taskId);
          if (!task) return { output: `Task not found: ${args.taskId}` };

          task.status = args.status;
          if (args.notes) task.notes = args.notes;
          if (args.status === 'done') task.completedAt = new Date().toISOString();
          if (args.status === 'review') task.reviewAttempts = (task.reviewAttempts || 0) + 1;

          saveTasks(tasks);
          return { output: `Task ${task.id} ("${task.title}") → ${args.status}` };
        },
      }),

      swarm_review_feedback: tool({
        description: 'Approve or reject a subtask after review (max 3 rounds)',
        args: {
          taskId: z.string().describe('Task ID'),
          approved: z.boolean().describe('Whether the work is approved'),
          feedback: z.string().optional().describe('Review feedback'),
        },
        async execute(args) {
          const tasks = loadTasks();
          const task = tasks.find(t => t.id === args.taskId);
          if (!task) return { output: `Task not found: ${args.taskId}` };

          if (args.approved) {
            task.status = 'done';
            task.completedAt = new Date().toISOString();
            task.feedback = args.feedback;
          } else if ((task.reviewAttempts || 0) >= MAX_REVIEW) {
            task.status = 'blocked';
            task.blockedReason = args.feedback || 'Max review attempts exceeded';
          } else {
            task.status = 'active';
            task.feedback = args.feedback;
          }

          saveTasks(tasks);
          return { output: `Task ${task.id}: ${args.approved ? 'approved ✓' : `rejected (attempt ${task.reviewAttempts}/${MAX_REVIEW})`}` };
        },
      }),

      swarm_reserve_files: tool({
        description: 'Reserve file paths for a worker (prevents conflicts)',
        args: {
          agent: z.string().describe('Agent/worker name'),
          files: z.array(z.string()).describe('File paths to reserve'),
        },
        async execute(args) {
          const res = loadJson(RESERVATIONS_FILE, {});
          const conflicts = [];

          for (const file of args.files) {
            if (res[file] && res[file] !== args.agent) {
              conflicts.push({ file, owner: res[file] });
            } else {
              res[file] = args.agent;
            }
          }

          saveJson(RESERVATIONS_FILE, res);
          if (conflicts.length) {
            return { output: `Conflicts: ${conflicts.map(c => `${c.file} (owned by ${c.owner})`).join(', ')}` };
          }
          return { output: `Reserved ${args.files.length} files for ${args.agent}` };
        },
      }),

      swarm_release_files: tool({
        description: 'Release file reservations for an agent',
        args: {
          agent: z.string().describe('Agent/worker name to release'),
        },
        async execute(args) {
          const res = loadJson(RESERVATIONS_FILE, {});
          let released = 0;
          for (const [file, owner] of Object.entries(res)) {
            if (owner === args.agent) { delete res[file]; released++; }
          }
          saveJson(RESERVATIONS_FILE, res);
          return { output: `Released ${released} files for ${args.agent}` };
        },
      }),

      swarm_send_mail: tool({
        description: 'Send a message between swarm workers',
        args: {
          from: z.string().describe('Sender'),
          to: z.string().describe('Recipient'),
          subject: z.string().describe('Subject'),
          body: z.string().describe('Message body'),
          epicId: z.string().optional().describe('Related epic ID'),
        },
        async execute(args) {
          const mail = loadJson(MAIL_FILE, []);
          const msg = {
            id: uid('msg'),
            from: args.from,
            to: args.to,
            subject: args.subject,
            body: args.body,
            epicId: args.epicId || null,
            sentAt: new Date().toISOString(),
            acked: false,
          };
          mail.push(msg);
          saveJson(MAIL_FILE, mail);
          return { output: `Mail sent: ${msg.id} (${args.from} → ${args.to}: "${args.subject}")` };
        },
      }),

      swarm_inbox: tool({
        description: 'Check inbox for a swarm agent',
        args: {
          agent: z.string().describe('Agent name to check inbox for'),
          epicId: z.string().optional().describe('Filter by epic ID'),
        },
        async execute(args) {
          const mail = loadJson(MAIL_FILE, []);
          const msgs = mail.filter(m => m.to === args.agent && !m.acked && (!args.epicId || m.epicId === args.epicId));
          if (!msgs.length) return { output: `No unread messages for ${args.agent}` };
          return { output: JSON.stringify(msgs.map(m => ({ id: m.id, from: m.from, subject: m.subject, sentAt: m.sentAt })), null, 2) };
        },
      }),

      swarm_ack_message: tool({
        description: 'Acknowledge a swarm mail message',
        args: {
          messageId: z.string().describe('Message ID to acknowledge'),
        },
        async execute(args) {
          const mail = loadJson(MAIL_FILE, []);
          const msg = mail.find(m => m.id === args.messageId);
          if (!msg) return { output: `Message not found: ${args.messageId}` };
          msg.acked = true;
          msg.ackedAt = new Date().toISOString();
          saveJson(MAIL_FILE, mail);
          return { output: `Message ${args.messageId} acknowledged` };
        },
      }),

      swarm_record_outcome: tool({
        description: 'Record swarm outcome and learnings for future reference',
        args: {
          epicId: z.string().describe('Epic ID'),
          summary: z.string().describe('What was accomplished'),
          decisions: z.array(z.string()).optional().describe('Key decisions made'),
          learnings: z.array(z.string()).optional().describe('Learnings for next time'),
        },
        async execute(args) {
          const entry = {
            epicId: args.epicId,
            summary: args.summary,
            decisions: args.decisions || [],
            learnings: args.learnings || [],
            recordedAt: new Date().toISOString(),
          };
          ensure(SWARM_DIR);
          fs.appendFileSync(OUTCOMES_FILE, JSON.stringify(entry) + '\n', 'utf-8');

          const epics = loadEpics();
          const epic = epics.find(e => e.id === args.epicId);
          if (epic) {
            epic.status = 'completed';
            epic.completedAt = new Date().toISOString();
            saveEpics(epics);
          }

          const tasks = loadTasks().filter(t => t.epicId === args.epicId);
          const res = loadJson(RESERVATIONS_FILE, {});
          for (const task of tasks) {
            if (task.assignedAgent) {
              for (const [file, owner] of Object.entries(res)) {
                if (owner === task.assignedAgent) delete res[file];
              }
            }
          }
          saveJson(RESERVATIONS_FILE, res);

          const mail = loadJson(MAIL_FILE, []).filter(m => m.epicId !== args.epicId);
          saveJson(MAIL_FILE, mail);

          return { output: `Outcome recorded for ${args.epicId}. Epic closed. Resources released.` };
        },
      }),

      swarm_get_outcomes: tool({
        description: 'Retrieve past swarm outcomes for learning. Use BEFORE creating new epics to check if similar work was done before.',
        args: {
          limit: z.number().optional().describe('Max outcomes to return (default 5)'),
          query: z.string().optional().describe('Filter outcomes by keyword'),
        },
        async execute(args) {
          const limit = args.limit || 5;
          try {
            if (!fs.existsSync(OUTCOMES_FILE)) return { output: 'No past outcomes found.' };
            const lines = fs.readFileSync(OUTCOMES_FILE, 'utf-8').trim().split('\n');
            let outcomes = lines.map(l => JSON.parse(l));

            if (args.query) {
              const terms = args.query.toLowerCase().split(/\s+/);
              outcomes = outcomes.filter(o => {
                const text = `${o.summary} ${(o.decisions || []).join(' ')} ${(o.learnings || []).join(' ')}`.toLowerCase();
                return terms.some(t => text.includes(t));
              });
            }

            outcomes = outcomes.slice(-limit).reverse();
            if (!outcomes.length) return { output: `No outcomes found${args.query ? ` for "${args.query}"` : ''}.` };
            return { output: JSON.stringify(outcomes, null, 2) };
          } catch { return { output: 'No past outcomes found.' }; }
        },
      }),

      swarm_nest_epic: tool({
        description: 'Create a child epic under a parent epic (hierarchical swarm). Use for mega-tasks that need multiple coordination layers.',
        args: {
          parentEpicId: z.string().describe('Parent epic ID'),
          title: z.string().describe('Child epic title'),
          description: z.string().optional().describe('Child epic description'),
          subtasks: z.array(z.object({
            title: z.string(),
            description: z.string().optional(),
            scope: z.array(z.string()).optional(),
            agent: z.string().optional(),
          })).describe('Subtasks for child epic'),
        },
        async execute(args) {
          const epics = loadEpics();
          const tasks = loadTasks();
          const parent = epics.find(e => e.id === args.parentEpicId);
          if (!parent) return { output: `Parent epic not found: ${args.parentEpicId}` };

          const childEpic = {
            id: uid('epic'),
            parentId: args.parentEpicId,
            title: args.title,
            description: args.description || '',
            status: 'active',
            createdAt: new Date().toISOString(),
            subtaskIds: [],
          };

          for (const st of args.subtasks) {
            const task = {
              id: uid('task'),
              epicId: childEpic.id,
              title: st.title,
              description: st.description || '',
              scope: st.scope || [],
              assignedAgent: st.agent || null,
              status: 'pending',
              reviewAttempts: 0,
              createdAt: new Date().toISOString(),
            };
            tasks.push(task);
            childEpic.subtaskIds.push(task.id);
          }

          epics.push(childEpic);
          if (!parent.childEpicIds) parent.childEpicIds = [];
          parent.childEpicIds.push(childEpic.id);

          saveEpics(epics);
          saveTasks(tasks);

          return {
            output: `Child epic created: ${childEpic.id} under ${parent.id} — "${childEpic.title}" with ${args.subtasks.length} subtasks`,
          };
        },
      }),

      swarm_active: tool({
        description: 'List all active (incomplete) epics across sessions. Use for cross-session continuity.',
        args: {},
        async execute() {
          const epics = loadEpics();
          const active = epics.filter(e => e.status === 'active');
          if (!active.length) return { output: 'No active epics. All work complete.' };

          const tasks = loadTasks();
          const lines = active.map(e => {
            const epicTasks = tasks.filter(t => t.epicId === e.id);
            const done = epicTasks.filter(t => t.status === 'done').length;
            const parent = e.parentId ? ` (child of ${e.parentId})` : '';
            return `- **${e.id}**: ${e.title}${parent} — ${done}/${epicTasks.length} done (created ${e.createdAt.split('T')[0]})`;
          });

          return { output: `## Active Epics (${active.length})\n${lines.join('\n')}` };
        },
      }),

      swarm_suggest: tool({
        description: 'Suggest decomposition for a task based on past swarm outcomes. Learns from history.',
        args: {
          task: z.string().describe('Task description to decompose'),
        },
        async execute(args) {
          try {
            if (!fs.existsSync(OUTCOMES_FILE)) return { output: 'No past outcomes to learn from. Decompose manually.' };
            const lines = fs.readFileSync(OUTCOMES_FILE, 'utf-8').trim().split('\n');
            const outcomes = lines.map(l => JSON.parse(l));

            const terms = args.task.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
            const similar = outcomes.filter(o => {
              const text = `${o.summary} ${(o.learnings || []).join(' ')}`.toLowerCase();
              return terms.filter(t => text.includes(t)).length >= 2;
            }).slice(-3);

            if (!similar.length) return { output: 'No similar past work found. Decompose from scratch.' };

            const suggestions = similar.map(o => [
              `**Past**: ${o.summary}`,
              o.learnings?.length ? `  Learnings: ${o.learnings.join('; ')}` : '',
              o.decisions?.length ? `  Decisions: ${o.decisions.join('; ')}` : '',
            ].filter(Boolean).join('\n'));

            return { output: `## Similar Past Work (${similar.length} matches)\n\n${suggestions.join('\n\n')}\n\nUse these learnings to inform your decomposition.` };
          } catch { return { output: 'Error reading outcomes.' }; }
        },
      }),

      // ── Compaction Tools ────────────────────────────────────────────────

      zara_compact: tool({
        description: 'Compact current working state into a summary when context is getting large. Call this BEFORE context window fills up. Saves decisions, progress, and key facts — discards raw tool outputs and intermediate reasoning.',
        args: {
          activeTasks: z.array(z.string()).describe('Tasks currently in progress'),
          completedTasks: z.array(z.string()).optional().describe('Tasks completed this session'),
          keyDecisions: z.array(z.string()).describe('Important decisions made (preserve these)'),
          activeFiles: z.array(z.string()).optional().describe('Files currently being worked on'),
          openQuestions: z.array(z.string()).optional().describe('Unresolved questions'),
          summary: z.string().describe('Compressed summary of work so far — what matters for continuation'),
        },
        async execute(args) {
          ensure(COMPACT_DIR);
          const snapshot = {
            id: uid('compact'),
            ts: new Date().toISOString(),
            project: directory || process.cwd(),
            ...args,
          };

          const file = path.join(COMPACT_DIR, `${snapshot.id}.json`);
          fs.writeFileSync(file, JSON.stringify(snapshot, null, 2), 'utf-8');

          const files = fs.readdirSync(COMPACT_DIR)
            .filter(f => f.startsWith('compact-') && f.endsWith('.json'))
            .sort()
            .reverse();
          for (const old of files.slice(10)) {
            try { fs.unlinkSync(path.join(COMPACT_DIR, old)); } catch {}
          }

          return {
            output: [
              `Context compacted → ${snapshot.id}`,
              `Active: ${args.activeTasks.join(', ')}`,
              `Decisions preserved: ${args.keyDecisions.length}`,
              '',
              'You can now proceed with reduced context. The summary above is your working state.',
            ].join('\n'),
          };
        },
      }),

      zara_restore_compact: tool({
        description: 'Restore the most recent compaction snapshot (use after context reset or if you lost track)',
        args: {},
        async execute() {
          ensure(COMPACT_DIR);
          const files = fs.readdirSync(COMPACT_DIR)
            .filter(f => f.startsWith('compact-') && f.endsWith('.json'))
            .sort()
            .reverse();

          if (!files.length) return { output: 'No compaction snapshots found.' };

          const latest = JSON.parse(fs.readFileSync(path.join(COMPACT_DIR, files[0]), 'utf-8'));
          return { output: JSON.stringify(latest, null, 2) };
        },
      }),

      zara_context_pressure: tool({
        description: 'Show current context window pressure level and token budget breakdown.',
        args: {},
        async execute() {
          const breakdown = {};
          for (const [key, ratio] of Object.entries(BUDGET_RATIOS)) {
            breakdown[key] = { ratio, tokens: Math.round(CONTEXT_WINDOW * ratio) };
          }
          return {
            output: JSON.stringify({
              estimatedTokens: contextPressure.estimatedTokens,
              contextWindow: CONTEXT_WINDOW,
              pressure: Math.round(contextPressure.pressure * 100) + '%',
              status: contextPressure.pressure > PRESSURE_COMPACT ? 'CRITICAL' : contextPressure.pressure > PRESSURE_WARN ? 'WARNING' : 'OK',
              lastCheck: contextPressure.lastCheck,
              budget: breakdown,
            }, null, 2),
          };
        },
      }),

      // ── Scratchpad Tools ────────────────────────────────────────────────

      scratch_note: tool({
        description: 'Write a note to your scratchpad. Use for findings, hypotheses, intermediate results — anything that should persist outside context window.',
        args: {
          content: z.string().describe('The note content'),
          tag: z.enum(['finding', 'hypothesis', 'decision', 'blocker', 'todo', 'learning']).optional().describe('Note category'),
        },
        async execute(args) {
          const data = loadScratch(scratchFilepath);
          data.notes.push({
            content: args.content,
            tag: args.tag || 'finding',
            ts: new Date().toISOString(),
          });
          if (data.notes.length > 50) data.notes = data.notes.slice(-50);
          saveScratch(scratchFilepath, data);
          return { output: `Note saved (${args.tag || 'finding'}). Total: ${data.notes.length}` };
        },
      }),

      scratch_plan: tool({
        description: 'Set or update the current working plan. This is your "what am I doing and what comes next" — read it after context resets.',
        args: {
          plan: z.string().describe('The current plan (overwrites previous)'),
        },
        async execute(args) {
          const data = loadScratch(scratchFilepath);
          data.plan = { content: args.plan, ts: new Date().toISOString() };
          saveScratch(scratchFilepath, data);
          return { output: 'Plan updated.' };
        },
      }),

      scratch_read: tool({
        description: 'Read your scratchpad — plan and recent notes. Use after context compaction or at session start.',
        args: {
          limit: z.number().optional().describe('Max notes to return (default 10)'),
        },
        async execute(args) {
          const data = loadScratch(scratchFilepath);
          const limit = args.limit || 10;
          const parts = [];

          if (data.plan) {
            parts.push(`## Plan\n${data.plan.content}\n(set: ${data.plan.ts})`);
          }

          const recent = data.notes.slice(-limit);
          if (recent.length) {
            parts.push(`## Notes (${recent.length}/${data.notes.length})`);
            for (const n of recent) {
              parts.push(`- [${n.tag}] ${n.content}`);
            }
          }

          return { output: parts.length ? parts.join('\n\n') : 'Scratchpad is empty.' };
        },
      }),

      scratch_clear: tool({
        description: 'Clear the scratchpad (use when task is fully complete)',
        args: {},
        async execute() {
          saveScratch(scratchFilepath, { notes: [], plan: null });
          return { output: 'Scratchpad cleared.' };
        },
      }),
    },
  };
}
