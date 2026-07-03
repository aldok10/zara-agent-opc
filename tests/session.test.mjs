import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import memoryTools from '../tools/mcp/domain/memory.mjs';

const mem = memoryTools.memory.handler;
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

  it('exposes the unified memory tool with session routing', () => {
    assert.ok(memoryTools.memory);
    assert.ok(memoryTools.memory.inputSchema.properties.action.enum.includes('session'));
  });

  it('start → check → end lifecycle', async () => {
    const start = await mem({ action: 'session', op: 'start', context: 'test-session' });
    assert.match(start, /Session started/);

    const check = await mem({ action: 'session', op: 'check' });
    assert.match(check, /Active:/);

    const end = await mem({ action: 'session', op: 'end' });
    assert.match(end, /Session ended/);
  });

  it('end with no active session is graceful', async () => {
    // Ensure ended first
    await mem({ action: 'session', op: 'end' });
    const out = await mem({ action: 'session', op: 'end' });
    assert.match(out, /No active session/);
  });

  it('session-end runs deterministic memory maintenance (hooks-as-spine)', async () => {
    await mem({ action: 'session', op: 'start', context: 'maintenance-test' });
    const end = await mem({ action: 'session', op: 'end' });
    // Maintenance line is appended when consolidation produced output OR contradictions exist.
    // At minimum the call must not throw and must report a clean session end.
    assert.match(end, /Session ended/);
    // If memory had anything to maintain, the note appears; either way no crash.
    assert.ok(typeof end === 'string' && end.length > 0);
  });

  it('goal set/status/clear', async () => {
    const set = await mem({ action: 'session', op: 'goal_set', condition: 'finish tests', max_turns: 5 });
    assert.match(set, /Goal set/);
    const status = await mem({ action: 'session', op: 'goal_status' });
    assert.match(status, /finish tests/);
    const clear = await mem({ action: 'session', op: 'goal_clear' });
    assert.match(clear, /cleared/);
  });
});
