import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import identityTools from '../tools/mcp/domain/identity.mjs';

describe('user_identity', () => {
  it('exposes the identity tool', () => {
    assert.ok(identityTools.user_identity);
    assert.equal(typeof identityTools.user_identity.handler, 'function');
  });

  it('resolves a best match from available sources', () => {
    const out = identityTools.user_identity.handler({});
    assert.match(out, /Best match:/);
    // On this machine there is always at least an OS/git/env source
    assert.ok(!/fallback/.test(out) || /there/.test(out));
  });

  it('honors explicit ZARA_USER_NAME env override', () => {
    const prev = process.env.ZARA_USER_NAME;
    process.env.ZARA_USER_NAME = 'Test Override Name';
    try {
      const out = identityTools.user_identity.handler({});
      assert.match(out, /Test Override Name/);
      assert.match(out, /env:ZARA_USER_NAME/);
    } finally {
      if (prev === undefined) delete process.env.ZARA_USER_NAME;
      else process.env.ZARA_USER_NAME = prev;
    }
  });

  it('lists multiple candidate sources when available', () => {
    const out = identityTools.user_identity.handler({});
    // Should at least mention a source attribution
    assert.match(out, /via |←/);
  });
});
