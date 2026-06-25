// Self-Improvement domain — observe, orient, prioritize
// Read-only diagnosis. Never auto-edits config/prompts/code.

import fs from 'fs';
import path from 'path';
import { HOME, ensure, loadJson, saveJson } from '../infra.mjs';

const EVOLVE_DIR = path.join(HOME, 'evolve');
const REFLECT_DIR = path.join(HOME, 'reflections');
const LEARNINGS_DIR = path.join(HOME, 'learnings');
const METRICS_DIR = path.join(HOME, 'metrics');

class ImproveTools {
  get tools() {
    return {
      zara_self_improve: {
        description: 'Run self-improvement cycle: observe (gather signals) or orient (prioritize findings). Safe read-only tool.',
        inputSchema: {
          type: 'object',
          properties: {
            phase: {
              type: 'string',
              enum: ['observe', 'orient', 'full'],
              description: 'Phase to run. observe=gather signals, orient=prioritize, full=both.',
            },
          },
          required: ['phase'],
        },
        handler: (args) => this.#handle(args),
      },
    };
  }

  #handle(args) {
    const phase = args.phase || 'full';
    const results = {};

    if (phase === 'observe' || phase === 'full') {
      results.signals = this.#observe();
    }
    if (phase === 'orient' || phase === 'full') {
      const signals = results.signals || this.#observe();
      results.priority = this.#orient(signals);
    }

    // Persist to pending-improvements.json for system prompt injection
    const pendingFile = path.join(HOME, 'pending-improvements.json');
    const pending = loadJson(pendingFile, []);
    // Clear old pending entries for same type, keep non-improvement ones
    const other = pending.filter(p => p.type !== 'self-improve');
    if (results.priority?.recommendations?.length) {
      other.push({
        id: `imp-${Date.now().toString(36)}`,
        type: 'self-improve',
        status: 'pending',
        source: 'zara_self_improve',
        firedAt: new Date().toISOString(),
        recommendations: results.priority.recommendations.slice(0, 3),
      });
      saveJson(pendingFile, other);
    }

