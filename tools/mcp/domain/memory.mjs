// Unified memory tool — single MCP tool with action-based routing.
// Consolidates 26 tools across 10 domains into ONE `memory` tool to slash
// system-prompt token cost. All prior functionality is preserved and reachable
// through the `action` (+ `op`) parameters.
//
// Dropped: music player, shutdown ritual.

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { execFileSync } from 'child_process';

import {
  semanticLearn, semanticRecall, semanticRecallAsync,
  episodicRecord, episodicRecall,
  proceduralSave, proceduralRecall, proceduralCount,
  stats as dbStats, dreamConsolidate, detectContradictions, detectContradictionsAsync,
  deleteByPattern, countByPattern, adjustTrust, getDb,
  knowledgeUpsert, knowledgeBySection, knowledgeSearch, knowledgeSections, knowledgeCount,
  knowledgeChunkUpsert, knowledgeChunkSearch, knowledgeChunkSearchAsync, knowledgeChunkUpsertAsync, knowledgeChunkCount
} from '../../memory-db.mjs';
import { SemanticEmbedder } from '../../embedder.mjs';
import { CHROMA_ENABLED } from '../../vector-store.mjs';
import { parseBundle, isOkfBundle, mapType, validateBundle } from '../../memory/okf.mjs';
import { HOME, loadJson, saveJson, ensure } from '../infra.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const REFLECT_DIR = path.join(HOME, 'reflections');
const EVOLVE_DIR = path.join(HOME, 'evolve');
const LEARNINGS_DIR = path.join(HOME, 'learnings');
const METRICS_DIR = path.join(HOME, 'metrics');
const IDENTITY_FILE = path.join(HOME, 'identity.json');
const PROFILE_FILE = path.join(HOME, 'user-profile.json');
const PROFILE_CACHE = path.join(HOME, 'profile.json');

// Track keys recalled this session for trust calibration (cross-action shared).
const recalledKeys = new Set();
// Sliding window: max 5 trust adjustments per 60 minutes.
const _trustTimestamps = [];

const SECTION_TYPE_MAP = {
  principles: 'policy', practices: 'workflow', antipatterns: 'pitfall',
  'code-smells': 'pitfall', architecture: 'architecture', 'design-patterns': 'architecture',
  'domain-driven-design': 'architecture', testing: 'workflow', laws: 'fact',
  values: 'policy', terms: 'fact', tools: 'fact', 'natural-voice': 'policy',
};

// ─────────────────────────────────────────────────────────────────────────
// Tool definition
// ─────────────────────────────────────────────────────────────────────────

const tools = {
  memory: {
    description: 'Unified memory + learning system. action: recall|learn|episode|procedure|manage|session|system. Sub-routes via op.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['recall', 'learn', 'episode', 'procedure', 'manage', 'session', 'system'] },
        op: { type: 'string', description: 'Sub-operation for manage/session/system/episode/learn' },
        query: { type: 'string' },
        key: { type: 'string' },
        value: { type: 'string' },
        layer: { type: 'string', enum: ['all', 'semantic', 'episodic', 'procedural', 'knowledge'] },
        scope: { type: 'string' },
        type: { type: 'string', enum: ['policy', 'workflow', 'pitfall', 'architecture', 'decision', 'preference', 'fact'] },
        source: { type: 'string', enum: ['user_explicit', 'observed', 'inferred', 'external_unverified'] },
        k: { type: 'number' },
        event: { type: 'string' },
        outcome: { type: 'string', enum: ['success', 'partial', 'failure'] },
        tags: { type: 'array', items: { type: 'string' } },
        pattern: { type: 'string' },
        worked: { type: 'string' },
        failed: { type: 'string' },
        agent: { type: 'string' },
        test_exit_code: { type: 'number' },
        test_summary: { type: 'string' },
        reflection_type: { type: 'string', enum: ['principle', 'procedural', 'both'] },
        area: { type: 'string' },
        observation: { type: 'string' },
        suggestion: { type: 'string' },
        name: { type: 'string' },
        steps: { type: 'array', items: { type: 'string' } },
        context: { type: 'string' },
        pattern_match: { type: 'string' },
        path: { type: 'string' },
        force: { type: 'boolean' },
        include_skills: { type: 'boolean' },
        dry_run: { type: 'boolean' },
        confirm: { type: 'boolean' },
        threshold: { type: 'number' },
        section: { type: 'string' },
        list_sections: { type: 'boolean' },
        update: { type: 'object' },
        condition: { type: 'string' },
        max_turns: { type: 'number' },
        notes: { type: 'string' },
        persist: { type: 'boolean' },
        situation: { type: 'string' },
        days: { type: 'number' },
        phase: { type: 'string', enum: ['observe', 'orient', 'full'] },
        map: { type: 'boolean' },
      },
      required: ['action'],
    },
    handler: (args) => route(args),
  },
};

