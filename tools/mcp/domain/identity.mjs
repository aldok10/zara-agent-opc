import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { HOME, loadJson, saveJson } from '../infra.mjs';
import { semanticRecall } from '../../memory-db.mjs';

// User self-recognition: resolve who the user is from whatever sources exist on
// this device/repo/memory — so Zara is never a stranger, even on a fresh setup
// with no env configured. Priority chain, highest-confidence first.
//
// Sources (in order):
//   1. ZARA_USER_NAME env var (explicit override)
//   2. ~/.zara/identity.json (canonical, persisted across all projects)
//   3. ~/.zara/user-profile.json (runtime memory profile)
//   4. semantic memory (learned facts about the user's name)
//   5. git config user.name (repo identity)
//   6. OS full name (macOS `id -F`, falls back to username)
//   7. $USER / $USERNAME
//   8. 'there' (neutral fallback)

const IDENTITY_FILE = path.join(HOME, 'identity.json');
const PROFILE_FILE = path.join(HOME, 'user-profile.json');

function fromEnv() {
  const v = process.env.ZARA_USER_NAME;
  return v ? { name: v, source: 'env:ZARA_USER_NAME', confidence: 1.0 } : null;
}

function fromIdentityFile() {
  const id = loadJson(IDENTITY_FILE, null);
  return id?.name ? { name: id.name, source: 'identity.json', confidence: 1.0, extra: id } : null;
}

function fromProfile() {
  const p = loadJson(PROFILE_FILE, null);
  return p?.name ? { name: p.name, source: 'user-profile.json', confidence: 0.95, extra: p } : null;
}

function fromMemory() {
  try {
    const hits = semanticRecall('user name preferred name call user', 3, { type: 'preference' });
    const hit = hits.find(h => /name|panggil|call/i.test(h.key) || /name|panggil/i.test(h.value));
    if (hit) return { name: hit.value, source: `memory:${hit.key}`, confidence: 0.8 };
  } catch {}
  return null;
}

function fromGit() {
  try {
    const name = execFileSync('git', ['config', 'user.name'], { encoding: 'utf-8', timeout: 2000 }).trim();
    return name ? { name, source: 'git:user.name', confidence: 0.6 } : null;
  } catch {}
  return null;
}

function fromOS() {
  // macOS: full name via `id -F`. Other platforms: fall back to username.
  if (process.platform === 'darwin') {
    try {
      const full = execFileSync('id', ['-F'], { encoding: 'utf-8', timeout: 2000 }).trim();
      if (full) return { name: full, source: 'os:fullname', confidence: 0.5 };
    } catch {}
  }
  try {
    const u = os.userInfo().username;
    if (u) return { name: u, source: 'os:username', confidence: 0.3 };
  } catch {}
  return null;
}

function fromShellUser() {
  const u = process.env.USER || process.env.USERNAME;
  return u ? { name: u, source: 'env:USER', confidence: 0.3 } : null;
}

const RESOLVERS = [fromEnv, fromIdentityFile, fromProfile, fromMemory, fromGit, fromOS, fromShellUser];

function discoverAll() {
  const found = [];
  for (const r of RESOLVERS) {
    try { const res = r(); if (res) found.push(res); } catch {}
  }
  return found;
}

function resolveBest() {
  const all = discoverAll();
  if (!all.length) return { name: 'there', source: 'fallback', confidence: 0 };
  return all.sort((a, b) => b.confidence - a.confidence)[0];
}

class IdentityTools {
  get tools() {
    return {
      user_identity: {
        description: 'Discover who the user is from every available source (env, persisted identity, memory profile, git config, OS account). Returns the best-resolved name plus all candidates and their sources. Use at session start when memory is thin, or to confirm who you are talking to.',
        inputSchema: {
          type: 'object',
          properties: {
            persist: { type: 'boolean', description: 'If true, save the best-resolved name as the canonical identity (~/.zara/identity.json) so it is stable across all projects.' },
            name: { type: 'string', description: 'Explicitly set/override the canonical user name (implies persist=true).' },
          },
        },
        handler: (args) => this.#handleIdentity(args),
      },
    };
  }

  #handleIdentity(args) {
    // Explicit set
    if (args?.name) {
      const existing = loadJson(IDENTITY_FILE, {});
      saveJson(IDENTITY_FILE, { ...existing, name: args.name, confirmedAt: new Date().toISOString(), confirmedBy: 'user_explicit' });
      return `Canonical identity set: "${args.name}" (saved to ~/.zara/identity.json — stable across all projects).`;
    }

    const candidates = discoverAll();
    const best = candidates.length ? candidates.sort((a, b) => b.confidence - a.confidence)[0] : { name: 'there', source: 'fallback', confidence: 0 };

    if (args?.persist && best.source !== 'fallback') {
      const existing = loadJson(IDENTITY_FILE, {});
      saveJson(IDENTITY_FILE, { ...existing, name: best.name, confirmedAt: new Date().toISOString(), confirmedBy: best.source });
    }

    const lines = [`Best match: **${best.name}** (via ${best.source}, confidence ${best.confidence.toFixed(2)})`];
    if (candidates.length > 1) {
      lines.push('', 'All sources:');
      for (const c of candidates) lines.push(`  - ${c.name} ← ${c.source} (${c.confidence.toFixed(2)})`);
    }
    if (args?.persist && best.source !== 'fallback') lines.push('', 'Persisted as canonical identity.');
    return lines.join('\n');
  }
}

// Exported for reuse by other domains (e.g. session profile default)
export { resolveBest };
export default new IdentityTools().tools;
