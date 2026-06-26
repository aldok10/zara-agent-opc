// Dev module — Codebase, Sandbox, Principles, HITL
// Ported from: zara-codebase, zara-ctx, zara-senior-dev, zara-hitl

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { tool } from '@opencode-ai/plugin';
import { FileStore, HOME, loadJson, saveJson } from '../infra/store.mjs';

const z = tool.schema;

// ─── Skill Auto-Router (lightweight keyword match) ──────────────────────────

const SKILL_ROUTES = [
  // Languages & Frameworks
  { keywords: ['go ', 'golang', '.go', 'go.mod', 'go build', 'go test'], skill: 'golang-expert' },
  { keywords: ['php', 'laravel', 'composer', 'swoole', 'frankenphp', 'roadrunner'], skill: 'php-expert' },
  { keywords: ['typescript', 'tsconfig', 'tsc ', 'type system', 'generics'], skill: 'typescript-expert' },
  { keywords: ['javascript', 'esm', 'commonjs', 'node.js', 'nodejs', 'npm ', 'package.json'], skill: 'javascript-expert' },
  { keywords: ['react', 'jsx', 'tsx', 'usestate', 'useeffect', 'server component'], skill: 'react-expert' },
  { keywords: ['next.js', 'nextjs', 'app router', 'getserversideprops'], skill: 'nextjs-expert' },
  { keywords: ['python', '.py', 'pip ', 'pyproject', 'virtualenv', 'poetry'], skill: 'python-expert' },
  { keywords: ['rust ', 'cargo', 'ownership', 'lifetimes', 'borrow checker'], skill: 'rust-expert' },
  { keywords: ['css', 'flexbox', 'grid layout', 'tailwind', 'animation'], skill: 'css-expert' },
  { keywords: ['graphql', 'resolver', 'mutation', 'subscription', 'schema.graphql'], skill: 'graphql-expert' },
  { keywords: ['wasm', 'webassembly', 'wasi', 'component model'], skill: 'wasm-expert' },
  { keywords: ['regex', 'regular expression', 'pattern match', 'capture group'], skill: 'regex-expert' },

  // Infrastructure & DevOps
  { keywords: ['docker', 'dockerfile', 'docker-compose', 'container'], skill: 'docker' },
  { keywords: ['kubernetes', 'kubectl', 'k8s', 'pod', 'deployment', 'helm chart'], skill: 'kubernetes' },
  { keywords: ['helm', 'chart.yaml', 'values.yaml', 'helm template'], skill: 'helm' },
  { keywords: ['terraform', '.tf', 'tfstate', 'hcl', 'terraform plan'], skill: 'terraform' },
  { keywords: ['ansible', 'playbook', 'inventory', 'ansible-vault'], skill: 'ansible' },
  { keywords: ['nginx', 'reverse proxy', 'upstream', 'server block'], skill: 'nginx' },
  { keywords: ['ci/cd', 'github actions', 'gitlab ci', 'pipeline', 'jenkins'], skill: 'ci-cd' },
  { keywords: ['prometheus', 'promql', 'alertmanager', 'grafana'], skill: 'prometheus' },

  // Cloud
  { keywords: ['aws', 'ec2', 's3', 'lambda', 'iam policy', 'cloudformation'], skill: 'aws' },
  { keywords: ['gcp', 'gcloud', 'cloud run', 'bigquery', 'gke'], skill: 'gcp' },
  { keywords: ['azure', 'az ', 'aks', 'app service', 'azure devops'], skill: 'azure' },

  // Databases
  { keywords: ['postgres', 'postgresql', 'pg_', 'psql', 'plpgsql'], skill: 'postgres-expert' },
  { keywords: ['sqlite', 'wal mode', '.sqlite', 'sqlite3'], skill: 'sqlite-expert' },
  { keywords: ['redis', 'pub/sub', 'redis cluster', 'redisearch'], skill: 'redis-expert' },
  { keywords: ['mongodb', 'mongosh', 'aggregation pipeline', 'mongoose'], skill: 'mongodb' },
  { keywords: ['elasticsearch', 'kibana', 'lucene', 'es query'], skill: 'elasticsearch' },
  { keywords: ['sql ', 'select ', 'join ', 'index ', 'query optimization'], skill: 'sql-analyst' },
  { keywords: ['vector db', 'embedding', 'similarity search', 'pinecone', 'qdrant', 'chromadb'], skill: 'vector-db' },

  // Security & Auth
  { keywords: ['security audit', 'owasp', 'penetration', 'vulnerability', 'cve'], skill: 'security-audit' },
  { keywords: ['oauth', 'oidc', 'pkce', 'authorization code', 'refresh token'], skill: 'oauth-expert' },
  { keywords: ['tls', 'certificate', 'encryption', 'aes', 'rsa', 'hmac', 'jwt'], skill: 'crypto-expert' },
  { keywords: ['compliance', 'soc 2', 'gdpr', 'hipaa', 'pci-dss'], skill: 'compliance' },

  // Development Workflow
  { keywords: ['bug', 'error', 'crash', 'failing', 'broken', 'debug'], skill: 'systematic-debugging' },
  { keywords: ['code review', 'pr review', 'review this'], skill: 'code-review' },
  { keywords: ['test', 'tdd', 'coverage', 'unit test', 'integration test'], skill: 'tdd' },
  { keywords: ['git rebase', 'merge conflict', 'cherry-pick', 'git reset', 'reflog'], skill: 'git-expert' },
  { keywords: ['worktree', 'git worktree'], skill: 'git-worktrees' },
  { keywords: ['github', 'gh pr', 'gh issue', 'actions', 'workflow'], skill: 'github' },
  { keywords: ['openapi', 'swagger', 'api spec', 'openapi.yaml'], skill: 'openapi-expert' },
  { keywords: ['shell script', 'bash', 'zsh', 'set -e', 'shebang'], skill: 'shell-scripting' },

  // AI & ML
  { keywords: ['mcp', 'mcp server', 'model context protocol'], skill: 'mcp-development' },
  { keywords: ['agent', 'orchestr', 'multi-agent', 'agent system'], skill: 'agent-architecture' },
  { keywords: ['fine-tune', 'finetune', 'lora', 'qlora', 'training data'], skill: 'llm-finetuning' },
  { keywords: ['prompt engineer', 'chain of thought', 'few-shot', 'system prompt'], skill: 'prompt-engineer' },
  { keywords: ['machine learning', 'pytorch', 'scikit', 'model training', 'mlops'], skill: 'ml-engineer' },
  { keywords: ['ai engineer', 'transformer', 'attention', 'inference', 'rag '], skill: 'ai-engineering' },

  // Communication & Writing
  { keywords: ['email', 'write email', 'email template', 'professional email'], skill: 'email-writer' },
  { keywords: ['presentation', 'slides', 'keynote', 'pitch deck'], skill: 'presentation' },
  { keywords: ['technical writing', 'documentation', 'api docs', 'adr'], skill: 'technical-writer' },
  { keywords: ['writing style', 'grammar', 'clarity', 'rewrite this'], skill: 'writing-coach' },

  // Project & Team
  { keywords: ['project manage', 'sprint', 'estimation', 'agile', 'scrum'], skill: 'project-manager' },
  { keywords: ['linear', 'linear issue', 'cycle', 'linear project'], skill: 'linear-tools' },
  { keywords: ['jira', 'jira ticket', 'epic', 'story point'], skill: 'jira' },
  { keywords: ['confluence', 'wiki', 'space', 'confluence page'], skill: 'confluence' },
  { keywords: ['notion', 'notion page', 'database', 'notion api'], skill: 'notion' },
  { keywords: ['slack', 'slack bot', 'webhook', 'slack api'], skill: 'slack-tools' },

  // Data & Analytics
  { keywords: ['data analysis', 'pandas', 'statistics', 'visualization', 'matplotlib'], skill: 'data-analyst' },
  { keywords: ['etl', 'data pipeline', 'airflow', 'dbt', 'spark'], skill: 'data-pipeline' },

  // Specialized
  { keywords: ['swig', 'typemap', 'interface file', '.i file'], skill: 'swig-expert' },
  { keywords: ['reverse engineer', 'decompil', 'disassembl', 'binary analysis'], skill: 'reverse-engineering' },
  { keywords: ['metatrader', 'mt5', 'trading bot', 'mql5'], skill: 'metatrader5-sdk' },
  { keywords: ['interview', 'leetcode', 'system design interview', 'behavioral'], skill: 'interview-prep' },
  { keywords: ['figma', 'design system', 'auto-layout', 'handoff'], skill: 'figma-expert' },
  { keywords: ['sentry', 'error tracking', 'sentry issue'], skill: 'sentry' },
  { keywords: ['pdf', 'extract pdf', 'read pdf', 'pdf content'], skill: 'pdf-reader' },
  { keywords: ['searxng', 'metasearch', 'privacy search'], skill: 'searxng' },

  // Zara Internal / Meta
  { keywords: ['opencode plugin', 'opencode config', 'opencode.json'], skill: 'opencode-plugin-dev' },
  { keywords: ['customize opencode', '.opencode/', 'opencode agent'], skill: 'customize-opencode' },
  { keywords: ['ponytail', 'lazy mode', 'simplest solution', 'over-engineer'], skill: 'ponytail' },
  { keywords: ['leadership', 'coaching', 'delegation', 'team dynamic'], skill: 'leadership-expert' },
  { keywords: ['9router', 'ninerouter', 'ai gateway'], skill: '9router' },
  { keywords: ['infisical', 'vault', 'secret sync'], skill: 'infisical-sync-skill' },
  { keywords: ['browser automat', 'playwright', 'puppeteer', 'headless'], skill: 'browser-automation' },

  // Networking
  { keywords: ['iptables', 'nftables', 'routing table', 'dns', 'tcpdump', 'network'], skill: 'linux-networking' },
  { keywords: ['sysadmin', 'systemctl', 'journalctl', 'cron', 'disk usage'], skill: 'sysadmin' },
];

