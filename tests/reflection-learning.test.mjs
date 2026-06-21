import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import reflectionTools from '../tools/mcp/domain/reflection.mjs';

const PATTERNS_FILE = path.join(os.homedir(), '.zara', 'reflections', 'patterns.json');
const TEST_PREFIX = '__test_pattern_';

function loadPatterns() {
  try { return JSON.parse(fs.readFileSync(PATTERNS_FILE, 'utf-8')); } catch { return []; }
}
function cleanup() {
  try {
    const p = loadPatterns().filter(x => !x.name.startsWith(TEST_PREFIX));
    fs.writeFileSync(PATTERNS_FILE, JSON.stringify(p, null, 2));
  } catch {}
}

describe('reflection learning loop', () => {
  after(cleanup);

  it('exposes reflect, patterns, reflect_suggest', () => {
    assert.ok(reflectionTools.reflect);
    assert.ok(reflectionTools.patterns);
    assert.ok(reflectionTools.reflect_suggest);
  });

  it('records outcome and computes success rate over repeated reflections', () => {
    const name = `${TEST_PREFIX}go_race`;
    reflectionTools.reflect.handler({ task: 'fix go race', pattern: name, worked: 'use sync.Mutex', outcome: 'success' });
    reflectionTools.reflect.handler({ task: 'fix go race again', pattern: name, outcome: 'failure' });
    const p = loadPatterns().find(x => x.name === name);
    assert.equal(p.occurrences, 2);
    // one success (1) + one failure (0) → 0.5
    assert.equal(p.successRate, 0.5);
  });

  it('reflect_suggest returns matching learned patterns', () => {
    const name = `${TEST_PREFIX}debug_flaky_test`;
    reflectionTools.reflect.handler({ task: 'debug flaky test', pattern: name, worked: 'isolate with seed', outcome: 'success' });
    const out = reflectionTools.reflect_suggest.handler({ situation: 'debug flaky test in CI' });
    assert.match(out, /debug_flaky_test|Suggested approaches/);
  });

  it('reflect_suggest is graceful when nothing matches', () => {
    const out = reflectionTools.reflect_suggest.handler({ situation: 'zzz_nonexistent_situation_xyz' });
    assert.match(out, /No matching pattern|No learned patterns/);
  });

  it('higher success rate ranks above a one-off for the same situation', () => {
    const good = `${TEST_PREFIX}zzqq_proven`;
    const bad = `${TEST_PREFIX}zzqq_flaky`;
    for (let i = 0; i < 4; i++) reflectionTools.reflect.handler({ task: 't', pattern: good, worked: 'zzqq proven approach', outcome: 'success' });
    reflectionTools.reflect.handler({ task: 't', pattern: bad, worked: 'zzqq flaky approach', outcome: 'failure' });
    // reflect_suggest filters by relevance first (unique token "zzqq"), so only our two patterns match
    const out = reflectionTools.reflect_suggest.handler({ situation: 'zzqq approach' });
    const goodIdx = out.indexOf(good);
    const badIdx = out.indexOf(bad);
    assert.ok(goodIdx !== -1, 'proven pattern should appear');
    assert.ok(badIdx === -1 || goodIdx < badIdx, 'proven pattern should rank above flaky one');
  });
});
