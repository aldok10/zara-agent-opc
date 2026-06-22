import path from 'path';
import {
  semanticLearn, semanticRecall, semanticBaseline, semanticScoped,
  episodicRecord, episodicRecall,
  proceduralSave, proceduralRecall, proceduralCount,
  stats as dbStats, dreamConsolidate, detectContradictions, deleteByPattern
} from '../../memory-db.mjs';

class MemoryTools {
  get tools() {
    return {
      memory_recall: {
        description: 'Search Zara memory (episodic, semantic, procedural). Supports scoped retrieval and token budget.',
        inputSchema: { type: 'object', properties: { query: { type: 'string' }, layer: { type: 'string', enum: ['all', 'episodic', 'semantic', 'procedural'] }, scope: { type: 'string', description: 'File path or context for scoped retrieval' }, type: { type: 'string', enum: ['policy', 'workflow', 'pitfall', 'architecture', 'decision', 'preference', 'fact'], description: 'Filter by memory type' } }, required: ['query'] },
        handler: (args) => this.#handleRecall(args),
      },
      memory_stats: {
        description: 'Show Zara memory statistics',
        inputSchema: { type: 'object', properties: {} },
        handler: () => this.#handleStats(),
      },
      memory_learn: {
        description: 'Store a fact in semantic memory (key-value with metadata). Types: policy, workflow, pitfall, architecture, decision, preference, fact',
        inputSchema: { type: 'object', properties: { key: { type: 'string', description: 'Memory key' }, value: { type: 'string', description: 'The fact to remember' }, source: { type: 'string', enum: ['user_explicit', 'observed', 'inferred'] }, type: { type: 'string', enum: ['policy', 'workflow', 'pitfall', 'architecture', 'decision', 'preference', 'fact'], description: 'Memory type for activation priority' }, scope: { type: 'string', description: 'File path or context scope (for scoped activation)' } }, required: ['key', 'value'] },
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
        inputSchema: { type: 'object', properties: { pattern: { type: 'string', description: 'Pattern to match (substring, case-insensitive in SQLite LIKE)' }, dry_run: { type: 'boolean', description: 'If true, report what would be deleted without actually deleting' } }, required: ['pattern'] },
        handler: (args) => this.#handleDelete(args),
      },
    };
  }

  #handleRecall(args) {
    const layer = args.layer || 'all';
    const results = [];
    if (layer === 'all' || layer === 'semantic') {
      const m = semanticRecall(args.query, 5, { scope: args.scope, type: args.type });
      if (m.length) results.push(m.map(r => `[${r.type || 'fact'}] ${r.key}: ${r.value}`).join('\n'));
    }
    if (layer === 'all' || layer === 'episodic') {
      const m = episodicRecall(args.query, 3);
      if (m.length) results.push(m.map(r => `[${r.ts?.split('T')[0]}] ${r.event}${r.outcome ? ' → ' + r.outcome : ''}`).join('\n'));
    }
    if (layer === 'all' || layer === 'procedural') {
      const m = proceduralRecall(args.query, 3);
      if (m.length) results.push(m.map(r => `${r.name}: ${JSON.parse(r.steps).join(' → ')}`).join('\n'));
    }
    return results.join('\n\n') || `No memories for "${args.query}"`;
  }

  #handleStats() {
    const s = dbStats();
    return `Episodic: ${s.episodic} | Semantic: ${s.semantic} | Procedural: ${s.procedural} | DB: ${s.dbSize}`;
  }

  #handleLearn(args) {
    const memType = args.type || 'fact';
    const source = args.source || 'observed';
    if ((memType === 'policy' || memType === 'architecture') && source !== 'user_explicit') {
      return `⚠️ Refused: type '${memType}' requires source 'user_explicit'. Use source: 'user_explicit' for policy/architecture memories.`;
    }
    const result = semanticLearn(args.key, args.value, source, memType, args.scope || '');
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

  #handleConsolidate() {
    const r = dreamConsolidate();
    const conflicts = detectContradictions();
    const conflictNote = conflicts.length
      ? `\n⚠️ ${conflicts.length} potential contradiction(s) detected — run memory_contradictions to review.`
      : '';
    return `Consolidation complete: ${r.merged} merged, ${r.archived} archived, ${r.reinforced} promoted${conflictNote}`;
  }

  #handleContradictions(args) {
    const flagged = detectContradictions(args.threshold || 0.85);
    if (!flagged.length) return 'No contradicting memories detected.';
    return `${flagged.length} potential contradiction(s):\n` +
      flagged.map(f => `- [${f.type}] "${f.a}" vs "${f.b}" (${(f.sim * 100).toFixed(0)}% similar)`).join('\n');
  }

  #handleDelete(args) {
    if (!args.pattern || args.pattern.length < 3) return 'Pattern must be at least 3 characters.';
    if (args.dry_run) {
      const { semanticRecall: sr, episodicRecall: er } = { semanticRecall, episodicRecall };
      const sem = sr(args.pattern, 20, {});
      const epi = er(args.pattern, 20);
      return `Dry run — would affect ~${sem.length} semantic + ~${epi.length} episodic entries matching "${args.pattern}"`;
    }
    const result = deleteByPattern(args.pattern);
    return `Deleted: ${result.semantic} semantic, ${result.episodic} episodic, ${result.procedural} procedural entries matching "${args.pattern}"`;
  }
}

export default new MemoryTools().tools;
