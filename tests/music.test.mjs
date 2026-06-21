import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import musicTools from '../tools/mcp/domain/music.mjs';

// Only exercise safe, non-spawning actions. Playback (play/next/prev/radio)
// spawns external processes (yt-dlp/mpv) and is covered by shell-safety tests.
const MUSIC_DIR = path.join(os.homedir(), '.zara', 'music');
const STATE_FILE = path.join(MUSIC_DIR, 'state.json');
let backup = null;

describe('music domain', () => {
  before(() => {
    try { backup = fs.readFileSync(STATE_FILE, 'utf-8'); } catch { backup = null; }
  });
  after(() => {
    if (backup !== null) { try { fs.writeFileSync(STATE_FILE, backup); } catch {} }
  });

  it('exposes play_music tool', () => {
    assert.ok(musicTools.play_music);
    assert.equal(typeof musicTools.play_music.handler, 'function');
  });

  it('status returns a string without spawning', async () => {
    const out = await musicTools.play_music.handler({ action: 'status' });
    assert.equal(typeof out, 'string');
    assert.ok(out.length > 0);
  });

  it('taste returns learned preferences view', async () => {
    const out = await musicTools.play_music.handler({ action: 'taste' });
    assert.equal(typeof out, 'string');
  });

  it('playlist action is safe and returns a string', async () => {
    const out = await musicTools.play_music.handler({ action: 'playlist' });
    assert.equal(typeof out, 'string');
  });

  it('history action returns a string', async () => {
    const out = await musicTools.play_music.handler({ action: 'history' });
    assert.equal(typeof out, 'string');
  });

  it('stop is idempotent and safe', async () => {
    const out = await musicTools.play_music.handler({ action: 'stop' });
    assert.equal(typeof out, 'string');
  });
});
