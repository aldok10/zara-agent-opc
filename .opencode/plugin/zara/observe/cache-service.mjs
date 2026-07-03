// Cache Service — TTL + LRU cache for read-only tool results

import { FileStore, today, hash } from '../infra/store.mjs';

export class CacheService {
  #store = new FileStore('cache');
  #cache = null;
  #stats = null;
  #ttl = 4 * 3600000;
  #max = 100;
  #cacheable = new Set(['web_search', 'webfetch', 'context7_query-docs', 'context7_resolve-library-id']);

  isCacheable(tool) { return this.#cacheable.has(tool); }

  get(tool, args) {
    const c = this.#getCache();
    const key = hash(`${tool}:${JSON.stringify(args)}`);
    const entry = c[key];
    if (entry && (Date.now() - entry.ts) < this.#ttl) { this.#getStats().hits++; this.#save(); return entry.output; }
    this.#getStats().misses++;
    this.#save();
    return null;
  }

  set(tool, args, output) {
    if (!output || (typeof output === 'string' && output.startsWith('Error'))) return;
    const c = this.#getCache();
    c[hash(`${tool}:${JSON.stringify(args)}`)] = { output, ts: Date.now() };
    this.#evict();
    this.#save();
  }

  stats() {
    const s = this.#getStats();
    const total = s.hits + s.misses;
    return { hitRate: total ? Math.round((s.hits / total) * 100) : 0, ...s, entries: Object.keys(this.#getCache()).length };
  }

  clear() { this.#cache = {}; this.#save(); }

  #getCache() { if (!this.#cache) this.#cache = this.#store.readJSON('cache.json') || {}; return this.#cache; }
  #getStats() {
    if (!this.#stats) this.#stats = this.#store.readJSON('stats.json') || { hits: 0, misses: 0, today: '' };
    if (this.#stats.today !== today()) this.#stats = { hits: 0, misses: 0, today: today() };
    return this.#stats;
  }
  #evict() {
    const entries = Object.entries(this.#getCache()).filter(([, v]) => (Date.now() - v.ts) < this.#ttl)
      .sort((a, b) => b[1].ts - a[1].ts).slice(0, this.#max);
    this.#cache = Object.fromEntries(entries);
  }
  #save() {
    // Debounce: write at most once per 30s
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this.#store.writeJSON('cache.json', this.#cache);
      this.#store.writeJSON('stats.json', this.#stats);
      this._saveTimer = null;
    }, 30000);
  }
  flush() { if (this._saveTimer) { clearTimeout(this._saveTimer); this._saveTimer = null; } this.#store.writeJSON('cache.json', this.#cache); this.#store.writeJSON('stats.json', this.#stats); }
}
