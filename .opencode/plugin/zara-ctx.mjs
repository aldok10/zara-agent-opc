// Zara CTX — Self-contained context sandbox tools
//
// What this does:
//   1. ctx_execute — Run code in subprocess, only stdout enters context
//   2. ctx_execute_file — Process file in sandbox, raw data stays out
//   3. ctx_batch_execute — Multiple commands in one call
//   4. ctx_fetch — Fetch URL, return markdown, raw HTML stays out
//   5. ctx_search — Simple indexed-content search (file-based)
//
// Design: Zero external dependencies. Uses child_process + fetch.
// No SQLite, no FTS5 — just files and grep.
// Data stays in ~/.zara/ctx/ as indexed chunks.
//
// Install in opencode.json:
//   { "plugin": ["./plugins/zara-ctx.mjs"] }

import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const CTX_DIR = path.join(os.homedir(), '.zara', 'ctx');
const INDEX_DIR = path.join(CTX_DIR, 'index');
const CACHE_DIR = path.join(CTX_DIR, 'cache');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ---------------------------------------------------------------------------
// 1. ctx_execute — Run code in sandbox, only stdout in context
// ---------------------------------------------------------------------------
function ctxExecute(language, code) {
  const tmpFile = path.join(CTX_DIR, `exec-${crypto.randomUUID()}.tmp`);
  ensureDir(CTX_DIR);

  try {
    const langMap = {
      javascript: { cmd: 'node', ext: '.mjs' },
      js: { cmd: 'node', ext: '.mjs' },
      typescript: { cmd: 'npx', args: ['tsx'], ext: '.ts' },
      ts: { cmd: 'npx', args: ['tsx'], ext: '.ts' },
      shell: { cmd: 'bash', ext: '.sh' },
      bash: { cmd: 'bash', ext: '.sh' },
      python: { cmd: 'python3', ext: '.py' },
      py: { cmd: 'python3', ext: '.py' },
      ruby: { cmd: 'ruby', ext: '.rb' },
      go: { cmd: 'go', args: ['run'], ext: '.go' },
    };

    const lang = langMap[language] || langMap.javascript;
    const ext = lang.ext || '.mjs';
    const srcFile = tmpFile + ext;

    if (language === 'typescript' || language === 'ts') {
      // For TypeScript, wrap in a quick inline script
      fs.writeFileSync(srcFile, code, 'utf-8');
    } else if (language === 'shell' || language === 'bash') {
      fs.writeFileSync(srcFile, code, 'utf-8');
      fs.chmodSync(srcFile, 0o755);
    } else if (language === 'go') {
      // Go needs a main package — wrap in tmp dir
      const dir = tmpFile;
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'main.go'), code, 'utf-8');
      const result = spawnSync('go', ['run', dir], {
        cwd: dir,
        timeout: 30_000,
        maxBuffer: 1024 * 1024,
        encoding: 'utf-8',
      });
      fs.rmSync(dir, { recursive: true, force: true });
      cleanup(tmpFile);
      return formatResult(result);
    } else {
      fs.writeFileSync(srcFile, code, 'utf-8');
    }

    const cmd = lang.cmd;
    const args = [...(lang.args || []), srcFile];

    const result = spawnSync(cmd, args, {
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
      encoding: 'utf-8',
      env: { ...process.env, NODE_OPTIONS: '--no-warnings' },
    });

    cleanup(tmpFile);
    return formatResult(result, language);
  } catch (err) {
    cleanup(tmpFile);
    return { ok: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// 2. ctx_execute_file — Process a file in sandbox
// ---------------------------------------------------------------------------
function ctxExecuteFile(filePath, language, code) {
  if (!fs.existsSync(filePath)) {
    return { ok: false, error: `File not found: ${filePath}` };
  }

  const absPath = path.resolve(filePath);

  // Inject the file path as an env var or argument
  const injectedCode = language === 'shell' || language === 'bash'
    ? code
    : `const __FILE__ = ${JSON.stringify(absPath)};\nconst __DIR__ = ${JSON.stringify(path.dirname(absPath))};\n${code}`;

  const result = ctxExecute(language, injectedCode);
  return { ...result, file: filePath };
}

// ---------------------------------------------------------------------------
// 3. ctx_batch_execute — Multiple commands in one call
// ---------------------------------------------------------------------------
function ctxBatchExecute(commands) {
  const results = [];
  for (const cmd of commands) {
    const { label, command, language } = cmd;
    const result = ctxExecute(language || 'shell', command);
    results.push({
      label: label || command.slice(0, 60),
      ...result,
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// 4. ctx_fetch — Fetch URL, return markdown, index by default
// ---------------------------------------------------------------------------
async function ctxFetch(url, source) {
  ensureDir(CACHE_DIR);
  const cacheKey = crypto.createHash('md5').update(url).digest('hex');
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);

  // Check cache (24h TTL)
  if (fs.existsSync(cacheFile)) {
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    const age = Date.now() - cached.ts;
    if (age < 86_400_000) {
      return { ok: true, url, source, content: cached.content, cached: true };
    }
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'Zara/1.0' },
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const html = await response.text();
    // Strip HTML tags to get plain text / markdown
    const markdown = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/^\s+/gm, '')
      .trim()
      .slice(0, 50_000); // Limit to 50k chars

    const content = markdown;

    // Cache it
    fs.writeFileSync(cacheFile, JSON.stringify({ url, source, content, ts: Date.now() }), 'utf-8');

    // Index it for search
    if (source) indexContent(content, source);

    return { ok: true, url, source, content, cached: false };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// 5. ctx_search — Simple indexed-content search (grep-based)
// ---------------------------------------------------------------------------
function ctxSearch(queries, source) {
  ensureDir(INDEX_DIR);
  const results = [];

  // Find relevant index files
  let files = fs.readdirSync(INDEX_DIR).filter(f => f.endsWith('.txt'));
  if (source) {
    files = files.filter(f => f.includes(sanitize(source)));
  }

  for (const query of (Array.isArray(queries) ? queries : [queries])) {
    const qLower = query.toLowerCase();
    const matches = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(INDEX_DIR, file), 'utf-8');
      const lines = content.split('\n');
      const hitLines = [];

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(qLower)) {
          const start = Math.max(0, i - 2);
          const end = Math.min(lines.length, i + 3);
          hitLines.push({ line: i + 1, context: lines.slice(start, end).join('\n') });
        }
      }

      if (hitLines.length > 0) {
        matches.push({ source: file.replace('.txt', ''), hits: hitLines });
      }
    }

    results.push({ query, matches });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Index helper — store content for later search
// ---------------------------------------------------------------------------
function indexContent(content, source) {
  ensureDir(INDEX_DIR);
  const name = sanitize(source || `content-${Date.now()}`);
  const file = path.join(INDEX_DIR, `${name}.txt`);

  // Append to existing or create
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') + '\n---\n' : '';
  fs.writeFileSync(file, existing + content, 'utf-8');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatResult(result, language) {
  if (result.error) {
    return { ok: false, error: result.stderr?.trim() || result.error };
  }
  if (result.status !== 0) {
    return {
      ok: false,
      error: result.stderr?.trim() || `Exit code ${result.status}`,
      stdout: result.stdout?.trim() || '',
    };
  }

  const stdout = result.stdout?.trim() || '';
  const stderr = result.stderr?.trim() || '';

  // If only stderr and no stdout, that's suspicious for non-shell
  if (!stdout && stderr && language !== 'shell' && language !== 'bash') {
    return { ok: false, error: stderr };
  }

  return {
    ok: true,
    stdout,
    stderr: stderr || undefined,
    size: stdout.length,
  };
}

function sanitize(str) {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase().slice(0, 100);
}

function cleanup(tmpFile) {
  try {
    if (tmpFile) {
      ['', '.mjs', '.ts', '.sh', '.py', '.rb', '.go'].forEach(ext => {
        try { fs.unlinkSync(tmpFile + ext); } catch {}
      });
    }
  } catch {}
}

// ---------------------------------------------------------------------------
// Exports for direct use
// ---------------------------------------------------------------------------
export {
  ctxExecute,
  ctxExecuteFile,
  ctxBatchExecute,
  ctxFetch,
  ctxSearch,
  indexContent,
};