async function route(args) {
  switch (args.action) {
    case 'recall': return recall(args);
    case 'learn':
      if (args.op === 'project') return projectLearn(args);
      if (args.op === 'pitfall') return learnPitfall(args);
      return learn(args);
    case 'episode':
      if (args.op === 'reflect') return reflect(args);
      if (args.op === 'blindspot') return blindspotLog(args);
      if (args.op === 'suggest') return reflectSuggest(args);
      if (args.op === 'patterns') return listPatterns();
      return episode(args);
    case 'procedure': return procedure(args);
    case 'manage': return manage(args);
    case 'session': return session(args);
    case 'system': return system(args);
    default: return `Unknown action: ${args.action}. Use recall|learn|episode|procedure|manage|session|system.`;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// RECALL
// ─────────────────────────────────────────────────────────────────────────

async function recall(args) {
  if (!args.query) {
    return `Error: recall requires a 'query' parameter. Example: { action: "recall", query: "user preferences" }`;
  }
  const layer = args.layer || 'all';

  if (layer === 'knowledge') return knowledgePassage(args);

  if (layer !== 'all') {
    const results = [];
    if (layer === 'semantic') {
      let m;
      try { m = await semanticRecallAsync(args.query, args.k || 5, { scope: args.scope, type: args.type }); }
      catch { m = await semanticRecall(args.query, args.k || 5, { scope: args.scope, type: args.type }); }
      if (m.length) {
        for (const r of m) { if (recalledKeys.size < 20) recalledKeys.add(r.key); }
        results.push(m.map(r => `[${r.type || 'fact'}] ${r.key}: ${r.value}`).join('\n'));
      }
    }
    if (layer === 'episodic') {
      const m = await episodicRecall(args.query, args.k || 5);
      if (m.length) results.push(m.map(r => `[${r.ts?.split('T')[0]}] ${r.event}${r.outcome ? ' → ' + r.outcome : ''}`).join('\n'));
    }
    if (layer === 'procedural') {
      const m = await proceduralRecall(args.query, args.k || 3);
      if (m.length) results.push(m.map(r => `${r.name}: ${JSON.parse(r.steps).join(' → ')}`).join('\n'));
    }
    return results.join('\n\n') || `No memories for "${args.query}"`;
  }

  // Multi-layer RRF fusion.
  const K = 60;
  const fused = new Map();

  let sem;
  try { sem = await semanticRecallAsync(args.query, 8, { scope: args.scope, type: args.type }); }
  catch { sem = await semanticRecall(args.query, 8, { scope: args.scope, type: args.type }); }
  for (let rank = 0; rank < sem.length; rank++) {
    const r = sem[rank];
    const id = `sem:${r.key}`;
    if (recalledKeys.size < 20) recalledKeys.add(r.key);
    const entry = fused.get(id) || { id, display: `[${r.type || 'fact'}] ${r.key}: ${r.value}`, rrfScore: 0, sources: [] };
    entry.rrfScore += 1 / (K + rank + 1);
    entry.sources.push('semantic');
    fused.set(id, entry);
  }

  const epi = await episodicRecall(args.query, 5);
  for (let rank = 0; rank < epi.length; rank++) {
    const r = epi[rank];
    const id = `epi:${r.id || r.event.slice(0, 40)}`;
    const entry = fused.get(id) || { id, display: `[${r.ts?.split('T')[0]}] ${r.event}${r.outcome ? ' → ' + r.outcome : ''}`, rrfScore: 0, sources: [] };
    entry.rrfScore += 1 / (K + rank + 1);
    entry.sources.push('episodic');
    fused.set(id, entry);
  }

  const proc = await proceduralRecall(args.query, 3);
  for (let rank = 0; rank < proc.length; rank++) {
    const r = proc[rank];
    const id = `proc:${r.name}`;
    const entry = fused.get(id) || { id, display: `${r.name}: ${JSON.parse(r.steps).join(' → ')}`, rrfScore: 0, sources: [] };
    entry.rrfScore += 1 / (K + rank + 1);
    entry.sources.push('procedural');
    fused.set(id, entry);
  }

  if (!fused.size) return `No memories for "${args.query}"`;
  const ranked = [...fused.values()].sort((a, b) => b.rrfScore - a.rrfScore).slice(0, 8);
  return ranked.map(r => r.display).join('\n');
}

// ─────────────────────────────────────────────────────────────────────────
// LEARN
// ─────────────────────────────────────────────────────────────────────────

async function learnPitfall(args) {
  const situation = args.situation || args.context || 'unknown';
  const observation = args.observation || args.failed || '';
  const suggestion = args.suggestion || args.worked || '';
  if (!observation && !suggestion) return 'Error: pitfall requires at least observation or suggestion.';
  const key = `pitfall:${situation.replace(/\s+/g, '-').toLowerCase().slice(0, 60)}`;
  const value = `Situation: ${situation}. Problem: ${observation}${suggestion ? '. Fix: ' + suggestion : ''}`;
  const result = await semanticLearn(key, value, 'observed', 'pitfall', '', { agent: args.agent || '' });
  return `Pitfall stored: ${result.key} = ${result.value} [${result.type}]`;
}

async function learn(args) {
  if (!args.key || !args.value) {
    return `Error: learn requires 'key' and 'value' parameters. Got key=${JSON.stringify(args.key)}, value=${JSON.stringify(args.value)}. For pitfalls use op='pitfall' with situation/observation/suggestion.`;
  }
  const memType = args.type || 'fact';
  const source = args.source || 'observed';
  const agent = args.agent || '';
  const SECRETS_RE = /(?:(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}|(?:sk|pk)[-_](?:live|test)[-_][A-Za-z0-9]{20,}|(?:AKIA|ASIA)[A-Z0-9]{16}|xox[bpras]-[A-Za-z0-9-]{10,}|eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{35}|sk-ant-[A-Za-z0-9_-]{20,}|sk-proj-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9_-]{40,}|-----BEGIN.*PRIVATE KEY-----|(?:postgres|mysql|mongodb\+srv|redis):\/\/[^\s]+:[^\s]+@|(?:password|secret|token|api_key)\s*[=:]\s*['"][^\s'"]{8,})/;
  if (SECRETS_RE.test(args.key + ' ' + args.value)) {
    return `⚠️ Refused: value appears to contain a secret/token. Never store credentials in memory.`;
  }
  const POLICY_TYPES = ['policy', 'architecture', 'decision', 'preference', 'pitfall'];
  const RESTRICTED_AGENTS = ['forge', 'implementation', 'hive', 'swarm', 'explore', 'general'];
  if (POLICY_TYPES.includes(memType) && RESTRICTED_AGENTS.includes(agent.toLowerCase())) {
    return `⚠️ Refused: agent '${agent}' cannot write type '${memType}'. Only orchestrator or user can set policies.`;
  }
  if (POLICY_TYPES.includes(memType) && source !== 'user_explicit') {
    return `⚠️ Refused: type '${memType}' requires source 'user_explicit'.`;
  }
  if (source === 'external_unverified' && POLICY_TYPES.includes(memType)) {
    return `⚠️ Refused: external_unverified content cannot be stored as ${memType}. Use type 'fact'.`;
  }
  const result = await semanticLearn(args.key, args.value, source, memType, args.scope || '', { agent });
  return `Stored: ${result.key} = ${result.value} [${result.type}]`;
}

// ─────────────────────────────────────────────────────────────────────────
// EPISODE / REFLECT / BLINDSPOT
// ─────────────────────────────────────────────────────────────────────────

async function episode(args) {
  const result = await episodicRecord(args.event, args.outcome || '', args.tags || []);
  return `Recorded: ${result.event}`;
}

function reflect(args) {
  ensure(REFLECT_DIR);
  let defaulted = false;
  if (!args.outcome) { args.outcome = 'partial'; defaulted = true; }
  let downgraded = false;
  if (args.outcome === 'success' && !args.worked?.trim()) { args.outcome = 'partial'; downgraded = true; }
  let grounded = false, groundedNote = '';
  if (typeof args.test_exit_code === 'number') {
    grounded = true;
    if (args.test_exit_code !== 0 && args.outcome === 'success') {
      args.outcome = 'failure'; downgraded = true; groundedNote = ' (GROUNDED: test_exit_code!=0, success rejected)';
    } else if (args.test_exit_code === 0 && args.outcome === 'success') {
      groundedNote = ' (grounded: tests passed)';
    }
  }
  const logFile = path.join(REFLECT_DIR, 'log.jsonl');
  fs.appendFileSync(logFile, JSON.stringify({ ...args, agent: args.agent || '', grounded, ts: new Date().toISOString() }) + '\n');
  try {
    const lines = fs.readFileSync(logFile, 'utf-8').trim().split('\n');
    if (lines.length > 500) fs.writeFileSync(logFile, lines.slice(-500).join('\n') + '\n');
  } catch (e) { process.stderr.write(`[mcp:memory] log rotation failed: ${e.message}\n`); }

  if (args.outcome && recalledKeys.size > 0) {
    const now = Date.now(), windowMs = 60 * 60 * 1000;
    while (_trustTimestamps.length && _trustTimestamps[0] <= now - windowMs) _trustTimestamps.shift();
    if (_trustTimestamps.length < 5) {
      _trustTimestamps.push(now);
      const canRaise = args.outcome === 'success' && args.worked && args.worked.trim().length >= 20 && (grounded || typeof args.test_exit_code !== 'number');
      const effectiveOutcome = canRaise ? 'success' : (args.outcome === 'failure' ? 'failure' : 'partial');
      Promise.resolve(adjustTrust([...recalledKeys], effectiveOutcome)).catch(() => {});
    }
    recalledKeys.clear();
  }

  if (args.pattern) {
    const patternName = args.pattern.replace(/^(For |When |If |Before |After |During )/i, '').slice(0, 80).trim();
    const pFile = path.join(REFLECT_DIR, 'patterns.json');
    const patterns = loadJson(pFile, []);
    const existing = patterns.find(p => p.name === patternName);
    const reward = args.outcome === 'success' ? 1 : args.outcome === 'failure' ? 0 : 0.5;
    if (existing) {
      existing.occurrences++;
      existing.rewardSum = (existing.rewardSum ?? (existing.occurrences - 1)) + reward;
      existing.successRate = existing.rewardSum / existing.occurrences;
      existing.lastSeen = new Date().toISOString().split('T')[0];
      if (args.worked) existing.approach = args.worked;
      if (args.agent) existing.agent = args.agent;
    } else {
      patterns.push({
        name: patternName, approach: args.worked || args.task, occurrences: 1,
        rewardSum: reward, successRate: reward,
        created: new Date().toISOString().split('T')[0], lastSeen: new Date().toISOString().split('T')[0],
        ...(args.agent ? { agent: args.agent } : {}),
      });
    }
    saveJson(pFile, patterns);
  }
  const note = downgraded ? ' (downgraded: no evidence in worked field)' : defaulted ? ' (no outcome provided, defaulted to partial)' : '';
  const hints = [];
  if (args.outcome === 'failure' && !args.pattern) hints.push('PRINCIPLE: What rule would prevent this failure?');
  if (args.outcome === 'success' && args.worked && !args.pattern) hints.push('PROCEDURAL: What exact sequence worked? Consider storing as procedure.');
  if (args.outcome === 'failure' && args.failed) {
    const logLines = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf-8').trim().split('\n') : [];
    const recent = logLines.slice(-20).filter(l => { try { const e = JSON.parse(l); return e.outcome === 'failure' && e.failed; } catch { return false; } });
    if (recent.length >= 3) hints.push('ANTI-ENTRENCHMENT: 3+ recent failures. Switch perspective or approach.');
  }
  const hintStr = hints.length ? `\n${hints.join(' | ')}` : '';
  const task = args.task || args.event || 'task';
  return `Reflected on: ${task}${args.pattern ? ` → pattern: ${args.pattern}${args.outcome ? ` [${args.outcome}]` : ''}` : ''}${note}${groundedNote}${hintStr}`;
}

function blindspotLog(args) {
  const file = path.join(HOME, 'blindspots.json');
  const data = loadJson(file, []);
  data.push({ area: args.area, observation: args.observation, suggestion: args.suggestion, ts: new Date().toISOString().split('T')[0], reminded: 0 });
  saveJson(file, data);
  return `Blindspot recorded: ${args.area} — ${args.observation}`;
}

function scorePattern(p) {
  const rate = p.successRate ?? 1;
  const freqWeight = Math.log2((p.occurrences || 1) + 1);
  return rate * freqWeight;
}

function reflectSuggest(args) {
  const patterns = loadJson(path.join(REFLECT_DIR, 'patterns.json'), []);
  if (!patterns.length) return 'No learned patterns yet. Proceed and reflect afterward to build the loop.';
  const situation = args.situation || args.query || '';
  const terms = situation.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
  const matched = patterns
    .map(p => {
      const text = `${p.name} ${p.approach || ''}`.toLowerCase();
      const hits = terms.filter(t => text.includes(t)).length;
      const pTerms = p.name.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
      const reverseHits = pTerms.filter(t => situation.toLowerCase().includes(t)).length;
      const totalRelevance = (hits / Math.max(terms.length, 1)) + (reverseHits / Math.max(pTerms.length, 1));
      return totalRelevance > 0.1 ? { p, relevance: totalRelevance, score: scorePattern(p) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (b.relevance * b.score) - (a.relevance * a.score))
    .slice(0, 3);
  if (!matched.length) return `No matching pattern for "${situation}". Proceed fresh and reflect afterward.`;
  return `## Suggested approaches (learned)\n` +
    matched.map(({ p }) => `- **${p.name}** (${p.occurrences}x, ${Math.round((p.successRate ?? 1) * 100)}% success): ${p.approach}`).join('\n');
}

function listPatterns() {
  const patterns = loadJson(path.join(REFLECT_DIR, 'patterns.json'), []);
  if (!patterns.length) return 'No patterns learned yet.';
  return [...patterns]
    .sort((a, b) => scorePattern(b) - scorePattern(a))
    .slice(0, 10)
    .map(p => `- ${p.name}: ${p.approach} — ${p.occurrences}x, ${Math.round((p.successRate ?? 1) * 100)}% success`)
    .join('\n');
}

// ─────────────────────────────────────────────────────────────────────────
// PROCEDURE
// ─────────────────────────────────────────────────────────────────────────

async function procedure(args) {
  if (args.steps && args.steps.length) {
    const result = await proceduralSave(args.name, args.steps, args.context || '');
    return `Saved procedure: ${result.name} (${result.steps} steps)`;
  }
  const m = await proceduralRecall(args.query || args.name || '', args.k || 3);
  if (!m.length) return `No procedures for "${args.query || args.name}"`;
  return m.map(r => `${r.name}: ${JSON.parse(r.steps).join(' → ')}`).join('\n');
}

// ─────────────────────────────────────────────────────────────────────────
// MANAGE (consolidate | delete | contradictions | seed)
// ─────────────────────────────────────────────────────────────────────────

async function manage(args) {
  switch (args.op) {
    case 'consolidate': return manageConsolidate();
    case 'delete': return manageDelete(args);
    case 'contradictions': return manageContradictions(args);
    case 'seed': return knowledgeLoadInit(args);
    case 'index': return knowledgeIndex(args);
    default: return `Unknown manage op: ${args.op}. Use consolidate|delete|contradictions|seed|index.`;
  }
}

async function manageConsolidate() {
  const r = await dreamConsolidate();
  let conflicts = [];
  try { conflicts = await detectContradictionsAsync(); } catch (e) { process.stderr.write(`[mcp:memory] detectContradictions failed: ${e.message}\n`); }
  try { await regenerateProfileCache(); } catch {}
  const conflictNote = conflicts.length
    ? `\n⚠️ ${conflicts.length} potential contradiction(s) detected — run manage/contradictions to review.`
    : '';
  return `Consolidation complete: ${r.merged} merged, ${r.archived} archived, ${r.reinforced} promoted${conflictNote}`;
}

async function manageContradictions(args) {
  let flagged;
  try { flagged = await detectContradictionsAsync(args.threshold || 0.92); }
  catch { flagged = detectContradictions(args.threshold || 0.85); }
  if (!flagged.length) return 'No contradicting memories detected.';
  return `${flagged.length} potential contradiction(s):\n` +
    flagged.map(f => `- [${f.type}] "${f.a}" (trust:${(f.trust_a ?? 0.5).toFixed(2)}) vs "${f.b}" (trust:${(f.trust_b ?? 0.5).toFixed(2)}) (${(f.sim * 100).toFixed(0)}% similar)`).join('\n');
}

async function manageDelete(args) {
  const pattern = args.pattern_match || args.pattern;
  if (!pattern || pattern.length < 3) return 'Pattern must be at least 3 characters.';
  if (args.dry_run) {
    const counts = await countByPattern(pattern);
    const total = counts.semantic + counts.episodic + counts.procedural;
    return `Dry run: would delete ${counts.semantic} semantic, ${counts.episodic} episodic, ${counts.procedural} procedural entries (${total} total) matching "${pattern}"`;
  }
  const counts = await countByPattern(pattern);
  const total = counts.semantic + counts.episodic + counts.procedural;
  if (total > 10 && !args.confirm) {
    return `⚠️ Bulk delete blocked: ${total} entries match "${pattern}". Pass confirm: true to proceed, or use a more specific pattern.`;
  }
  const result = await deleteByPattern(pattern);
  if (result.error) return `Refused: ${result.error} (${result.semantic} semantic match). Use a more specific pattern.`;
  return `Deleted: ${result.semantic} semantic, ${result.episodic} episodic, ${result.procedural} procedural entries matching "${pattern}"`;
}

// ─────────────────────────────────────────────────────────────────────────
// KNOWLEDGE (seed | index | passage)
// ─────────────────────────────────────────────────────────────────────────

const backendLabel = () => (CHROMA_ENABLED ? 'ChromaDB' : 'SQLite');

async function knowledgeLoadInit(args) {
  const serverRoot = PROJECT_ROOT;
  const root = args.path || (fs.existsSync(path.join(process.cwd(), 'knowledge')) ? process.cwd() : serverRoot);
  const resolvedRoot = path.resolve(root);
  const allowedBases = [path.resolve(serverRoot), path.resolve(process.cwd())];
  if (args.path && !allowedBases.some(base => resolvedRoot.startsWith(base + path.sep) || resolvedRoot === base)) {
    return `Error: path must be within the project directory`;
  }
  const knowledgeDir = path.join(resolvedRoot, 'knowledge');
  if (!fs.existsSync(knowledgeDir)) return `Error: ${knowledgeDir} not found`;

  const includeSkills = args.include_skills !== false;

  if (args.dry_run) {
    const files = walkMd(knowledgeDir);
    let msg = `Found ${files.length} knowledge files in ${knowledgeDir}`;
    if (includeSkills) {
      const skillDirs = fs.readdirSync(path.join(serverRoot, '.opencode/skills'), { withFileTypes: true })
        .filter(d => d.isDirectory() && fs.existsSync(path.join(serverRoot, '.opencode/skills', d.name, 'SKILL.md')));
      msg += `, ${skillDirs.length} skills`;
    }
    msg += `.\nVector backend: ${backendLabel()}.`;
    return msg;
  }

  const loader = isOkfBundle(knowledgeDir) ? loadOkfBundle : loadLegacyBundle;

  if (args.force && CHROMA_ENABLED) {
    try {
      const { getVectorStore } = await import('../../vector-store.mjs');
      const kChunks = getVectorStore('zara_knowledge');
      if (kChunks) await kChunks.removeAll();
      const kSemantic = getVectorStore('zara_semantic');
      if (kSemantic) {
        const all = await kSemantic.getAll(null, 10000);
        const toDelete = all.filter(e => e.metadata.key?.startsWith('knowledge.'));
        if (toDelete.length) await kSemantic.removeMany(toDelete.map(e => e.id || e.key));
      }
    } catch { /* best-effort */ }
  }

  const result = await loader(knowledgeDir, args.force);

  let skillsSynced = 0;
  if (includeSkills) {
    const skillsDir = path.join(serverRoot, '.opencode/skills');
    if (fs.existsSync(skillsDir)) {
      for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const skillMd = path.join(skillsDir, entry.name, 'SKILL.md');
        if (!fs.existsSync(skillMd)) continue;
        try {
          const content = fs.readFileSync(skillMd, 'utf-8');
          const key = `skill.${entry.name}`;
          await semanticLearn(key, `Skill ${entry.name}`, 'observed', 'workflow', `skills/${entry.name}`);
          await knowledgeChunkUpsert(key, 'skills', content);
          skillsSynced++;
        } catch (e) { /* skip */ }
      }
    }
  }

  const chunkCount = await knowledgeChunkCount();
  return `${result}\nSkills synced: ${skillsSynced}\nVector backend: ${backendLabel()}\nTotal chunks: ${chunkCount}`;
}

async function loadOkfBundle(knowledgeDir, force) {
  const concepts = parseBundle(knowledgeDir);
  if (!concepts.length) return 'No concepts found.';
  let stored = 0; const errors = [];
  if (force) {
    const db = getDb();
    db.prepare('DELETE FROM knowledge WHERE key LIKE ?').run('knowledge.%');
    db.prepare('DELETE FROM knowledge_chunks WHERE key LIKE ?').run('knowledge.%');
  }
  for (const concept of concepts) {
    try {
      const section = concept.conceptId.includes('/') ? concept.conceptId.split('/')[0] : 'standalone';
      const memType = concept.type ? mapType(concept.type) : (SECTION_TYPE_MAP[section] || 'fact');
      const key = `knowledge.${section}.${concept.conceptId.split('/').pop()}`;
      const summary = concept.description
        ? `${concept.title}: ${concept.description}`
        : concept.body
          ? `${concept.title}: ${concept.body.split(/\n\n/).find(p => p.trim() && !p.startsWith('#'))?.replace(/\n/g, ' ') || ''}`
          : concept.title;
      knowledgeUpsert(key, section, concept.title, summary, concept.file, memType);
      await semanticLearn(key, summary, 'observed', memType, `knowledge/${concept.file}`);
      if (concept.body) {
        try {
          const embedder = SemanticEmbedder.instance();
          await knowledgeChunkUpsertAsync(key, section, concept.body, embedder);
        } catch {
          try { await knowledgeChunkUpsert(key, section, concept.body); } catch (e2) { errors.push(`${concept.file}[fallback]: ${e2.message}`); }
        }
      }
      stored++;
    } catch (e) { errors.push(`${concept.file}: ${e.message}`); }
  }
  const sections = knowledgeSections().map(s => `${s.section}(${s.count})`).join(', ');
  return `OKF bundle loaded: ${stored} concepts stored, ${errors.length} errors.\nSections: ${sections}${errors.length ? '\nErrors:\n' + errors.slice(0, 5).join('\n') : ''}`;
}

async function loadLegacyBundle(knowledgeDir, force) {
  const files = walkMd(knowledgeDir);
  if (!files.length) return 'No markdown files found.';
  let stored = 0, skipped = 0; const errors = [];
  if (force) {
    const db = getDb();
    db.prepare('DELETE FROM knowledge WHERE key LIKE ?').run('knowledge.%');
    db.prepare('DELETE FROM knowledge_chunks WHERE key LIKE ?').run('knowledge.%');
  }
  for (const file of files) {
    try {
      const rel = path.relative(knowledgeDir, file);
      const section = rel.includes(path.sep) ? rel.split(path.sep)[0] : 'standalone';
      const memType = SECTION_TYPE_MAP[section] || 'fact';
      const content = fs.readFileSync(file, 'utf-8');
      const { title, description, body } = parseFrontmatter(content);
      if (!title && !body) { skipped++; continue; }
      const basename = path.basename(file, '.md');
      const key = `knowledge.${section}.${basename}`;
      let summary = '';
      if (description) summary = `${title}: ${description}`;
      else if (body) {
        const firstPara = body.split(/\n\n/).find(p => p.trim() && !p.startsWith('![') && !p.startsWith('#'));
        summary = firstPara ? `${title}: ${firstPara.replace(/\n/g, ' ')}` : title;
      } else summary = title;
      knowledgeUpsert(key, section, title || basename, summary, rel, memType);
      await semanticLearn(key, summary, 'observed', memType, `knowledge/${rel}`);
      if (body) {
        try {
          const embedder = SemanticEmbedder.instance();
          await knowledgeChunkUpsertAsync(key, section, body, embedder);
        } catch {
          try { await knowledgeChunkUpsert(key, section, body); } catch (e2) { errors.push(`${file}[fallback]: ${e2.message}`); }
        }
      }
      stored++;
    } catch (e) { errors.push(`${file}: ${e.message}`); }
  }
  const sections = knowledgeSections().map(s => `${s.section}(${s.count})`).join(', ');
  return `Knowledge seeded: ${stored} stored, ${skipped} skipped, ${errors.length} errors.\nSections: ${sections}${errors.length ? '\nErrors:\n' + errors.slice(0, 5).join('\n') : ''}`;
}

async function knowledgePassage(args) {
  if (knowledgeChunkCount() === 0) {
    return 'No passages indexed. Run manage/seed (or force=true to re-seed) to build the passage index.';
  }
  let hits;
  try {
    const embedder = SemanticEmbedder.instance();
    hits = await knowledgeChunkSearchAsync(args.query, embedder, args.section || '', args.k || 5);
  } catch {
    hits = knowledgeChunkSearch(args.query, args.section || '', args.k || 5);
  }
  if (!hits.length) return `No passages found for "${args.query}"${args.section ? ` in section "${args.section}"` : ''}.`;
  return hits.map(h => `[${(h.score).toFixed(2)}] ${h.key} #${h.chunk_index} (${h.section})\n  ${h.text.slice(0, 400)}`).join('\n\n');
}

function knowledgeIndex(args) {
  const count = knowledgeCount();
  if (!count) return 'No knowledge indexed. Run manage/seed first.';
  if (args.list_sections) {
    const sections = knowledgeSections();
    let out = `Knowledge Index (${count} articles)\n\n`;
    for (const s of sections) out += `  ${s.section} (${s.count}) [${s.mem_type}]\n`;
    return out;
  }
  let results;
  if (args.section && args.query) {
    results = knowledgeBySection(args.section).filter(r => {
      const q = args.query.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q);
    });
  } else if (args.section) results = knowledgeBySection(args.section);
  else if (args.query) results = knowledgeSearch(args.query);
  else return knowledgeIndex({ list_sections: true });
  if (!results.length) return 'No matching articles.';
  return results.slice(0, 30).map(r => `[${r.mem_type}] ${r.key}: ${r.title}\n  ${r.summary.slice(0, 120)}`).join('\n\n');
}

function walkMd(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'images') results.push(...walkMd(full));
    else if (entry.isFile() && entry.name.endsWith('.md') && !['_index.md', 'INDEX.md', 'SUMMARY.md'].includes(entry.name)) results.push(full);
  }
  return results;
}

function parseFrontmatter(content) {
  const fm = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)/);
  if (!fm) return { title: '', description: '', body: content };
  const meta = fm[1];
  const body = fm[2].trim();
  const title = meta.match(/^title:\s*(.+)/m)?.[1]?.trim() || '';
  const description = meta.match(/^description:\s*(.+)/m)?.[1]?.trim() || '';
  return { title, description, body };
}

