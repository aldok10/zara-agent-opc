#!/usr/bin/env node
// tools/scripts/sync-to-chroma.mjs — Migrate local knowledge + skills to ChromaDB.
//
// Reads the knowledge/ directory and .opencode/skills/ directory, embeds all
// content, and upserts into the appropriate Chroma collections:
//   - knowledge/ -> zara_knowledge collection (passage chunks)
//   - skills/    -> zara_knowledge collection (skill content as passages)
//   - Also seeds the semantic collection with summaries for recall.
//
// Usage:
//   ZARA_VECTOR=chroma ZARA_CHROMA_URL=http://localhost:8000 \
//     node --experimental-sqlite tools/scripts/sync-to-chroma.mjs [--force]
//
// Requires: chromadb npm package, running Chroma server.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Force chroma mode for this script
process.env.ZARA_VECTOR = 'chroma';

const { MemoryStore } = await import(path.join(PROJECT_ROOT, 'tools/memory-db.mjs'));
const { parseBundle, isOkfBundle, mapType } = await import(path.join(PROJECT_ROOT, 'tools/memory/okf.mjs'));
const { SemanticEmbedder } = await import(path.join(PROJECT_ROOT, 'tools/embedder.mjs'));
const { getVectorStore } = await import(path.join(PROJECT_ROOT, 'tools/vector-store.mjs'));

const force = process.argv.includes('--force');
const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

function log(msg) { process.stdout.write(`${msg}\n`); }
function dbg(msg) { if (verbose) process.stdout.write(`  ${msg}\n`); }

// --- Verify Chroma is reachable ---
const vs = getVectorStore('zara_semantic');
if (!vs) {
  log('ERROR: ZARA_VECTOR must be "chroma" and Chroma must be reachable.');
  process.exit(1);
}
const reachable = await vs.reachable();
if (!reachable) {
  log(`ERROR: Chroma not reachable at ${process.env.ZARA_CHROMA_URL || 'http://localhost:8000'}`);
  process.exit(1);
}
log('Chroma reachable. Starting sync...\n');

// --- Initialize stores ---
const store = new MemoryStore();
void store.db; // init SQLite schema

let embedder;
try {
  embedder = SemanticEmbedder.instance();
  await embedder.embed('test'); // warm up
} catch (e) {
  log(`ERROR: SemanticEmbedder failed: ${e.message}`);
  process.exit(1);
}

const stats = { knowledge: 0, skills: 0, chunks: 0, errors: [] };

// --- Sync Knowledge ---
const knowledgeDir = path.join(PROJECT_ROOT, 'knowledge');
if (fs.existsSync(knowledgeDir)) {
  log('=== Syncing knowledge/ to Chroma ===');

  if (isOkfBundle(knowledgeDir)) {
    log('  Format: OKF bundle detected');
    const concepts = parseBundle(knowledgeDir);
    for (const concept of concepts) {
      try {
        const section = concept.conceptId.includes('/') ? concept.conceptId.split('/')[0] : 'standalone';
        const memType = concept.type ? mapType(concept.type) : 'fact';
        const key = `knowledge.${section}.${concept.conceptId.split('/').pop()}`;
        const summary = concept.description
          ? `${concept.title}: ${concept.description}`
          : `${concept.title}: ${(concept.body || '').slice(0, 200)}`;

        // Semantic memory (summaries for recall)
        await store.learn(key, summary, { source: 'observed', type: memType, scope: `knowledge/${concept.file}` });

        // Knowledge chunks (passage retrieval)
        if (concept.body) {
          await store.knowledgeChunkUpsert(key, section, concept.body);
          stats.chunks++;
        }
        stats.knowledge++;
        dbg(`  ${concept.file} -> ${key}`);
      } catch (e) {
        stats.errors.push(`knowledge/${concept.file}: ${e.message}`);
      }
    }
  } else {
    log('  Format: legacy (Hugo-style)');
    const walkMd = (dir) => {
      let results = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && !['images', 'node_modules', '.git'].includes(entry.name)) {
          results.push(...walkMd(full));
        } else if (entry.isFile() && entry.name.endsWith('.md') && !['_index.md', 'INDEX.md', 'SUMMARY.md'].includes(entry.name)) {
          results.push(full);
        }
      }
      return results;
    };
    const files = walkMd(knowledgeDir);
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const rel = path.relative(knowledgeDir, file);
        const section = rel.includes(path.sep) ? rel.split(path.sep)[0] : 'standalone';
        const basename = path.basename(file, '.md');
        const key = `knowledge.${section}.${basename}`;

        // Extract title from frontmatter
        const titleMatch = content.match(/^title:\s*(.+)/m);
        const title = titleMatch?.[1]?.trim()?.replace(/^["']|["']$/g, '') || basename;
        const fmEnd = content.indexOf('\n---', 4);
        const body = fmEnd > 0 ? content.slice(fmEnd + 4).trim() : content;

        const summary = `${title}: ${body.split(/\n\n/).find(p => p.trim() && !p.startsWith('#'))?.replace(/\n/g, ' ').slice(0, 200) || ''}`;
        await store.learn(key, summary, { source: 'observed', type: 'fact', scope: `knowledge/${rel}` });

        if (body) {
          await store.knowledgeChunkUpsert(key, section, body);
          stats.chunks++;
        }
        stats.knowledge++;
        dbg(`  ${rel} -> ${key}`);
      } catch (e) {
        stats.errors.push(`${file}: ${e.message}`);
      }
    }
  }
  log(`  Done: ${stats.knowledge} articles synced, ${stats.chunks} passage sets indexed.\n`);
} else {
  log('  knowledge/ not found, skipping.\n');
}

