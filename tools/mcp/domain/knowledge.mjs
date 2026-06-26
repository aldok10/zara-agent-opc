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
        description: 'Scan ALL knowledge/ markdown files and batch-store to semantic memory. Skips if already seeded (use force=true to re-seed). Also builds a fast-lookup index.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Project root path (defaults to cwd)' },
            dry_run: { type: 'boolean', description: 'If true, count files without storing' },
            force: { type: 'boolean', description: 'Force re-seed even if already done' },
          },
        },
        handler: (args) => this.#handleKnowledgeLoadInit(args),
      },
      knowledge_index: {
        description: 'Search the knowledge index by section, keyword, or list all sections. Fast lookup without FTS.',
        inputSchema: {
          type: 'object',
          properties: {
            section: { type: 'string', description: 'Filter by section (e.g. principles, antipatterns, design-patterns)' },
            query: { type: 'string', description: 'Keyword filter within results' },
            list_sections: { type: 'boolean', description: 'Just list available sections with counts' },
          },
        },
        handler: (args) => this.#handleKnowledgeIndex(args),
      },
      knowledge_passage: {
        description: 'Semantic passage search over full article bodies (not just titles/summaries). Returns the most relevant text chunks. Use when you need the actual content that answers a question, not a list of article titles.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'What you want to find in the article bodies' },
            section: { type: 'string', description: 'Optional: restrict to one section before ranking' },
            k: { type: 'number', description: 'Max passages to return (default 5)' },
          },
          required: ['query'],
        },
        handler: (args) => this.#handleKnowledgePassage(args),
      },
      team_knowledge: {
        description: 'Search team shared knowledge',
        inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
        handler: (args) => this.#handleTeamKnowledge(args),
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

    const files = this.#walkMd(knowledgeDir);
    if (args.dry_run) return `Found ${files.length} knowledge files in ${knowledgeDir}`;

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

        // Build summary: title + description or first meaningful paragraph
        let summary = '';
        if (description) {
          summary = `${title}: ${description}`;
        } else if (body) {
          const firstPara = body.split(/\n\n/).find(p => p.trim() && !p.startsWith('![') && !p.startsWith('#'));
          summary = firstPara ? `${title}: ${firstPara.replace(/\n/g, ' ').slice(0, 300)}` : title;
        } else {
          summary = title;
        }

        // Store in knowledge table (fast indexed lookup)
        knowledgeUpsert(key, section, title || basename, summary, rel, memType);

        // Also store in semantic memory (for FTS recall)
        semanticLearn(key, summary, 'observed', memType, `knowledge/${rel}`);

        // Chunk + embed the full body for passage retrieval
        if (body) {
          try {
            const embedder = SemanticEmbedder.instance();
            await knowledgeChunkUpsertAsync(key, section, body, embedder);
          } catch {
            try { knowledgeChunkUpsert(key, section, body); } catch (e2) { errors.push(`${file}[fallback]: ${e2.message}`); }
          }
        }
        stored++;
      } catch (e) {
        errors.push(`${file}: ${e.message}`);
      }
    }

    const sections = knowledgeSections().map(s => `${s.section}(${s.count})`).join(', ');
    return `Knowledge seeded: ${stored} stored, ${skipped} skipped, ${errors.length} errors.\nPassages indexed: ${knowledgeChunkCount()}.\nSections: ${sections}${errors.length ? '\nErrors:\n' + errors.slice(0, 5).join('\n') : ''}`;
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

  #handleTeamKnowledge(args) {
    const shared = loadJson(path.join(HOME, 'team', 'shared-knowledge.json'), {});
    const terms = (args.query || '').toLowerCase().split(/\s+/);
    const matched = Object.entries(shared).filter(([k, v]) =>
      terms.some(t => `${k} ${v.value}`.toLowerCase().includes(t))
    ).slice(0, 10);
    if (!matched.length) return 'No matches.';
    return matched.map(([k, v]) => `${k}: ${v.value}`).join('\n');
  }
}

export default new KnowledgeTools().tools;