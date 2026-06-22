// Shared infrastructure — FileStore, utilities, constants
// Single Responsibility: file I/O abstraction for all modules

import fs from 'fs';
import path from 'path';
import os from 'os';
import { createHash } from 'crypto';

export const HOME = path.join(os.homedir(), '.zara');

export class FileStore {
  #dir;
  #buffers = new Map();
  #timer = null;

  constructor(subdir) { this.#dir = path.join(HOME, subdir); }
  get dir() { return this.#dir; }

  ensure() { fs.mkdirSync(this.#dir, { recursive: true, mode: 0o700 }); }

  flush() { this.#flush(); }

  path(file) { return path.join(this.#dir, file); }

  exists(file) { return fs.existsSync(this.path(file)); }

  readJSON(file, fallback = null) {
    try { return JSON.parse(fs.readFileSync(this.path(file), 'utf-8')); }
    catch { return fallback; }
  }

  writeJSON(file, data) {
    this.ensure();
    const target = this.path(file);
    const tmp = target + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 });
    fs.renameSync(tmp, target);
  }

  appendLine(file, entry) {
    if (!this.#buffers.has(file)) this.#buffers.set(file, []);
    this.#buffers.get(file).push(JSON.stringify(entry));
    this.#scheduleFlush();
  }

  readLines(file, max = 200) {
    this.#flush();
    try {
      return fs.readFileSync(this.path(file), 'utf-8')
        .trim().split('\n').filter(Boolean).slice(-max).map(l => JSON.parse(l));
    } catch { return []; }
  }

  prune(file, max) {
    try {
      const lines = fs.readFileSync(this.path(file), 'utf-8').trim().split('\n').filter(Boolean);
      if (lines.length > max) fs.writeFileSync(this.path(file), lines.slice(-max).join('\n') + '\n', 'utf-8');
    } catch {}
  }

  pruneOldFiles(pattern, maxDays) {
    try {
      const cutoff = Date.now() - (maxDays * 86400000);
      for (const f of fs.readdirSync(this.#dir).filter(f => f.match(pattern))) {
        if (new Date(f.replace(/\.\w+$/, '')).getTime() < cutoff) fs.unlinkSync(this.path(f));
      }
    } catch {}
  }

  listFiles(pattern) {
    try { return fs.readdirSync(this.#dir).filter(f => f.match(pattern)); }
    catch { return []; }
  }

  #scheduleFlush() {
    if (this.#timer) return;
    this.#timer = setTimeout(() => { this.#timer = null; this.#flush(); }, 3000);
    this.#timer.unref?.();
  }

  #flush() {
    if (!this.#buffers.size) return;
    this.ensure();
    for (const [file, lines] of this.#buffers) {
      fs.appendFileSync(this.path(file), lines.join('\n') + '\n', { encoding: 'utf-8', mode: 0o600 });
    }
    this.#buffers.clear();
  }
}

export function today() { return new Date().toISOString().split('T')[0]; }
export function spanId() { return Math.random().toString(36).slice(2, 10); }
export function estimateTokens(text) {
  if (!text) return 0;
  // Model-aware estimation: different char/token ratios by content type
  const hasCode = /[{}\[\]();=<>]/.test(text);
  const hasIndo = /(?:nggak|udah|gimana|sih|dong|ya|nih|aja|bisa|saya|kami|jangan)/i.test(text);
  const ratio = hasCode ? 2.5 : hasIndo ? 4.0 : 3.5;
  return Math.ceil(text.length / ratio);
}
export function hash(str) {
  return createHash('sha256').update(str).digest('hex').slice(0, 12);
}

// ─── Shared Utilities (DRY consolidation) ────────────────────────────────────

export function ensure(dir) { fs.mkdirSync(dir, { recursive: true }); }

export function loadJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch { return typeof fallback === 'function' ? fallback() : fallback; }
}

export function saveJson(file, data) {
  ensure(path.dirname(file));
  atomicWrite(file, JSON.stringify(data, null, 2));
}

export function atomicWrite(filePath, data) {
  const tmp = filePath + '.tmp.' + Date.now().toString(36);
  try {
    fs.writeFileSync(tmp, data, 'utf-8');
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch {}
    throw err;
  }
}
