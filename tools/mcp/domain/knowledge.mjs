import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  semanticLearn, getDb,
  knowledgeUpsert, knowledgeBySection, knowledgeSearch, knowledgeSections, knowledgeCount,
  knowledgeChunkUpsert, knowledgeChunkSearch, knowledgeChunkSearchAsync, knowledgeChunkUpsertAsync, knowledgeChunkCount
} from '../../memory-db.mjs';
import { SemanticEmbedder } from '../../embedder.mjs';
import { CHROMA_ENABLED } from '../../vector-store.mjs';
import { parseBundle, isOkfBundle, mapType, validateBundle } from '../../memory/okf.mjs';

const SECTION_TYPE_MAP = {
  principles: 'policy',
  practices: 'workflow',
  antipatterns: 'pitfall',
  'code-smells': 'pitfall',
  architecture: 'architecture',
  'design-patterns': 'architecture',
  'domain-driven-design': 'architecture',
  testing: 'workflow',
  laws: 'fact',
  values: 'policy',
  terms: 'fact',
  tools: 'fact',
  'natural-voice': 'policy',
};

class KnowledgeTools {
  get tools() {
    return {
      knowledge_load_init: {
        description: 'Seed knowledge to memory',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Project root (looks for knowledge/ subfolder)' },
            dry_run: { type: 'boolean', description: 'Count files without writing' },
            force: { type: 'boolean', description: 'Re-seed even if already seeded' },
            include_skills: { type: 'boolean' },
          },
        },
        handler: (args) => this.#handleKnowledgeLoadInit(args),
      },
      knowledge_index: {
        description: 'Search knowledge index or list sections',
        inputSchema: {
          type: 'object',
          properties: {
            section: { type: 'string' },
            query: { type: 'string' },
            list_sections: { type: 'boolean' },
          },
        },
        handler: (args) => this.#handleKnowledgeIndex(args),
      },
      knowledge_passage: {
        description: 'Semantic search over article bodies',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            section: { type: 'string' },
            k: { type: 'number' },
          },
          required: ['query'],
        },
        handler: (args) => this.#handleKnowledgePassage(args),
      },
    };
  }

  get #backendLabel() {
    return CHROMA_ENABLED ? 'ChromaDB' : 'SQLite';
  }

  async #handleKnowledgeLoadInit(args) {
    const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const root = args.path || (fs.existsSync(path.join(process.cwd(), 'knowledge')) ? process.cwd() : serverRoot);
    const resolvedRoot = path.resolve(root);
    const allowedBases = [path.resolve(serverRoot), path.resolve(process.cwd())];
    if (args.path && !allowedBases.some(base => resolvedRoot.startsWith(base + path.sep) || resolvedRoot === base)) {
      return `Error: path must be within the project directory`;
    }
    const knowledgeDir = path.join(resolvedRoot, 'knowledge');
    if (!fs.existsSync(knowledgeDir)) return `Error: ${knowledgeDir} not found`;

    const includeSkills = args.include_skills !== false;

    // Dry run: just count
    if (args.dry_run) {
      const files = this.#walkMd(knowledgeDir);
      let msg = `Found ${files.length} knowledge files in ${knowledgeDir}`;
      if (includeSkills) {
        const skillDirs = fs.readdirSync(path.join(serverRoot, '.opencode/skills'), { withFileTypes: true })
          .filter(d => d.isDirectory() && fs.existsSync(path.join(serverRoot, '.opencode/skills', d.name, 'SKILL.md')));
        msg += `, ${skillDirs.length} skills`;
      }
      msg += `.\nVector backend: ${this.#backendLabel}.`;
      return msg;
    }

    // Detect format
    const loader = isOkfBundle(knowledgeDir) ? this.#loadOkfBundle.bind(this) : this.#loadLegacyBundle.bind(this);

    // Force: bulk-clear Chroma knowledge entries first (much faster than per-key delete)
    if (args.force && CHROMA_ENABLED) {
      try {
        const { getVectorStore } = await import('../../vector-store.mjs');
        // Delete all knowledge chunks by fetching IDs in pages
        const kChunks = getVectorStore('zara_knowledge');
        if (kChunks) await kChunks.removeAll();
        // Delete knowledge entries from semantic collection
        const kSemantic = getVectorStore('zara_semantic');
        if (kSemantic) {
          // Chroma doesn't support pattern delete; page through all and delete matching
          const all = await kSemantic.getAll(null, 10000);
          const toDelete = all.filter(e => e.metadata.key?.startsWith('knowledge.'));
          if (toDelete.length) await kSemantic.removeMany(toDelete.map(e => e.id || e.key));
        }
      } catch { /* cleanup best-effort; per-key delete in adapter handles leftovers */ }
    }

    const result = await loader(knowledgeDir, args.force);

    // Sync skills if requested
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
          } catch (e) { /* skip unreadable skills */ }
        }
      }
    }

    const chunkCount = await knowledgeChunkCount();
    return `${result}\nSkills synced: ${skillsSynced}\nVector backend: ${this.#backendLabel}\nTotal chunks: ${chunkCount}`;
  }

  // OKF bundle loader: uses the OKF parser for proper conformant loading.
  async #loadOkfBundle(knowledgeDir, force) {
    const concepts = parseBundle(knowledgeDir);
    if (!concepts.length) return 'No concepts found.';

    let stored = 0, errors = [];

    // Force: clear existing knowledge entries before re-seeding
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

        // Build summary from OKF fields
        const summary = concept.description
          ? `${concept.title}: ${concept.description}`
          : concept.body
            ? `${concept.title}: ${concept.body.split(/\n\n/).find(p => p.trim() && !p.startsWith('#'))?.replace(/\n/g, ' ') || ''}`
            : concept.title;

        // Store in knowledge table
        knowledgeUpsert(key, section, concept.title, summary, concept.file, memType);

        // Store in semantic memory (for FTS recall)
        await semanticLearn(key, summary, 'observed', memType, `knowledge/${concept.file}`);

        // Chunk + embed the full body for passage retrieval
        if (concept.body) {
          try {
            const embedder = SemanticEmbedder.instance();
            await knowledgeChunkUpsertAsync(key, section, concept.body, embedder);
          } catch {
            try { await knowledgeChunkUpsert(key, section, concept.body); } catch (e2) { errors.push(`${concept.file}[fallback]: ${e2.message}`); }
          }
        }
        stored++;
      } catch (e) {
        errors.push(`${concept.file}: ${e.message}`);
      }
    }

    const sections = knowledgeSections().map(s => `${s.section}(${s.count})`).join(', ');
    return `OKF bundle loaded: ${stored} concepts stored, ${errors.length} errors.\nSections: ${sections}${errors.length ? '\nErrors:\n' + errors.slice(0, 5).join('\n') : ''}`;
  }

  // Legacy loader (Hugo-style frontmatter without `type` field).
  async #loadLegacyBundle(knowledgeDir, force) {
    const files = this.#walkMd(knowledgeDir);
    if (!files.length) return 'No markdown files found.';

    let stored = 0, skipped = 0, errors = [];

    // Force: clear existing knowledge entries before re-seeding
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
        const { title, description, body } = this.#parseFrontmatter(content);
        if (!title && !body) { skipped++; continue; }

        const basename = path.basename(file, '.md');
        const key = `knowledge.${section}.${basename}`;

        let summary = '';
        if (description) {
          summary = `${title}: ${description}`;
        } else if (body) {
          const firstPara = body.split(/\n\n/).find(p => p.trim() && !p.startsWith('![') && !p.startsWith('#'));
          summary = firstPara ? `${title}: ${firstPara.replace(/\n/g, ' ')}` : title;
        } else {
          summary = title;
        }

        // SQLite knowledge table (always — metadata/index layer)
        knowledgeUpsert(key, section, title || basename, summary, rel, memType);
        // Semantic memory + chunks — routes to SQLite or Chroma via adapter
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
      } catch (e) {
        errors.push(`${file}: ${e.message}`);
      }
    }

    const sections = knowledgeSections().map(s => `${s.section}(${s.count})`).join(', ');
    return `Knowledge seeded: ${stored} stored, ${skipped} skipped, ${errors.length} errors.\nSections: ${sections}${errors.length ? '\nErrors:\n' + errors.slice(0, 5).join('\n') : ''}`;
  }

  async #handleKnowledgePassage(args) {
    if (knowledgeChunkCount() === 0) {
      return 'No passages indexed. Run knowledge_load_init (or force=true to re-seed) to build the passage index.';
    }
    let hits;
    try {
      const embedder = SemanticEmbedder.instance();
      hits = await knowledgeChunkSearchAsync(args.query, embedder, args.section || '', args.k || 5);
    } catch {
      hits = knowledgeChunkSearch(args.query, args.section || '', args.k || 5);
    }
    if (!hits.length) return `No passages found for "${args.query}"${args.section ? ` in section "${args.section}"` : ''}.`;
    return hits.map(h =>
      `[${(h.score).toFixed(2)}] ${h.key} #${h.chunk_index} (${h.section})\n  ${h.text.slice(0, 400)}`
    ).join('\n\n');
  }

  #handleKnowledgeIndex(args) {
    const count = knowledgeCount();
    if (!count) return 'No knowledge indexed. Run knowledge_load_init first.';

    if (args.list_sections) {
      const sections = knowledgeSections();
      let out = `Knowledge Index (${count} articles)\n\n`;
      for (const s of sections) {
        out += `  ${s.section} (${s.count}) [${s.mem_type}]\n`;
      }
      return out;
    }

    let results;
    if (args.section && args.query) {
      results = knowledgeBySection(args.section).filter(r => {
        const q = args.query.toLowerCase();
        return r.title.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q);
      });
    } else if (args.section) {
      results = knowledgeBySection(args.section);
    } else if (args.query) {
      results = knowledgeSearch(args.query);
    } else {
      return this.#handleKnowledgeIndex({ list_sections: true });
    }

    if (!results.length) return 'No matching articles.';
    return results.slice(0, 30).map(r => `[${r.mem_type}] ${r.key}: ${r.title}\n  ${r.summary.slice(0, 120)}`).join('\n\n');
  }

  #walkMd(dir) {
    let results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'images') {
        results.push(...this.#walkMd(full));
      } else if (entry.isFile() && entry.name.endsWith('.md') && !['_index.md', 'INDEX.md', 'SUMMARY.md'].includes(entry.name)) {
        results.push(full);
      }
    }
    return results;
  }

  #parseFrontmatter(content) {
    const fm = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)/);
    if (!fm) return { title: '', description: '', body: content };
    const meta = fm[1];
    const body = fm[2].trim();
    const title = meta.match(/^title:\s*(.+)/m)?.[1]?.trim() || '';
    const description = meta.match(/^description:\s*(.+)/m)?.[1]?.trim() || '';
    return { title, description, body };
  }

}

export default new KnowledgeTools().tools;