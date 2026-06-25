#!/usr/bin/env node
// Zara MCP Server — Entry point
//
// Usage:
//   node tools/mcp/index.mjs

import fs from 'fs';
import path from 'path';
import { McpServer } from './server.mjs';
import { HOME, ensure, loadJson } from './infra.mjs';
import {
  getDb, applyDecay, consolidate, closeDb
} from '../memory-db.mjs';

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

// Initialize
const MEM_DIR = path.join(HOME, 'memory');
const REFLECT_DIR = path.join(HOME, 'reflections');
const METRICS_DIR = path.join(HOME, 'metrics');
const SCRATCH_DIR = path.join(HOME, 'scratch');
[MEM_DIR, REFLECT_DIR, METRICS_DIR, SCRATCH_DIR].forEach(ensure);
getDb();

// Create server
const server = new McpServer('zara-mcp', '0.1.0');

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
  const shouldDecay = !fs.existsSync(lastDecay) ||
    (Date.now() - fs.statSync(lastDecay).mtimeMs) > 7 * 24 * 60 * 60 * 1000;
  if (shouldDecay) {
    applyDecay();
    consolidate(0.05);
    fs.writeFileSync(lastDecay, new Date().toISOString());
  }
} catch (e) { process.stderr.write(`[zara-mcp] decay error: ${e.message}\n`); }

// Loop executor (30s interval)
const loopTimer = setInterval(() => {
  try {
    const loopFile = path.join(HOME, 'loops.json');
    const loops = loadJson(loopFile, []);
    if (!loops.length) return;
    const now = Date.now();
    const fired = loops.filter(l => now >= new Date(l.nextFire).getTime());
    if (!fired.length) return;
    for (const l of fired) {
      l.nextFire = new Date(now + l.ms).toISOString();
      l.fireCount = (l.fireCount || 0) + 1;
      l.lastFired = new Date().toISOString();
      if (l.type === 'music' || (!l.type && /^(lagu|music|next|prev)$/i.test(l.prompt.trim()))) {
        try { const r = server.tools.play_music?.handler({ action: 'next' }); if (r?.catch) r.catch(() => {}); } catch {}
      }
      if (l.type === 'knowledge' || (!l.type && /^(artikel|article|knowledge|cari)$/i.test(l.prompt.trim()))) {
        const pendingFile = path.join(HOME, 'loop-pending.json');
        const pending = loadJson(pendingFile, []);
        pending.push({ id: l.id, prompt: l.prompt, firedAt: new Date().toISOString() });
        fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 2));
      }
      // Self-improvement loop: write to pending-improvements.json for session pickup
      if (l.type === 'self-improve' || (!l.type && /self.?improv|improve.?self|self.?audit/i.test(l.prompt))) {
        try {
          const pendingFile = path.join(HOME, 'pending-improvements.json');
          const pending = loadJson(pendingFile, []);
          pending.push({
            id: l.id,
            type: 'self-improve',
            status: 'pending',
            source: 'loop',
            firedAt: new Date().toISOString(),
            cycle: l.fireCount || 0,
          });
          fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 2));
        } catch (e) { process.stderr.write(`[zara-mcp] self-improve loop error: ${e.message}\n`); }
      }
    }
    fs.writeFileSync(loopFile, JSON.stringify(loops, null, 2));
} catch (e) { process.stderr.write(`[zara-mcp] loop error: ${e.message}\n`); }
}, 30000);

process.on('exit', () => { clearInterval(loopTimer); closeDb(); });
process.stderr.write('Zara MCP server v0.1.0 running (stdio)\n');
