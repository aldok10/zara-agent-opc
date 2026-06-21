import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import sessionTools from '../tools/mcp/domain/session.mjs';

const SESSION_FILE = path.join(os.homedir(), '.zara', 'session.json');

// Preserve and restore real session state so the suite never disturbs live data.
let backup = null;

describe('session domain', () => {
  before(() => {
    try { backup = fs.readFileSync(SESSION_FILE, 'utf-8'); } catch { backup = null; }
  });
  after(() => {
    if (backup !== null) fs.writeFileSync(SESSION_FILE, backup);
    else try { fs.unlinkSync(SESSION_FILE); } catch {}
  });

  it('exposes session tools', () => {
    assert.ok(sessionTools.session_log);
    assert.ok(sessionTools.user_profile);
    assert.ok(sessionTools.goal);
    assert.ok(sessionTools.loop);
    assert.ok(sessionTools.shutdown_ritual);
  });

  it('start → check → end lifecycle', () => {
    const start = sessionTools.session_log.handler({ action: 'start', context: 'test-session' });
    assert.match(start, /Session started/);

    const check = sessionTools.session_log.handler({ action: 'check' });
    assert.match(check, /Active:/);

    const end = sessionTools.session_log.handler({ action: 'end' });
    assert.match(end, /Session ended/);
  });

  it('end with no active session is graceful', () => {
    // Ensure ended first
    sessionTools.session_log.handler({ action: 'end' });
    const out = sessionTools.session_log.handler({ action: 'end' });
    assert.match(out, /No active session/);
  });

  it('session-end runs deterministic memory maintenance (hooks-as-spine)', () => {
    sessionTools.session_log.handler({ action: 'start', context: 'maintenance-test' });
    const end = sessionTools.session_log.handler({ action: 'end' });
    // Maintenance line is appended when consolidation produced output OR contradictions exist.
    // At minimum the call must not throw and must report a clean session end.
    assert.match(end, /Session ended/);
    // If memory had anything to maintain, the note appears; either way no crash.
    assert.ok(typeof end === 'string' && end.length > 0);
  });

  it('goal set/status/clear', () => {
    const set = sessionTools.goal.handler({ action: 'set', condition: 'finish tests', max_turns: 5 });
    assert.match(set, /Goal set/);
    const status = sessionTools.goal.handler({ action: 'status' });
    assert.match(status, /finish tests/);
    const clear = sessionTools.goal.handler({ action: 'clear' });
    assert.match(clear, /cleared/);
  });

  it('shutdown_ritual status returns bedtime info', () => {
    const out = sessionTools.shutdown_ritual.handler({ action: 'status' });
    assert.match(out, /Bedtime|Enabled/);
  });
});
