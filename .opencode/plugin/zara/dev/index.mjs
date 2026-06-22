// Dev module — Codebase, Sandbox, Principles, HITL
// Ported from: zara-codebase, zara-ctx, zara-senior-dev, zara-hitl

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { tool } from '@opencode-ai/plugin';
import { FileStore, HOME, loadJson, saveJson } from '../infra/store.mjs';

const z = tool.schema;

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
  const scan = { lang: [], entryPoints: [], configFiles: [], dirs: [], fileCount: 0, scannedAt: new Date().toISOString() };
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
  return scan;
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
      const p = getProject(true);
      if (p.scan.lang.length || p.conventions.length || p.architecture) {
        const parts = [`## Project Context (${p.name})`];
        if (p.scan.lang.length) parts.push(`Lang: ${p.scan.lang.join(', ')}`);
        if (p.architecture) parts.push(`Arch: ${p.architecture}`);
        if (p.conventions.length) parts.push(`Conventions: ${p.conventions.slice(0, 5).join('; ')}`);
        if (p.notes.length) parts.push(`Recent: ${p.notes.slice(-3).join(' | ')}`);
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

    dispose() {},

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
