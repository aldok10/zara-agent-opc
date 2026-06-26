#!/usr/bin/env node
// Cleanup: Remove 0x-execution micro-tools and stale 1x patterns (Issue #29)
// Identifies theater: mechanisms that look rigorous but never fire (Issue #30)
// Run: node scripts/cleanup-theater.mjs [--dry-run]

import fs from 'fs';
import path from 'path';
import os from 'os';

const HOME = path.join(os.homedir(), '.zara');
const EVOLVE_DIR = path.join(HOME, 'evolve');
const REFLECT_DIR = path.join(HOME, 'reflections');
const dryRun = process.argv.includes('--dry-run');

function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return fallback; }
}
function saveJson(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

console.log(`=== Theater Cleanup ${dryRun ? '(DRY RUN)' : ''} ===\n`);
let removed = 0;

// 1. Micro-tools with 0 executions
const microFile = path.join(EVOLVE_DIR, 'micro-tools.json');
const microTools = loadJson(microFile, []);
const deadTools = microTools.filter(t => (t.uses || 0) === 0);
const liveTools = microTools.filter(t => (t.uses || 0) > 0);

if (deadTools.length) {
  console.log(`MICRO-TOOLS: ${deadTools.length} with 0 executions (removing)`);
  for (const t of deadTools) console.log(`  - ${t.name}: "${t.trigger}" (0x)`);
  if (!dryRun) saveJson(microFile, liveTools);
  removed += deadTools.length;
} else {
  console.log('MICRO-TOOLS: all have been used at least once');
}

// 2. Patterns with 1 occurrence and low success
const patternsFile = path.join(REFLECT_DIR, 'patterns.json');
const patterns = loadJson(patternsFile, []);
const stalePatterns = patterns.filter(p => p.occurrences <= 1 && (p.successRate || 0) < 0.6);
const healthyPatterns = patterns.filter(p => !(p.occurrences <= 1 && (p.successRate || 0) < 0.6));

if (stalePatterns.length) {
  console.log(`\nPATTERNS: ${stalePatterns.length} stale (1x, low success, removing)`);
  for (const p of stalePatterns) console.log(`  - ${p.name}: ${p.occurrences}x, ${Math.round((p.successRate || 0) * 100)}% success`);
  if (!dryRun) saveJson(patternsFile, healthyPatterns);
  removed += stalePatterns.length;
} else {
  console.log('\nPATTERNS: none stale');
}

// 3. Rules that never fired
const rulesFile = path.join(EVOLVE_DIR, 'workflow-rules.json');
const rules = loadJson(rulesFile, []);
const deadRules = rules.filter(r => (r.fired || 0) === 0);
const liveRules = rules.filter(r => (r.fired || 0) > 0);

if (deadRules.length) {
  console.log(`\nRULES: ${deadRules.length} never fired (removing)`);
  for (const r of deadRules) console.log(`  - WHEN "${r.when}" THEN ${r.then} (0 fires)`);
  if (!dryRun) saveJson(rulesFile, liveRules);
  removed += deadRules.length;
} else {
  console.log('\nRULES: all have fired at least once');
}

console.log(`\n--- Summary: ${removed} items ${dryRun ? 'would be' : ''} removed ---`);
if (dryRun) console.log('Run without --dry-run to apply.');