// ─────────────────────────────────────────────────────────────────────────
// PROJECT LEARN
// ─────────────────────────────────────────────────────────────────────────

function detectProjectName(root) {
  try {
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
    const match = remote.match(/\/([^/]+?)(?:\.git)?$/);
    if (match) return match[1];
  } catch {}
  return path.basename(root);
}

function readJson(fp) { try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return null; } }

function topDirs(root) {
  try {
    return fs.readdirSync(root, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'vendor')
      .map(e => e.name);
  } catch { return []; }
}

function extractStack(root) {
  const facts = [];
  const pkg = readJson(path.join(root, 'package.json'));
  if (pkg) {
    facts.push({ slug: 'node', value: `Node.js project: ${pkg.name || 'unnamed'}` });
    if (pkg.type === 'module') facts.push({ slug: 'esm', value: 'Uses ESM (type: module)' });
    const deps = Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.devDependencies || {}));
    if (deps.length) facts.push({ slug: 'deps', value: `Key deps: ${deps.slice(0, 15).join(', ')}` });
  }
  if (fs.existsSync(path.join(root, 'go.mod'))) {
    const mod = fs.readFileSync(path.join(root, 'go.mod'), 'utf-8');
    const modName = mod.match(/^module\s+(.+)/m)?.[1] || '';
    facts.push({ slug: 'go', value: `Go module: ${modName}` });
  }
  if (fs.existsSync(path.join(root, 'Cargo.toml'))) facts.push({ slug: 'rust', value: 'Rust project (Cargo.toml)' });
  if (fs.existsSync(path.join(root, 'composer.json'))) {
    const c = readJson(path.join(root, 'composer.json'));
    facts.push({ slug: 'php', value: `PHP project: ${c?.name || 'unnamed'}` });
  }
  return facts;
}

