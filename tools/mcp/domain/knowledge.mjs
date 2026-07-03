import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { HOME, loadJson } from '../infra.mjs';
import {
  semanticLearn,
  knowledgeUpsert, knowledgeBySection, knowledgeSearch, knowledgeSections, knowledgeCount,
  knowledgeChunkUpsert, knowledgeChunkSearch, knowledgeChunkSearchAsync, knowledgeChunkUpsertAsync, knowledgeChunkCount
} from '../../memory-db.mjs';
import { SemanticEmbedder } from '../../embedder.mjs';
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
        description: 'Seed knowledge/ markdown into semantic memory (one-time; force=true re-seeds).',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            dry_run: { type: 'boolean' },
            force: { type: 'boolean' },
          },
        },
        handler: (args) => this.#handleKnowledgeLoadInit(args),
      },
      knowledge_index: {
        description: 'Search knowledge index by section/keyword, or list sections. Fast, no FTS.',
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
        description: 'Semantic search over full article bodies. Returns relevant text chunks (use when you need the content, not titles).',
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

  async #handleKnowledgeLoadInit(args) {
    // Check if already seeded (skip unless forced)
    if (!args.force && !args.dry_run) {
      const count = knowledgeCount();
      if (count > 0) {
        return `Already seeded (${count} articles in knowledge table). Use force=true to re-seed.`;
      }
    }

    // Resolve knowledge dir: explicit path > cwd > MCP server's own project
    const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const root = args.path || (fs.existsSync(path.join(process.cwd(), 'knowledge')) ? process.cwd() : serverRoot);
    const resolvedRoot = path.resolve(root);
    // Prevent path traversal: must be within serverRoot or cwd
    const allowedBases = [path.resolve(serverRoot), path.resolve(process.cwd())];
    if (args.path && !allowedBases.some(base => resolvedRoot.startsWith(base + path.sep) || resolvedRoot === base)) {
      return `Error: path must be within the project directory`;
    }
    const knowledgeDir = path.join(resolvedRoot, 'knowledge');
    if (!fs.existsSync(knowledgeDir)) return `Error: ${knowledgeDir} not found`;

    // Detect format: OKF bundle or legacy Hugo-style
    if (isOkfBundle(knowledgeDir)) {
      return this.#loadOkfBundle(knowledgeDir, args.dry_run);
    }
    return this.#loadLegacyBundle(knowledgeDir, args.dry_run);
  }

  // OKF bundle loader: uses the OKF parser for proper conformant loading.
  async #loadOkfBundle(knowledgeDir, dryRun) {
    const concepts = parseBundle(knowledgeDir);
    if (dryRun) {
      const validation = validateBundle(concepts);
      return `OKF bundle detected. ${concepts.length} concepts found.${validation.valid ? ' All conformant.' : `\nNon-conformant: ${validation.errors.length} errors:\n${validation.errors.slice(0, 5).join('\n')}`}`;
    }

    let stored = 0, errors = [];
    for (const concept of concepts) {
      try {
        const section = concept.conceptId.includes('/') ? concept.conceptId.split('/')[0] : 'standalone';
        const memType = concept.type ? mapType(concept.type) : (SECTION_TYPE_MAP[section] || 'fact');
        const key = `knowledge.${section}.${concept.conceptId.split('/').pop()}`;

        // Build summary from OKF fields
        const summary = concept.description
          ? `${concept.title}: ${concept.description}`
          : concept.body
            ? `${concept.title}: ${concept.body.split(/\n\n/).find(p => p.trim() && !p.startsWith('#'))?.replace(/\n/g, ' ').slice(0, 300) || ''}`
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
    const chunkCount = await knowledgeChunkCount();
    return `OKF bundle loaded: ${stored} concepts stored, ${errors.length} errors.\nPassages indexed: ${chunkCount}.\nSections: ${sections}${errors.length ? '\nErrors:\n' + errors.slice(0, 5).join('\n') : ''}`;
  }

  // Legacy loader (Hugo-style frontmatter without `type` field).
  async #loadLegacyBundle(knowledgeDir, dryRun) {
    const files = this.#walkMd(knowledgeDir);
    if (dryRun) return `Found ${files.length} knowledge files in ${knowledgeDir} (legacy format)`;

    let stored = 0, skipped = 0, errors = [];

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
          summary = firstPara ? `${title}: ${firstPara.replace(/\n/g, ' ').slice(0, 300)}` : title;
        } else {
          summary = title;
        }

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
      } catch (e) {
        errors.push(`${file}: ${e.message}`);
      }
    }

    const sections = knowledgeSections().map(s => `${s.section}(${s.count})`).join(', ');
    const chunkCount = await knowledgeChunkCount();
    return `Knowledge seeded: ${stored} stored, ${skipped} skipped, ${errors.length} errors.\nPassages indexed: ${chunkCount}.\nSections: ${sections}${errors.length ? '\nErrors:\n' + errors.slice(0, 5).join('\n') : ''}`;
  }

  async #handleKnowledgePassage(args) {
    if (knowledgeChunkCount() === 0) {
      return 'No passages indexed. Run knowledge_load_init (or force=true to re-seed) to build the passage index.';
    }
    // Use SemanticEmbedder for quality search; fall back to trigram if model unavailable
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
      // Both: filter section results by query
      results = knowledgeBySection(args.section).filter(r => {
        const q = args.query.toLowerCase();
        return r.title.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q);
      });
    } else if (args.section) {
      results = knowledgeBySection(args.section);
    } else if (args.query) {
      results = knowledgeSearch(args.query);
    } else {
      // No filter — show sections overview
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
    // Handle multiline or single-line frontmatter fields with blank lines between them
    const title = meta.match(/^title:\s*(.+)/m)?.[1]?.trim() || '';
    const description = meta.match(/^description:\s*(.+)/m)?.[1]?.trim() || '';
    return { title, description, body };
  }

}

export default new KnowledgeTools().tools;