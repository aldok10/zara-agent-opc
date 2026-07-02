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

  return {
    onEvent(event) {
      if (event.type === 'session.created') touch();
    },

    inject(messages) {
      // Only inject when there's something actionable (due thread)
      const due = getDueThreads();
      if (!due.length) return messages;

      const sys = messages.find(m => m.role === 'system');
      if (sys) sys.content += `\n\n[Thread due] "${due[0].context}" — ${due[0].action}`;
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
        description: 'Track follow-up thread.',
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
        description: 'List threads.',
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
        description: 'Close thread.',
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

      zara_stance_record: tool({
        description: 'Record stance.',
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

      zara_relationship_status: tool({
        description: 'Relationship overview.',
        args: {},
        async execute() {
          const state = loadState();
          const threads = loadThreads().filter(t => t.status === 'pending');
          const stances = loadStances();
          return { output: [
            `**Interactions**: ${state.interactionCount}`,
            `**Open threads**: ${threads.length}`,
            `**Stances**: ${stances.length}`,
          ].join('\n') };
        },
      }),
    },
  };
}
