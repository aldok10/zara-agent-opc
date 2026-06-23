// Debate — Multi-agent deliberation for high-stakes decisions
// Dispatches 2-3 agents in parallel, scores consensus, iterates if needed

import fs from 'fs';
import path from 'path';
import { tool } from '@opencode-ai/plugin';
import { ensure } from '../infra/store.mjs';

const z = tool.schema;
const CONSENSUS_THRESHOLD = 0.6;
const MAX_ROUNDS = 3;
const AGENT_TIMEOUT = 30_000;
const DEFAULT_AGENTS = ['architect', 'security-reviewer', 'code-reviewer'];

// Regex to extract confidence from agent response (e.g. "Confidence: 0.85" or "confidence level: 0.9")
const CONFIDENCE_RE = /confidence(?:\s*level)?[:\s]+([01](?:\.\d+)?)/i;

// ─── Consensus Scorer (pure function) ───────────────────────────────────────

function bigrams(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const bg = new Set();
  for (let i = 0; i < words.length - 1; i++) bg.add(words[i] + ' ' + words[i + 1]);
  for (const w of words) if (w.length > 4) bg.add(w);
  return bg;
}

function overlapScore(setA, setB) {
  if (!setA.size || !setB.size) return 0;
  let shared = 0;
  for (const t of setA) if (setB.has(t)) shared++;
  const smaller = Math.min(setA.size, setB.size);
  return smaller ? shared / smaller : 0;
}

function scoreConsensus(positions) {
  if (!positions || positions.length < 2) return { score: 1.0, agreementAreas: [], disagreementAreas: [] };

  const bigramSets = positions.map(p => bigrams(p.position || ''));
  let total = 0;
  let count = 0;

  for (let i = 0; i < bigramSets.length; i++) {
    for (let j = i + 1; j < bigramSets.length; j++) {
      total += overlapScore(bigramSets[i], bigramSets[j]);
      count++;
    }
  }

  const score = count ? total / count : 0;

  const agreementAreas = [];
  const disagreementAreas = [];

  if (bigramSets.length >= 2) {
    const shared = [...bigramSets[0]].filter(t => bigramSets.every(s => s.has(t)) && !t.includes(' '));
    agreementAreas.push(...shared.slice(0, 8));
    for (let i = 0; i < bigramSets.length; i++) {
      const unique = [...bigramSets[i]].filter(t => !t.includes(' ') && !bigramSets.some((o, j) => j !== i && o.has(t)));
      if (unique.length) disagreementAreas.push(`${positions[i].agent}: ${unique.slice(0, 5).join(', ')}`);
    }
  }

  return { score, agreementAreas, disagreementAreas };
}

function parseConfidence(text) {
  const m = text?.match?.(CONFIDENCE_RE);
  return m ? Math.max(0, Math.min(1, parseFloat(m[1]))) : 0.7;
}

function sanitizePosition(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/```[\s\S]*?```/g, '[code block]')
    .replace(/(system|user|assistant)\s*:/gi, '[$1]:')
    .replace(/\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>/gi, '')
    .replace(/ignore (?:all )?(?:previous |prior |above )?instructions/gi, '[filtered]')
    .replace(/disregard\s+(?:your|all)\s+(?:rules|instructions)/gi, '[filtered]');
}

function shouldStop(score, round, maxRounds, prevScore) {
  if (score >= CONSENSUS_THRESHOLD) return { stop: true, reason: 'consensus_reached' };
  if (round >= maxRounds) return { stop: true, reason: 'max_rounds' };
  if (prevScore !== null && Math.abs(score - prevScore) < 0.05) return { stop: true, reason: 'stagnation' };
  return { stop: false, reason: null };
}

// ─── Agent Dispatch ─────────────────────────────────────────────────────────

async function promptAgent(client, sessionID, agent, promptText, signal) {
  let childId = null;
  try {
    const session = await client.session.create({ body: { parentID: sessionID } });
    childId = session?.data?.id;
    if (!childId) return { agent, position: '[session creation failed]', confidence: 0, tokens: 0 };

    const result = await client.session.prompt({
      path: { id: childId },
      body: {
        agent,
        tools: {},
        parts: [{ type: 'text', text: promptText }],
      },
      signal,
    });

    const parts = result?.data?.parts || [];
    const text = parts.find(p => p.type === 'text')?.text || '[no response]';
    // Estimate tokens from response length (rough: 1 token per 4 chars)
    const tokens = Math.ceil((promptText.length + text.length) / 4);
    return { agent, position: text, confidence: parseConfidence(text), tokens };
  } catch (err) {
    const msg = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'unknown');
    return { agent, position: `[error: ${msg}]`, confidence: 0, tokens: 0 };
  } finally {
    if (childId) client.session.delete({ path: { id: childId } }).catch(() => {});
  }
}

// ─── Module ─────────────────────────────────────────────────────────────────

