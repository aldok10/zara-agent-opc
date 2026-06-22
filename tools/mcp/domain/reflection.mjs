import fs from 'fs';
import path from 'path';
import { HOME, ensure, loadJson, saveJson } from '../infra.mjs';
import { adjustTrust, detectContradictions } from '../../memory-db.mjs';

const REFLECT_DIR = path.join(HOME, 'reflections');

// Track keys recalled this session for trust calibration
const recalledKeys = new Set();

class ReflectionTools {
  get tools() {
    return {
      reflect: {
        description: 'Record a reflection (what worked, what failed, pattern extracted). Pass outcome to feed the success-weighted learning loop.',
        inputSchema: { type: 'object', properties: { task: { type: 'string', description: 'What was the task' }, worked: { type: 'string' }, failed: { type: 'string' }, pattern: { type: 'string' }, outcome: { type: 'string', enum: ['success', 'partial', 'failure'], description: 'How it went — trains pattern scores over time' } }, required: ['task'] },
        handler: (args) => this.#handleReflect(args),
      },
      patterns: {
        description: 'List learned patterns from reflection, ranked by success-weighted score.',
        inputSchema: { type: 'object', properties: {} },
        handler: () => this.#handlePatterns(),
      },
      reflect_suggest: {
        description: 'Before starting a task, recall the historically best-scoring approach for a similar situation. Returns patterns ranked by success rate x frequency.',
        inputSchema: { type: 'object', properties: { situation: { type: 'string', description: 'What you are about to do' } }, required: ['situation'] },
        handler: (args) => this.#handleSuggest(args),
      },
      zara_evolve_status: {
        description: 'Snapshot of Zara learning state — top patterns, active rules, micro-tools, contradictions, blindspots.',
        inputSchema: { type: 'object', properties: {} },
        handler: () => this.#handleEvolveStatus(),
      },
      blindspot_log: {
        description: 'Record a blindspot detected in user behavior (for gentle future reminders)',
        inputSchema: { type: 'object', properties: { area: { type: 'string' }, observation: { type: 'string' }, suggestion: { type: 'string' } }, required: ['area', 'observation'] },
        handler: (args) => this.#handleBlindspotLog(args),
      },
      blindspot_check: {
        description: 'Check if current situation matches any known blindspots',
        inputSchema: { type: 'object', properties: { context: { type: 'string' } }, required: ['context'] },
        handler: (args) => this.#handleBlindspotCheck(args),
      },
    };
  }

  #handleReflect(args) {
    ensure(REFLECT_DIR);
    const logFile = path.join(REFLECT_DIR, 'log.jsonl');
    fs.appendFileSync(logFile, JSON.stringify({ ...args, ts: new Date().toISOString() }) + '\n');
    // Rotate: keep last 500 entries
    try {
      const lines = fs.readFileSync(logFile, 'utf-8').trim().split('\n');
      if (lines.length > 500) fs.writeFileSync(logFile, lines.slice(-500).join('\n') + '\n');
    } catch {}

    // Trust calibration: adjust trust scores of memories recalled this session
    let trustResult = null;
    if (args.outcome && recalledKeys.size > 0) {
      trustResult = adjustTrust([...recalledKeys], args.outcome);
      recalledKeys.clear();
    }