function suggestSkill(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const route of SKILL_ROUTES) {
    if (route.keywords.some(k => lower.includes(k))) return { type: 'found', skill: route.skill };
  }
  // Detect unmatched technical topics that could become new skills
  const topic = detectNewSkillCandidate(lower);
  if (topic) return { type: 'create', topic };
  return null;
}

// Heuristic: user mentions a tool/framework/technology we don't have a skill for
const TECH_SIGNALS = /\b(how to|setup|configure|implement|integrate|deploy|migrate|upgrade|build with|use)\b/;
const SKIP_WORDS = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'be', 'to', 'of', 'and', 'or', 'in', 'on', 'at', 'for', 'with', 'from', 'by', 'it', 'this', 'that', 'my', 'your', 'we', 'i', 'can', 'do', 'how', 'what', 'why', 'when']);

function detectNewSkillCandidate(text) {
  // Only trigger if message looks like a technical question/request
  if (!TECH_SIGNALS.test(text)) return null;
  if (text.length < 20) return null;
  // Extract potential tech terms (alphanumeric with dots/hyphens, typical of tools)
  const words = text.match(/[a-z][a-z0-9.-]+/g) || [];
  const candidates = words.filter(w => w.length >= 4 && !SKIP_WORDS.has(w));
  if (candidates.length < 2) return null;
  // Prefer words with dots/hyphens (next.js, vue-router) or uncommon terms (not English verbs/nouns)
  const COMMON_VERBS = new Set(['setup', 'configure', 'implement', 'integrate', 'deploy', 'migrate', 'upgrade', 'build', 'create', 'make', 'want', 'need', 'like', 'using', 'have', 'does', 'should', 'would', 'could', 'just', 'also', 'then', 'some', 'about', 'into', 'over', 'more', 'much', 'very', 'here', 'there', 'where', 'after', 'before', 'between', 'through', 'already', 'still', 'keep', 'authentication', 'database', 'migrations', 'connection', 'server', 'client', 'project', 'application', 'function', 'service', 'request', 'response', 'model', 'controller', 'handler', 'middleware', 'route', 'endpoint']);
  const techCandidates = candidates.filter(w => !COMMON_VERBS.has(w));
  // If we have specific tech words, pick the most likely tool name
  if (techCandidates.length > 0) {
    // Prefer words with special chars (dots, hyphens) then shortest-unusual (tool names are often short)
    const special = techCandidates.filter(w => /[.-]/.test(w));
    if (special.length) return special[0];
    return techCandidates[0];
  }
  return null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PROJECTS_DIR = path.join(HOME, 'projects');
const CTX_CACHE_DIR = path.join(HOME, 'ctx', 'cache');
const HITL_DIR = path.join(HOME, 'hitl');
const DECISIONS_FILE = path.join(HITL_DIR, 'decisions.jsonl');
// ─── Codebase Helpers ───────────────────────────────────────────────────────

function projectId(dir) {
  return crypto.createHash('md5').update(dir).digest('hex').slice(0, 12);
}

function projectFile(dir) {
  return path.join(PROJECTS_DIR, `${projectId(dir)}.json`);
}

function scanProject(dir) {
  const scan = { lang: [], entryPoints: [], configFiles: [], dirs: [], fileCount: 0, commands: [], scannedAt: new Date().toISOString() };
  try {
    const topFiles = fs.readdirSync(dir).filter(f => !f.startsWith('.') && f !== 'node_modules' && f !== 'vendor');
    for (const f of topFiles) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) { scan.dirs.push(f); continue; }
      scan.fileCount++;
      if (f === 'go.mod') scan.lang.push('go');
      if (f === 'composer.json') scan.lang.push('php');
      if (f === 'Cargo.toml') scan.lang.push('rust');
      if (f === 'package.json') scan.lang.push('javascript');
      if (f === 'tsconfig.json') scan.lang.push('typescript');
      if (f === 'pyproject.toml' || f === 'setup.py') scan.lang.push('python');
      if (f === 'Gemfile') scan.lang.push('ruby');
      if (f === 'main.go' || f === 'main.py' || f === 'index.ts' || f === 'index.js' || f === 'app.ts' || f === 'app.js') {
        scan.entryPoints.push(f);
      }
      if (f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.toml') || f === 'Makefile' || f === 'Dockerfile') {
        scan.configFiles.push(f);
      }
    }
    for (const d of scan.dirs.slice(0, 10)) {
      try {
        const sub = fs.readdirSync(path.join(dir, d));
        scan.fileCount += sub.length;
        if (d === 'cmd') {
          const cmds = sub.filter(s => fs.statSync(path.join(dir, d, s)).isDirectory());
          scan.entryPoints.push(...cmds.map(c => `cmd/${c}`));
        }
      } catch {}
    }
    scan.lang = [...new Set(scan.lang)];
  } catch {}
  scan.commands = discoverCommands(dir);
  return scan;
}

