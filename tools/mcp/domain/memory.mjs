import {
  semanticLearn, semanticRecall, semanticRecallAsync,
  episodicRecord, episodicRecall,
  proceduralSave, proceduralRecall,
  stats as dbStats, dreamConsolidate, detectContradictions, detectContradictionsAsync, deleteByPattern, countByPattern
} from '../../memory-db.mjs';
import { recalledKeys } from './reflection.mjs';

class MemoryTools {
  get tools() {
    return {
      memory_recall: {
        description: 'Search Zara memory (episodic, semantic, procedural). Supports scoped retrieval and token budget.',
        inputSchema: { type: 'object', properties: { query: { type: 'string' }, layer: { type: 'string', enum: ['all', 'episodic', 'semantic', 'procedural'] }, scope: { type: 'string', description: 'File path or context for scoped retrieval' }, type: { type: 'string', enum: ['policy', 'workflow', 'pitfall', 'architecture', 'decision', 'preference', 'fact'], description: 'Filter by memory type' } }, required: ['query'] },
        handler: (args) => this.#handleRecall(args),
      },
      memory_learn: {
        description: 'Store a fact in semantic memory (key-value with metadata). Types: policy, workflow, pitfall, architecture, decision, preference, fact',
        inputSchema: { type: 'object', properties: { key: { type: 'string', description: 'Memory key' }, value: { type: 'string', description: 'The fact to remember' }, source: { type: 'string', enum: ['user_explicit', 'observed', 'inferred', 'external_unverified'] }, type: { type: 'string', enum: ['policy', 'workflow', 'pitfall', 'architecture', 'decision', 'preference', 'fact'], description: 'Memory type for activation priority' }, scope: { type: 'string', description: 'File path or context scope (for scoped activation)' }, agent: { type: 'string', description: 'Which agent is storing this (provenance)' } }, required: ['key', 'value'] },
        handler: (args) => this.#handleLearn(args),
      },
      memory_episode: {
        description: 'Record an episodic memory (event/outcome)',
        inputSchema: { type: 'object', properties: { event: { type: 'string', description: 'What happened' }, outcome: { type: 'string', description: 'Result or lesson' }, tags: { type: 'array', items: { type: 'string' }, description: 'Tags for retrieval' } }, required: ['event'] },
        handler: (args) => this.#handleEpisode(args),
      },
      memory_procedure: {
        description: 'Save a reusable workflow/procedure',
        inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'Procedure name' }, context: { type: 'string', description: 'When to use this' }, steps: { type: 'array', items: { type: 'string' }, description: 'Steps in order' } }, required: ['name', 'steps'] },
        handler: (args) => this.#handleProcedure(args),
      },
      memory_consolidate: {
        description: 'Run dreamer consolidation: merge duplicates, archive stale memories, promote recurring topics. Call periodically or at session end.',
        inputSchema: { type: 'object', properties: {} },
        handler: () => this.#handleConsolidate(),
      },
      memory_contradictions: {
        description: 'Detect semantically contradicting memories — same-type facts that are highly similar but say different things (e.g. "prefers X" vs "prefers Y"). Flags for review, does not auto-merge. Use to keep long-lived memory coherent.',
        inputSchema: { type: 'object', properties: { threshold: { type: 'number', description: 'Similarity threshold 0-1 (default 0.85)' } } },
        handler: (args) => this.#handleContradictions(args),
      },
      memory_delete: {
        description: 'Delete memories matching a pattern (searches key, value, event, outcome). Use for targeted cleanup of obsolete/incorrect memories.',
        inputSchema: { type: 'object', properties: { pattern: { type: 'string', description: 'Pattern to match (substring, case-insensitive in SQLite LIKE)' }, dry_run: { type: 'boolean', description: 'If true, report what would be deleted without actually deleting' }, confirm: { type: 'boolean', description: 'Required true when deleting >10 entries' } }, required: ['pattern'] },
        handler: (args) => this.#handleDelete(args),
      },
    };
  }

  async #handleRecall(args) {
    const layer = args.layer || 'all';

    // Single-layer mode: direct retrieval (no fusion needed)
    if (layer !== 'all') {
      const results = [];
      if (layer === 'semantic') {
        let m;
        try { m = await semanticRecallAsync(args.query, 5, { scope: args.scope, type: args.type }); }
        catch { m = semanticRecall(args.query, 5, { scope: args.scope, type: args.type }); }
        if (m.length) {
          for (const r of m) { if (recalledKeys.size < 20) recalledKeys.add(r.key); }
          results.push(m.map(r => `[${r.type || 'fact'}] ${r.key}: ${r.value}`).join('\n'));
        }
      }
      if (layer === 'episodic') {
        const m = episodicRecall(args.query, 5);
        if (m.length) results.push(m.map(r => `[${r.ts?.split('T')[0]}] ${r.event}${r.outcome ? ' → ' + r.outcome : ''}`).join('\n'));
      }
      if (layer === 'procedural') {
        const m = proceduralRecall(args.query, 3);
        if (m.length) results.push(m.map(r => `${r.name}: ${JSON.parse(r.steps).join(' → ')}`).join('\n'));
      }
      return results.join('\n\n') || `No memories for "${args.query}"`;
    }

    // Multi-layer RRF (Reciprocal Rank Fusion) mode
    // Retrieve from all layers, fuse rankings so items relevant across multiple layers rank higher
    const K = 60; // RRF constant (standard value from original paper)
    const fused = new Map(); // id -> { display, rrfScore, sources[], evidence }

    // Semantic layer
    let sem;
    try { sem = await semanticRecallAsync(args.query, 8, { scope: args.scope, type: args.type }); }
    catch { sem = semanticRecall(args.query, 8, { scope: args.scope, type: args.type }); }
    for (let rank = 0; rank < sem.length; rank++) {
      const r = sem[rank];
      const id = `sem:${r.key}`;
      if (recalledKeys.size < 20) recalledKeys.add(r.key);
      const entry = fused.get(id) || { id, display: `[${r.type || 'fact'}] ${r.key}: ${r.value}`, rrfScore: 0, sources: [], evidence: { source: r.source, confidence: r.confidence, trust: r.trust_score, grounded: !!r.grounded, type: r.type } };
      entry.rrfScore += 1 / (K + rank + 1);
      entry.sources.push('semantic');
      fused.set(id, entry);
    }

    // Episodic layer
    const epi = episodicRecall(args.query, 5);
    for (let rank = 0; rank < epi.length; rank++) {
      const r = epi[rank];
      const id = `epi:${r.id || r.event.slice(0, 40)}`;
      const entry = fused.get(id) || { id, display: `[${r.ts?.split('T')[0]}] ${r.event}${r.outcome ? ' → ' + r.outcome : ''}`, rrfScore: 0, sources: [], evidence: { source: 'episodic', confidence: 0.9, type: 'episode' } };
      entry.rrfScore += 1 / (K + rank + 1);
      entry.sources.push('episodic');
      fused.set(id, entry);
    }

    // Procedural layer
    const proc = proceduralRecall(args.query, 3);
    for (let rank = 0; rank < proc.length; rank++) {
      const r = proc[rank];
      const id = `proc:${r.name}`;
      const entry = fused.get(id) || { id, display: `${r.name}: ${JSON.parse(r.steps).join(' → ')}`, rrfScore: 0, sources: [], evidence: { source: 'procedural', confidence: 0.85, type: 'procedure' } };
      entry.rrfScore += 1 / (K + rank + 1);
      entry.sources.push('procedural');
      fused.set(id, entry);
    }

    if (!fused.size) return `No memories for "${args.query}"`;

    // Sort by RRF score (items appearing in multiple layers rank higher)
    const ranked = [...fused.values()].sort((a, b) => b.rrfScore - a.rrfScore).slice(0, 8);
    return ranked.map(r => r.display).join('\n');
  }

  #handleLearn(args) {
    const memType = args.type || 'fact';
    const source = args.source || 'observed';
    const agent = args.agent || '';
    // CONSTITUTION Privacy: block obvious secrets from being stored
    const SECRETS_RE = /(?:(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}|(?:sk|pk)[-_](?:live|test)[-_][A-Za-z0-9]{20,}|(?:AKIA|ASIA)[A-Z0-9]{16}|xox[bpras]-[A-Za-z0-9-]{10,}|eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{35}|sk-ant-[A-Za-z0-9_-]{20,}|sk-proj-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9_-]{40,}|-----BEGIN.*PRIVATE KEY-----|(?:postgres|mysql|mongodb\+srv|redis):\/\/[^\s]+:[^\s]+@|(?:password|secret|token|api_key)\s*[=:]\s*['"][^\s'"]{8,})/;
    if (SECRETS_RE.test(args.key + ' ' + args.value)) {
      return `⚠️ Refused: value appears to contain a secret/token. Never store credentials in memory.`;
    }
    // CONSTITUTION P3: subagents cannot write policy-tier memories
    const POLICY_TYPES = ['policy', 'architecture', 'decision', 'preference', 'pitfall'];
    const RESTRICTED_AGENTS = ['forge', 'implementation', 'hive', 'swarm', 'explore', 'general'];
    if (POLICY_TYPES.includes(memType) && RESTRICTED_AGENTS.includes(agent.toLowerCase())) {
      return `⚠️ Refused: agent '${agent}' cannot write type '${memType}'. Only orchestrator or user can set policies.`;
    }
    // CONSTITUTION P1: truth-asserting types require owner's explicit statement
    if (POLICY_TYPES.includes(memType) && source !== 'user_explicit') {
      return `⚠️ Refused: type '${memType}' requires source 'user_explicit'. Use source: 'user_explicit' for policy/architecture/decision/preference/pitfall memories.`;
    }
    // CONSTITUTION P2: external content never stored as trusted type
    if (source === 'external_unverified') {
      if (POLICY_TYPES.includes(memType)) {
        return `⚠️ Refused: external_unverified content cannot be stored as ${memType}. Use type 'fact' for external content.`;
      }
    }
    const result = semanticLearn(args.key, args.value, source, memType, args.scope || '', { agent });
    return `Stored: ${result.key} = ${result.value} [${result.type}]`;
  }

  #handleEpisode(args) {
    const result = episodicRecord(args.event, args.outcome || '', args.tags || []);
    return `Recorded: ${result.event}`;
  }

  #handleProcedure(args) {
    const result = proceduralSave(args.name, args.steps, args.context || '');
    return `Saved procedure: ${result.name} (${result.steps} steps)`;
  }

  async #handleConsolidate() {
    const r = dreamConsolidate();
    let conflicts = [];
    try { conflicts = await detectContradictionsAsync(); } catch (e) { process.stderr.write(`[mcp:memory] detectContradictions failed: ${e.message}\n`); }
    const conflictNote = conflicts.length
      ? `\n⚠️ ${conflicts.length} potential contradiction(s) detected — run memory_contradictions to review.`
      : '';
    return `Consolidation complete: ${r.merged} merged, ${r.archived} archived, ${r.reinforced} promoted${conflictNote}`;
  }

  async #handleContradictions(args) {
    let flagged;
    try { flagged = await detectContradictionsAsync(args.threshold || 0.92); }
    catch { flagged = detectContradictions(args.threshold || 0.85); }
    if (!flagged.length) return 'No contradicting memories detected.';
    return `${flagged.length} potential contradiction(s):\n` +
      flagged.map(f => `- [${f.type}] "${f.a}" (trust:${(f.trust_a ?? 0.5).toFixed(2)}) vs "${f.b}" (trust:${(f.trust_b ?? 0.5).toFixed(2)}) (${(f.sim * 100).toFixed(0)}% similar)`).join('\n');
  }

  #handleDelete(args) {
    if (!args.pattern || args.pattern.length < 3) return 'Pattern must be at least 3 characters.';
    if (args.dry_run) {
      const counts = countByPattern(args.pattern);
      const total = counts.semantic + counts.episodic + counts.procedural;
      return `Dry run: would delete ${counts.semantic} semantic, ${counts.episodic} episodic, ${counts.procedural} procedural entries (${total} total) matching "${args.pattern}"`;
    }
    // CONSTITUTION P7: bulk delete gate
    const counts = countByPattern(args.pattern);
    const total = counts.semantic + counts.episodic + counts.procedural;
    if (total > 10 && !args.confirm) {
      return `⚠️ Bulk delete blocked: ${total} entries match "${args.pattern}". Pass confirm: true to proceed, or use a more specific pattern.`;
    }
    const result = deleteByPattern(args.pattern);
    if (result.error) return `Refused: ${result.error}. Would affect ${result.total} entries (${result.semantic} semantic, ${result.episodic} episodic, ${result.procedural} procedural). Use a more specific pattern.`;
    return `Deleted: ${result.semantic} semantic, ${result.episodic} episodic, ${result.procedural} procedural entries matching "${args.pattern}"`;
  }
}

export default new MemoryTools().tools;