    if (args.pattern) {
      const pFile = path.join(REFLECT_DIR, 'patterns.json');
      const patterns = loadJson(pFile, []);
      const existing = patterns.find(p => p.name === args.pattern);
      // Outcome → reward signal. success=1, partial=0.5, failure=0. Unspecified treated as success (legacy).
      const reward = args.outcome === 'failure' ? 0 : args.outcome === 'partial' ? 0.5 : 1;
      if (existing) {
        existing.occurrences++;
        // Running sum of rewards → success rate is the average reward per occurrence.
        existing.rewardSum = (existing.rewardSum ?? (existing.occurrences - 1)) + reward;
        existing.successRate = existing.rewardSum / existing.occurrences;
        existing.lastSeen = new Date().toISOString().split('T')[0];
        if (args.worked) existing.approach = args.worked;
      } else {
        patterns.push({
          name: args.pattern,
          approach: args.worked || args.task,
          occurrences: 1,
          rewardSum: reward,
          successRate: reward,
          created: new Date().toISOString().split('T')[0],
          lastSeen: new Date().toISOString().split('T')[0],
        });
      }
      saveJson(pFile, patterns);
    }
    return `Reflected on: ${args.task}${args.pattern ? ` → pattern: ${args.pattern}${args.outcome ? ` [${args.outcome}]` : ''}` : ''}`;
  }

  // Wilson-ish ranking: successRate weighted by log frequency so a proven pattern
  // outranks a one-off lucky hit. Pure arithmetic, no ML dependency.
  #score(p) {
    const rate = p.successRate ?? 1;
    const freqWeight = Math.log2((p.occurrences || 1) + 1);
    return rate * freqWeight;
  }

  #handleSuggest(args) {
    const patterns = loadJson(path.join(REFLECT_DIR, 'patterns.json'), []);
    if (!patterns.length) return 'No learned patterns yet. Proceed and reflect afterward to build the loop.';
    const terms = args.situation.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
    const matched = patterns
      .map(p => {
        const text = `${p.name} ${p.approach || ''}`.toLowerCase();
        const hits = terms.filter(t => text.includes(t)).length;
        return hits ? { p, relevance: hits / terms.length, score: this.#score(p) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (b.relevance * b.score) - (a.relevance * a.score))
      .slice(0, 3);
    if (!matched.length) return `No matching pattern for "${args.situation}". Proceed fresh and reflect afterward.`;
    return `## Suggested approaches (learned)\n` +
      matched.map(({ p }) => `- **${p.name}** (${p.occurrences}x, ${Math.round((p.successRate ?? 1) * 100)}% success): ${p.approach}`).join('\n');
  }

  #handlePatterns() {
    const patterns = loadJson(path.join(REFLECT_DIR, 'patterns.json'), []);
    if (!patterns.length) return 'No patterns learned yet.';
    return [...patterns]
      .sort((a, b) => this.#score(b) - this.#score(a))
      .slice(0, 10)
      .map(p => `- ${p.name}: ${p.approach} — ${p.occurrences}x, ${Math.round((p.successRate ?? 1) * 100)}% success`)
      .join('\n');
  }

  #handleEvolveStatus() {
    const out = ['# Zara Learning Status', ''];
    const patterns = loadJson(path.join(REFLECT_DIR, 'patterns.json'), []);
    if (patterns.length) {
      const top = [...patterns].sort((a, b) => this.#score(b) - this.#score(a)).slice(0, 5);
      out.push(`## Top Patterns (${patterns.length} learned)`);
      for (const p of top) out.push(`- ${p.name} — ${p.occurrences}x, ${Math.round((p.successRate ?? 1) * 100)}% success`);
      out.push('');
    }
    const EVOLVE_DIR = path.join(HOME, 'evolve');
    const rules = loadJson(path.join(EVOLVE_DIR, 'workflow-rules.json'), []);
    if (rules.length) { out.push(`## Active Rules (${rules.length})`); for (const r of rules.slice(0, 5)) out.push(`- [${r.priority || 'med'}] WHEN ${r.when} → ${r.then} (fired ${r.fired || 0}x)`); out.push(''); }
    const micro = loadJson(path.join(EVOLVE_DIR, 'micro-tools.json'), []);
    if (micro.length) { out.push(`## Micro-Tools (${micro.length} crystallized)`); for (const t of [...micro].sort((a, b) => (b.uses || 0) - (a.uses || 0)).slice(0, 5)) out.push(`- ${t.name} (used ${t.uses || 0}x)`); out.push(''); }
    let contradictions = []; try { contradictions = detectContradictions(); } catch {}
    if (contradictions.length) { out.push(`## Open Contradictions (${contradictions.length})`); out.push('Run memory_contradictions to review.'); out.push(''); }
    const blindspots = loadJson(path.join(HOME, 'blindspots.json'), []);
    if (blindspots.length) { out.push(`## Blindspots tracked (${blindspots.length})`); for (const b of blindspots.slice(-3)) out.push(`- ${b.area}: ${b.observation}`); out.push(''); }
    if (out.length <= 2) return 'No learning data yet.';
    const avgSuccess = patterns.length ? Math.round(patterns.reduce((s, p) => s + (p.successRate ?? 1), 0) / patterns.length * 100) : null;
    out.push('---'); out.push(`Health: ${patterns.length} patterns${avgSuccess !== null ? ` (avg ${avgSuccess}% success)` : ''}, ${rules.length} rules, ${micro.length} micro-tools, ${contradictions.length} contradictions.`);
    return out.join('\n');
  }

  #handleBlindspotLog(args) {
    const file = path.join(HOME, 'blindspots.json');
    const data = loadJson(file, []);
    data.push({ ...args, ts: new Date().toISOString().split('T')[0], reminded: 0 });
    saveJson(file, data);
    return `Blindspot recorded: ${args.area} — ${args.observation}`;
  }

  #handleBlindspotCheck(args) {
    const data = loadJson(path.join(HOME, 'blindspots.json'), []);
    if (!data.length) return 'No blindspots recorded yet.';
    const terms = args.context.toLowerCase().split(/\s+/);
    const matched = data.filter(b => terms.some(t => `${b.area} ${b.observation}`.toLowerCase().includes(t)));
    if (!matched.length) return 'No matching blindspots for this context.';
    return matched.map(b => `⚡ ${b.area}: ${b.observation}\n   → ${b.suggestion || 'Be mindful.'}`).join('\n\n');
  }
}

export default new ReflectionTools().tools;
export { recalledKeys };