    return JSON.stringify(results, null, 2);
  }

  // ─── Observe: gather signals ──────────────────────────────────────

  #observe() {
    const signals = {};

    // 1. Config integrity (self-audit)
    signals.audit = this.#checkAudit();

    // 2. Memory health
    signals.memory = this.#checkMemory();

    // 3. Tool error rate
    signals.tools = this.#checkToolHealth();

    // 4. Evaluation blind spots
    signals.eval = this.#checkEval();

    // 5. Unused micro-tools
    signals.microTools = this.#checkMicroTools();

    // 6. .learnings backlog
    signals.learnings = this.#checkLearnings();

    // 7. Reflection patterns
    signals.reflections = this.#checkReflections();

    return signals;
  }

  #checkAudit() {
    const findings = loadJson(path.join(HOME, 'audit-cache.json'), null);
    // We don't run the full audit here (too heavy) — rely on cached result
    // Returns count of known config issues
    return { cachedFindings: findings?.findings?.length ?? -1 };
  }

  #checkMemory() {
    // Check contradictions file if exists
    const contrad = loadJson(path.join(HOME, 'memory-contradictions.json'), null);
    const count = contrad?.length ?? 0;
    return { contradictions: count };
  }

  #checkToolHealth() {
    // Check recent metrics for error rate
    let total = 0, errors = 0;
    try {
      if (fs.existsSync(METRICS_DIR)) {
        const files = fs.readdirSync(METRICS_DIR).filter(f => f.endsWith('.json')).sort().reverse().slice(0, 7);
        for (const f of files) {
          const d = loadJson(path.join(METRICS_DIR, f), {});
          total += d.toolCalls?.total || 0;
          errors += d.toolCalls?.error || 0;
        }
      }
    } catch {}
    const rate = total > 0 ? Math.round((errors / total) * 100) : 0;
    return { errorRate: rate, totalCalls: total };
  }

  #checkEval() {
    const qFile = path.join(HOME, 'eval', 'quality.json');
    const q = loadJson(qFile, null);
    if (!q) return { overall: null, blindSpots: [] };
    const spots = Object.entries(q.categories || {})
      .filter(([, d]) => d.avg < 3.5 && d.count >= 3)
      .map(([cat]) => cat);
    return { overall: q.overall ?? null, blindSpots: spots };
  }

  #checkMicroTools() {
    const mFile = path.join(EVOLVE_DIR, 'micro-tools.json');
    const tools = loadJson(mFile, []);
    const unused = tools.filter(t => (t.uses ?? 0) === 0);
    return { total: tools.length, unused: unused.length, unusedNames: unused.map(t => t.name).slice(0, 5) };
  }

  #checkLearnings() {
    // Scan .learnings files for pending high-priority items
    let pending = 0;
    let highPriority = 0;
    for (const file of ['LEARNINGS.md', 'ERRORS.md']) {
      const fPath = path.join(LEARNINGS_DIR, file);
      try {
        const content = fs.readFileSync(fPath, 'utf-8');
        const lines = content.split('\n');
        pending += lines.filter(l => l.includes('**Status**: pending')).length;
        highPriority += lines.filter(l => l.includes('**Priority**: high') && content.includes('**Status**: pending')).length;
      } catch {}
    }
    return { pending, highPriority };
  }

  #checkReflections() {
    const pFile = path.join(REFLECT_DIR, 'patterns.json');
    const patterns = loadJson(pFile, []);
    // Count recent failures (last 24h) from log
    const logFile = path.join(REFLECT_DIR, 'log.jsonl');
    let recentFailurePatterns = 0;
    try {
      if (fs.existsSync(logFile)) {
        const cutoff = Date.now() - 86400000;
        const lines = fs.readFileSync(logFile, 'utf-8').trim().split('\n').filter(Boolean);
        const recent = lines
          .map(l => JSON.parse(l))
          .filter(e => new Date(e.ts).getTime() > cutoff && e.outcome === 'failure');
        recentFailurePatterns = recent.length;
      }
    } catch {}
    return { patterns: patterns.length, recentFailures: recentFailurePatterns };
  }

  // ─── Orient: prioritize findings ──────────────────────────────────

  #orient(signals) {
    const recommendations = [];

    // Priority 1: Config drift (audit)
    if (signals.audit?.cachedFindings > 0) {
      recommendations.push({
        priority: 'P0-critical',
        area: 'config-drift',
        what: `${signals.audit.cachedFindings} config issues detected`,
        why: 'Broken agent/command references degrade reliability',
        effort: 'low',
        autoSafe: true,
      });
    }

    // Priority 1: Memory contradictions
    if (signals.memory?.contradictions > 0) {
      recommendations.push({
        priority: 'P1-high',
        area: 'memory',
        what: `${signals.memory.contradictions} memory contradictions flagged`,
        why: 'Conflicting memories produce inconsistent behavior over time',
        effort: 'low',
        autoSafe: true,
      });
    }

    // Priority 1: High error rate
    if (signals.tools?.errorRate > 10) {
      recommendations.push({
        priority: 'P1-high',
        area: 'tools',
        what: `Tool error rate ${signals.tools.errorRate}% (${signals.tools.totalCalls} calls)`,
        why: 'High error rate degrades user experience and wastes tokens',
        effort: 'medium',
        autoSafe: false,
      });
    }

    // Priority 2: Eval blind spots
    if (signals.eval?.blindSpots?.length > 0) {
      recommendations.push({
        priority: 'P2-medium',
        area: 'quality',
        what: `${signals.eval.blindSpots.length} eval categories below threshold: ${signals.eval.blindSpots.join(', ')}`,
        why: 'Consistent low scores indicate systematic weakness',
        effort: 'medium',
        autoSafe: false,
      });
    }

    // Priority 2: Unused micro-tools
    if (signals.microTools?.unused > 0) {
      recommendations.push({
        priority: 'P2-medium',
        area: 'cleanup',
        what: `${signals.microTools.unused} unused micro-tools (${signals.microTools.unusedNames.join(', ')})`,
        why: 'Clutter reduces signal-to-noise in system prompt injection',
        effort: 'low',
        autoSafe: true,
      });
    }

    // Priority 2: High-priority learnings
    if (signals.learnings?.highPriority > 0) {
      recommendations.push({
        priority: 'P2-medium',
        area: 'learnings',
        what: `${signals.learnings.highPriority} high-priority pending learnings`,
        why: 'Important lessons not yet addressed',
        effort: 'varies',
        autoSafe: false,
      });
    }

    // Priority 3: Prompt issues
    const promptIssues = this.#checkPromptScores();
    if (promptIssues.length > 0) {
      recommendations.push({
        priority: 'P3-low',
        area: 'prompts',
        what: `${promptIssues.length} harmful prompt patterns detected`,
        why: 'Prompt quality compounds over time',
        effort: 'low',
        autoSafe: false,
      });
    }

    return {
      healthy: recommendations.length === 0,
      totalSignals: Object.keys(signals).length,
      recommendations: recommendations.sort((a, b) => a.priority.localeCompare(b.priority)),
    };
  }

  #checkPromptScores() {
    const scoresFile = path.join(EVOLVE_DIR, 'prompt-scores.json');
    const scores = loadJson(scoresFile, {});
    const harmful = [];
    for (const [instruction, s] of Object.entries(scores)) {
      const total = (s.helpful || 0) + (s.neutral || 0) + (s.harmful || 0);
      if (total >= 3 && (s.harmful || 0) / total > 0.5) {
        harmful.push(instruction);
      }
    }
    return harmful;
  }
}

export default new ImproveTools().tools;
