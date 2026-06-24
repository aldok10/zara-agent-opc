#!/usr/bin/env node
// Re-seed knowledge chunks with SemanticEmbedder (384-dim MiniLM-L6-v2)
// Usage: node --experimental-sqlite scripts/reseed-knowledge.mjs

import knowledgeTools from '../tools/mcp/domain/knowledge.mjs';

const t0 = Date.now();
console.log('Re-seeding knowledge with SemanticEmbedder (force=true)...');
const result = await knowledgeTools.knowledge_load_init.handler({ force: true });
console.log(result);
console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
