#!/usr/bin/env node
// Benchmark: Zara vs bare OpenCode vs ponytail
// Measures static overhead (token count of always-loaded context) per config profile.
// Run: node scripts/benchmark-overhead.mjs

import fs from 'fs';
import path from 'path';

const PROJECT = path.resolve('.');

function countTokens(text) { return Math.ceil(text.length / 4); }
function readFile(f) { try { return fs.readFileSync(path.join(PROJECT, f), 'utf-8'); } catch { return ''; } }

// Profile: Zara Full
function measureZaraFull() {
  const files = [
    '.opencode/agent/zara.md',
    '.opencode/instructions/system.md',
    'AGENTS.md',
    'ZARA_CONSTITUTION.md',
  ];
  const content = files.map(readFile).join('\n');
  return { name: 'Zara Full', files: files.length, chars: content.length, tokens: countTokens(content) };
}

// Profile: Bare OpenCode (estimated)
function measureBare() {
  return { name: 'Bare OpenCode', files: 0, chars: 8000, tokens: 2000, note: 'estimated default prompt' };
}

// Profile: Ponytail (single skill when loaded)
function measurePonytail() {
  const ponytailPath = path.join(process.env.HOME || '', '.agents/skills/ponytail/SKILL.md');
  let content = '';
  try { content = fs.readFileSync(ponytailPath, 'utf-8'); } catch { content = '(~400 tokens estimated)'; }
  return { name: 'Ponytail', files: 1, chars: content.length, tokens: countTokens(content), note: 'loaded on-demand, 0 when idle' };
}

// Measure MCP tool schemas (estimate from opencode.json)
function measureMcpOverhead() {
  const config = JSON.parse(readFile('opencode.json'));
  const mcpCount = Object.keys(config.mcp || {}).length;
  // Each MCP domain contributes ~1500 tokens of schema
  return { mcpServers: mcpCount, estSchemaTokens: mcpCount * 1500 };
}

// Skill descriptions (estimate from available_skills count)
function measureSkillDescriptions() {
  const dirs = [];
  const paths = [
    path.join(PROJECT, '.opencode/skills'),
    path.join(process.env.HOME || '', '.agents/skills'),
    path.join(process.env.HOME || '', '.claude/skills'),
  ];
  for (const p of paths) {
    try { dirs.push(...fs.readdirSync(p).filter(d => fs.existsSync(path.join(p, d, 'SKILL.md')))); } catch {}
  }
  // ~45 tokens per skill description on average
  return { skillCount: dirs.length, estTokens: dirs.length * 45 };
}

// Run
const results = [measureZaraFull(), measureBare(), measurePonytail()];
const mcp = measureMcpOverhead();
const skills = measureSkillDescriptions();

console.log('=== Token Overhead Benchmark ===\n');
console.log('| Profile | Prompt tokens | MCP schema | Skill descs | TOTAL |');
console.log('|---------|---------------|------------|-------------|-------|');
for (const r of results) {
  const total = r.tokens + (r.name === 'Zara Full' ? mcp.estSchemaTokens + skills.estTokens : 0);
  const mcpCol = r.name === 'Zara Full' ? `~${mcp.estSchemaTokens}` : '-';
  const skillCol = r.name === 'Zara Full' ? `~${skills.estTokens}` : '-';
  console.log(`| ${r.name} | ${r.tokens} | ${mcpCol} | ${skillCol} | ~${total} |`);
}

console.log(`\nMCP servers: ${mcp.mcpServers}`);
console.log(`Skills available: ${skills.skillCount}`);
console.log(`\nZara/Bare ratio: ${(results[0].tokens / results[1].tokens).toFixed(1)}x`);
console.log(`\nNote: With prompt caching, repeated prefix tokens are ~10x cheaper.`);
console.log('Run after trimming to compare: node scripts/benchmark-overhead.mjs');
