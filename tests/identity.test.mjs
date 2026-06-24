import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveBest, discoverAll, persistIdentity } from '../tools/mcp/domain/identity.mjs';

describe('identity resolution', () => {
  it('exports resolveBest and discoverAll', () => {
    assert.equal(typeof resolveBest, 'function');
    assert.equal(typeof discoverAll, 'function');
    assert.equal(typeof persistIdentity, 'function');
  });

  it('resolves a best match from available sources', () => {
    const result = resolveBest();
    assert.ok(result.name);
    assert.ok(result.source);
    assert.ok(typeof result.confidence === 'number');
  });

  it('honors explicit ZARA_USER_NAME env override', () => {
    const prev = process.env.ZARA_USER_NAME;
    process.env.ZARA_USER_NAME = 'Test Override Name';
    try {
      const result = resolveBest();
      assert.equal(result.name, 'Test Override Name');
      assert.equal(result.source, 'env:ZARA_USER_NAME');
      assert.equal(result.confidence, 1.0);
    } finally {
      if (prev === undefined) delete process.env.ZARA_USER_NAME;
      else process.env.ZARA_USER_NAME = prev;
    }
  });

  it('discoverAll returns multiple candidates when available', () => {
    const all = discoverAll();
    assert.ok(Array.isArray(all));
    assert.ok(all.length >= 1);
    for (const entry of all) {
      assert.ok(entry.name);
      assert.ok(entry.source);
    }
  });
});
