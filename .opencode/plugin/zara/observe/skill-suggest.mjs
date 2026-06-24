// Skill suggestion based on skill_routes table (adaptive, weight-sorted)

import { skillRoutesAll } from '../../../../tools/memory-db.mjs';

// Future learning path (not yet implemented):
// - On successful session reflect: UPDATE skill_routes SET hits = hits + 1, weight = weight + 0.1 WHERE skill = ?
// - On failed session reflect: UPDATE skill_routes SET weight = MAX(0.1, weight - 0.05) WHERE skill = ?
// This makes routing adaptive over time without hardcoded thresholds.

export class SkillSuggester {
  #buffer = [];
  #suggested = new Set();

  addMessage(text) {
    if (!text) return;
    this.#buffer.push(text.toLowerCase());
    if (this.#buffer.length > 5) this.#buffer.shift();
  }

  suggest() {
    if (this.#buffer.length < 3) return null;
    const combined = this.#buffer.join(' ');

    let routes;
    try { routes = skillRoutesAll(); } catch { return null; }

    // Group by skill, find first skill with a signal match (already sorted by weight DESC)
    const matched = new Map();
    for (const { skill, signal, weight } of routes) {
      if (this.#suggested.has(skill)) continue;
      if (combined.includes(signal.toLowerCase())) {
        matched.set(skill, (matched.get(skill) || 0) + weight);
      }
    }

    // Pick highest aggregate weight
    let best = null, bestScore = 0;
    for (const [skill, score] of matched) {
      if (score > bestScore) { best = skill; bestScore = score; }
    }

    if (best) {
      this.#suggested.add(best);
      return `[Suggest] Your workflow matches \`${best}\`. Consider loading it.`;
    }
    return null;
  }
}
