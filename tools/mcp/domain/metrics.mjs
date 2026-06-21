import fs from 'fs';
import path from 'path';
import { HOME, loadJson } from '../infra.mjs';
import { semanticRecall, proceduralRecall, proceduralCount, stats as dbStats } from '../../memory-db.mjs';

const METRICS_DIR = path.join(HOME, 'metrics');
const REFLECT_DIR = path.join(HOME, 'reflections');
const EVOLVE_DIR = path.join(HOME, 'evolve');

class MetricsTools {
  get tools() {
    return {
      metrics_today: {
        description: 'Show today agent metrics',
        inputSchema: { type: 'object', properties: {} },
        handler: () => this.#handleMetricsToday(),
      },
      micro_tools: {
        description: 'List crystallized micro-tools',
        inputSchema: { type: 'object', properties: {} },
        handler: () => this.#handleMicroTools(),
      },
      workflow_rules: {
        description: 'List active workflow rules',
        inputSchema: { type: 'object', properties: {} },
        handler: () => this.#handleWorkflowRules(),
      },
      dashboard: {
        description: 'Zara dashboard — overview of memory, metrics, patterns, procedures, micro-tools, rules',
        inputSchema: { type: 'object', properties: { section: { type: 'string', enum: ['all', 'memory', 'metrics', 'patterns', 'procedures', 'tools', 'rules'] } } },
        handler: (args) => this.#handleDashboard(args),
      },
    };
  }

  #handleMetricsToday() {
    const today = new Date().toISOString().split('T')[0];
    const data = loadJson(path.join(METRICS_DIR, `${today}.json`), { toolCalls: { total: 0, success: 0, error: 0 }, sessions: 0 });
    const rate = data.toolCalls.total > 0 ? Math.round((data.toolCalls.success / data.toolCalls.total) * 100) : 0;
    return `${today}: ${data.toolCalls.total} calls, ${rate}% success, ${data.sessions} sessions`;
  }

  #handleMicroTools() {
    const mt = loadJson(path.join(EVOLVE_DIR, 'micro-tools.json'), []);
    if (!mt.length) return 'No micro-tools yet.';
    return mt.map(t => `${t.name} (${t.uses}x): ${t.trigger}`).join('\n');
  }

  #handleWorkflowRules() {
    const rules = loadJson(path.join(EVOLVE_DIR, 'workflow-rules.json'), []);
    if (!rules.length) return 'No rules defined.';
    return rules.map(r => `[${r.priority}] WHEN "${r.when}" → ${r.then}`).join('\n');
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
