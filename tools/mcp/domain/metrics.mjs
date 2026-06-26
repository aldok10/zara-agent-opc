import fs from 'fs';
import path from 'path';
import { HOME, loadJson } from '../infra.mjs';
import { semanticRecall, proceduralRecall, proceduralCount, stats as dbStats } from '../../memory-db.mjs';
import { recordTurn, getMetrics } from '../../telemetry.mjs';

const METRICS_DIR = path.join(HOME, 'metrics');
const REFLECT_DIR = path.join(HOME, 'reflections');
const EVOLVE_DIR = path.join(HOME, 'evolve');

class MetricsTools {
  get tools() {
    return {
      dashboard: {
        description: 'Zara dashboard — overview of memory, metrics, patterns, procedures, micro-tools, rules. Use section param for specific views.',
        inputSchema: { type: 'object', properties: { section: { type: 'string', enum: ['all', 'memory', 'metrics', 'patterns', 'procedures', 'tools', 'rules'] } } },
        handler: (args) => this.#handleDashboard(args),
      },
      metrics_today: {
        description: 'Token spend and cost for today/session. Shows total tokens in/out, estimated cost, cache hit ratio, per-agent breakdown.',
        inputSchema: { type: 'object', properties: { period: { type: 'string', enum: ['today', 'session', 'all'], description: 'Time window (default: today)' } } },
        handler: (args) => this.#handleMetricsToday(args),
      },
      metrics_record_turn: {
        description: 'Record a turn token count (called by plugin automatically).',
        inputSchema: { type: 'object', properties: { tokens_in: { type: 'number' }, tokens_out: { type: 'number' }, cached_tokens: { type: 'number' }, tools_called: { type: 'number' }, agent: { type: 'string' }, model: { type: 'string' } } },
        handler: (args) => { recordTurn(args); return 'Recorded.'; },
      },
    };
  }

  #handleMetricsToday(args) {
    const m = getMetrics(args?.period || 'today');
    const lines = [
      `Token spend (${args?.period || 'today'}):`,
      `  Turns: ${m.turns}`,
      `  Input: ${m.total_in.toLocaleString()} tok (${m.total_cached.toLocaleString()} cached)`,
      `  Output: ${m.total_out.toLocaleString()} tok`,
      `  Cache hit: ${Math.round(m.cache_hit_ratio * 100)}%`,
      `  Est. cost: $${m.est_cost_usd.toFixed(4)}`,
      `  Tools called: ${m.total_tools}`,
    ];
    if (Object.keys(m.by_agent).length) {
      lines.push('  Per-agent:');
      for (const [agent, d] of Object.entries(m.by_agent)) {
        lines.push(`    ${agent}: ${d.turns} turns, ${d.tokens_in}+${d.tokens_out} tok`);
      }
    }
    return lines.join('\n');
  }

  #handleDashboard(args) {
    const section = args.section || 'all';
    const lines = ['═══ ZARA DASHBOARD ═══'];

    if (section === 'all' || section === 'memory') {
      const s = dbStats();
      lines.push(`\n📊 MEMORY\n  Episodic: ${s.episodic} | Semantic: ${s.semantic} | Procedural: ${s.procedural} | DB: ${s.dbSize}`);
      const top = semanticRecall('user project goal', 5);
      if (top.length) lines.push('  Top: ' + top.map(r => `${r.key}=${r.value}`).join(', '));
    }
    if (section === 'all' || section === 'metrics') {
      if (fs.existsSync(METRICS_DIR)) {
        const files = fs.readdirSync(METRICS_DIR).filter(f => f.endsWith('.json')).sort().reverse().slice(0, 7);
        lines.push('\n📈 METRICS (last 7 days)');
        for (const f of files) {
          const d = loadJson(path.join(METRICS_DIR, f), {});
          const rate = d.toolCalls?.total > 0 ? Math.round((d.toolCalls.success / d.toolCalls.total) * 100) : 0;
          lines.push(`  ${f.replace('.json', '')}: ${d.toolCalls?.total || 0} calls, ${rate}% success`);
        }
      }
    }
    if (section === 'all' || section === 'patterns') {
      const patterns = loadJson(path.join(REFLECT_DIR, 'patterns.json'), []);
      lines.push(`\n🧠 PATTERNS (${patterns.length})`);
      if (patterns.length) lines.push(patterns.sort((a, b) => b.occurrences - a.occurrences).slice(0, 10).map(p => `  ${p.name} (×${p.occurrences}): ${p.approach}`).join('\n'));
    }
    if (section === 'all' || section === 'procedures') {
      const count = proceduralCount();
      lines.push(`\n⚙️ PROCEDURES (${count})`);
      if (count) lines.push(proceduralRecall('', 10).map(p => `  ${p.name} (${p.uses}x): ${JSON.parse(p.steps).join(' → ')}`).join('\n'));
    }
    if (section === 'all' || section === 'tools') {
      const mt = loadJson(path.join(EVOLVE_DIR, 'micro-tools.json'), []);
      lines.push(`\n🔧 MICRO-TOOLS (${mt.length})`);
      if (mt.length) lines.push(mt.sort((a, b) => b.uses - a.uses).slice(0, 10).map(t => `  ${t.name} (${t.uses}x): ${t.trigger}`).join('\n'));
    }
    if (section === 'all' || section === 'rules') {
      const rules = loadJson(path.join(EVOLVE_DIR, 'workflow-rules.json'), []);
      lines.push(`\n📋 RULES (${rules.length})`);
      if (rules.length) lines.push(rules.map((r, i) => `  ${i + 1}. [${r.priority}] WHEN "${r.when}" → ${r.then}`).join('\n'));
    }
    return lines.join('\n');
  }
}

export default new MetricsTools().tools;
