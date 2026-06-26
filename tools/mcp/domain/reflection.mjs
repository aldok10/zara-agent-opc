import fs from 'fs';
import path from 'path';
import { HOME, ensure, loadJson, saveJson } from '../infra.mjs';
import { adjustTrust } from '../../memory-db.mjs';

const REFLECT_DIR = path.join(HOME, 'reflections');

// Track keys recalled this session for trust calibration
const recalledKeys = new Set();

// Sliding window: max 5 trust adjustments per 60 minutes (ring buffer of timestamps)
const _trustTimestamps = [];

class ReflectionTools {
  get tools() {
    return {
      reflect: {
        description: 'Record a reflection (what worked, what failed, pattern extracted). Pass outcome to feed the success-weighted learning loop.',
        inputSchema: { type: 'object', properties: { task: { type: 'string', description: 'What was the task' }, worked: { type: 'string' }, failed: { type: 'string' }, pattern: { type: 'string' }, outcome: { type: 'string', enum: ['success', 'partial', 'failure'], description: 'How it went — trains pattern scores over time' }, agent: { type: 'string', description: 'Which agent is reflecting (provenance)' }, reflection_type: { type: 'string', enum: ['principle', 'procedural', 'both'], description: 'MARS-style: principle (normative rule) or procedural (step-by-step strategy)' } }, required: ['task'] },
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
        inputSchema: { type: 'object', properties: { days: { type: 'number', description: 'Filter to last N days (default: all time)' } } },
        handler: (args) => this.#handleEvolveStatus(args),
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
    // CONSTITUTION P4: absence of signal is not success. Default to 'partial'.
    let defaulted = false;
    if (!args.outcome) {
      args.outcome = 'partial';
      defaulted = true;
    }
    // CONSTITUTION P3: success requires evidence. Downgrade if worked field is empty.
    let downgraded = false;
    if (args.outcome === 'success' && !args.worked?.trim()) {
      args.outcome = 'partial';
      downgraded = true;
    }
    const logFile = path.join(REFLECT_DIR, 'log.jsonl');
    fs.appendFileSync(logFile, JSON.stringify({ ...args, agent: args.agent || '', ts: new Date().toISOString() }) + '\n');
    // Rotate: keep last 500 entries
    try {
      const lines = fs.readFileSync(logFile, 'utf-8').trim().split('\n');
      if (lines.length > 500) fs.writeFileSync(logFile, lines.slice(-500).join('\n') + '\n');
    } catch (e) { process.stderr.write(`[mcp:reflection] log rotation failed: ${e.message}\n`); }

    // Trust calibration: adjust trust scores of memories recalled this session
    // CONSTITUTION P3: only raise trust on explicit success WITH evidence (worked field).
    // Without evidence, trust may stay flat or fall, never rise.
    if (args.outcome && recalledKeys.size > 0) {
      // Sliding window: max 5 trust adjustments per 60 minutes
      const now = Date.now();
      const windowMs = 60 * 60 * 1000;
      while (_trustTimestamps.length && _trustTimestamps[0] <= now - windowMs) _trustTimestamps.shift();
      if (_trustTimestamps.length < 5) {
        _trustTimestamps.push(now);
        const canRaise = args.outcome === 'success' && args.worked && args.worked.trim().length >= 20;
        const effectiveOutcome = canRaise ? 'success' : (args.outcome === 'failure' ? 'failure' : 'partial');
        adjustTrust([...recalledKeys], effectiveOutcome);
      }
      recalledKeys.clear();
    }

    if (args.pattern) {
      const patternName = args.pattern.replace(/^(For |When |If |Before |After |During )/i, '').slice(0, 80).trim();
      const pFile = path.join(REFLECT_DIR, 'patterns.json');
      const patterns = loadJson(pFile, []);
      const existing = patterns.find(p => p.name === patternName);
      // Outcome → reward signal. CONSTITUTION P4: unspecified = partial (0.5), not success.
      const reward = args.outcome === 'success' ? 1 : args.outcome === 'failure' ? 0 : 0.5;
      if (existing) {
        existing.occurrences++;
        // Running sum of rewards → success rate is the average reward per occurrence.
        existing.rewardSum = (existing.rewardSum ?? (existing.occurrences - 1)) + reward;
        existing.successRate = existing.rewardSum / existing.occurrences;
        existing.lastSeen = new Date().toISOString().split('T')[0];
        if (args.worked) existing.approach = args.worked;
        if (args.agent) existing.agent = args.agent;
      } else {
        patterns.push({
          name: patternName,
          approach: args.worked || args.task,
          occurrences: 1,
          rewardSum: reward,
          successRate: reward,
          created: new Date().toISOString().split('T')[0],
          lastSeen: new Date().toISOString().split('T')[0],
          ...(args.agent ? { agent: args.agent } : {}),
        });
      }
      saveJson(pFile, patterns);
    }
    const note = downgraded ? ' (downgraded: no evidence in worked field)' : defaulted ? ' (no outcome provided, defaulted to partial)' : '';
    // MARS-style dual reflection hints
    const hints = [];
    if (args.outcome === 'failure' && !args.pattern) hints.push('PRINCIPLE: What rule would prevent this failure?');
    if (args.outcome === 'success' && args.worked && !args.pattern) hints.push('PROCEDURAL: What exact sequence worked? Consider storing as procedure.');
    if (args.outcome === 'failure' && args.failed) {
      const logLines = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf-8').trim().split('\n') : [];
      const recent = logLines.slice(-20).filter(l => { try { const e = JSON.parse(l); return e.outcome === 'failure' && e.failed; } catch { return false; } });
      if (recent.length >= 3) hints.push('ANTI-ENTRENCHMENT: 3+ recent failures. Switch perspective or approach.');
    }
    const hintStr = hints.length ? `\n💡 ${hints.join(' | ')}` : '';
    return `Reflected on: ${args.task}${args.pattern ? ` → pattern: ${args.pattern}${args.outcome ? ` [${args.outcome}]` : ''}` : ''}${note}${hintStr}`;
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
        const pTerms = p.name.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
        const reverseHits = pTerms.filter(t => args.situation.toLowerCase().includes(t)).length;
        const totalRelevance = (hits / Math.max(terms.length, 1)) + (reverseHits / Math.max(pTerms.length, 1));
        return totalRelevance > 0.1 ? { p, relevance: totalRelevance, score: this.#score(p) } : null;
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

  #handleEvolveStatus(args = {}) {
    const out = ['# Zara Learning Status', ''];
    const cutoff = args.days ? new Date(Date.now() - args.days * 86400000).toISOString().split('T')[0] : null;
    const patterns = loadJson(path.join(REFLECT_DIR, 'patterns.json'), []);
    const filtered = cutoff ? patterns.filter(p => p.lastSeen >= cutoff) : patterns;
    if (filtered.length) {
      const top = [...filtered].sort((a, b) => this.#score(b) - this.#score(a)).slice(0, 5);
      out.push(`## ${cutoff ? `Recent Patterns (last ${args.days}d)` : 'Top Patterns'} (${filtered.length}${cutoff ? ` of ${patterns.length}` : ''} learned)`);
      for (const p of top) out.push(`- ${p.name} — ${p.occurrences}x, ${Math.round((p.successRate ?? 1) * 100)}% success`);
      out.push('');
    }
    const EVOLVE_DIR = path.join(HOME, 'evolve');
    const rules = loadJson(path.join(EVOLVE_DIR, 'workflow-rules.json'), []);
    if (rules.length) { out.push(`## Active Rules (${rules.length})`); for (const r of rules.slice(0, 5)) out.push(`- [${r.priority || 'med'}] WHEN ${r.when} → ${r.then} (fired ${r.fired || 0}x)`); out.push(''); }
    const micro = loadJson(path.join(EVOLVE_DIR, 'micro-tools.json'), []);
    if (micro.length) { out.push(`## Micro-Tools (${micro.length} crystallized)`); for (const t of [...micro].sort((a, b) => (b.uses || 0) - (a.uses || 0)).slice(0, 5)) out.push(`- ${t.name} (used ${t.uses || 0}x)`); out.push(''); }
    out.push('## Contradictions'); out.push('Run memory_contradictions manually (semantic detection).'); out.push('');
    const blindspots = loadJson(path.join(HOME, 'blindspots.json'), []);
    if (blindspots.length) { out.push(`## Blindspots tracked (${blindspots.length})`); for (const b of blindspots.slice(-3)) out.push(`- ${b.area}: ${b.observation}`); out.push(''); }
    if (out.length <= 2) return 'No learning data yet.';
    const avgSuccess = patterns.length ? Math.round(patterns.reduce((s, p) => s + (p.successRate ?? 1), 0) / patterns.length * 100) : null;
    out.push('---'); out.push(`Health: ${patterns.length} patterns${avgSuccess !== null ? ` (avg ${avgSuccess}% success)` : ''}, ${rules.length} rules, ${micro.length} micro-tools.`);
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
