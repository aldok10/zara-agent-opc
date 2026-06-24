// Skill suggestion based on keyword signals in recent user messages

const SKILL_SIGNALS = [
  { skill: 'systematic-debugging', signals: ['error', 'fail', 'bug', 'broken', 'crash'], min: 2 },
  { skill: 'golang-expert', signals: ['go ', '.go', 'goroutine', 'func '], min: 1 },
  { skill: 'php-expert', signals: ['php', 'laravel', 'composer'], min: 1 },
  { skill: 'typescript-expert', signals: ['.ts', 'typescript', 'interface ', 'type '], min: 1 },
  { skill: 'tdd', signals: ['test', 'spec', 'coverage', 'assert', 'expect'], min: 2 },
  { skill: 'docker', signals: ['docker', 'container', 'dockerfile', 'compose'], min: 1 },
];

export class SkillSuggester {
  #buffer = [];    // last 5 user messages (lowercase)
  #suggested = new Set();

  addMessage(text) {
    if (!text) return;
    this.#buffer.push(text.toLowerCase());
    if (this.#buffer.length > 5) this.#buffer.shift();
  }

  suggest() {
    if (this.#buffer.length < 3) return null;
    const combined = this.#buffer.join(' ');
    for (const { skill, signals, min } of SKILL_SIGNALS) {
      if (this.#suggested.has(skill)) continue;
      const hits = signals.filter(s => combined.includes(s)).length;
      if (hits >= min) {
        this.#suggested.add(skill);
        return `[Suggest] Your workflow matches \`${skill}\`. Consider loading it.`;
      }
    }
    return null;
  }
}
