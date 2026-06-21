import fs from 'fs';
import path from 'path';
import os from 'os';
import { HOME, loadJson } from '../infra.mjs';
import { convertChm } from '../../chm2md.mjs';
import {
  semanticLearn, semanticRecall,
  knowledgeUpsert, knowledgeBySection, knowledgeSearch, knowledgeSections, knowledgeCount,
  knowledgeChunkUpsert, knowledgeChunkSearch, knowledgeChunkCount
} from '../../memory-db.mjs';

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
      chm2md: {
        description: 'Convert CHM to AI skill with subskills. Auto-installs to ~/.agents/skills/<name>/.',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string', description: 'Path to .chm file' },
            skill_name: { type: 'string', description: 'Skill name' },
            output: { type: 'string', description: 'Custom output path' },
            mode: { type: 'string', enum: ['skill', 'group', 'flat', 'single'] },
          },
          required: ['input'],
        },
        handler: (args) => this.#handleChm2md(args),
      },
      chm2md_improve: {
        description: 'Get actionable AI improvement tasks for a generated skill.',
        inputSchema: {
          type: 'object',
          properties: {
            skill_path: { type: 'string', description: 'Path to skill root' },
            subskill: { type: 'string' },
            action: { type: 'string', enum: ['plan', 'files', 'template'] },
          },
          required: ['skill_path'],
        },
        handler: (args) => this.#handleChm2mdImprove(args),
      },
    };
  }

  #handleKnowledgeLoadInit(args) {
    // Check if already seeded (skip unless forced)
    if (!args.force && !args.dry_run) {
      const count = knowledgeCount();
      if (count > 0) {
        return `Already seeded (${count} articles in knowledge table). Use force=true to re-seed.`;
      }
    }

    // Resolve knowledge dir: explicit path > cwd > MCP server's own project
    const serverRoot = path.resolve(new URL('.', import.meta.url).pathname, '../../..');
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
        semanticLearn(key, summary, 'user_explicit', memType, `knowledge/${rel}`);

        // Chunk + embed the full body for passage retrieval (Minds-style RAG)
        if (body) {
          try { knowledgeChunkUpsert(key, section, body); } catch {}
        }
        stored++;
      } catch (e) {
        errors.push(`${file}: ${e.message}`);
      }
    }

    const sections = knowledgeSections().map(s => `${s.section}(${s.count})`).join(', ');
    return `Knowledge seeded: ${stored} stored, ${skipped} skipped, ${errors.length} errors.\nPassages indexed: ${knowledgeChunkCount()}.\nSections: ${sections}${errors.length ? '\nErrors:\n' + errors.slice(0, 5).join('\n') : ''}`;
  }

  #handleKnowledgePassage(args) {
    if (knowledgeChunkCount() === 0) {
      return 'No passages indexed. Run knowledge_load_init (or force=true to re-seed) to build the passage index.';
    }
    const hits = knowledgeChunkSearch(args.query, args.section || '', args.k || 5);
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

  #handleChm2md(args) {
    const skillName = args.skill_name || path.basename(args.input, path.extname(args.input)).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const outputDir = args.output || path.join(os.homedir(), '.agents', 'skills', skillName);
    const result = convertChm(args.input, outputDir, { mode: args.mode || 'skill', skillName });
    if (result.subskills) {
      let out = `AI Skill installed: ${result.skillName}\n  Location: ${outputDir}/\n  Router: ${result.skillPath}\n  Source: ${result.inputFiles} pages \u2192 ${result.totalLines} lines\n\n  Subskills (${result.subskills.length}):\n`;
      for (const s of result.subskills) out += `    - ${s.name}: ${s.entries} entries, ${s.files} knowledge files\n`;
      out += `\n  Next: call chm2md_improve to get AI optimization prompts.`;
      return out;
    }
    return `Converted ${result.inputFiles} \u2192 ${result.outputFiles || 0} files (${result.totalLines} lines)\nOutput: ${outputDir}`;
  }

  #handleChm2mdImprove(args) {
    const skillPath = args.skill_path;
    const action = args.action || 'plan';
    if (!fs.existsSync(skillPath)) return `Error: ${skillPath} not found`;

    const subskillsDir = path.join(skillPath, 'subskills');
    let subskills = [];
    if (fs.existsSync(subskillsDir)) {
      subskills = fs.readdirSync(subskillsDir).filter(d => fs.existsSync(path.join(subskillsDir, d, 'SKILL.md')));
    }
    if (args.subskill) {
      subskills = subskills.filter(s => s === args.subskill);
      if (!subskills.length) return `Error: subskill "${args.subskill}" not found`;
    }

    if (action === 'template') {
      return `# [Subskill Name]\n\n## Description\n[1-2 sentences]\n\n## When to Use\n- [trigger 1]\n\n## Key Concepts\n\`term1\`, \`term2\`\n\n## Quick Lookup\n\n| I need to... | Load file |\n|---|---|\n| [task] | knowledge/[file].md |\n\n## Common Patterns\n\n\`\`\`\n// [Pattern]\n\`\`\`\n\n## Pitfalls\n- [mistake]\n\n## Knowledge Files\n\n| File | Content | Lines |\n|------|---------|-------|\n| [file] | [desc] | [n] |`;
    }

    if (action === 'files') {
      let files = [];
      for (const sub of subskills) {
        const kDir = path.join(subskillsDir, sub, 'knowledge');
        if (!fs.existsSync(kDir)) continue;
        for (const f of fs.readdirSync(kDir).filter(f => f.endsWith('.md'))) {
          const fp = path.join(kDir, f);
          const content = fs.readFileSync(fp, 'utf-8');
          const lines = content.split('\n').length;
          const headers = (content.match(/^#{2,3}\s/gm) || []).length;
          files.push({ path: fp, subskill: sub, file: f, lines, score: lines - headers * 50 });
        }
      }
      files.sort((a, b) => b.score - a.score);
      let out = `Files needing improvement (${files.length} total, top 20):\n\n`;
      for (const f of files.slice(0, 20)) out += `${f.path}\n  ${f.lines} lines (score: ${f.score})\n\n`;
      return out;
    }

    let plan = `# Improvement Plan: ${path.basename(skillPath)}\n\n`;
    plan += `1. Read subskill SKILL.md\n2. Rewrite with template (action="template")\n3. Improve largest knowledge files\n4. Cross-reference subskills\n\n`;
    plan += `| Priority | Subskill | Files |\n|---|---|---|\n`;
    const ranked = subskills.map(sub => {
      const kDir = path.join(subskillsDir, sub, 'knowledge');
      return { sub, files: fs.existsSync(kDir) ? fs.readdirSync(kDir).filter(f => f.endsWith('.md')).length : 0 };
    }).sort((a, b) => b.files - a.files);
    ranked.forEach((r, i) => { plan += `| ${i + 1} | ${r.sub} | ${r.files} |\n`; });
    return plan;
  }
}

export default new KnowledgeTools().tools;
