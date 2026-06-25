import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { HOME, loadJson, saveJson } from '../infra.mjs';
import { semanticRecall, episodicRecall } from '../../memory-db.mjs';

// User self-recognition: resolve who the user is from whatever sources exist.
// Priority chain, highest-confidence first.

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

function persistIdentity(name, source) {
  const existing = loadJson(IDENTITY_FILE, {});
  saveJson(IDENTITY_FILE, { ...existing, name, confirmedAt: new Date().toISOString(), confirmedBy: source });
}

export { resolveBest, discoverAll, persistIdentity };

class IdentityTools {
  get tools() {
    return {
      user_model: {
        description: 'View over existing memory: assembles who the user is, their goals, thinking patterns, priorities, projects, and recent evolution.',
        inputSchema: { type: 'object', properties: {} },
        handler: () => this.#handleUserModel(),
      },
    };
  }

  #handleUserModel() {
    const fmt = (label, items) => items.length ? `**${label}:**\n${items.map(i => `- ${i}`).join('\n')}` : '';
    const who = semanticRecall('user name identity values personality', 5, { type: 'preference' })
      .map(r => `${r.key}: ${r.value}`);
    const goals = semanticRecall('goal objective target milestone', 5, { type: 'decision' })
      .concat(semanticRecall('goal objective target', 3, { type: 'fact' }))
      .map(r => `${r.key}: ${r.value}`);
    const patternsFile = path.join(HOME, 'reflections', 'patterns.json');
    const patterns = loadJson(patternsFile, [])
      .sort((a, b) => (b.successRate * b.occurrences) - (a.successRate * a.occurrences))
      .slice(0, 5)
      .map(p => `${p.name} (${(p.successRate * 100).toFixed(0)}% over ${p.occurrences}x)`);
    const cares = semanticRecall('interest priority care important value', 5, { type: 'preference' })
      .map(r => `${r.key}: ${r.value}`);
    const projects = semanticRecall('project working on building', 5, { type: 'fact' })
      .map(r => `${r.key}: ${r.value}`);
    const evolving = episodicRecall('changed learned grew shifted', 5)
      .map(r => `[${r.ts?.split('T')[0] || '?'}] ${r.event}`);

    const sections = [
      fmt('Who', who), fmt('Goals', goals), fmt('Thinking patterns', patterns),
      fmt('Cares about', cares), fmt('Working on', projects), fmt('Evolving', evolving),
    ].filter(Boolean);
    return sections.join('\n\n') || 'No user model data found. Interact more to build the model.';
  }
}

export default new IdentityTools().tools;