// --- Sync Skills ---
const skillsDir = path.join(PROJECT_ROOT, '.opencode/skills');
if (fs.existsSync(skillsDir)) {
  log('=== Syncing skills/ to Chroma ===');

  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillDir = path.join(skillsDir, entry.name);
    const skillMd = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillMd)) continue;

    try {
      const content = fs.readFileSync(skillMd, 'utf-8');
      const key = `skill.${entry.name}`;
      const firstLine = content.split('\n').find(l => l.trim() && !l.startsWith('#'));
      const summary = `Skill ${entry.name}: ${(firstLine || '').slice(0, 200)}`;

      // Store skill summary in semantic memory
      await store.learn(key, summary, { source: 'observed', type: 'workflow', scope: `skills/${entry.name}` });

      // Store skill body as knowledge chunks for passage retrieval
      await store.knowledgeChunkUpsert(key, `skills`, content);

      // Also process knowledge/ subdirectory within skill if present
      const knowledgeSubdir = path.join(skillDir, 'knowledge');
      if (fs.existsSync(knowledgeSubdir)) {
        for (const kf of fs.readdirSync(knowledgeSubdir).filter(f => f.endsWith('.md'))) {
          const kContent = fs.readFileSync(path.join(knowledgeSubdir, kf), 'utf-8');
          const kKey = `skill.${entry.name}.${path.basename(kf, '.md')}`;
          await store.knowledgeChunkUpsert(kKey, `skills/${entry.name}`, kContent);
        }
      }

      stats.skills++;
      dbg(`  ${entry.name}/SKILL.md -> ${key}`);
    } catch (e) {
      stats.errors.push(`skills/${entry.name}: ${e.message}`);
    }
  }
  log(`  Done: ${stats.skills} skills synced.\n`);
} else {
  log('  .opencode/skills/ not found, skipping.\n');
}

// --- Summary ---
log('=== Sync Complete ===');
log(`  Knowledge articles: ${stats.knowledge}`);
log(`  Skills: ${stats.skills}`);
log(`  Passage sets: ${stats.chunks}`);
if (stats.errors.length) {
  log(`  Errors: ${stats.errors.length}`);
  for (const e of stats.errors.slice(0, 10)) log(`    ${e}`);
}

// Show collection counts
const semCount = await store.semantic.count();
const epiCount = await store.episodic.count();
const procCount = await store.procedural.count();
const kcCount = await store.knowledgeChunks.count();
log(`\n  Chroma collections:`);
log(`    zara_semantic:   ${semCount} entries`);
log(`    zara_episodic:   ${epiCount} entries`);
log(`    zara_procedural: ${procCount} entries`);
log(`    zara_knowledge:  ${kcCount} entries`);

store.close();
