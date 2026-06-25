#!/usr/bin/env node
// generate-context.mjs — Auto-generate .context/ for AI-friendly project onboarding
// Reads project structure, package manifests, and conventions to produce
// pre-digested context files that AI agents can load instead of exploring.
//
// Usage: node scripts/generate-context.mjs [path]

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ROOT = path.resolve(process.argv[2] || '.');
const CTX = path.join(ROOT, '.context');

// Ensure .context/ exists
fs.mkdirSync(CTX, { recursive: true });

// --- Helpers ---
function read(f) { try { return fs.readFileSync(path.join(ROOT, f), 'utf-8'); } catch { return null; } }
function exists(f) { return fs.existsSync(path.join(ROOT, f)); }
function ls(dir, opts = {}) {
  try { return fs.readdirSync(path.join(ROOT, dir), opts); } catch { return []; }
}
function git(...args) {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf-8', timeout: 5000 }).trim(); } catch { return ''; }
}

// --- 1. PROJECT.md ---
function generateProject() {
  const pkg = JSON.parse(read('package.json') || '{}');
  const version = JSON.parse(read('version.json') || '{}');
  const goMod = read('go.mod');
  const composer = read('composer.json') ? JSON.parse(read('composer.json')) : null;

  const name = pkg.name || version.name || path.basename(ROOT);
  const desc = version.description || pkg.description || '';
  const ver = version.version || pkg.version || 'unknown';

  // Detect stack
  const stack = [];
  if (pkg.dependencies) stack.push('Node.js');
  if (exists('tsconfig.json')) stack.push('TypeScript');
  if (goMod) stack.push('Go');
  if (composer) stack.push('PHP');
  if (exists('Cargo.toml')) stack.push('Rust');
  if (exists('pyproject.toml') || exists('requirements.txt')) stack.push('Python');
  if (exists('Dockerfile') || exists('docker-compose.yml')) stack.push('Docker');

  const remote = git('remote', 'get-url', 'origin').replace(/https?:\/\/[^@]+@/, 'https://').replace(/\.git$/, '');

  let out = `# ${name}\n\n`;
  out += `> ${desc}\n\n`;
  out += `- **Version:** ${ver}\n`;
  out += `- **Stack:** ${stack.join(', ') || 'unknown'}\n`;
  if (remote) out += `- **Repository:** ${remote}\n`;
  out += `- **Generated:** ${new Date().toISOString().split('T')[0]}\n\n`;

  // Architecture overview from existing docs
  const arch = read('docs/architecture.md');
  if (arch) {
    const summary = arch.split('\n').slice(0, 30).join('\n');
    out += `## Architecture\n\n${summary}\n\n`;
  }

  fs.writeFileSync(path.join(CTX, 'PROJECT.md'), out);
}

// --- 2. STRUCTURE.md ---
function generateStructure() {
  let out = '# Directory Structure\n\n```\n';

  function walk(dir, prefix = '', depth = 0) {
    if (depth > 2) return;
    const entries = ls(dir).filter(e =>
      !e.startsWith('.') && e !== 'node_modules' && e !== '.git'
    ).sort();
    for (const entry of entries) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(path.join(ROOT, full));
      if (stat.isDirectory()) {
        out += `${prefix}${entry}/\n`;
        walk(full, prefix + '  ', depth + 1);
      } else if (depth < 2) {
        out += `${prefix}${entry}\n`;
      }
    }
  }

  walk('.');
  out += '```\n\n## Key Directories\n\n';

  const annotations = {
    'tools/': 'MCP server and domain tools',
    'tools/mcp/': 'Model Context Protocol server',
    '.opencode/': 'OpenCode agent configuration',
    '.opencode/plugin/': 'Plugin modules (11 domains)',
    '.opencode/skills/': 'Loadable skill definitions',
    '.opencode/agent/': 'Agent prompt files',
    '.opencode/commands/': 'Slash commands',
    '.opencode/instructions/': 'System instructions',
    'knowledge/': 'DevIQ knowledge base (254 articles)',
    'tests/': 'Unit and structural tests',
    'scripts/': 'CLI scripts (install, bump, test)',
    'docs/': 'Project documentation',
    '.github/': 'GitHub Actions workflows',
  };

  for (const [dir, desc] of Object.entries(annotations)) {
    if (exists(dir)) out += `- \`${dir}\` - ${desc}\n`;
  }

  fs.writeFileSync(path.join(CTX, 'STRUCTURE.md'), out);
}

