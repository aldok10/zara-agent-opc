// Zara — Composition Root
// Imports all 13 domain modules, dispatches hooks, aggregates tools

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
import createHarness from './zara/harness/index.mjs';
import createProactive from './zara/proactive/index.mjs';

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
  const harness = createHarness(config);
  const proactive = createProactive(config);

  // Unified hook dispatch — all modules get called in consistent order
  function each(fn) {
    for (const m of [observe, memory, flow, dev, social, evolve, empathy, relationship, voice, workspace, debate, harness, proactive]) {
      fn(m);
    }
  }

  return {
    // Event lifecycle (session.start, session.end, etc)
    event: async ({ event }) => {
      // Normalize: OpenCode may pass string ('created') or object ({type:'session.created'})
      const normalized = typeof event === 'string'
        ? { type: event.startsWith('session.') ? event : `session.${event}` }
        : event;
      each(m => m.onEvent?.(normalized));
    },

    // System prompt injection.
    // Real OpenCode API (@opencode-ai/plugin 1.17.x): (input, output) where
    // output.system is a string[]. Modules still operate on a messages array
    // ({role, content}), so we bridge the string[] <-> messages representation.
    // Legacy call shape ({ messages }) is preserved for backward compat/tests.
    'experimental.chat.system.transform': async (input, output) => {
      if (output && Array.isArray(output.system)) {
        // New API: fold system[] into a synthetic messages array, run modules,
        // then write the (possibly extended) system content back.
        let messages = [{ role: 'system', content: output.system.join('\n\n') }];
        each(m => { messages = m.inject?.(messages) || messages; });
        const sys = messages.find(m => m.role === 'system');
        const rebuilt = [];
        if (sys && typeof sys.content === 'string') rebuilt.push(sys.content);
        // Any additional messages modules pushed (e.g. appended nudges) get
        // flattened into extra system strings.
        for (const msg of messages) {
          if (msg !== sys && typeof msg?.content === 'string' && msg.content) rebuilt.push(msg.content);
        }
        output.system = rebuilt.length ? rebuilt : output.system;
        return;
      }
      // Legacy shape: input === { messages }
      let messages = input?.messages || [];
      each(m => { messages = m.inject?.(messages) || messages; });
      return { messages };
    },

    // Message transformation (tool result truncation).
    // Real API: (input, output) where output.messages is { info: Message, parts: Part[] }[].
    'experimental.chat.messages.transform': async (input, output) => {
      if (output && Array.isArray(output.messages)) {
        let messages = output.messages;
        each(m => { messages = m.transformMessages?.(messages) || messages; });
        output.messages = messages;
        return;
      }
      // Legacy shape: input === { messages }
      let messages = input?.messages || [];
      each(m => { messages = m.transformMessages?.(messages) || messages; });
      return { messages };
    },

    // Session compacting (OpenCode built-in) — multi-layer strategy.
    // Real API: (input, output) where output.context is a string[] and
    // output.prompt is an optional override.
    'experimental.session.compacting': async (input, output) => {
      const compressor = observe.getCompressor?.() || null;

      if (output && Array.isArray(output.context)) {
        each(m => {
          const result = m.onCompact?.();
          if (result?.context) output.context.push(result.context);
        });
        if (compressor) {
          output.context.push(`[Pre-compaction] Total tokens saved by tool result pruning: ${compressor.totalPruned}`);
        }
        return;
      }
      // Legacy fallback (no output.context provided)
      const contexts = [];
      each(m => {
        const result = m.onCompact?.();
        if (result?.context) contexts.push(result.context);
      });
      return contexts.length ? { context: contexts.join('\n') } : {};
    },

    // Before tool execution (trace start + guard validation + cache check).
    // Real API: args live in output.args. Hooks return void — to block/short-circuit
    // a tool, mutate output (observe.beforeTool handles this).
    'tool.execute.before': async (input, output) => {
      observe.beforeTool?.(input, output);
    },

    // After tool execution (trace end + guard + cache store).
    // Real API: input.tool, input.args, output.output/title/metadata.
    'tool.execute.after': async (input, output) => {
      observe.afterTool?.(input, output);
    },

    // Chat message hook — fires for both user and assistant messages.
    // Real API: (input, output) where output.message is a Message and
    // output.parts is Part[]. We flatten parts into a legacy-shaped {role, content,
    // tool_calls} object so the existing module handlers keep working. Assistant
    // messages also drive the response-side logic that used to live on the
    // (now-removed) chat.response hook.
    'chat.message': async (input, output) => {
      const message = output?.message || null;
      const parts = Array.isArray(output?.parts) ? output.parts : [];
      const role = message?.role || 'user';
      const text = parts
        .filter(p => p?.type === 'text' && typeof p.text === 'string')
        .map(p => p.text)
        .join('\n')
        || (typeof message?.content === 'string' ? message.content : '');
      const toolCalls = parts.filter(p => p?.type === 'tool');
      const adapted = { ...(message || {}), role, content: text, tool_calls: toolCalls };

      memory.onMessage?.(adapted);
      empathy.onMessage?.(adapted);

      if (role === 'assistant') {
        observe.onResponse?.(adapted);
        memory.onResponse?.(adapted);
        voice.onResponse?.(adapted);
      }
    },

    // Tool definition hook — compress verbose tool descriptions before they reach
    // the LLM (saves context tokens).
    'tool.definition': async (input, output) => {
      observe.compressToolDefinition?.(input, output);
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
      ...harness.tools,
      ...proactive.tools,
    },

    // Cleanup
    dispose: () => {
      each(m => m.dispose?.());
    },
  };
}
