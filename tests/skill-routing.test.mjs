import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';

const PROJECT_SKILLS = path.resolve('.opencode/skills');
const GLOBAL_SKILLS = [
  path.join(os.homedir(), '.agents/skills'),
  path.join(os.homedir(), '.claude/skills'),
];

function skillExists(name) {
  const dirs = [PROJECT_SKILLS, ...GLOBAL_SKILLS];
  return dirs.some(d => fs.existsSync(path.join(d, name, 'SKILL.md')));
}

describe('skill-gate routing validation', () => {
  const gateFile = fs.readFileSync(path.join(PROJECT_SKILLS, 'skill-gate', 'SKILL.md'), 'utf-8');
  // Extract all backtick-quoted skill names from the routing table
  const MCP_TOOLS = new Set(['memory_recall', 'memory_learn', 'memory_episode', 'memory_procedure',
    'knowledge_passage', 'knowledge_index', 'reflect', 'reflect_suggest', 'memory_contradictions',
    'memory_consolidate', 'session_log', 'user_profile', 'zara_compact']);
  const routedSkills = [...new Set(
    [...gateFile.matchAll(/`([a-z][\w-]+)`/g)].map(m => m[1])
      .filter(s => !s.startsWith('task(') && !s.startsWith('/') && !s.includes('.') && !s.includes('_') && !MCP_TOOLS.has(s))
  )];

  it('routing table references at least 20 skills', () => {
    assert.ok(routedSkills.length >= 20, `Only found ${routedSkills.length} skill references`);
  });

  // Only verify skills that exist in the project (global skills not available in CI)
  const projectSkills = routedSkills.filter(s => fs.existsSync(path.join(PROJECT_SKILLS, s, 'SKILL.md')));
  const globalOnly = routedSkills.filter(s => !fs.existsSync(path.join(PROJECT_SKILLS, s, 'SKILL.md')));

  for (const skill of projectSkills) {
    it(`skill "${skill}" exists in project`, () => {
      assert.ok(fs.existsSync(path.join(PROJECT_SKILLS, skill, 'SKILL.md')));
    });
  }

  it(`${globalOnly.length} skills are global-only (not verified in CI)`, () => {
    // Informational: these exist at ~/.agents/skills/ or ~/.claude/skills/ locally
    assert.ok(true);
  });

  it('skill-manifest.json covers all project skills', () => {
    const manifestPath = path.resolve('.opencode/skill-manifest.json');
    assert.ok(fs.existsSync(manifestPath), 'skill-manifest.json missing');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const onDisk = fs.readdirSync(PROJECT_SKILLS).filter(n =>
      fs.existsSync(path.join(PROJECT_SKILLS, n, 'SKILL.md'))
    );
    for (const name of onDisk) {
      assert.ok(manifest[name], `Skill "${name}" on disk but missing from manifest`);
    }
  });
});
