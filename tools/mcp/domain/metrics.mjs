import fs from 'fs';
import path from 'path';
import { HOME, loadJson } from '../infra.mjs';
import { semanticRecall, proceduralRecall, proceduralCount, stats as dbStats } from '../../memory-db.mjs';

const REFLECT_DIR = path.join(HOME, 'reflections');
const EVOLVE_DIR = path.join(HOME, 'evolve');

// Token/cost/turn metrics live in the OpenCode plugin (zara/observe) which
// captures them automatically via tool.execute hooks and exposes them through
// `zara_trace_summary`. This MCP domain only surfaces the memory/learning state
// that the plugin does not track.
class MetricsTools {
  get tools() {
    return {
      dashboard: {
        description: 'Memory/learning dashboard. Sections: memory, patterns, procedures, tools, rules.',
        inputSchema: { type: 'object', properties: { section: { type: 'string', enum: ['all', 'memory', 'patterns', 'procedures', 'tools', 'rules'] } } },
        handler: (args) => this.#handleDashboard(args),
      },
    };
  }

  async #handleDashboard(args) {
    const section = args.section || 'all';
    const lines = ['═══ ZARA DASHBOARD ═══'];

    if (section === 'all' || section === 'memory') {
      const s = await dbStats();
      lines.push(`\n📊 MEMORY\n  Episodic: ${s.episodic} | Semantic: ${s.semantic} | Procedural: ${s.procedural} | DB: ${s.dbSize}`);
      const top = await semanticRecall('user project goal', 5);
      if (top.length) lines.push('  Top: ' + top.map(r => `${r.key}=${r.value}`).join(', '));
    }
    if (section === 'all' || section === 'patterns') {
      const patterns = loadJson(path.join(REFLECT_DIR, 'patterns.json'), []);
      lines.push(`\n🧠 PATTERNS (${patterns.length})`);
      if (patterns.length) lines.push(patterns.sort((a, b) => b.occurrences - a.occurrences).slice(0, 10).map(p => `  ${p.name} (×${p.occurrences}): ${p.approach}`).join('\n'));
    }
    if (section === 'all' || section === 'procedures') {
      const count = await proceduralCount();
      lines.push(`\n⚙️ PROCEDURES (${count})`);
      if (count) {
        const procs = await proceduralRecall('', 10);
        lines.push(procs.map(p => `  ${p.name} (${p.uses}x): ${JSON.parse(p.steps).join(' → ')}`).join('\n'));
      }
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