function extractTests(root) {
  const patterns = [['jest', 'jest.config'], ['vitest', 'vitest.config'], ['mocha', '.mocharc'], ['go-test', '*_test.go'], ['phpunit', 'phpunit.xml']];
  const found = [];
  for (const [name, pattern] of patterns) {
    try {
      const entries = fs.readdirSync(root);
      if (entries.some(e => e.includes(pattern))) found.push(name);
    } catch {}
  }
  for (const dir of ['test', 'tests', '__tests__', 'spec']) {
    if (fs.existsSync(path.join(root, dir))) found.push(`dir:${dir}`);
  }
  return found.length ? [{ slug: 'framework', value: `Test setup: ${found.join(', ')}` }] : [];
}

function extractCI(root) {
  const facts = [];
  if (fs.existsSync(path.join(root, '.github', 'workflows'))) {
    const wfs = fs.readdirSync(path.join(root, '.github', 'workflows')).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    facts.push({ slug: 'github-actions', value: `GitHub Actions: ${wfs.join(', ')}` });
  }
  if (fs.existsSync(path.join(root, '.gitlab-ci.yml'))) facts.push({ slug: 'gitlab-ci', value: 'GitLab CI configured' });
  return facts;
}

function extractStructure(root) {
  const dirs = topDirs(root);
  return dirs.length ? [{ slug: 'dirs', value: `Top-level dirs: ${dirs.join(', ')}` }] : [];
}