function discoverCommands(dir) {
  const commands = [];

  // package.json scripts
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'));
    if (pkg.scripts) {
      for (const [name, cmd] of Object.entries(pkg.scripts)) {
        commands.push({ name, cmd: `npm run ${name}`, source: 'package.json' });
      }
    }
  } catch {}

  // Makefile targets
  try {
    const makefile = fs.readFileSync(path.join(dir, 'Makefile'), 'utf-8');
    const targets = makefile.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):/gm) || [];
    for (const t of targets) {
      const name = t.replace(':', '');
      if (!name.startsWith('.') && name !== 'all') {
        commands.push({ name, cmd: `make ${name}`, source: 'Makefile' });
      }
    }
  } catch {}

  // Taskfile.yml
  try {
    const taskfile = fs.readFileSync(path.join(dir, 'Taskfile.yml'), 'utf-8');
    const tasks = taskfile.match(/^\s{2}([a-zA-Z_][a-zA-Z0-9_-]*):/gm) || [];
    for (const t of tasks) {
      const name = t.trim().replace(':', '');
      commands.push({ name, cmd: `task ${name}`, source: 'Taskfile.yml' });
    }
  } catch {}

  return commands;
}

// ─── 8 Principles ──────────────────────────────────────────────────────────

const CREED = [
  { id: 'delete-first', mantra: 'Delete first. Add second. Only if you must.', ask: 'What can I remove before I add anything?', signals: ['adding code/deps', 'new abstraction', 'new feature'] },
  { id: 'readability', mantra: 'Code is written once. Read a hundred times.', ask: 'Will the next engineer understand this in 30 seconds?', signals: ['clever code', 'deep nesting', 'implicit behavior'] },
  { id: 'solve-the-problem', mantra: 'Solve the problem in front of you. Not the one you imagine.', ask: 'Am I solving a real problem or an imagined future problem?', signals: ['speculative', 'what-if', 'might need later'] },
  { id: 'data-beats-debate', mantra: 'Measure before you decide.', ask: 'Do I have data, or just an opinion?', signals: ['performance claim', 'optimization', 'technology choice'] },
  { id: 'ship-to-learn', mantra: 'Ship small. Ship often. Learn from real usage.', ask: 'What is the smallest thing I can ship to learn?', signals: ['big bang change', 'long-running branch', 'delayed release'] },
  { id: 'consistency', mantra: 'Consistency is the closest thing to correctness.', ask: 'Does this follow existing patterns, or introduce a new one?', signals: ['new pattern', 'different style', 'breaking convention'] },
  { id: 'good-enough', mantra: 'Good enough today beats perfect tomorrow.', ask: 'Is this good enough to ship, or am I polishing?', signals: ['perfectionism', 'gold-plating', 'scope creep'] },
  { id: 'future-self', mantra: 'Your future self is not your friend. Write for a stranger.', ask: 'If I read this in 6 months during an outage, would I understand it immediately?', signals: ['magic values', 'missing docs', 'complex flow'] },
];

