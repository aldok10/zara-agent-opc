#!/usr/bin/env node
// Zara MCP Server — Entry point
//
// Usage:
//   node tools/mcp/index.mjs

// Node version gate: FTS5 requires >=22.14.0
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 14)) {
  process.stderr.write(`[zara-mcp] ERROR: Node.js >=22.14.0 required (found ${process.version}). FTS5 unavailable.\n`);
  process.exit(1);
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from './server.mjs';
import { HOME, ensure, loadJson } from './infra.mjs';
import {
  getDb, applyDecay, consolidate, closeDb
} from '../memory-db.mjs';
import { SemanticEmbedder } from '../embedder.mjs';

// Tool modules
import memoryTools from './domain/memory.mjs';
import reflectionTools from './domain/reflection.mjs';
import metricsTools from './domain/metrics.mjs';
import sessionTools from './domain/session.mjs';
import musicTools from './domain/music.mjs';
import knowledgeTools from './domain/knowledge.mjs';
import auditTools from './domain/audit.mjs';
import projectTools from './domain/project.mjs';
import identityTools from './domain/identity.mjs';
import improveTools from './domain/improve.mjs';

// Version: single source of truth is package.json
const PKG_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');
let VERSION = '0.0.0';
try { VERSION = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8')).version || VERSION; } catch { /* fall back */ }

// Initialize
const MEM_DIR = path.join(HOME, 'memory');
const REFLECT_DIR = path.join(HOME, 'reflections');
const SCRATCH_DIR = path.join(HOME, 'scratch');
[MEM_DIR, REFLECT_DIR, SCRATCH_DIR].forEach(ensure);
getDb();

// Warm embedder in background (non-blocking, eliminates cold-start lag on first recall)
SemanticEmbedder.instance().embed('warmup').catch(() => {});

// Create server
const server = new McpServer('zara-mcp', VERSION);

// Register all tools
server.registerAll([memoryTools, reflectionTools, metricsTools, sessionTools, musicTools, knowledgeTools, auditTools, projectTools, identityTools, improveTools]);

// Start listening
server.listen();

process.on('uncaughtException', (err) => {
  process.stderr.write(`[zara-mcp] FATAL: ${err.message}\n${err.stack}\n`);
});
process.on('unhandledRejection', (reason) => {
  process.stderr.write(`[zara-mcp] UNHANDLED: ${reason}\n`);
});

// Weekly decay
try {
  const lastDecay = path.join(HOME, '.last-decay');
  let shouldDecay = true;
  try {
    const stat = fs.statSync(lastDecay);
    shouldDecay = (Date.now() - stat.mtimeMs) > 7 * 24 * 60 * 60 * 1000;
  } catch { /* file doesn't exist, proceed with decay */ }
  if (shouldDecay) {
    applyDecay();
    consolidate(0.05);
    fs.writeFileSync(lastDecay, new Date().toISOString());
  }
} catch (e) { process.stderr.write(`[zara-mcp] decay error: ${e.message}\n`); }

// Loop executor removed: the 30s polling timer was a token/CPU waster and its
// only real consumer (self-improve auto-fire) is better served on demand via
// the zara_self_improve tool + session-end hooks. Music autoplay lives in the
// music domain; self-improvement stays fully available, just not timer-driven.

process.on('exit', () => { closeDb(); });
process.stderr.write(`Zara MCP server v${VERSION} running (stdio)\n`);
