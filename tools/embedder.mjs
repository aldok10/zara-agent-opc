import { createHash } from 'node:crypto';

class TrigramEmbedder {
  embed(text) {
    const vec = new Float32Array(128).fill(0);
    const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    for (let i = 0; i < lower.length - 2; i++) {
      const hash = createHash('md5').update(lower.slice(i, i + 3)).digest();
      vec[hash[0] % 128] += 1;
      vec[(hash[1] + 64) % 128] += 0.5;
    }
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map(v => v / mag);
  }

  cosineSim(a, b) { return a.reduce((s, v, i) => s + v * b[i], 0); }
}

let _semanticInstance = null;

class SemanticEmbedder {
  #pipeline = null;
  #ready = null;

  constructor() {
    // Lazy init — model loads on first embed() call
  }

  async #init() {
    if (this.#pipeline) return;
    if (this.#ready) return this.#ready;
    this.#ready = (async () => {
      const { pipeline } = await import('@huggingface/transformers');
      this.#pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        dtype: 'fp32',
      });
    })();
    return this.#ready;
  }

  async embed(text) {
    await this.#init();
    const output = await this.#pipeline(text, { pooling: 'mean', normalize: true });
    return new Float32Array(output.data);
  }

  cosineSim(a, b) {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
  }

  static instance() {
    if (!_semanticInstance) _semanticInstance = new SemanticEmbedder();
    return _semanticInstance;
  }
}

export { TrigramEmbedder, SemanticEmbedder };
