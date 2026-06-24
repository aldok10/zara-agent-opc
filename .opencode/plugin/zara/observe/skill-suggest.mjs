// Skill suggestion based on skill_routes table + filesystem discovery (adaptive, weight-sorted)

import { skillRoutesAll } from '../../../../tools/memory-db.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Session-lifetime cache for discovered skills
let _discoveryCache = null;

function discoverSkills() {
  if (_discoveryCache) return _discoveryCache;
  const dirs = [
    path.join(os.homedir(), '.agents/skills'),
    path.join(os.homedir(), '.claude/skills'),
    '.opencode/skills',
  ];
  const skills = [];
  for (const dir of dirs) {
    try {
      for (const name of fs.readdirSync(dir)) {
        const skillFile = path.join(dir, name, 'SKILL.md');
        if (fs.existsSync(skillFile)) {
          const content = fs.readFileSync(skillFile, 'utf-8').slice(0, 500);
          const descMatch = content.match(/description:\s*(.+)/i);
          if (descMatch) skills.push({ name, description: descMatch[1].trim().toLowerCase() });
        }
      }
    } catch {}
  }
  _discoveryCache = skills;
  return skills;
}

export class SkillSuggester {
  #buffer = [];
  #suggested = new Set();
  #discoveryFailed = false;

  addMessage(text) {
    if (!text) return;
    this.#buffer.push(text.toLowerCase());
    if (this.#buffer.length > 5) this.#buffer.shift();
  }

  /** True when both routes AND discovery found nothing for the current buffer */
  get gapDetected() { return this.#discoveryFailed; }

  suggest() {
    if (this.#buffer.length < 3) return null;
    const combined = this.#buffer.join(' ');
    this.#discoveryFailed = false;

    // Phase 1: route-based matching
    let routes;
    try { routes = skillRoutesAll(); } catch { routes = []; }

    const matched = new Map();
    for (const { skill, signal, weight } of routes) {
      if (this.#suggested.has(skill)) continue;
      if (combined.includes(signal.toLowerCase())) {
        matched.set(skill, (matched.get(skill) || 0) + weight);
      }
    }

    let best = null, bestScore = 0;
    for (const [skill, score] of matched) {
      if (score > bestScore) { best = skill; bestScore = score; }
    }

    if (best) {
      this.#suggested.add(best);
      return `[Suggest] Your workflow matches \`${best}\`. Consider loading it.`;
    }

    // Phase 2: filesystem discovery fallback (word overlap)
    const words = combined.split(/\s+/).filter(w => w.length > 3);
    const skills = discoverSkills();
    let discoveryBest = null, discoveryScore = 0;
    for (const { name, description } of skills) {
      if (this.#suggested.has(name)) continue;
      const overlap = words.filter(w => description.includes(w)).length;
      if (overlap > discoveryScore) { discoveryBest = name; discoveryScore = overlap; }
    }

    if (discoveryBest && discoveryScore >= 2) {
      this.#suggested.add(discoveryBest);
      return `[Suggest] Your workflow matches \`${discoveryBest}\`. Consider loading it.`;
    }

    // Neither route nor discovery matched
    this.#discoveryFailed = true;
    return null;
  }
}
