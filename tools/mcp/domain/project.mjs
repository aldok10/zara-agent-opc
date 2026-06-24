import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { semanticLearn } from '../../memory-db.mjs';

function detectProjectName(root) {
  try {
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
    const match = remote.match(/\/([^/]+?)(?:\.git)?$/);
    if (match) return match[1];
  } catch {}
  return path.basename(root);
}

function readJson(fp) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return null; }
}

function topDirs(root) {
  try {
    return fs.readdirSync(root, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'vendor')
      .map(e => e.name);
  } catch { return []; }
}

function extractStack(root) {
  const facts = [];
  const pkg = readJson(path.join(root, 'package.json'));
  if (pkg) {
    facts.push({ slug: 'node', value: `Node.js project: ${pkg.name || 'unnamed'}` });
    if (pkg.type === 'module') facts.push({ slug: 'esm', value: 'Uses ESM (type: module)' });
    const deps = Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.devDependencies || {}));
    if (deps.length) facts.push({ slug: 'deps', value: `Key deps: ${deps.slice(0, 15).join(', ')}` });
  }
  if (fs.existsSync(path.join(root, 'go.mod'))) {
    const mod = fs.readFileSync(path.join(root, 'go.mod'), 'utf-8');
    const modName = mod.match(/^module\s+(.+)/m)?.[1] || '';
    facts.push({ slug: 'go', value: `Go module: ${modName}` });
  }
  if (fs.existsSync(path.join(root, 'Cargo.toml'))) facts.push({ slug: 'rust', value: 'Rust project (Cargo.toml)' });
  if (fs.existsSync(path.join(root, 'composer.json'))) {
    const c = readJson(path.join(root, 'composer.json'));
    facts.push({ slug: 'php', value: `PHP project: ${c?.name || 'unnamed'}` });
  }
  return facts;
}

function extractTests(root) {
  const patterns = [
    ['jest', 'jest.config'],
    ['vitest', 'vitest.config'],
    ['mocha', '.mocharc'],
    ['go-test', '*_test.go'],
    ['phpunit', 'phpunit.xml'],
  ];
  const found = [];
  for (const [name, pattern] of patterns) {
    try {
      const entries = fs.readdirSync(root);
      if (entries.some(e => e.includes(pattern))) found.push(name);
    } catch {}
  }
  // Check for test directories
  for (const dir of ['test', 'tests', '__tests__', 'spec']) {
    if (fs.existsSync(path.join(root, dir))) found.push(`dir:${dir}`);
  }
  return found.length ? [{ slug: 'framework', value: `Test setup: ${found.join(', ')}` }] : [];
}

function extractCI(root) {
  const facts = [];
  if (fs.existsSync(path.join(root, '.github', 'workflows'))) {
    const wfs = fs.readdirSync(path.join(root, '.github', 'workflows')).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    facts.push({ slug: 'github-actions', value: `GitHub Actions: ${wfs.join(', ')}` });
  }
  if (fs.existsSync(path.join(root, '.gitlab-ci.yml'))) facts.push({ slug: 'gitlab-ci', value: 'GitLab CI configured' });
  return facts;
}

function extractStructure(root) {
  const dirs = topDirs(root);
  return dirs.length ? [{ slug: 'dirs', value: `Top-level dirs: ${dirs.join(', ')}` }] : [];
}

class ProjectTools {
  get tools() {
    return {
      project_learn: {
        description: 'Extract project knowledge (stack, structure, tests, CI) from the current workspace and store as scoped facts. Run once per project to teach Zara about the codebase.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Project root (defaults to cwd)' },
          },
        },
        handler: (args) => this.#handle(args),
      },
    };
  }

  #handle(args) {
    const root = path.resolve(args.path || process.cwd());
    if (!fs.existsSync(root)) return `Error: ${root} not found`;

    const project = detectProjectName(root);
    const scope = `project:${project}`;
    const extractors = [
      { category: 'stack', fn: extractStack },
      { category: 'structure', fn: extractStructure },
      { category: 'tests', fn: extractTests },
      { category: 'ci', fn: extractCI },
    ];

    let total = 0;
    const summary = [];

    for (const { category, fn } of extractors) {
      const facts = fn(root);
      for (const { slug, value } of facts) {
        const key = `project:${project}:${category}:${slug}`;
        const type = category === 'stack' ? 'architecture' : 'fact';
        semanticLearn(key, value, 'observed', type, scope);
        total++;
      }
      if (facts.length) summary.push(`${category}: ${facts.length}`);
    }

    return `Extracted ${total} facts about "${project}" (${summary.join(', ')}). Scope: ${scope}\nUse memory_recall with scope "${scope}" to retrieve.`;
  }
}

export default new ProjectTools().tools;