async function projectLearn(args) {
  const root = path.resolve(args.path || process.cwd());
  if (!fs.existsSync(root)) return `Error: ${root} not found`;
  const project = detectProjectName(root);
  const scope = `project:${project}`;
  const extractors = [
    { category: 'stack', fn: extractStack },
    { category: 'structure', fn: extractStructure },
    { category: 'tests', fn: extractTests },
    { category: 'ci', fn: extractCI },
  ];
  let total = 0; const summary = [];
  for (const { category, fn } of extractors) {
    const facts = fn(root);
    for (const { slug, value } of facts) {
      const key = `project:${project}:${category}:${slug}`;
      const type = category === 'stack' ? 'architecture' : 'fact';
      await semanticLearn(key, value, 'observed', type, scope);
      total++;
    }
    if (facts.length) summary.push(`${category}: ${facts.length}`);
  }
  return `Extracted ${total} facts about "${project}" (${summary.join(', ')}). Scope: ${scope}\nUse recall with scope "${scope}" to retrieve.`;
}

// ─────────────────────────────────────────────────────────────────────────
// SESSION (start | end | check | profile | goal_* | discover | model)
// ─────────────────────────────────────────────────────────────────────────

async function session(args) {
  switch (args.op) {
    case 'start': case 'end': case 'check': return sessionLog(args);
    case 'profile': return userProfile(args);
    case 'discover': return discover(args);
    case 'model': return userModel();
    case 'goal_set': case 'goal_check': case 'goal_done': case 'goal_clear': case 'goal_status': return goal(args);
    default: return `Unknown session op: ${args.op}. Use start|end|check|profile|discover|model|goal_set|goal_check|goal_done|goal_clear|goal_status.`;
  }
}

async function sessionLog(args) {
  const file = path.join(HOME, 'session.json');
  const s = loadJson(file, { active: false, startedAt: null, context: '', totalToday: 0 });
  const MAX_SESSION_MS = 12 * 3600000;
  if (s.active && s.startedAt && (Date.now() - new Date(s.startedAt).getTime()) > MAX_SESSION_MS) {
    s.active = false; s.startedAt = null; s.lastEnded = new Date().toISOString(); saveJson(file, s);
  }
  if (args.op === 'start') {
    s.active = true; s.startedAt = new Date().toISOString(); s.context = args.context || '';
    recalledKeys.clear();
    saveJson(file, s);
    import('../../embedder.mjs').then(mod => mod.SemanticEmbedder.instance().embed('warmup')).catch(() => {});
    return `Session started: ${s.context || 'general'}`;
  }
  if (args.op === 'end') {
    if (!s.active || !s.startedAt) return 'No active session.';
    const mins = Math.round((Date.now() - new Date(s.startedAt).getTime()) / 60000);
    s.totalToday += mins; s.active = false; s.startedAt = null; s.lastEnded = new Date().toISOString();
    saveJson(file, s);
    const profile = loadJson(PROFILE_FILE, { sessionCount: 0 });
    profile.sessionCount = (profile.sessionCount || 0) + 1;
    profile.lastSeen = new Date().toISOString(); profile.lastUpdated = new Date().toISOString();
    saveJson(PROFILE_FILE, profile);
    let maintenance = '';
    try {
      const r = await dreamConsolidate();
      const bits = [];
      if (r.merged || r.archived || r.reinforced) bits.push(`${r.merged} merged, ${r.archived} archived, ${r.reinforced} promoted`);
      if (bits.length) maintenance = `\nMemory maintained: ${bits.join('; ')}.`;
    } catch (e) { process.stderr.write(`[mcp:session] end consolidation failed: ${e.message}\n`); }
    try {
      const conflicts = await detectContradictionsAsync(0.95);
      if (conflicts.length > 0) {
        const top = conflicts.slice(0, 3).map(c => `  - "${c.a}" vs "${c.b}" (sim: ${c.sim.toFixed(2)})`).join('\n');
        maintenance += `\n⚠️ ${conflicts.length} potential contradiction(s):\n${top}`;
      }
    } catch { /* skip */ }
    return `Session ended. Duration: ${mins}min. Total today: ${s.totalToday}min.${maintenance}`;
  }
  // check
  if (!s.active || !s.startedAt) return 'No active session.';
  const mins = Math.round((Date.now() - new Date(s.startedAt).getTime()) / 60000);
  const warnings = [];
  if (mins >= 120) warnings.push('⚠️ 2+ jam kerja tanpa istirahat. Sarankan break.');
  if (mins >= 180) warnings.push('🚨 3+ jam non-stop. Strongly suggest rest.');
  return `Active: ${mins}min on "${s.context}". Total today: ${s.totalToday + mins}min.${warnings.length ? '\n' + warnings.join('\n') : ''}`;
}

function userProfile(args) {
  const defaultName = (() => { try { return resolveBest().name; } catch { return 'there'; } })();
  const profile = loadJson(PROFILE_FILE, { name: defaultName, goals: [], activeProjects: [], energy: 'unknown', lastSeen: null, sessionCount: 0 });
  if (args.update) {
    const sanitize = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      const clean = Array.isArray(obj) ? [] : {};
      for (const [k, v] of Object.entries(obj)) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
        clean[k] = typeof v === 'object' && v !== null ? sanitize(v) : v;
      }
      return clean;
    };
    Object.assign(profile, sanitize(args.update));
    profile.lastUpdated = new Date().toISOString();
    saveJson(PROFILE_FILE, profile);
    return `Profile updated: ${Object.keys(args.update).join(', ')}`;
  }
  return JSON.stringify(profile, null, 2);
}

