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
    const isWin = process.platform === 'win32';

    it('returns cmd and args array', () => {
      const result = localPlayerArgs('/tmp/test.mp3');
      assert.ok(result.cmd);
      assert.ok(Array.isArray(result.args));
      // On Windows, path is embedded in a PowerShell command string, not as a separate arg
      if (!isWin) assert.ok(result.args.includes('/tmp/test.mp3'));
      else assert.ok(result.args.some(a => a.includes('test.mp3')));
    });

    it('handles paths with spaces safely', () => {
      const result = localPlayerArgs('/tmp/my file (1).mp3');
      if (!isWin) assert.ok(result.args.includes('/tmp/my file (1).mp3'));
      else assert.ok(result.args.some(a => a.includes('my file (1).mp3')));
    });

    it('handles paths with shell metacharacters as literal strings', () => {
      const result = localPlayerArgs('/tmp/$(whoami).mp3');
      if (!isWin) assert.ok(result.args.includes('/tmp/$(whoami).mp3'));
      else assert.ok(result.args.some(a => a.includes('$(whoami).mp3')));
    });

    it('handles paths with backticks as literal strings', () => {
      const result = localPlayerArgs('/tmp/`id`.mp3');
      if (!isWin) assert.ok(result.args.includes('/tmp/`id`.mp3'));
      else assert.ok(result.args.some(a => a.includes('id')));
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
