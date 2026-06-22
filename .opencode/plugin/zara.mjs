// Zara — Composition Root
// Imports all 11 domain modules, dispatches hooks, aggregates tools

import createObserve from './zara/observe/index.mjs';
import createMemory from './zara/memory/index.mjs';
import createFlow from './zara/flow/index.mjs';
import createDev from './zara/dev/index.mjs';
import createSocial from './zara/social/index.mjs';
import createEvolve from './zara/evolve/index.mjs';
import createEmpathy from './zara/empathy/index.mjs';
import createRelationship from './zara/relationship/index.mjs';
import createVoice from './zara/voice/index.mjs';
import createWorkspace from './zara/workspace/index.mjs';
import createDebate from './zara/debate/index.mjs';

export const id = 'zara';

export async function server({ client, directory }) {
  const config = { client, directory };

  // Initialize all modules
  const observe = createObserve(config);
  const memory = createMemory(config);
  const flow = createFlow(config);
  const dev = createDev(config);
  const social = createSocial(config);
  const evolve = createEvolve(config);
  const empathy = createEmpathy(config);
  const relationship = createRelationship(config);
  const voice = createVoice(config);
  const workspace = createWorkspace(config);
  const debate = createDebate(config);

  // Unified hook dispatch — all modules get called in consistent order
  function each(fn) {
    for (const m of [observe, memory, flow, dev, social, evolve, empathy, relationship, voice, workspace, debate]) {
      fn(m);
    }
  }

  return {
    // Event lifecycle (session.start, session.end, etc)
    event: async ({ event }) => {
      each(m => m.onEvent?.(event));
    },

    // System prompt injection
    'experimental.chat.system.transform': async ({ messages }) => {
      each(m => { messages = m.inject?.(messages) || messages; });
      return { messages };
    },

    // Message transformation (tool result truncation)
    'experimental.chat.messages.transform': async ({ messages }) => {
      each(m => { messages = m.transformMessages?.(messages) || messages; });
      return { messages };
    },

    // Session compacting (OpenCode built-in)
    'experimental.session.compacting': async () => {
      const contexts = [];
      each(m => {
        const result = m.onCompact?.();
        if (result?.context) contexts.push(result.context);
      });
      return contexts.length ? { context: contexts.join('\n') } : {};
    },

    // Before tool execution (trace start + guard validation + cache check)
    'tool.execute.before': async (input) => {
      const result = observe.beforeTool?.(input);
      if (result) return result; // cache hit, blocked tool, etc.
    },

    // After tool execution (trace end + guard + cache store)
    'tool.execute.after': async (input, output) => {
      observe.afterTool?.(input, output);
    },

    // Chat message hook (auto-capture memory)
    'chat.message': async (msg) => {
      memory.onMessage?.(msg);
      flow.onMessage?.(msg);
      empathy.onMessage?.(msg);
    },

    // Chat response hook (trace + guard repetition)
    'chat.response': async (res) => {
      observe.onResponse?.(res);
      memory.onResponse?.(res);
    },

    // All tools aggregated — last module wins on name conflict
    tool: {
      ...observe.tools,
      ...memory.tools,
      ...flow.tools,
      ...dev.tools,
      ...social.tools,
      ...evolve.tools,
      ...empathy.tools,
      ...relationship.tools,
      ...voice.tools,
      ...workspace.tools,
      ...debate.tools,
    },

    // Cleanup
    dispose: () => {
      each(m => m.dispose?.());
    },
  };
}