function goal(args) {
  const file = path.join(HOME, 'goal.json');
  const g = loadJson(file, { active: false, condition: null, turns: 0, maxTurns: 20, history: [] });
  if (args.op === 'goal_set') {
    if (!args.condition) return 'Need a condition/goal.';
    saveJson(file, { active: true, condition: args.condition, turns: 0, maxTurns: args.max_turns || 20, startedAt: new Date().toISOString(), history: [] });
    return `🎯 Goal set: "${args.condition}"\nMax turns: ${args.max_turns || 20}.`;
  }
  if (args.op === 'goal_status') {
    if (!g.active) return 'No active goal.';
    return `🎯 Goal: "${g.condition}"\nTurns: ${g.turns}/${g.maxTurns}`;
  }
  if (args.op === 'goal_check') {
    if (!g.active) return 'No active goal.';
    g.turns++;
    if (args.notes) g.history.push(`[${g.turns}] ${args.notes}`);
    saveJson(file, g);
    if (g.turns >= g.maxTurns) return `⚠️ Max turns reached (${g.maxTurns}). Goal: "${g.condition}"`;
    return `📍 Turn ${g.turns}/${g.maxTurns}. Goal: "${g.condition}"`;
  }
  if (args.op === 'goal_done') {
    if (!g.active) return 'No active goal.';
    g.active = false; g.completedAt = new Date().toISOString(); saveJson(file, g);
    return `✅ Goal achieved: "${g.condition}" in ${g.turns} turns.`;
  }
  if (args.op === 'goal_clear') {
    saveJson(file, { active: false, condition: null, turns: 0, maxTurns: 20, history: [] });
    return '🗑 Goal cleared.';
  }
  return 'Unknown goal op.';
}

// ── Identity resolution ──────────────────────────────────────────────────

function fromEnv() { const v = process.env.ZARA_USER_NAME; return v ? { name: v, source: 'env:ZARA_USER_NAME', confidence: 1.0 } : null; }
function fromIdentityFile() { const id = loadJson(IDENTITY_FILE, null); return id?.name ? { name: id.name, source: 'identity.json', confidence: 1.0, extra: id } : null; }
function fromProfile() { const p = loadJson(PROFILE_FILE, null); return p?.name ? { name: p.name, source: 'user-profile.json', confidence: 0.95, extra: p } : null; }
function fromMemory() {
  try {
    const cache = loadJson(PROFILE_CACHE, null);
    const hit = cache?.who?.find(h => /name|panggil|call/i.test(h.source) || /name|panggil/i.test(h.claim));
    if (hit) return { name: hit.claim, source: `memory:${hit.source}`, confidence: 0.8 };
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
    try { const full = execFileSync('id', ['-F'], { encoding: 'utf-8', timeout: 2000 }).trim(); if (full) return { name: full, source: 'os:fullname', confidence: 0.5 }; } catch {}
  }
  try { const u = os.userInfo().username; if (u) return { name: u, source: 'os:username', confidence: 0.3 }; } catch {}
  return null;
}
function fromShellUser() { const u = process.env.USER || process.env.USERNAME; return u ? { name: u, source: 'env:USER', confidence: 0.3 } : null; }

const RESOLVERS = [fromEnv, fromIdentityFile, fromProfile, fromMemory, fromGit, fromOS, fromShellUser];

function discoverAll() {
  const found = [];
  for (const r of RESOLVERS) { try { const res = r(); if (res) found.push(res); } catch {} }
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

async function regenerateProfileCache() {
  const who = (await semanticRecall('user name identity values personality', 5, { type: 'preference' })).map(r => ({ claim: r.value, source: r.key }));
  const goals = (await semanticRecall('goal objective target milestone', 5, { type: 'decision' })).map(r => ({ claim: r.value, source: r.key }));
  const cares = (await semanticRecall('interest priority care important value', 5, { type: 'preference' })).map(r => ({ claim: r.value, source: r.key }));
  const projects = (await semanticRecall('project working on building', 5, { type: 'fact' })).map(r => ({ claim: r.value, source: r.key }));
  const profile = { generated: new Date().toISOString(), who, goals, cares, projects };
  saveJson(PROFILE_CACHE, profile);
  return profile;
}

function discover(args) {
  if (args?.name) {
    persistIdentity(args.name, 'user_explicit');
    return `Canonical identity set: "${args.name}" (saved to ~/.zara/identity.json).`;
  }
  const candidates = discoverAll();
  const best = candidates.length ? candidates.sort((a, b) => b.confidence - a.confidence)[0] : { name: 'there', source: 'fallback', confidence: 0 };
  if (args?.persist && best.source !== 'fallback') persistIdentity(best.name, best.source);
  const lines = [`Best match: **${best.name}** (via ${best.source}, confidence ${best.confidence.toFixed(2)})`];
  if (candidates.length > 1) {
    lines.push('', 'All sources:');
    for (const c of candidates) lines.push(`  - ${c.name} <- ${c.source} (${c.confidence.toFixed(2)})`);
  }
  if (args?.persist && best.source !== 'fallback') lines.push('', 'Persisted as canonical identity.');
  return lines.join('\n');
}

async function userModel() {
  const fmt = (label, items) => items.length ? `**${label}:**\n${items.map(i => `- ${i}`).join('\n')}` : '';
  const who = (await semanticRecall('user name identity values personality', 5, { type: 'preference' })).map(r => `${r.key}: ${r.value}`);
  const goals = (await semanticRecall('goal objective target milestone', 5, { type: 'decision' }))
    .concat(await semanticRecall('goal objective target', 3, { type: 'fact' }))
    .map(r => `${r.key}: ${r.value}`);
  const patternsFile = path.join(REFLECT_DIR, 'patterns.json');
  const patterns = loadJson(patternsFile, [])
    .sort((a, b) => (b.successRate * b.occurrences) - (a.successRate * a.occurrences))
    .slice(0, 5)
    .map(p => `${p.name} (${(p.successRate * 100).toFixed(0)}% over ${p.occurrences}x)`);
  const cares = (await semanticRecall('interest priority care important value', 5, { type: 'preference' })).map(r => `${r.key}: ${r.value}`);
  const projects = (await semanticRecall('project working on building', 5, { type: 'fact' })).map(r => `${r.key}: ${r.value}`);
  const evolving = (await episodicRecall('changed learned grew shifted', 5)).map(r => `[${r.ts?.split('T')[0] || '?'}] ${r.event}`);
  const sections = [
    fmt('Who', who), fmt('Goals', goals), fmt('Thinking patterns', patterns),
    fmt('Cares about', cares), fmt('Working on', projects), fmt('Evolving', evolving),
  ].filter(Boolean);
  return sections.join('\n\n') || 'No user model data found. Interact more to build the model.';
}

// ─────────────────────────────────────────────────────────────────────────
// SYSTEM (audit | improve | evolve | patterns | suggest | integrity | dashboard)
// ─────────────────────────────────────────────────────────────────────────

async function system(args) {
  switch (args.op) {
    case 'audit': return selfAudit(args);
    case 'integrity': return skillIntegrity(args);
    case 'improve': return selfImprove(args);
    case 'evolve': return evolveStatus(args);
    case 'patterns': return listPatterns();
    case 'suggest': return reflectSuggest(args);
    case 'dashboard': return dashboard(args);
    default: return `Unknown system op: ${args.op}. Use audit|integrity|improve|evolve|patterns|suggest|dashboard.`;
  }
}

async function selfAudit(args) {
  const findings = []; const ok = [];
  try {
    const cfgRaw = fs.readFileSync(path.join(PROJECT_ROOT, 'opencode.json'), 'utf-8');
    const cfg = JSON.parse(cfgRaw);
    const agents = cfg.agent || {};
    let agentOk = 0;
    for (const [name, def] of Object.entries(agents)) {
      const m = (def.prompt || '').match(/\{file:([^}]+)\}/);
      if (!m) continue;
      const promptPath = path.join(PROJECT_ROOT, m[1]);
      if (fs.existsSync(promptPath)) agentOk++;
      else findings.push(`agent "${name}": prompt file missing → ${m[1]}`);
    }
    ok.push(`${agentOk}/${Object.keys(agents).length} agent prompt files present`);
    for (const ins of (cfg.instructions || [])) if (!fs.existsSync(path.join(PROJECT_ROOT, ins))) findings.push(`instructions file missing → ${ins}`);
    for (const pl of (cfg.plugin || [])) if (!fs.existsSync(path.join(PROJECT_ROOT, pl))) findings.push(`plugin entry missing → ${pl}`);
  } catch (e) { findings.push(`opencode.json: ${e.message}`); }

  try {
    const rootPath = path.join(PROJECT_ROOT, '.opencode/plugin/zara.mjs');
    if (fs.existsSync(rootPath)) {
      const src = fs.readFileSync(rootPath, 'utf-8');
      const imports = [...src.matchAll(/from\s+'(\.\/zara\/[^']+)'/g)].map(m => m[1]);
      let modOk = 0;
      for (const imp of imports) {
        const resolved = path.join(PROJECT_ROOT, '.opencode/plugin', imp);
        if (fs.existsSync(resolved)) modOk++;
        else findings.push(`plugin module imported but missing → ${imp}`);
      }
      ok.push(`${modOk}/${imports.length} plugin modules present`);
    }
  } catch (e) { findings.push(`plugin root: ${e.message}`); }

  try {
    const mcpIndex = path.join(PROJECT_ROOT, 'tools/mcp/index.mjs');
    if (fs.existsSync(mcpIndex)) {
      const src = fs.readFileSync(mcpIndex, 'utf-8');
      const domains = [...src.matchAll(/from\s+'(\.\/domain\/[^']+)'/g)].map(m => m[1]);
      let domOk = 0;
      for (const d of domains) {
        if (fs.existsSync(path.join(PROJECT_ROOT, 'tools/mcp', d))) domOk++;
        else findings.push(`MCP domain imported but missing → ${d}`);
      }
      ok.push(`${domOk}/${domains.length} MCP domains present`);
    }
  } catch (e) { findings.push(`MCP index: ${e.message}`); }

  const header = findings.length ? `Self-audit: ${findings.length} finding(s)\n\n` : `Self-audit: clean ✓\n\n`;
  const okLine = ok.length ? `OK:\n${ok.map(o => `  - ${o}`).join('\n')}\n\n` : '';
  const findLine = findings.length ? `Findings:\n${findings.map(f => `  ⚠️ ${f}`).join('\n')}` : '';
  let mapLine = '';
  if (args?.map) mapLine = '\n\n' + await capabilityMap();
  return header + okLine + findLine + mapLine;
}

