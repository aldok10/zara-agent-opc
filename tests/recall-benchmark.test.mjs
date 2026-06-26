// Recall Quality Benchmark: Semantic vs Trigram (Issue #24)
// Run: ZARA_EMBED=trigram node tests/recall-benchmark.test.mjs
// Then: ZARA_EMBED=semantic node tests/recall-benchmark.test.mjs

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TrigramEmbedder, SemanticEmbedder } from '../tools/embedder.mjs';

const QUERIES = [
  // Paraphrase tests (should match conceptually)
  { query: 'feeling exhausted from work', expected: 'burnout', type: 'paraphrase' },
  { query: 'kode yang nggak bisa dibaca', expected: 'readability', type: 'cross-lingual' },
  { query: 'how to prevent data loss', expected: 'backup', type: 'paraphrase' },
  { query: 'making the system faster', expected: 'performance', type: 'paraphrase' },
  { query: 'breaking changes in API', expected: 'versioning', type: 'paraphrase' },
];

const CORPUS = [
  { key: 'burnout', text: 'User shows signs of burnout and overwork, needs rest reminders' },
  { key: 'readability', text: 'Code readability is priority, write for strangers to understand' },
  { key: 'backup', text: 'Always backup data before destructive operations, prevent loss' },
  { key: 'performance', text: 'Performance optimization should be measured, not premature' },
  { key: 'versioning', text: 'API versioning strategy to handle breaking changes gracefully' },
  { key: 'testing', text: 'Run tests before claiming work is done, TDD preferred' },
  { key: 'security', text: 'Treat all external input as untrusted, parameterized queries only' },
  { key: 'simplicity', text: 'Prefer stdlib and simple solutions over complex abstractions' },
];

function rankWithEmbedder(embedder, query, corpus) {
  const qVec = embedder.embed(query);
  return corpus
    .map(c => ({ key: c.key, sim: embedder.cosineSim(qVec, embedder.embed(c.text)) }))
    .sort((a, b) => b.sim - a.sim);
}

describe('recall quality: trigram baseline', () => {
  const embedder = new TrigramEmbedder();
  let hits = 0;

  for (const q of QUERIES) {
    it(`trigram: "${q.query}" should find "${q.expected}" (${q.type})`, () => {
      const ranked = rankWithEmbedder(embedder, q.query, CORPUS);
      const position = ranked.findIndex(r => r.key === q.expected);
      // Count as hit if in top 3
      if (position <= 2) hits++;
      // Don't assert, just report (trigram is the baseline)
      assert.ok(position >= 0, `Expected key "${q.expected}" must exist in results`);
    });
  }

  it('trigram recall@3 summary', () => {
    console.log(`  Trigram: ${hits}/${QUERIES.length} hit in top-3 (${Math.round(hits/QUERIES.length*100)}%)`);
    assert.ok(true);
  });
});

describe('recall quality: semantic (if available)', async () => {
  let embedder;
  try {
    embedder = SemanticEmbedder.instance();
    // Warm up
    await embedder.embed('test');
  } catch {
    it('semantic embedder not available (skip)', () => assert.ok(true));
    return;
  }

  let hits = 0;

  for (const q of QUERIES) {
    it(`semantic: "${q.query}" should find "${q.expected}" (${q.type})`, async () => {
      const qVec = await embedder.embed(q.query);
      const scored = [];
      for (const c of CORPUS) {
        const cVec = await embedder.embed(c.text);
        scored.push({ key: c.key, sim: embedder.cosineSim(qVec, cVec) });
      }
      scored.sort((a, b) => b.sim - a.sim);
      const position = scored.findIndex(r => r.key === q.expected);
      if (position <= 2) hits++;
      // Semantic should reliably find paraphrases in top-3
      assert.ok(position <= 2, `"${q.expected}" at position ${position}, expected top-3`);
    });
  }

  it('semantic recall@3 summary', () => {
    console.log(`  Semantic: ${hits}/${QUERIES.length} hit in top-3 (${Math.round(hits/QUERIES.length*100)}%)`);
    assert.ok(hits >= QUERIES.length * 0.8, `Semantic should hit >= 80% (got ${Math.round(hits/QUERIES.length*100)}%)`);
  });
});