// --- 3. DEPENDENCIES.md ---
function generateDependencies() {
  const pkg = JSON.parse(read('package.json') || '{}');
  let out = '# Dependencies\n\n';

  if (pkg.dependencies) {
    out += '## Production\n\n| Package | Purpose |\n|---------|--------|\n';
    for (const [name, ver] of Object.entries(pkg.dependencies)) {
      out += `| ${name} | ${ver} |\n`;
    }
    out += '\n';
  }

  if (pkg.devDependencies) {
    out += '## Development\n\n| Package | Purpose |\n|---------|--------|\n';
    for (const [name, ver] of Object.entries(pkg.devDependencies)) {
      out += `| ${name} | ${ver} |\n`;
    }
    out += '\n';
  }

  fs.writeFileSync(path.join(CTX, 'DEPENDENCIES.md'), out);
}

// --- 4. CONVENTIONS.md ---
function generateConventions() {
  let out = '# Conventions\n\n';

  // From package.json
  const pkg = JSON.parse(read('package.json') || '{}');
  if (pkg.type) out += `- **Module system:** ${pkg.type === 'module' ? 'ESM (import/export)' : 'CommonJS (require)'}\n`;

  // From existing docs
  const agents = read('AGENTS.md');
  if (agents) {
    const codeStandards = agents.match(/## Code Standards[\s\S]*?(?=\n## )/);
    if (codeStandards) out += `\n${codeStandards[0]}\n`;
  }

  // Git conventions
  out += '\n## Git\n\n';
  out += '- Conventional commits: `type(scope): description`\n';
  out += '- Protected branches: main\n';
  out += '- Feature branches: `feat/`, `fix/`, `chore/`\n';
  out += '- Semver: only feat/fix/perf trigger releases\n';

  // Test conventions
  out += '\n## Testing\n\n';
  out += `- Runner: node --test\n`;
  out += `- Files: tests/*.test.mjs\n`;
  out += `- Run: node --test --test-concurrency=1 tests/*.test.mjs\n`;

  fs.writeFileSync(path.join(CTX, 'CONVENTIONS.md'), out);
}

// --- 5. ENTRY_POINTS.md ---
function generateEntryPoints() {
  let out = '# Entry Points\n\nWhere to start reading this project.\n\n';

  const entries = [
    ['opencode.json', 'Agent configuration (agents, plugins, commands, permissions)'],
    ['tools/mcp/index.mjs', 'MCP server entry (registers all domain tools)'],
    ['.opencode/plugin/zara.mjs', 'Plugin composition root (assembles 11 modules)'],
    ['.opencode/instructions/system.md', 'System behavior instructions'],
    ['AGENTS.md', 'Agent dispatch map and routing table'],
    ['prompts/philosophy.md', 'Engineering priorities and decision framework'],
    ['scripts/bump-version.sh', 'Release automation (conventional commits to semver)'],
  ];

  out += '| File | Purpose |\n|------|--------|\n';
  for (const [file, desc] of entries) {
    if (exists(file)) out += `| \`${file}\` | ${desc} |\n`;
  }

  out += '\n## Quick Start\n\n';
  out += '1. Read `opencode.json` for project structure\n';
  out += '2. Read `.opencode/instructions/system.md` for behavior rules\n';
  out += '3. Read `AGENTS.md` for agent routing and dispatch\n';
  out += '4. Run `node --test --test-concurrency=1 tests/*.test.mjs` to verify\n';

  fs.writeFileSync(path.join(CTX, 'ENTRY_POINTS.md'), out);
}

// --- Run all ---
console.log('Generating .context/ ...');
generateProject();
generateStructure();
generateDependencies();
generateConventions();
generateEntryPoints();
console.log(`Done. ${ls('.context').length} files in .context/`);
