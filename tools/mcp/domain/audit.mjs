import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

// Resolve project root from this module's location (tools/mcp/domain -> project root)
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

// Self-audit: validate that opencode.json config, skill routing, and plugin
// wiring match what actually exists on disk. Catches config drift before it
// becomes a silent runtime failure. Inspired by ruflo MetaHarness, minus the
// 1-100 scoring theater — just actionable findings.
class SelfAuditTools {
  get tools() {
    return {
      zara_self_audit: {
        description: 'Audit Zara config integrity: agents declared in opencode.json vs prompt files on disk, plugin modules imported vs present, MCP domain count, and orphaned references. Returns actionable findings. Run periodically to catch config drift.',
        inputSchema: { type: 'object', properties: { map: { type: 'boolean', description: 'Also emit a capability map: every MCP domain, plugin module, and agent available.' } } },
        handler: (args) => this.#handleAudit(args),
      },
      zara_skill_integrity: {
        description: 'Check skill file integrity: generate or verify SHA-256 hashes of all project skills. Use action=generate to create manifest, action=verify to check against it.',
        inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['generate', 'verify'], description: 'generate = create manifest, verify = check against existing' } }, required: ['action'] },
        handler: (args) => this.#handleSkillIntegrity(args),
      },
    };
  }

  async #handleAudit(args) {
    const findings = [];
    const ok = [];

    // 1. opencode.json agents → prompt files exist
    try {
      const cfgRaw = fs.readFileSync(path.join(PROJECT_ROOT, 'opencode.json'), 'utf-8');
      const cfg = JSON.parse(cfgRaw);
      const agents = cfg.agent || {};
      let agentOk = 0;
      for (const [name, def] of Object.entries(agents)) {
        const m = (def.prompt || '').match(/\{file:([^}]+)\}/);
        if (!m) continue;
        const promptPath = path.join(PROJECT_ROOT, m[1]);
        if (fs.existsSync(promptPath)) agentOk++;
        else findings.push(`agent "${name}": prompt file missing → ${m[1]}`);
      }
      ok.push(`${agentOk}/${Object.keys(agents).length} agent prompt files present`);

      // instructions files exist
      for (const ins of (cfg.instructions || [])) {
        if (!fs.existsSync(path.join(PROJECT_ROOT, ins))) findings.push(`instructions file missing → ${ins}`);
      }

      // plugin entry exists
      for (const pl of (cfg.plugin || [])) {
        if (!fs.existsSync(path.join(PROJECT_ROOT, pl))) findings.push(`plugin entry missing → ${pl}`);
      }
    } catch (e) {
      findings.push(`opencode.json: ${e.message}`);
    }

    // 2. Plugin composition root: imported modules exist on disk
    try {
      const rootPath = path.join(PROJECT_ROOT, '.opencode/plugin/zara.mjs');
      if (fs.existsSync(rootPath)) {
        const src = fs.readFileSync(rootPath, 'utf-8');
        const imports = [...src.matchAll(/from\s+'(\.\/zara\/[^']+)'/g)].map(m => m[1]);
        let modOk = 0;
        for (const imp of imports) {
          const resolved = path.join(PROJECT_ROOT, '.opencode/plugin', imp);
          if (fs.existsSync(resolved)) modOk++;
          else findings.push(`plugin module imported but missing → ${imp}`);
        }
        ok.push(`${modOk}/${imports.length} plugin modules present`);
      }
    } catch (e) {
      findings.push(`plugin root: ${e.message}`);
    }

    // 3. MCP domains: every domain file referenced in index.mjs exists
    try {
      const mcpIndex = path.join(PROJECT_ROOT, 'tools/mcp/index.mjs');
      if (fs.existsSync(mcpIndex)) {
        const src = fs.readFileSync(mcpIndex, 'utf-8');
        const domains = [...src.matchAll(/from\s+'(\.\/domain\/[^']+)'/g)].map(m => m[1]);
        let domOk = 0;
        for (const d of domains) {
          if (fs.existsSync(path.join(PROJECT_ROOT, 'tools/mcp', d))) domOk++;
          else findings.push(`MCP domain imported but missing → ${d}`);
        }
        ok.push(`${domOk}/${domains.length} MCP domains present`);
      }
    } catch (e) {
      findings.push(`MCP index: ${e.message}`);
    }

    const header = findings.length
      ? `Self-audit: ${findings.length} finding(s)\n\n`
      : `Self-audit: clean ✓\n\n`;
    const okLine = ok.length ? `OK:\n${ok.map(o => `  - ${o}`).join('\n')}\n\n` : '';
    const findLine = findings.length ? `Findings:\n${findings.map(f => `  ⚠️ ${f}`).join('\n')}` : '';

    let mapLine = '';
    if (args?.map) {
      mapLine = '\n\n' + await this.#capabilityMap();
    }
    return header + okLine + findLine + mapLine;
  }

  #handleSkillIntegrity(args) {
    const skillDir = path.join(PROJECT_ROOT, '.opencode/skills');
    const manifestPath = path.join(PROJECT_ROOT, '.opencode/skill-manifest.json');

    // Collect all skill hashes + dependency info
    const current = {};
    try {
      for (const name of fs.readdirSync(skillDir)) {
        const skillFile = path.join(skillDir, name, 'SKILL.md');
        if (fs.existsSync(skillFile)) {
          const content = fs.readFileSync(skillFile, 'utf-8');
          const hash = createHash('sha256').update(content).digest('hex');
          // Extract dependencies from Related Skills tables and skill references
          const deps = [...new Set(
            [...content.matchAll(/`([a-z][\w-]+)`/g)].map(m => m[1])
              .filter(s => fs.existsSync(path.join(skillDir, s, 'SKILL.md')) && s !== name)
          )];
          current[name] = { hash, requires: deps.length ? deps : undefined };
        }
      }
    } catch (e) { return `Error reading skills: ${e.message}`; }

    if (args.action === 'generate') {
      fs.writeFileSync(manifestPath, JSON.stringify(current, null, 2) + '\n');
      const depCount = Object.values(current).filter(v => v.requires).length;
      return `Manifest generated: ${Object.keys(current).length} skills (${depCount} with dependencies) → .opencode/skill-manifest.json`;
    }

    // Verify mode
    if (!fs.existsSync(manifestPath)) {
      return `No manifest found. Run with action=generate first.`;
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const issues = [];
    for (const [name, entry] of Object.entries(manifest)) {
      const hash = typeof entry === 'string' ? entry : entry.hash;
      if (!current[name]) issues.push(`MISSING: ${name} (in manifest but not on disk)`);
      else if (current[name].hash !== hash) issues.push(`MODIFIED: ${name}`);
    }
    for (const name of Object.keys(current)) {
      if (!manifest[name]) issues.push(`NEW: ${name} (on disk but not in manifest)`);
    }
    // Check broken dependencies
    for (const [name, entry] of Object.entries(current)) {
      for (const dep of (entry.requires || [])) {
        if (!current[dep]) issues.push(`BROKEN DEP: ${name} requires "${dep}" (not found)`);
      }
    }
    if (!issues.length) return `Skill integrity: clean ✓ (${Object.keys(manifest).length} skills verified)`;
    return `Skill integrity: ${issues.length} issue(s)\n${issues.map(i => `  ⚠️ ${i}`).join('\n')}`;
  }

  // Enumerate every capability the agent can actually invoke, so nothing
  // installed sits unused for lack of awareness.
  async #capabilityMap() {
    const parts = ['## Capability Map'];

    // MCP domains + tool counts (import each module and count its exported tools)
    try {
      const mcpIndex = path.join(PROJECT_ROOT, 'tools/mcp/index.mjs');
      const src = fs.readFileSync(mcpIndex, 'utf-8');
      const domains = [...src.matchAll(/from\s+'(\.\/domain\/([^']+)\.mjs)'/g)].map(m => m[2]);
      const lines = [];
      let total = 0;
      for (const d of domains) {
        const dPath = path.join(PROJECT_ROOT, 'tools/mcp/domain', `${d}.mjs`);
        let count = '?';
        try {
          const mod = await import(`file://${dPath}`);
          count = Object.keys(mod.default || {}).length;
          total += count;
        } catch {}
        lines.push(`  - ${d} (${count} tools)`);
      }
      parts.push(`MCP domains (${domains.length}, ${total} tools):\n${lines.join('\n')}`);
    } catch {}

    // Plugin modules
    try {
      const rootPath = path.join(PROJECT_ROOT, '.opencode/plugin/zara.mjs');
      const src = fs.readFileSync(rootPath, 'utf-8');
      const mods = [...src.matchAll(/from\s+'\.\/zara\/([^/]+)\//g)].map(m => m[1]);
      parts.push(`Plugin modules (${[...new Set(mods)].length}): ${[...new Set(mods)].join(', ')}`);
    } catch {}

    // Agents
    try {
      const cfg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'opencode.json'), 'utf-8'));
      const agents = Object.keys(cfg.agent || {});
      parts.push(`Agents (${agents.length}): ${agents.join(', ')}`);
    } catch {}

    return parts.join('\n\n');
  }
}

export default new SelfAuditTools().tools;
