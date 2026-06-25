#!/usr/bin/env node
// generate-context.mjs — Auto-generate .context/ for AI-friendly project onboarding
// Produces pre-digested context files that AI agents load instead of exploring.
// Target: <3K tokens total. High-signal, zero noise.
//
// Usage: node scripts/generate-context.mjs [path]

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ROOT = path.resolve(process.argv[2] || '.');
const CTX = path.join(ROOT, '.context');
fs.mkdirSync(CTX, { recursive: true });

// --- Helpers ---
function read(f) { try { return fs.readFileSync(path.join(ROOT, f), 'utf-8'); } catch { return null; } }
function exists(f) { return fs.existsSync(path.join(ROOT, f)); }
function git(...args) {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf-8', timeout: 5000 }).trim(); } catch { return ''; }
}

// --- 1. PROJECT.md (identity + architecture + API surface) ---
function generateProject() {
  const pkg = JSON.parse(read('package.json') || '{}');
  const version = JSON.parse(read('version.json') || '{}');
  const name = pkg.name || version.name || path.basename(ROOT);
  const desc = version.description || pkg.description || '';
  const ver = version.version || pkg.version || 'unknown';

  const stack = [];
  if (exists('go.mod')) stack.push('Go');
  if (exists('tsconfig.json')) stack.push('TypeScript');
  else if (pkg.dependencies) stack.push('Node.js/ESM');
  if (exists('composer.json')) stack.push('PHP');
  if (exists('Cargo.toml')) stack.push('Rust');
  if (exists('pyproject.toml') || exists('requirements.txt')) stack.push('Python');

  const remote = git('remote', 'get-url', 'origin').replace(/https?:\/\/[^@]+@/, 'https://').replace(/\.git$/, '');

  let out = `# ${name} v${ver}\n\n${desc}\n\n`;
  out += `**Stack:** ${stack.join(', ') || 'unknown'} | **Generated:** ${new Date().toISOString().split('T')[0]}\n`;
  if (remote) out += `**Repo:** ${remote}\n`;
  out += '\n';

  const arch = read('docs/architecture.md');
  if (arch) {
    // Take first meaningful paragraph (stop before code blocks or deep content)
    const firstPara = arch.split('\n').filter(l => !l.startsWith('#')).join('\n')
      .split(/\n```[\s\S]*?```\n/)[0]  // stop before code blocks
      .split('\n').filter(l => l.trim()).slice(0, 5).join('\n');
    if (firstPara) out += `## Architecture\n\n${firstPara}\n\n`;
  }

  out += '## API Surface\n\n';
  const opencode = JSON.parse(read('opencode.json') || '{}');
  if (opencode.agent) out += `**Agents (${Object.keys(opencode.agent).length}):** ${Object.keys(opencode.agent).join(', ')}\n`;
  if (opencode.command) out += `**Commands (${Object.keys(opencode.command).length}):** ${Object.keys(opencode.command).map(c => '/' + c).join(', ')}\n`;

  const mcpIndex = read('tools/mcp/index.mjs');
  if (mcpIndex) {
    const domains = [...mcpIndex.matchAll(/from\s+'\.\/domain\/([^']+)'/g)].map(m => m[1].replace('.mjs', ''));
    out += `**MCP Domains (${domains.length}):** ${domains.join(', ')}\n`;
  }

  try {
    const skills = fs.readdirSync(path.join(ROOT, '.opencode/skills')).filter(d =>
      fs.existsSync(path.join(ROOT, '.opencode/skills', d, 'SKILL.md'))
    );
    out += `**Skills (${skills.length}):** loadable via \`skill\` tool\n`;
  } catch {}

  fs.writeFileSync(path.join(CTX, 'PROJECT.md'), out);
}

// --- 2. STRUCTURE.md (annotated map, not raw tree) ---
function generateStructure() {
  let out = '# Structure\n\n';

  const annotations = [
    ['tools/mcp/', 'MCP server (28 tools across 9 domains)'],
    ['tools/mcp/domain/', 'Tool implementations per domain'],
    ['.opencode/plugin/zara/', 'Plugin modules (11: observe, memory, flow, dev, social, evolve, empathy, relationship, voice, workspace, debate)'],
    ['.opencode/skills/', 'Loadable skill definitions (28 skills)'],
    ['.opencode/agent/', 'Agent prompt files (11 agents)'],
    ['.opencode/commands/', 'Slash commands (22)'],
    ['.opencode/instructions/', 'System behavior instructions'],
    ['knowledge/', 'DevIQ knowledge base (254 articles, 585 passages)'],
    ['tests/', 'Unit + structural tests (node --test)'],
    ['scripts/', 'CLI: install, bump-version, generate-context'],
    ['docs/', 'Architecture, memory, plugins, tools reference'],
    ['.github/workflows/', 'GitHub Actions (CI, security, sync, release)'],
  ];

  out += '| Directory | Purpose |\n|---|---|\n';
  for (const [dir, desc] of annotations) {
    if (exists(dir)) out += `| \`${dir}\` | ${desc} |\n`;
  }

  out += '\n**Key files:** `opencode.json` (agent config), `version.json` (version), `.gitlab-ci.yml` (CI pipeline)\n';

  // Cross-references: find hub files (most imported by others)
  const importCounts = {};
  function scanImports(dir) {
    try {
      for (const entry of fs.readdirSync(path.join(ROOT, dir), { recursive: true })) {
        const full = path.join(dir, entry);
        if (!full.endsWith('.mjs') && !full.endsWith('.js') && !full.endsWith('.ts')) continue;
        const content = read(full);
        if (!content) continue;
        const imports = [...content.matchAll(/from\s+['"]([^'"]+)['"]/g)];
        for (const m of imports) {
          if (m[1].startsWith('.')) {
            const resolved = path.normalize(path.join(path.dirname(full), m[1])).replace(/\\/g, '/');
            importCounts[resolved] = (importCounts[resolved] || 0) + 1;
          }
        }
      }
    } catch {}
  }
  scanImports('tools');
  scanImports('.opencode/plugin');

  const hubs = Object.entries(importCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).filter(([, c]) => c >= 3);
  if (hubs.length) {
    out += '\n## Hub Files (most imported)\n\n';
    for (const [file, count] of hubs) {
      out += `- \`${file}\` (${count} importers)\n`;
    }
  }

  fs.writeFileSync(path.join(CTX, 'STRUCTURE.md'), out);
}

