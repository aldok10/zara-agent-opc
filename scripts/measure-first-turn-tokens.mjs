#!/usr/bin/env node
// scripts/measure-first-turn-tokens.mjs
// Estimates token budget consumed by Zara-controlled content on first turn.
// Usage: node scripts/measure-first-turn-tokens.mjs

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');

function charCount(file) {
  const full = path.resolve(ROOT, file);
  if (!fs.existsSync(full)) return { chars: 0, lines: 0, file };
  const content = fs.readFileSync(full, 'utf-8');
  return { chars: content.length, lines: content.split('\n').length, file };
}

function estimateTokens(chars) {
  return Math.ceil(chars / 4); // rough: 1 token ~ 4 chars
}

// 1. Agent prompt (always loaded)
const agentPrompt = charCount('.opencode/agent/zara.md');

// 2. Instructions (always loaded)
const instructions = charCount('.opencode/instructions/system.md');

// 3. MCP tool descriptions
let toolDescChars = 0;
const toolDir = path.join(ROOT, 'tools/mcp/domain');
if (fs.existsSync(toolDir)) {
  for (const f of fs.readdirSync(toolDir).filter(f => f.endsWith('.mjs'))) {
    const content = fs.readFileSync(path.join(toolDir, f), 'utf-8');
    const descs = content.match(/description:\s*['"]([^'"]+)['"]/g) || [];
    for (const d of descs) toolDescChars += d.length;
  }
}

// 4. Skill descriptions (injected by OpenCode from SKILL.md frontmatter)
let skillDescChars = 0;
let skillCount = 0;
const skillsDir = path.join(ROOT, '.opencode/skills');
if (fs.existsSync(skillsDir)) {
  for (const d of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const skillFile = path.join(skillsDir, d.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    const content = fs.readFileSync(skillFile, 'utf-8');
    const desc = content.match(/^description:\s*(.+)$/m)?.[1] || '';
    skillDescChars += desc.length;
    skillCount++;
  }
}

// 5. AGENTS.md (may or may not be loaded depending on convention)
const agentsFile = charCount('AGENTS.md');

// Summary
const alwaysLoaded = agentPrompt.chars + instructions.chars;
const toolTokens = estimateTokens(toolDescChars);
const skillTokens = estimateTokens(skillDescChars);
const totalFirstTurn = alwaysLoaded + toolDescChars + skillDescChars;

console.log('=== First-Turn Token Budget (Zara-controlled) ===\n');
console.log(`  Agent prompt (zara.md):     ${agentPrompt.chars} chars (~${estimateTokens(agentPrompt.chars)} tokens) [${agentPrompt.lines} lines]`);
console.log(`  Instructions (system.md):   ${instructions.chars} chars (~${estimateTokens(instructions.chars)} tokens) [${instructions.lines} lines]`);
console.log(`  MCP tool descriptions:      ${toolDescChars} chars (~${toolTokens} tokens)`);
console.log(`  Skill descriptions (${skillCount}):   ${skillDescChars} chars (~${skillTokens} tokens)`);
console.log(`  ────────────────────────────────────────────`);
console.log(`  TOTAL first-turn:           ${totalFirstTurn} chars (~${estimateTokens(totalFirstTurn)} tokens)`);
console.log('');
console.log(`  AGENTS.md (deferred):       ${agentsFile.chars} chars (~${estimateTokens(agentsFile.chars)} tokens) [NOT on first turn]`);
console.log(`  Extended files (deferred):   loaded on demand [NOT on first turn]`);
console.log('');

const target = 1000;
const actual = estimateTokens(totalFirstTurn);
if (actual <= target) {
  console.log(`  STATUS: PASS (${actual} <= ${target} target)`);
} else {
  console.log(`  STATUS: OVER (${actual} > ${target} target, need -${actual - target} tokens)`);
  console.log('  Breakdown of overage:');
  if (toolTokens > 300) console.log(`    - Tool descriptions still heavy: ${toolTokens} tokens`);
  if (skillTokens > 200) console.log(`    - Skill descriptions still heavy: ${skillTokens} tokens`);
}
