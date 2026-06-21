import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnPipe, localPlayerArgs, killProcess } from '../tools/mcp/infra.mjs';

describe('shell safety', () => {
  describe('spawnPipe', () => {
    it('returns object with pid and kill function', () => {
      const result = spawnPipe('echo', ['hello'], 'cat', []);
      assert.ok(typeof result.pid === 'number');
      assert.ok(typeof result.kill === 'function');
      result.kill();
    });
  });

  describe('localPlayerArgs', () => {
    it('returns cmd and args array', () => {
      const result = localPlayerArgs('/tmp/test.mp3');
      assert.ok(result.cmd);
      assert.ok(Array.isArray(result.args));
      assert.ok(result.args.includes('/tmp/test.mp3'));
    });

    it('handles paths with spaces safely', () => {
      const result = localPlayerArgs('/tmp/my file (1).mp3');
      assert.ok(result.args.includes('/tmp/my file (1).mp3'));
    });

    it('handles paths with shell metacharacters as literal strings', () => {
      const result = localPlayerArgs('/tmp/$(whoami).mp3');
      assert.ok(result.args.includes('/tmp/$(whoami).mp3'));
    });

    it('handles paths with backticks as literal strings', () => {
      const result = localPlayerArgs('/tmp/`id`.mp3');
      assert.ok(result.args.includes('/tmp/`id`.mp3'));
    });
  });

  describe('killProcess', () => {
    it('silently handles invalid PIDs', () => {
      // None of these should throw
      killProcess('abc');
      killProcess(-1);
      killProcess(0);
      killProcess(NaN);
      killProcess(null);
      killProcess(undefined);
    });
  });
});