// --- 3. CONVENTIONS.md (auto-detected from code + config) ---
function generateConventions() {
  let out = '# Conventions\n\n';
  const pkg = JSON.parse(read('package.json') || '{}');
  out += `- **Module:** ${pkg.type === 'module' ? 'ESM (import/export)' : 'CommonJS'}\n`;
  out += `- **Commits:** conventional (feat/fix/perf trigger release, chore/docs/ci skip)\n`;
  out += `- **Branches:** feature branches only, never commit to main\n`;
  out += `- **Tests:** \`node --test --test-concurrency=1 tests/*.test.mjs\`\n`;
  out += `- **Verify:** run tests + lint before claiming done\n`;

  // Auto-detect patterns from code
  try {
    const toolFiles = fs.readdirSync(path.join(ROOT, 'tools/mcp/domain')).filter(f => f.endsWith('.mjs')).slice(0, 3);
    const sample = toolFiles.map(f => (read(`tools/mcp/domain/${f}`) || '').slice(0, 500)).join('\n');
    const patterns = [];
    if (sample.includes('export default')) patterns.push('default exports for modules');
    if (sample.includes('class ')) patterns.push('class-based domain tools');
    if (sample.includes('#handle') || sample.includes('#')) patterns.push('private methods via # prefix');
    if (patterns.length) out += `- **Code patterns:** ${patterns.join(', ')}\n`;
  } catch {}

  const agents = read('AGENTS.md');
  if (agents) {
    const codeMatch = agents.match(/## Code Standards\n([\s\S]*?)(?=\n## )/);
    if (codeMatch) out += `\n## Code Standards\n\n${codeMatch[1].trim()}\n`;
  }

  fs.writeFileSync(path.join(CTX, 'CONVENTIONS.md'), out);
}

// --- 4. ENTRY_POINTS.md (where to start + recent activity) ---
function generateEntryPoints() {
  let out = '# Entry Points\n\n';
  const entries = [
    ['opencode.json', 'Agent configuration root'],
    ['tools/mcp/index.mjs', 'MCP server entry'],
    ['.opencode/plugin/zara.mjs', 'Plugin composition root (11 modules)'],
    ['.opencode/instructions/system.md', 'Behavior rules'],
    ['AGENTS.md', 'Agent dispatch + routing'],
  ];

  out += '| Start Here | Why |\n|---|---|\n';
  for (const [file, desc] of entries) {
    if (exists(file)) out += `| \`${file}\` | ${desc} |\n`;
  }

  const recent = git('log', '--oneline', '--since=7 days ago', '--no-decorate', 'HEAD');
  if (recent) {
    out += `\n## Recent Activity (7 days)\n\n`;
    for (const line of recent.split('\n').filter(Boolean).slice(0, 10)) {
      out += `- ${line.replace(/^[0-9a-f]+ /, '')}\n`;
    }
  }

  // Hot paths: most-changed files in last 30 days
  const hotFiles = git('log', '--format=', '--name-only', '--since=30 days ago', 'HEAD');
  if (hotFiles) {
    const counts = {};
    for (const f of hotFiles.split('\n').filter(Boolean)) {
      if (f.startsWith('.') || f.includes('node_modules') || f === 'CHANGELOG.md' || f === 'version.json') continue;
      counts[f] = (counts[f] || 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (top.length) {
      out += `\n## Hot Paths (most changed, 30 days)\n\n`;
      for (const [file, count] of top) {
        out += `- \`${file}\` (${count}x)\n`;
      }
    }
  }

  fs.writeFileSync(path.join(CTX, 'ENTRY_POINTS.md'), out);
}

// --- 5. DEPENDENCIES.md (compact) ---
function generateDependencies() {
  const pkg = JSON.parse(read('package.json') || '{}');
  if (!pkg.dependencies && !pkg.devDependencies) return;
  let out = '# Dependencies\n\n';
  if (pkg.dependencies) out += '**Production:** ' + Object.keys(pkg.dependencies).join(', ') + '\n\n';
  if (pkg.devDependencies) out += '**Dev:** ' + Object.keys(pkg.devDependencies).join(', ') + '\n';
  fs.writeFileSync(path.join(CTX, 'DEPENDENCIES.md'), out);
}

// --- Run ---
console.log('Generating .context/ ...');
generateProject();
generateStructure();
generateConventions();
generateEntryPoints();
generateDependencies();

const files = fs.readdirSync(CTX).filter(f => f.endsWith('.md'));
const totalBytes = files.reduce((s, f) => s + fs.statSync(path.join(CTX, f)).size, 0);
const estTokens = Math.ceil(totalBytes / 4);
console.log(`Done. ${files.length} files, ~${estTokens} tokens (${(totalBytes / 1024).toFixed(1)}KB)`);
if (estTokens > 3000) console.warn(`Warning: ${estTokens} tokens exceeds 3K target.`);
