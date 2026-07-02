import fs from 'fs';
import path from 'path';
import os from 'os';
import { tool } from '@opencode-ai/plugin';
import { FileStore, HOME, contextPressure } from '../infra/store.mjs';

const z = tool.schema;

function killProcess(pid) {
  const n = parseInt(pid, 10);
  if (!Number.isFinite(n) || n <= 0) return;
  try { process.kill(n, 'SIGTERM'); } catch { try { process.kill(n, 'SIGKILL'); } catch {} }
}

class LeadershipService {
  #store = new FileStore('memory');
  #cache = null;
  #mtime = 0;

  loadProfile() {
    const file = this.#store.path('user-profile.json');
    try {
      const stat = fs.statSync(file);
      if (this.#cache && stat.mtimeMs === this.#mtime) return this.#cache;
      this.#cache = JSON.parse(fs.readFileSync(file, 'utf-8'));
      this.#mtime = stat.mtimeMs;
      return this.#cache;
    } catch {}
    return {
      name: null, preferredAddress: null, language: 'mixed', tone: 'casual',
      leadershipLevel: 'unknown', communicationStyle: null, techExpertise: [],
      activeProjects: [], goals: [], strengths: [], growthAreas: [],
      preferences: {}, interactions: { total: 0, lastSeen: null }, notes: [],
    };
  }

  saveProfile(p) {
    this.#store.ensure();
    p.interactions.lastSeen = new Date().toISOString();
    fs.writeFileSync(this.#store.path('user-profile.json'), JSON.stringify(p, null, 2), 'utf-8');
    this.#cache = p;
    try { this.#mtime = fs.statSync(this.#store.path('user-profile.json')).mtimeMs; } catch {}
  }

  buildContextLine(p) {
    const fields = [];
    if (p.preferredAddress) fields.push(`call:${p.preferredAddress}`);
    if (p.language && p.language !== 'mixed') fields.push(`lang:${p.language}`);
    if (p.tone) fields.push(`tone:${p.tone}`);
    if (p.leadershipLevel && p.leadershipLevel !== 'unknown') fields.push(`D-level:${p.leadershipLevel}`);
    if (p.techExpertise.length) fields.push(`tech:${p.techExpertise.slice(0, 5).join(',')}`);
    if (p.activeProjects.length) fields.push(`projects:${p.activeProjects.slice(0, 3).join(',')}`);
    if (p.goals.length) fields.push(`goals:${p.goals.slice(0, 3).join(',')}`);
    if (!fields.length) return null;
    return `## User: ${fields.join(' | ')}`;
  }

  countInteraction() {
    const p = this.loadProfile();
    p.interactions.total += 1;
    this.saveProfile(p);
  }
}

function getMusicState() {
  const stateFile = path.join(HOME, 'player.json');
  try {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    if (!state.pid) return null;
    process.kill(state.pid, 0); // throws if dead
    return state;
  } catch { return null; }
}

const leadership = new LeadershipService();

// NOTE: Empathy tracking is now handled by the dedicated empathy/index.mjs module.
// NOTE: Music player is now in MCP (tools/mcp/domain/music.mjs). Plugin only reads state for inject().

const allTools = {
  zara_update_user: tool({
    description: 'Update user profile.',
    args: {
      field: z.enum(['name', 'preferredAddress', 'language', 'tone', 'leadershipLevel', 'communicationStyle', 'techExpertise', 'activeProjects', 'goals', 'strengths', 'growthAreas', 'notes', 'preferences']).describe('Field to update'),
      value: z.string().describe('New value (arrays: comma-separated; objects: JSON string)'),
      action: z.enum(['set', 'add', 'remove']).optional().describe('set=replace, add=append, remove=remove from array'),
    },
    async execute(args) {
      const p = leadership.loadProfile();
      const { field, value, action = 'set' } = args;
      const arrayFields = ['techExpertise', 'activeProjects', 'goals', 'strengths', 'growthAreas', 'notes'];
      if (arrayFields.includes(field)) {
        const items = value.split(',').map(s => s.trim()).filter(Boolean);
        if (action === 'add') p[field] = [...new Set([...p[field], ...items])];
        else if (action === 'remove') p[field] = p[field].filter(i => !items.includes(i));
        else p[field] = items;
      } else if (field === 'preferences') {
        try { Object.assign(p.preferences, JSON.parse(value)); } catch { p.preferences[value] = true; }
      } else {
        p[field] = value;
      }
      leadership.saveProfile(p);
      return { output: `Profile updated: ${field} = ${JSON.stringify(p[field])}` };
    },
  }),

  zara_get_user: tool({
    description: 'Get user profile.',
    args: {},
    async execute() {
      return { output: JSON.stringify(leadership.loadProfile(), null, 2) };
    },
  }),

  // NOTE: Empathy tools (zara_empathy_*) and growth tools (zara_growth_*) are now in empathy/index.mjs
  // NOTE: team_knowledge lives in MCP (tools/mcp/domain/knowledge.mjs) — removed here to avoid name collision.
};

export default function createSocial({ client, directory } = {}) {
  return {
    inject(messages) {
      // Shed social injection under high pressure (>70%)
      if (contextPressure.level > 0.70) return messages;

      leadership.countInteraction();
      const p = leadership.loadProfile();
      const lines = [];
      const ctx = leadership.buildContextLine(p);
      if (ctx) lines.push(ctx);
      const np = getMusicState();
      if (np) {
        const icon = np.paused ? '⏸' : '🎵';
        lines.push(`${icon} Now playing: ${np.file}${np.autoplay ? ' (autoplay)' : ''}`);
      }
      if (lines.length) {
        const last = messages[messages.length - 1];
        if (last && last.role === 'system') {
          last.content += '\n\n' + lines.join('\n');
        } else {
          messages.push({ role: 'system', content: lines.join('\n') });
        }
      }
      return messages;
    },

    tools: allTools,

    dispose() {
      // Kill music player on shutdown (read state, kill pid)
      try {
        const state = JSON.parse(fs.readFileSync(path.join(HOME, 'player.json'), 'utf-8'));
        if (state.pid) killProcess(state.pid);
      } catch {}
    },
  };
}
