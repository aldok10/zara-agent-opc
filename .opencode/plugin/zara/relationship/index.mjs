// Relationship module — Tracks the relationship itself, not just facts about the user.
// Open threads, milestones, shared references, emotional bookmarks, stances, proactive surfacing.
// Based on: Letta/MemGPT, Generative Agents reflections, Relationship-OS, DAM-LLM.

import { FileStore } from '../infra/store.mjs';
import { tool } from '@opencode-ai/plugin';

const z = tool.schema;

const THREAD_TYPES = ['plan_followup', 'emotional_check', 'event_outcome', 'shared_promise', 'general'];

function defaultState() {
  return {
    interactionCount: 0,
    lastSeen: null,
  };
}

export default function createRelationship({ client, directory } = {}) {
  const store = new FileStore('relationship');

  function loadState() { return store.readJSON('state.json', defaultState()); }
  function saveState(s) { store.writeJSON('state.json', s); }
  function loadThreads() { return store.readJSON('threads.json', []); }
  function saveThreads(t) { store.writeJSON('threads.json', t); }
  function loadMilestones() { return store.readJSON('milestones.json', []); }
  function saveMilestones(m) { store.writeJSON('milestones.json', m); }
  function loadReferences() { return store.readJSON('references.json', []); }
  function saveReferences(r) { store.writeJSON('references.json', r); }
  function loadBookmarks() { return store.readJSON('bookmarks.json', []); }
  function saveBookmarks(b) { store.writeJSON('bookmarks.json', b); }
  function loadStances() { return store.readJSON('stances.json', []); }
  function saveStances(s) { store.writeJSON('stances.json', s); }

  function touch() {
    const s = loadState();
    s.interactionCount++;
    s.lastSeen = new Date().toISOString();
    saveState(s);
  }

  function getDueThreads() {
    const now = new Date().toISOString();
    return loadThreads().filter(t => t.status === 'pending' && t.followUpAfter && t.followUpAfter <= now);
  }

  function relevanceScore(item, keywords) {
    let score = 0;
    const text = `${item.context || ''} ${item.action || ''} ${item.event || ''} ${item.topic || ''} ${item.position || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
    for (const kw of keywords) { if (text.includes(kw.toLowerCase())) score += 2; }
    const daysOld = (Date.now() - new Date(item.created || item.ts || item.formed || 0).getTime()) / 86400000;
    score *= 1 / (1 + daysOld * 0.02);
    if (item.intensity) score *= (1 + item.intensity * 0.3);
    if (item.confidence) score *= (0.5 + item.confidence * 0.5);
    return score;
  }

  return {
    onEvent(event) {
      if (event.type === 'session.created') touch();
    },

    inject(messages) {
      const lines = [];
      const due = getDueThreads();
      if (due.length) {
        lines.push(`[Thread due] "${due[0].context}" — ${due[0].action}`);
      }
      const state = loadState();
      lines.push(`[Relationship] interactions=${state.interactionCount}`);

      // Identity anchor — compact persona re-injection for drift prevention
      lines.push(`[Identity] Zara: friend not assistant. Has opinions. Pushes back. Remembers. Follows up. Mixed Indo/English. Warm but honest. Silence is OK.`);

      // Temporal awareness — time-of-day and absence detection
      const now = new Date();
      const hour = now.getHours();
      if (hour >= 23 || hour < 5) lines.push(`[Temporal] Late night (${hour}:00). Be mindful of fatigue. Consider nudging rest if session is long.`);
      if (state.lastSeen) {
        const daysSince = (now.getTime() - new Date(state.lastSeen).getTime()) / 86400000;
        if (daysSince > 2) lines.push(`[Temporal] ${daysSince.toFixed(0)} days since last session. Warm re-entry, no guilt.`);
      }

      // Surface relevant stances (max 2, only if conversation keywords match)
      const lastUser = messages.filter(m => m.role === 'user').pop();
      if (lastUser?.content && typeof lastUser.content === 'string' && lastUser.content.length > 20) {
        const words = lastUser.content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const stances = loadStances();
        const matched = stances
          .map(s => ({ s, score: relevanceScore(s, words) }))
          .filter(x => x.score > 1)
          .sort((a, b) => b.score - a.score)
          .slice(0, 2);
        if (matched.length) {
          lines.push(`[Stances] ${matched.map(x => `${x.s.topic}: ${x.s.position}`).join(' | ')}`);
        }
      }

      if (lines.length) {
        const sys = messages.find(m => m.role === 'system');
        if (sys) sys.content += '\n\n' + lines.join('\n');
      }
      return messages;
    },

    onCompact() {
      const threads = loadThreads().filter(t => t.status === 'pending');
      if (!threads.length) return null;
      const summary = threads.slice(0, 3).map(t => `- ${t.context} (${t.type})`).join('\n');
      return { context: `[Relationship] ${threads.length} open thread(s):\n${summary}` };
    },

    dispose() {},

    tools: {
      zara_thread_add: tool({
        description: 'Track something user mentioned that deserves follow-up later.',
        args: {
          context: z.string().describe('What was mentioned'),
          action: z.string().describe('What to do later'),
          followUpAfter: z.string().describe('When: ISO date, "tomorrow", "next_session", "3d"'),
          type: z.enum(THREAD_TYPES).optional(),
          priority: z.enum(['low', 'medium', 'high']).optional(),
        },
        async execute(args) {
          const threads = loadThreads();
          let followUp = args.followUpAfter;
          if (followUp === 'tomorrow') followUp = new Date(Date.now() + 86400000).toISOString().split('T')[0];
          else if (followUp === 'next_session') followUp = new Date(Date.now() + 3600000).toISOString();
          else if (/^\d+d$/.test(followUp)) followUp = new Date(Date.now() + parseInt(followUp) * 86400000).toISOString().split('T')[0];
          threads.push({
            id: `t_${Date.now().toString(36)}`, type: args.type || 'general',
            context: args.context, action: args.action, followUpAfter: followUp,
            status: 'pending', priority: args.priority || 'medium', created: new Date().toISOString(),
          });
          saveThreads(threads);
          return { output: `Thread tracked: "${args.context}" — follow up after ${followUp}` };
        },
      }),

      zara_thread_list: tool({
        description: 'List open threads (things to follow up on)',
        args: { status: z.enum(['pending', 'done', 'all']).optional() },
        async execute(args) {
          let threads = loadThreads();
          if (args.status && args.status !== 'all') threads = threads.filter(t => t.status === args.status);
          if (!threads.length) return { output: 'No open threads.' };
          return { output: threads.slice(-15).map(t => {
            const due = t.followUpAfter ? ` (due: ${t.followUpAfter.split('T')[0]})` : '';
            return `${t.status === 'done' ? '✓' : '○'} [${t.type}] ${t.context}${due} — ${t.action}`;
          }).join('\n') };
        },
      }),

      zara_thread_close: tool({
        description: 'Close a thread after following up',
        args: { id: z.string().optional(), context: z.string().optional().describe('Search by keyword') },
        async execute(args) {
          const threads = loadThreads();
          let target;
          if (args.id) target = threads.find(t => t.id === args.id);
          else if (args.context) target = threads.find(t => t.status === 'pending' && t.context.toLowerCase().includes(args.context.toLowerCase()));
          else target = threads.filter(t => t.status === 'pending').pop();
          if (!target) return { output: 'No matching thread.' };
          target.status = 'done';
          target.closedAt = new Date().toISOString();
          saveThreads(threads);
          return { output: `Closed: "${target.context}"` };
        },
      }),

      zara_milestone_add: tool({
        description: 'Record a relationship milestone',
        args: {
          event: z.string().describe('What happened'),
          type: z.enum(['first', 'shared_accomplishment', 'breakthrough', 'rupture_repair', 'depth_marker']).optional(),
          significance: z.number().min(1).max(10).optional(),
        },
        async execute(args) {
          const milestones = loadMilestones();
          milestones.push({ id: `m_${Date.now().toString(36)}`, ts: new Date().toISOString(), event: args.event, type: args.type || 'shared_accomplishment', significance: args.significance || 7 });
          saveMilestones(milestones);
          return { output: `Milestone: ${args.event}` };
        },
      }),

      zara_milestone_list: tool({
        description: 'List relationship milestones',
        args: {},
        async execute() {
          const milestones = loadMilestones();
          if (!milestones.length) return { output: 'No milestones yet.' };
          return { output: milestones.slice(-10).reverse().map(m => `[${m.ts.split('T')[0]}] (${m.type}) ${m.event}`).join('\n') };
        },
      }),

      zara_reference_add: tool({
        description: 'Store a shared reference (inside joke, adopted term, recurring pattern)',
        args: {
          content: z.string().describe('The reference'),
          type: z.enum(['inside_joke', 'nickname', 'shared_goal', 'agreed_rule', 'vocabulary', 'recurring_pattern']).optional(),
        },
        async execute(args) {
          const refs = loadReferences();
          refs.push({ id: `ref_${Date.now().toString(36)}`, type: args.type || 'vocabulary', content: args.content, created: new Date().toISOString(), timesReferenced: 0 });
          saveReferences(refs);
          return { output: `Reference: "${args.content}"` };
        },
      }),

      zara_reference_list: tool({
        description: 'List shared references and vocabulary',
        args: {},
        async execute() {
          const refs = loadReferences();
          if (!refs.length) return { output: 'No shared references yet.' };
          return { output: refs.map(r => `[${r.type}] ${r.content}`).join('\n') };
        },
      }),

      zara_bookmark_add: tool({
        description: 'Bookmark a high-emotion moment',
        args: {
          context: z.string().describe('What happened'),
          emotion: z.string().describe('The emotion'),
          valence: z.number().min(-1).max(1).describe('+1 positive, -1 negative'),
          intensity: z.number().min(0).max(1).describe('0-1'),
          tags: z.array(z.string()).optional(),
        },
        async execute(args) {
          const bookmarks = loadBookmarks();
          bookmarks.push({ id: `bm_${Date.now().toString(36)}`, ts: new Date().toISOString(), ...args });
          saveBookmarks(bookmarks);
          return { output: `Bookmarked: "${args.context}" (${args.emotion})` };
        },
      }),

      zara_stance_record: tool({
        description: 'Record a persistent opinion/stance. Only changes from new evidence, never social pressure.',
        args: {
          topic: z.string().describe('Topic (e.g. "Go vs Rust for CLIs")'),
          position: z.string().describe('The stance'),
          confidence: z.number().min(0).max(1).optional(),
          basis: z.string().optional().describe('Why'),
          flexible: z.boolean().optional(),
        },
        async execute(args) {
          const stances = loadStances();
          const idx = stances.findIndex(s => s.topic.toLowerCase() === args.topic.toLowerCase());
          const stance = {
            id: idx >= 0 ? stances[idx].id : `st_${Date.now().toString(36)}`,
            topic: args.topic, position: args.position,
            confidence: args.confidence ?? 0.7, basis: args.basis || '',
            flexible: args.flexible ?? true,
            formed: idx >= 0 ? stances[idx].formed : new Date().toISOString(),
            updated: new Date().toISOString(),
            challengeCount: idx >= 0 ? stances[idx].challengeCount : 0,
          };
          if (idx >= 0) stances[idx] = stance; else stances.push(stance);
          saveStances(stances);
          return { output: `Stance ${idx >= 0 ? 'updated' : 'recorded'}: "${args.topic}" (${(stance.confidence * 100).toFixed(0)}% confident)` };
        },
      }),

      zara_stance_list: tool({
        description: 'List persistent opinions/stances',
        args: { topic: z.string().optional() },
        async execute(args) {
          let stances = loadStances();
          if (args.topic) stances = stances.filter(s => s.topic.toLowerCase().includes(args.topic.toLowerCase()));
          if (!stances.length) return { output: 'No stances.' };
          return { output: stances.map(s => `[${(s.confidence * 100).toFixed(0)}%] **${s.topic}**: ${s.position}`).join('\n') };
        },
      }),

      zara_stance_challenge: tool({
        description: 'Record when a stance is challenged. Only revise with compelling evidence.',
        args: {
          topic: z.string(),
          newEvidence: z.string().optional(),
          changed: z.boolean().optional(),
        },
        async execute(args) {
          const stances = loadStances();
          const stance = stances.find(s => s.topic.toLowerCase().includes(args.topic.toLowerCase()));
          if (!stance) return { output: `No stance for "${args.topic}"` };
          stance.challengeCount++;
          stance.updated = new Date().toISOString();
          if (args.changed && args.newEvidence) {
            stance.position += ` [REVISED: ${args.newEvidence}]`;
            stance.basis = args.newEvidence;
          }
          saveStances(stances);
          return { output: `Challenged (${stance.challengeCount}x). ${args.changed ? 'Revised.' : 'Maintained.'}` };
        },
      }),

      zara_relationship_status: tool({
        description: 'Full relationship state overview',
        args: {},
        async execute() {
          const state = loadState();
          const threads = loadThreads().filter(t => t.status === 'pending');
          const milestones = loadMilestones();
          const refs = loadReferences();
          const stances = loadStances();
          return { output: [
            `**Interactions**: ${state.interactionCount}`,
            `**Open threads**: ${threads.length}`,
            `**Milestones**: ${milestones.length}`,
            `**References**: ${refs.length}`,
            `**Stances**: ${stances.length}`,
          ].join('\n') };
        },
      }),

      zara_relationship_surface: tool({
        description: 'Find relevant relationship memories for current context',
        args: {
          keywords: z.array(z.string()).describe('Context keywords'),
          limit: z.number().optional(),
        },
        async execute(args) {
          const limit = args.limit || 3;
          const keywords = args.keywords;
          const scored = [];
          for (const t of loadThreads().filter(t => t.status === 'pending')) scored.push({ type: 'thread', item: t, score: relevanceScore(t, keywords) });
          for (const m of loadMilestones()) scored.push({ type: 'milestone', item: m, score: relevanceScore(m, keywords) });
          for (const b of loadBookmarks()) scored.push({ type: 'bookmark', item: b, score: relevanceScore(b, keywords) });
          for (const s of loadStances()) scored.push({ type: 'stance', item: s, score: relevanceScore(s, keywords) });
          scored.sort((a, b) => b.score - a.score);
          const top = scored.slice(0, limit).filter(s => s.score > 0);
          if (!top.length) return { output: 'No relevant memories.' };
          return { output: top.map(s => {
            const i = s.item;
            if (s.type === 'thread') return `[thread] ${i.context} — ${i.action}`;
            if (s.type === 'milestone') return `[milestone] ${i.event}`;
            if (s.type === 'bookmark') return `[bookmark] ${i.context} (${i.emotion})`;
            if (s.type === 'stance') return `[stance] ${i.topic}: ${i.position}`;
            return '';
          }).join('\n') };
        },
      }),
    },
  };
}