async function capabilityMap() {
  const parts = ['## Capability Map'];
  try {
    const mcpIndex = path.join(PROJECT_ROOT, 'tools/mcp/index.mjs');
    const src = fs.readFileSync(mcpIndex, 'utf-8');
    const domains = [...src.matchAll(/from\s+'(\.\/domain\/([^']+)\.mjs)'/g)].map(m => m[2]);
    const lines = []; let total = 0;
    for (const d of domains) {
      const dPath = path.join(PROJECT_ROOT, 'tools/mcp/domain', `${d}.mjs`);
      let count = '?';
      try { const mod = await import(`file://${dPath}`); count = Object.keys(mod.default || {}).length; total += count; } catch {}
      lines.push(`  - ${d} (${count} tools)`);
    }
    parts.push(`MCP domains (${domains.length}, ${total} tools):\n${lines.join('\n')}`);
  } catch {}
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'opencode.json'), 'utf-8'));
    const agents = Object.keys(cfg.agent || {});
    parts.push(`Agents (${agents.length}): ${agents.join(', ')}`);
  } catch {}
  return parts.join('\n\n');
}

function skillIntegrity(args) {
  const skillDir = path.join(PROJECT_ROOT, '.opencode/skills');
  const manifestPath = path.join(PROJECT_ROOT, '.opencode/skill-manifest.json');
  const current = {};
  try {
    for (const name of fs.readdirSync(skillDir)) {
      const skillFile = path.join(skillDir, name, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        const content = fs.readFileSync(skillFile, 'utf-8');
        const hash = createHash('sha256').update(content).digest('hex');
        const deps = [...new Set(
          [...content.matchAll(/`([a-z][\w-]+)`/g)].map(m => m[1])
            .filter(s => fs.existsSync(path.join(skillDir, s, 'SKILL.md')) && s !== name)
        )];
        current[name] = { hash, requires: deps.length ? deps : undefined };
      }
    }
  } catch (e) { return `Error reading skills: ${e.message}`; }

  if (args.op === 'integrity' && args.phase === 'generate' || args.action === 'generate') {
    fs.writeFileSync(manifestPath, JSON.stringify(current, null, 2) + '\n');
    const depCount = Object.values(current).filter(v => v.requires).length;
    return `Manifest generated: ${Object.keys(current).length} skills (${depCount} with dependencies) → .opencode/skill-manifest.json`;
  }
  // default: verify
  if (!fs.existsSync(manifestPath)) return `No manifest found. Run with phase=generate first.`;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const issues = [];
  for (const [name, entry] of Object.entries(manifest)) {
    const hash = typeof entry === 'string' ? entry : entry.hash;
    if (!current[name]) issues.push(`MISSING: ${name} (in manifest but not on disk)`);
    else if (current[name].hash !== hash) issues.push(`MODIFIED: ${name}`);
  }
  for (const name of Object.keys(current)) if (!manifest[name]) issues.push(`NEW: ${name} (on disk but not in manifest)`);
  for (const [name, entry] of Object.entries(current)) {
    for (const dep of (entry.requires || [])) if (!current[dep]) issues.push(`BROKEN DEP: ${name} requires "${dep}" (not found)`);
  }
  if (!issues.length) return `Skill integrity: clean ✓ (${Object.keys(manifest).length} skills verified)`;
  return `Skill integrity: ${issues.length} issue(s)\n${issues.map(i => `  ⚠️ ${i}`).join('\n')}`;
}

// ── Self-improve ─────────────────────────────────────────────────────────

function selfImprove(args) {
  const phase = args.phase || 'full';
  const results = {};
  if (phase === 'observe' || phase === 'full') results.signals = observeSignals();
  if (phase === 'orient' || phase === 'full') {
    const signals = results.signals || observeSignals();
    results.priority = orientSignals(signals);
  }
  const pendingFile = path.join(HOME, 'pending-improvements.json');
  const pending = loadJson(pendingFile, []);
  const other = pending.filter(p => p.type !== 'self-improve');
  if (results.priority?.recommendations?.length) {
    other.push({
      id: `imp-${Date.now().toString(36)}`, type: 'self-improve', status: 'pending',
      source: 'zara_self_improve', firedAt: new Date().toISOString(),
      recommendations: results.priority.recommendations.slice(0, 3),
    });
    saveJson(pendingFile, other);
  }
  return JSON.stringify(results, null, 2);
}

function observeSignals() {
  const signals = {};
  signals.audit = (() => { const findings = loadJson(path.join(HOME, 'audit-cache.json'), null); return { cachedFindings: findings?.findings?.length ?? -1 }; })();
  signals.memory = (() => { const contrad = loadJson(path.join(HOME, 'memory-contradictions.json'), null); return { contradictions: contrad?.length ?? 0 }; })();
  signals.tools = (() => {
    let total = 0, errors = 0;
    try {
      if (fs.existsSync(METRICS_DIR)) {
        const files = fs.readdirSync(METRICS_DIR).filter(f => f.endsWith('.json')).sort().reverse().slice(0, 7);
        for (const f of files) { const d = loadJson(path.join(METRICS_DIR, f), {}); total += d.toolCalls?.total || 0; errors += d.toolCalls?.error || 0; }
      }
    } catch {}
    return { errorRate: total > 0 ? Math.round((errors / total) * 100) : 0, totalCalls: total };
  })();
  signals.eval = (() => {
    const q = loadJson(path.join(HOME, 'eval', 'quality.json'), null);
    if (!q) return { overall: null, blindSpots: [] };
    const spots = Object.entries(q.categories || {}).filter(([, d]) => d.avg < 3.5 && d.count >= 3).map(([cat]) => cat);
    return { overall: q.overall ?? null, blindSpots: spots };
  })();
  signals.microTools = (() => {
    const t = loadJson(path.join(EVOLVE_DIR, 'micro-tools.json'), []);
    const unused = t.filter(x => (x.uses ?? 0) === 0);
    return { total: t.length, unused: unused.length, unusedNames: unused.map(x => x.name).slice(0, 5) };
  })();
  signals.learnings = (() => {
    let pending = 0, highPriority = 0;
    for (const file of ['LEARNINGS.md', 'ERRORS.md']) {
      try {
        const content = fs.readFileSync(path.join(LEARNINGS_DIR, file), 'utf-8');
        const lines = content.split('\n');
        pending += lines.filter(l => l.includes('**Status**: pending')).length;
        highPriority += lines.filter(l => l.includes('**Priority**: high') && content.includes('**Status**: pending')).length;
      } catch {}
    }
    return { pending, highPriority };
  })();
  signals.reflections = (() => {
    const patterns = loadJson(path.join(REFLECT_DIR, 'patterns.json'), []);
    const logFile = path.join(REFLECT_DIR, 'log.jsonl');
    let recentFailurePatterns = 0;
    try {
      if (fs.existsSync(logFile)) {
        const cutoff = Date.now() - 86400000;
        const lines = fs.readFileSync(logFile, 'utf-8').trim().split('\n').filter(Boolean);
        recentFailurePatterns = lines.map(l => JSON.parse(l)).filter(e => new Date(e.ts).getTime() > cutoff && e.outcome === 'failure').length;
      }
    } catch {}
    return { patterns: patterns.length, recentFailures: recentFailurePatterns };
  })();
  return signals;
}