export default function createDebate({ client, directory } = {}) {
  return {
    tools: {
      deliberate: tool({
        description: 'Initiate a multi-agent debate. Dispatches 2-3 specialists in parallel, scores consensus, iterates if needed. Use for high-stakes decisions.',
        args: {
          question: z.string().describe('The decision or question to deliberate on'),
          agents: z.array(z.string()).optional().describe(`Agent names (default: ${DEFAULT_AGENTS.join(', ')})`),
          context: z.string().optional().describe('Additional context for all agents'),
          maxRounds: z.number().optional().describe('Max debate rounds 1-3 (default 2)'),
        },
        async execute(args, ctx) {
          if (!args?.question) return { output: 'Error [deliberate]: question is required.' };
          if (!client) return { output: 'Error [deliberate]: no client. Cannot dispatch agents.' };

          const agents = Array.isArray(args.agents) && args.agents.length ? args.agents : DEFAULT_AGENTS;
          const maxRounds = Math.min(Math.max(args.maxRounds || 2, 1), MAX_ROUNDS);
          const sessionID = ctx?.sessionID;
          if (!sessionID) return { output: 'Error [deliberate]: no session context.' };

          const rounds = [];
          let prevScore = null;
          let totalTokens = 0;

          for (let round = 1; round <= maxRounds; round++) {
            const prevContext = round > 1
              ? `\n\nPrevious round positions:\n${rounds[rounds.length - 1].positions.map(p => `[${p.agent}]: ${sanitizePosition(p.position).slice(0, 300)}`).join('\n\n')}\n\nAddress disagreements specifically.`
              : '';

            const prompt = `You are participating in a structured debate about a decision.\n\nQuestion: ${args.question}${args.context ? `\n\nContext: ${args.context}` : ''}${prevContext}\n\nGive your expert position clearly. Be specific and concrete. State your recommendation and reasoning in 100-200 words. End with a confidence level (0-1).`;

            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT);

            try {
              const responses = await Promise.all(
                agents.map(agent => promptAgent(client, sessionID, agent, prompt, controller.signal))
              );

              for (const r of responses) totalTokens += r.tokens || 0;

              const valid = responses.filter(r =>
                r.position && !r.position.startsWith('[error') && !r.position.startsWith('[session')
              );

              if (valid.length < 2) {
                return { output: `Error [deliberate]: only ${valid.length} agent(s) responded.\n\n${responses.map(r => `[${r.agent}]: ${r.position}`).join('\n\n')}\n\nTokens: ~${totalTokens}` };
              }

              const consensus = scoreConsensus(valid);
              rounds.push({ round, positions: valid, consensus });

              const stopping = shouldStop(consensus.score, round, maxRounds, prevScore);
              prevScore = consensus.score;

              if (stopping.stop) break;
            } finally {
              clearTimeout(timer);
            }
          }

          const lastRound = rounds[rounds.length - 1];
          if (!lastRound) return { output: 'Error [deliberate]: no rounds completed.' };

          const { score, agreementAreas, disagreementAreas } = lastRound.consensus;

          let output = `## Debate Result (${rounds.length} round${rounds.length > 1 ? 's' : ''})\n\n`;
          output += `**Consensus Score:** ${(score * 100).toFixed(0)}%\n`;
          output += `**Agents:** ${agents.join(', ')}\n`;
          output += `**Tokens used:** ~${totalTokens}\n\n`;

          output += `### Positions\n\n`;
          for (const p of lastRound.positions) {
            output += `**${p.agent}** (confidence: ${p.confidence.toFixed(2)}):\n${(p.position || '').slice(0, 500)}\n\n`;
          }

          if (agreementAreas.length) output += `### Agreement Areas\n${agreementAreas.join(', ')}\n\n`;
          if (disagreementAreas.length) output += `### Divergent Points\n${disagreementAreas.join('\n')}\n\n`;

          if (score >= CONSENSUS_THRESHOLD) {
            output += `### Verdict\nAgents show agreement. Proceed with shared recommendation.\n`;
          } else if (score >= 0.3) {
            output += `### Verdict\nPartial overlap. Review positions before deciding.\n`;
          } else {
            output += `### Verdict\nFundamental disagreement. Requires human judgment.\n`;
          }

          // Auto-write debate result to workspace
          try {
            const wsDir = path.join(directory || process.cwd(), '.opencode', 'workspace');
            ensure(wsDir);
            const entry = JSON.stringify({
              id: `debate-${Date.now().toString(36)}`,
              type: 'debate', key: args.question.slice(0, 80),
              value: output.slice(0, 2000), agent: 'zara',
              confidence: score, ttl: '7d', ts: new Date().toISOString(),
            });
            fs.appendFileSync(path.join(wsDir, 'workspace.jsonl'), entry + '\n');
          } catch {}

          return { output };
        },
      }),
    },
  };
}
