import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TrigramEmbedder } from '../tools/embedder.mjs';

describe('embedder contract', () => {
  const embedder = new TrigramEmbedder();

  it('embed() returns fixed-dimension array of numbers', () => {
    const vec = embedder.embed('hello world');
    assert.ok(vec.length > 0, 'vector must be non-empty');
    assert.ok(Array.from(vec).every(v => typeof v === 'number' && !Number.isNaN(v)));
    assert.equal(vec.length, embedder.embed('different text').length);
  });

  it('same input produces identical output (determinism)', () => {
    const a = embedder.embed('zara memory recall');
    const b = embedder.embed('zara memory recall');
    assert.deepEqual(Array.from(a), Array.from(b));
  });

  it('cosineSim: identical vectors = 1, different < 1', () => {
    const vec = embedder.embed('test phrase');
    assert.ok(Math.abs(embedder.cosineSim(vec, vec) - 1.0) < 0.001);
    const other = embedder.embed('completely unrelated xyzzy');
    assert.ok(embedder.cosineSim(vec, other) < 1.0);
  });

  it('empty string does not crash', () => {
    const vec = embedder.embed('');
    assert.equal(vec.length, 128);
  });
});