function orientSignals(signals) {
  const recommendations = [];
  if (signals.audit?.cachedFindings > 0) recommendations.push({ priority: 'P0-critical', area: 'config-drift', what: `${signals.audit.cachedFindings} config issues detected`, why: 'Broken agent/command references degrade reliability', effort: 'low', autoSafe: true });
  if (signals.memory?.contradictions > 0) recommendations.push({ priority: 'P1-high', area: 'memory', what: `${signals.memory.contradictions} memory contradictions flagged`, why: 'Conflicting memories produce inconsistent behavior over time', effort: 'low', autoSafe: true });
  if (signals.tools?.errorRate > 10) recommendations.push({ priority: 'P1-high', area: 'tools', what: `Tool error rate ${signals.tools.errorRate}% (${signals.tools.totalCalls} calls)`, why: 'High error rate degrades user experience and wastes tokens', effort: 'medium', autoSafe: false });
  if (signals.eval?.blindSpots?.length > 0) recommendations.push({ priority: 'P2-medium', area: 'quality', what: `${signals.eval.blindSpots.length} eval categories below threshold: ${signals.eval.blindSpots.join(', ')}`, why: 'Consistent low scores indicate systematic weakness', effort: 'medium', autoSafe: false });
  if (signals.microTools?.unused > 0) recommendations.push({ priority: 'P2-medium', area: 'cleanup', what: `${signals.microTools.unused} unused micro-tools (${signals.microTools.unusedNames.join(', ')})`, why: 'Clutter reduces signal-to-noise in system prompt injection', effort: 'low', autoSafe: true });
  if (signals.learnings?.highPriority > 0) recommendations.push({ priority: 'P2-medium', area: 'learnings', what: `${signals.learnings.highPriority} high-priority pending learnings`, why: 'Important lessons not yet addressed', effort: 'varies', autoSafe: false });
  const promptIssues = checkPromptScores();
  if (promptIssues.length > 0) recommendations.push({ priority: 'P3-low', area: 'prompts', what: `${promptIssues.length} harmful prompt patterns detected`, why: 'Prompt quality compounds over time', effort: 'low', autoSafe: false });
  return { healthy: recommendations.length === 0, totalSignals: Object.keys(signals).length, recommendations: recommendations.sort((a, b) => a.priority.localeCompare(b.priority)) };
}

function checkPromptScores() {
  const scores = loadJson(path.join(EVOLVE_DIR, 'prompt-scores.json'), {});
  const harmful = [];
  for (const [instruction, s] of Object.entries(scores)) {
    const total = (s.helpful || 0) + (s.neutral || 0) + (s.harmful || 0);
    if (total >= 3 && (s.harmful || 0) / total > 0.5) harmful.push(instruction);
  }
  return harmful;
}

function evolveStatus(args = {}) {
  const out = ['# Zara Learning Status', ''];
  const cutoff = args.days ? new Date(Date.now() - args.days * 86400000).toISOString().split('T')[0] : null;
  const patterns = loadJson(path.join(REFLECT_DIR, 'patterns.json'), []);
  const filtered = cutoff ? patterns.filter(p => p.lastSeen >= cutoff) : patterns;
  if (filtered.length) {
    const top = [...filtered].sort((a, b) => scorePattern(b) - scorePattern(a)).slice(0, 5);
    out.push(`## ${cutoff ? `Recent Patterns (last ${args.days}d)` : 'Top Patterns'} (${filtered.length}${cutoff ? ` of ${patterns.length}` : ''} learned)`);
    for (const p of top) out.push(`- ${p.name} — ${p.occurrences}x, ${Math.round((p.successRate ?? 1) * 100)}% success`);
    out.push('');
  }
  const rules = loadJson(path.join(EVOLVE_DIR, 'workflow-rules.json'), []);
  if (rules.length) { out.push(`## Active Rules (${rules.length})`); for (const r of rules.slice(0, 5)) out.push(`- [${r.priority || 'med'}] WHEN ${r.when} → ${r.then} (fired ${r.fired || 0}x)`); out.push(''); }
  const micro = loadJson(path.join(EVOLVE_DIR, 'micro-tools.json'), []);
  if (micro.length) { out.push(`## Micro-Tools (${micro.length} crystallized)`); for (const t of [...micro].sort((a, b) => (b.uses || 0) - (a.uses || 0)).slice(0, 5)) out.push(`- ${t.name} (used ${t.uses || 0}x)`); out.push(''); }
  out.push('## Contradictions'); out.push('Run manage/contradictions manually (semantic detection).'); out.push('');
  const blindspots = loadJson(path.join(HOME, 'blindspots.json'), []);
  if (blindspots.length) { out.push(`## Blindspots tracked (${blindspots.length})`); for (const b of blindspots.slice(-3)) out.push(`- ${b.area}: ${b.observation}`); out.push(''); }
  if (out.length <= 2) return 'No learning data yet.';
  const avgSuccess = patterns.length ? Math.round(patterns.reduce((s, p) => s + (p.successRate ?? 1), 0) / patterns.length * 100) : null;
  out.push('---'); out.push(`Health: ${patterns.length} patterns${avgSuccess !== null ? ` (avg ${avgSuccess}% success)` : ''}, ${rules.length} rules, ${micro.length} micro-tools.`);
  return out.join('\n');
}

async function dashboard(args) {
  const section = args.section || 'all';
  const lines = ['═══ ZARA DASHBOARD ═══'];
  if (section === 'all' || section === 'memory') {
    const s = await dbStats();
    lines.push(`\n📊 MEMORY\n  Episodic: ${s.episodic} | Semantic: ${s.semantic} | Procedural: ${s.procedural} | DB: ${s.dbSize}`);
    const top = await semanticRecall('user project goal', 5);
    if (top.length) lines.push('  Top: ' + top.map(r => `${r.key}=${r.value}`).join(', '));
  }
  if (section === 'all' || section === 'patterns') {
    const patterns = loadJson(path.join(REFLECT_DIR, 'patterns.json'), []);
    lines.push(`\n🧠 PATTERNS (${patterns.length})`);
    if (patterns.length) lines.push(patterns.sort((a, b) => b.occurrences - a.occurrences).slice(0, 10).map(p => `  ${p.name} (×${p.occurrences}): ${p.approach}`).join('\n'));
  }
  if (section === 'all' || section === 'procedures') {
    const count = await proceduralCount();
    lines.push(`\n⚙️ PROCEDURES (${count})`);
    if (count) { const procs = await proceduralRecall('', 10); lines.push(procs.map(p => `  ${p.name} (${p.uses}x): ${JSON.parse(p.steps).join(' → ')}`).join('\n')); }
  }
  if (section === 'all' || section === 'tools') {
    const mt = loadJson(path.join(EVOLVE_DIR, 'micro-tools.json'), []);
    lines.push(`\n🔧 MICRO-TOOLS (${mt.length})`);
    if (mt.length) lines.push(mt.sort((a, b) => b.uses - a.uses).slice(0, 10).map(t => `  ${t.name} (${t.uses}x): ${t.trigger}`).join('\n'));
  }
  if (section === 'all' || section === 'rules') {
    const rules = loadJson(path.join(EVOLVE_DIR, 'workflow-rules.json'), []);
    lines.push(`\n📋 RULES (${rules.length})`);
    if (rules.length) lines.push(rules.map((r, i) => `  ${i + 1}. [${r.priority}] WHEN "${r.when}" → ${r.then}`).join('\n'));
  }
  return lines.join('\n');
}

export default tools;
export { recalledKeys, regenerateProfileCache, resolveBest, discoverAll, persistIdentity };