// ─── Module Export ──────────────────────────────────────────────────────────

export default function createDev({ client, directory } = {}) {
  const dir = directory || process.cwd();
  const file = projectFile(dir);

  // Codebase project state
  let project = null;
  function getProject(skipScan = false) {
    if (project) return project;
    project = loadJson(file, null);
    if (skipScan) {
      if (!project) project = { dir, name: path.basename(dir), scan: { lang: [], entryPoints: [], configFiles: [], dirs: [], fileCount: 0 }, notes: [], conventions: [], architecture: null, visits: 0 };
      return project;
    }
    const freshScan = scanProject(dir);
    if (!project) {
      project = { dir, name: path.basename(dir), scan: freshScan, notes: [], conventions: [], architecture: null, visits: 1 };
    } else {
      project.scan = freshScan;
      project.visits++;
    }
    saveJson(file, project);
    return project;
  }

  return {
    // ── Hooks ──────────────────────────────────────────────────────────────

    inject(messages) {
      // Skill auto-routing: scan last user message
      const lastUser = [...messages].reverse().find(m => m.role === 'user');
      const userText = typeof lastUser?.content === 'string' ? lastUser.content : '';
      const suggestion = suggestSkill(userText);

      const p = getProject(true);
      if (p.scan.lang.length || p.conventions.length || p.architecture || suggestion) {
        const parts = [`## Project Context (${p.name})`];
        if (p.scan.lang.length) parts.push(`Lang: ${p.scan.lang.join(', ')}`);
        if (p.architecture) parts.push(`Arch: ${p.architecture}`);
        if (p.conventions.length) parts.push(`Conventions: ${p.conventions.slice(0, 5).join('; ')}`);
        if (p.notes.length) parts.push(`Recent: ${p.notes.slice(-3).join(' | ')}`);
        if (suggestion?.type === 'found') {
          parts.push(`\n## Skill Suggestion\nLoad \`${suggestion.skill}\` before responding (auto-detected from user message).`);
        } else if (suggestion?.type === 'create') {
          parts.push(`\n## New Skill Opportunity\nNo existing skill matches topic "${suggestion.topic}". Consider creating one:\n1. Web search for "${suggestion.topic} best practices cheatsheet"\n2. Find existing skills that overlap (use \`find-skills\` or check ~/.agents/skills/)\n3. Create at ~/.agents/skills/${suggestion.topic}/SKILL.md with: context, key patterns, common pitfalls, commands\n4. Keep it under 200 lines. Reuse patterns from similar existing skills.\nOnly create if this topic is likely to recur. Skip for one-off questions.`);
        }
        const block = parts.join(' | ');
        const last = messages[messages.length - 1];
        if (last && last.role === 'system') {
          last.content += '\n\n' + block;
        } else {
          messages.push({ role: 'system', content: block });
        }
      }
      return messages;
    },

    // ── Tools ──────────────────────────────────────────────────────────────

    tools: {
      // ── Codebase Tools ──────────────────────────────────────────────────

      codebase_info: tool({
        description: 'Get current project understanding — languages, structure, conventions, architecture notes.',
        args: {},
        async execute() {
          const p = getProject();
          const parts = [
            `**Project**: ${p.name} (${p.dir})`,
            `**Languages**: ${p.scan.lang.join(', ') || 'unknown'}`,
            `**Dirs**: ${p.scan.dirs.join(', ')}`,
            `**Entry points**: ${p.scan.entryPoints.join(', ') || 'none detected'}`,
            `**Config**: ${p.scan.configFiles.join(', ')}`,
            `**Files**: ~${p.scan.fileCount}`,
            `**Visits**: ${p.visits}`,
          ];
          if (p.conventions.length) parts.push(`**Conventions**: ${p.conventions.join('; ')}`);
          if (p.architecture) parts.push(`**Architecture**: ${p.architecture}`);
          if (p.notes.length) parts.push(`**Notes**: ${p.notes.slice(-5).join(' | ')}`);
          return { output: parts.join('\n') };
        },
      }),

      codebase_note: tool({
        description: 'Add a note about this project (architecture insight, gotcha, convention). Persists across sessions.',
        args: {
          note: z.string().describe('The note to add'),
          type: z.enum(['convention', 'architecture', 'gotcha', 'dependency', 'pattern']).optional().describe('Note type'),
        },
        async execute(args) {
          const p = getProject();
          if (args.type === 'architecture') {
            p.architecture = args.note;
          } else if (args.type === 'convention') {
            if (!p.conventions.includes(args.note)) p.conventions.push(args.note);
          } else {
            p.notes.push(`[${args.type || 'note'}] ${args.note}`);
            if (p.notes.length > 30) p.notes = p.notes.slice(-30);
          }
          saveJson(file, p);
          return { output: `Project note saved (${args.type || 'general'})` };
        },
      }),

      codebase_conventions: tool({
        description: 'Set or list project conventions (naming, structure, patterns to follow).',
        args: {
          add: z.string().optional().describe('Add a new convention'),
          list: z.boolean().optional().describe('List all conventions'),
        },
        async execute(args) {
          const p = getProject();
          if (args.add) {
            if (!p.conventions.includes(args.add)) p.conventions.push(args.add);
            saveJson(file, p);
            return { output: `Convention added: "${args.add}" (${p.conventions.length} total)` };
          }
          if (!p.conventions.length) return { output: 'No conventions recorded yet.' };
          return { output: p.conventions.map((c, i) => `${i + 1}. ${c}`).join('\n') };
        },
      }),

      // ── Sandbox Tools ───────────────────────────────────────────────────

      ctx_execute: tool({
        description: 'Run code in a sandbox subprocess. Only stdout enters context (saves tokens). Use for analysis, counting, data processing.',
        args: {
          language: z.enum(['javascript', 'shell', 'python']).describe('Language to execute'),
          code: z.string().describe('Code to run'),
        },
        async execute(args) {
          const ctxDir = path.join(HOME, 'ctx');
          fs.mkdirSync(ctxDir, { recursive: true });
          const tmpFile = path.join(ctxDir, `exec-${crypto.randomUUID()}.tmp`);

          const langMap = {
            javascript: { cmd: 'node', ext: '.mjs' },
            shell: { cmd: 'bash', ext: '.sh' },
            python: { cmd: 'python3', ext: '.py' },
          };

          const lang = langMap[args.language];
          const srcFile = tmpFile + lang.ext;

          try {
            fs.writeFileSync(srcFile, args.code, 'utf-8');
            if (args.language === 'shell') fs.chmodSync(srcFile, 0o755);

            // Sanitize env: strip secrets from child process
            const safeEnv = Object.fromEntries(
              Object.entries(process.env).filter(([k]) =>
                !/(?:KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL|AUTH|PRIVATE|DSN|DATABASE|REDIS|MONGO|MYSQL|POSTGRES|AMQP|SMTP|API_?URL|AWS_|AZURE_|GCP_|OPENAI|ANTHROPIC|GITHUB_TOKEN|NPM_TOKEN|DOCKER_)/i.test(k)
              )
            );
            safeEnv.NODE_OPTIONS = '--no-warnings';

            const result = spawnSync(lang.cmd, [srcFile], {
              timeout: 30_000,
              maxBuffer: 1024 * 1024,
              encoding: 'utf-8',
              env: safeEnv,
              cwd: dir,
            });

            // Cleanup
            try { fs.unlinkSync(srcFile); } catch {}
            try { fs.unlinkSync(tmpFile); } catch {}

            if (result.error) {
              return { output: `Execution error: ${result.error.message}${result.error.code === 'ETIMEDOUT' ? ' (timeout 30s)' : ''}` };
            }

            if (result.status !== 0) {
              const stderr = (result.stderr || '').trim().slice(0, 500);
              return { output: `Error (exit ${result.status}):\n${stderr || 'unknown error'}` };
            }

            const stdout = result.stdout?.trim() || '(no output)';
            return {
              output: stdout.slice(0, 30_000),
              metadata: { bytes: stdout.length, language: args.language },
            };
          } catch (err) {
            try { fs.unlinkSync(srcFile); } catch {}
            try { fs.unlinkSync(tmpFile); } catch {}
            return { output: `Execution failed: ${err.message}` };
          }
        },
      }),

      ctx_fetch: tool({
        description: 'Fetch a URL and return content as markdown. Raw HTML never enters context.',
        args: {
          url: z.string().url().describe('URL to fetch'),
        },
        async execute(args) {
          fs.mkdirSync(CTX_CACHE_DIR, { recursive: true });
          const cacheKey = crypto.createHash('md5').update(args.url).digest('hex');
          const cacheFile = path.join(CTX_CACHE_DIR, `${cacheKey}.json`);

          // Check cache (24h TTL)
          if (fs.existsSync(cacheFile)) {
            const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
            if (Date.now() - cached.ts < 86_400_000) {
              return { output: cached.content.slice(0, 30_000), metadata: { cached: true, url: args.url } };
            }
          }

          try {
            const response = await fetch(args.url, {
              signal: AbortSignal.timeout(15_000),
              headers: { 'User-Agent': 'Zara/1.0' },
            });

            if (!response.ok) return { output: `HTTP ${response.status}: ${response.statusText}` };

            const html = await response.text();
            const content = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
              .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
              .replace(/<[^>]+>/g, '')
              .replace(/\n{3,}/g, '\n\n')
              .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
              .trim()
              .slice(0, 50_000);

            fs.writeFileSync(cacheFile, JSON.stringify({ url: args.url, content, ts: Date.now() }), 'utf-8');

            return { output: content.slice(0, 30_000), metadata: { url: args.url, bytes: content.length } };
          } catch (err) {
            return { output: `Fetch failed: ${err.message}` };
          }
        },
      }),

      // ── Principles Tool ─────────────────────────────────────────────────

      zara_principles: tool({
        description: 'Get the 8 engineering principles checklist to evaluate a proposal. Returns all principles with their diagnostic questions — YOU then judge which ones flag concerns based on the actual proposal semantics.',
        args: {
          proposal: z.string().describe('What is being proposed (feature, refactor, dependency, architecture decision)'),
          flagged: z.array(z.enum([
            'delete-first', 'readability', 'solve-the-problem',
            'data-beats-debate', 'ship-to-learn', 'consistency',
            'good-enough', 'future-self'
          ])).optional().describe('Which principles YOU think are violated (optional — if provided, skips checklist and goes straight to verdict)'),
        },
        async execute(args) {
          if (args.flagged?.length) {
            const flaggedPrinciples = CREED.filter(p => args.flagged.includes(p.id));
            const count = flaggedPrinciples.length;
            const verdict = count >= 3 ? 'RETHINK' : count >= 2 ? 'CAUTION' : 'NOTE';
            const lines = [
              `**Verdict: ${verdict}** (${count} principle${count > 1 ? 's' : ''} flagged)`,
              `**Proposal**: ${args.proposal}`,
              '',
              ...flaggedPrinciples.map(p => `- **${p.id}**: ${p.mantra}\n  Ask yourself: ${p.ask}`),
              '',
              count >= 3 ? 'Recommend a different approach.' : 'Proceed with awareness.',
            ];
            return { output: lines.join('\n') };
          }

          const lines = [
            `**Evaluating**: ${args.proposal}`,
            '',
            'Run through each principle. Flag any that raise concerns:',
            '',
            ...CREED.map(p => `- [ ] **${p.id}**: ${p.mantra}\n  Ask: ${p.ask}\n  Watch for: ${p.signals.join(', ')}`),
            '',
            'After checking all 8, call this tool again with `flagged` set to the violated principles for a verdict.',
          ];
          return { output: lines.join('\n') };
        },
      }),

      // ── HITL Tools ──────────────────────────────────────────────────────

      zara_confidence: tool({
        description: 'Rate confidence before a complex change. Low confidence = ask for review.',
        args: {
          action: z.string().describe('What action is being considered'),
          understanding: z.number().min(0).max(1).describe('How well you understand the change (0-1)'),
          risk: z.number().min(0).max(1).describe('Risk level (0=safe, 1=catastrophic)'),
          reversible: z.boolean().describe('Whether the action is easily reversible'),
          testCoverage: z.number().min(0).max(1).optional().describe('Test coverage for affected area (0-1)'),
        },
        async execute(args) {
          const score = Math.round(
            (args.understanding * 0.35 + (1 - args.risk) * 0.35 +
             (args.reversible ? 0.15 : 0) + (args.testCoverage || 0.5) * 0.15) * 100
          );
          const level = score >= 80 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW';
          const action = score >= 80 ? 'proceed' : score >= 50 ? 'proceed with caution' : 'ask user first';

          fs.mkdirSync(HITL_DIR, { recursive: true });
          fs.appendFileSync(DECISIONS_FILE, JSON.stringify({ type: 'confidence', action: args.action, score, level, ts: new Date().toISOString() }) + '\n', 'utf-8');

          return {
            output: `Confidence: ${score}% (${level}) → ${action}\n` +
              `Understanding: ${Math.round(args.understanding * 100)}% | Risk: ${Math.round(args.risk * 100)}% | Reversible: ${args.reversible}`,
          };
        },
      }),

      zara_log_decision: tool({
        description: 'Log an important engineering decision for future reference',
        args: {
          decision: z.string().describe('What was decided'),
          reason: z.string().describe('Why this was chosen'),
          alternatives: z.array(z.string()).optional().describe('What alternatives were considered'),
          tradeoffs: z.string().optional().describe('Key tradeoffs accepted'),
        },
        async execute(args) {
          fs.mkdirSync(HITL_DIR, { recursive: true });
          fs.appendFileSync(DECISIONS_FILE, JSON.stringify({ type: 'decision', ts: new Date().toISOString(), data: args }) + '\n', 'utf-8');
          return { output: `Decision logged: ${args.decision}` };
        },
      }),

      zara_decision_history: tool({
        description: 'Retrieve recent decisions from the log',
        args: {
          limit: z.number().optional().describe('Number of decisions to retrieve (default 10)'),
        },
        async execute(args) {
          const limit = args.limit || 10;
          try {
            if (!fs.existsSync(DECISIONS_FILE)) return { output: 'No decisions logged yet.' };
            const lines = fs.readFileSync(DECISIONS_FILE, 'utf-8').trim().split('\n');
            const recent = lines.slice(-limit).map(l => JSON.parse(l)).reverse();
            return { output: JSON.stringify(recent, null, 2) };
          } catch { return { output: 'No decisions logged yet.' }; }
        },
      }),

      zara_calibration: tool({
        description: 'Report whether a previous confidence assessment was accurate. Tracks calibration over time so future confidence scores improve.',
        args: {
          action: z.string().describe('Which action this is about'),
          predictedConfidence: z.number().min(0).max(100).describe('What confidence score was given (0-100)'),
          actualOutcome: z.enum(['success', 'failure', 'partial']).describe('What actually happened'),
        },
        async execute(args) {
          const accurate = (args.predictedConfidence >= 80 && args.actualOutcome === 'success') ||
                          (args.predictedConfidence < 50 && args.actualOutcome === 'failure') ||
                          (args.predictedConfidence >= 50 && args.predictedConfidence < 80 && args.actualOutcome === 'partial');

          fs.mkdirSync(HITL_DIR, { recursive: true });
          fs.appendFileSync(DECISIONS_FILE, JSON.stringify({ type: 'calibration', ts: new Date().toISOString(), data: args }) + '\n', 'utf-8');

          return {
            output: accurate
              ? `Calibration: accurate (predicted ${args.predictedConfidence}%, got ${args.actualOutcome})`
              : `Calibration: off (predicted ${args.predictedConfidence}%, got ${args.actualOutcome}) — adjust future estimates`,
          };
        },
      }),


    },
  };
}
