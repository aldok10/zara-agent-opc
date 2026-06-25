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

  #decisionTypes = {
    type1: { label: 'Irreversible', approach: 'Deliberate. Pre-mortem. Second-order effects. Sleep on it.' },
    type2: { label: 'Reversible', approach: 'Bias to action. Timebox. Ship to learn. Fix forward.' },
    data: { label: 'Data-available', approach: 'Measure first. Data beats debate. A/B test if possible.' },
    people: { label: 'Interpersonal', approach: 'Perspective-taking. Shared goals. Psychological safety.' },
    priority: { label: 'Prioritization', approach: 'ICE scoring (Impact x Confidence x Ease). Top 1-3 only.' },
  };

  #coachingPrompts = {
    stuck: "What's the real challenge here for you? (Not the surface problem — the underlying one.)",
    overwhelmed: "If you could only move ONE thing forward today, what would it be?",
    deciding: "What would you regret NOT doing? And what's the cost of not deciding right now?",
    conflict: "What's the generous interpretation of their behavior? What goal do you share?",
    growth: "What skill, if you developed it, would make everything else easier?",
    celebrating: "What specifically did you do that made this work? How can you repeat that pattern?",
    frustrated: "What's in your control here? Let's focus there.",
  };

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

  classifyDecision(args) {
    let type = 'type2';
    if (args.reversible === false || args.stakes === 'high') type = 'type1';
    if (args.decision.toLowerCase().match(/priorit|rank|order|focus|backlog/)) type = 'priority';
    if (args.decision.toLowerCase().match(/team|person|conflict|hire|fire|feedback/)) type = 'people';
    if (args.decision.toLowerCase().match(/performance|metric|benchmark|faster|slower/)) type = 'data';
    const dt = this.#decisionTypes[type];
    return [
      `**Decision Type**: ${dt.label}`,
      `**Approach**: ${dt.approach}`,
      '', type === 'type1' ? '⚠️ Irreversible — take time, consider pre-mortem.' : '✓ Proceed with bias to action.',
    ].join('\n');
  }

  getCoachingPrompt(situation) {
    return this.#coachingPrompts[situation];
  }
}

class TeamService {
  #store = new FileStore('team');
  #maxAudit = 1000;

  currentUser() {
    return process.env.ZARA_USER || os.userInfo().username || 'default';
  }

  audit(action, details) {
    this.#store.appendLine('audit.jsonl', { user: this.currentUser(), action, details, ts: new Date().toISOString() });
    this.#store.prune('audit.jsonl', this.#maxAudit);
  }

  getShared() { return this.#store.readJSON('shared-knowledge.json', {}); }
  saveShared(data) { this.#store.writeJSON('shared-knowledge.json', data); }
  readAudit(max) { return this.#store.readLines('audit.jsonl', max); }
  get dir() { return this.#store.dir; }
}

// ponytail: music player lives in MCP (tools/mcp/domain/music.mjs). This is read-only state for inject().
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
const teamSvc = new TeamService();

// NOTE: Empathy tracking is now handled by the dedicated empathy/index.mjs module.
// NOTE: Music player is now in MCP (tools/mcp/domain/music.mjs). Plugin only reads state for inject().

const allTools = {
  zara_update_user: tool({
    description: 'Update user profile memory — call when you learn something new about the user.',
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
    description: 'Read current user profile from memory.',
    args: {},
    async execute() {
      return { output: JSON.stringify(leadership.loadProfile(), null, 2) };
    },
  }),

  zara_classify_decision: tool({
    description: 'Classify a decision and recommend the appropriate framework.',
    args: {
      decision: z.string().describe('The decision to classify'),
      reversible: z.boolean().optional().describe('Is this reversible?'),
      stakes: z.enum(['low', 'medium', 'high']).optional().describe('Stakes level'),
    },
    async execute(args) {
      return { output: leadership.classifyDecision(args) };
    },
  }),

  zara_coaching_prompt: tool({
    description: 'Get a contextual coaching question based on user situation.',
    args: {
      situation: z.enum(['stuck', 'overwhelmed', 'deciding', 'conflict', 'growth', 'celebrating', 'frustrated']).describe('User situation'),
    },
    async execute(args) {
      return { output: leadership.getCoachingPrompt(args.situation) };
    },
  }),

  team_share: tool({
    description: 'Share a fact with the team knowledge graph.',
    args: {
      key: z.string().describe('Knowledge key'),
      value: z.string().describe('The shared knowledge'),
      tags: z.array(z.string()).optional().describe('Tags for discovery'),
    },
    async execute(args) {
      const shared = teamSvc.getShared();
      shared[args.key] = { value: args.value, tags: args.tags || [], author: teamSvc.currentUser(), updatedAt: new Date().toISOString() };
      teamSvc.saveShared(shared);
      teamSvc.audit('share', { key: args.key });
      return { output: `Shared: ${args.key} (by ${teamSvc.currentUser()})` };
    },
  }),

  team_knowledge: tool({
    description: 'Search shared team knowledge graph.',
    args: { query: z.string().optional().describe('Search keyword') },
    async execute(args) {
      const shared = teamSvc.getShared();
      const entries = Object.entries(shared);
      if (!entries.length) return { output: 'Team knowledge graph is empty.' };
      let results = entries;
      if (args.query) {
        const terms = args.query.toLowerCase().split(/\s+/);
        results = entries.filter(([k, v]) => {
          const text = `${k} ${v.value} ${(v.tags || []).join(' ')}`.toLowerCase();
          return terms.some(t => text.includes(t));
        });
      }
      if (!results.length) return { output: `No team knowledge found for "${args.query}"` };
      const lines = results.slice(0, 10).map(([k, v]) => `- **${k}**: ${v.value} (by ${v.author}, ${v.updatedAt.split('T')[0]})`);
      return { output: `## Team Knowledge (${results.length} entries)\n${lines.join('\n')}` };
    },
  }),

  team_audit: tool({
    description: 'View audit trail — who did what, when.',
    args: {
      limit: z.number().optional().describe('Entries to show (default 20)'),
      user: z.string().optional().describe('Filter by user'),
    },
    async execute(args) {
      const limit = args.limit || 20;
      let entries = teamSvc.readAudit(500);
      if (args.user) entries = entries.filter(e => e.user === args.user);
      entries = entries.slice(-limit).reverse();
      if (!entries.length) return { output: 'No audit entries found.' };
      const output = entries.map(e =>
        `[${e.ts.split('T')[0]} ${e.ts.split('T')[1]?.slice(0, 5)}] ${e.user}: ${e.action} — ${JSON.stringify(e.details).slice(0, 80)}`
      ).join('\n');
      return { output };
    },
  }),

  team_whoami: tool({
    description: 'Show current user identity and isolation namespace.',
    args: {},
    async execute() {
      return { output: `User: ${teamSvc.currentUser()}\nMemory: ${path.join(HOME, 'memory')}\nTeam: ${teamSvc.dir}\nSet ZARA_USER env var to change identity.` };
    },
  }),

  // NOTE: Empathy tools (zara_empathy_*) and growth tools (zara_growth_*) are now in empathy/index.mjs
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
