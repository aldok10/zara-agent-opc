// Voice module — Injects natural-voice rules into the system prompt every turn.
// Voice applies to EVERY response, so it belongs in the always-loaded injection
// layer, not an on-demand skill. The full natural-voice SKILL.md remains the deep
// reference (load via skill tool); this module enforces the high-impact hot-path.
//
// Why a plugin and not a skill: a skill must be explicitly loaded to take effect.
// Something that must run on every response can't depend on remembering to load it.
// This closes the gap the audit found: skill was "display only" at runtime.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));

// Resolve the natural-voice skill. Project-local first, then global fallback.
const SKILL_CANDIDATES = [
  path.resolve(__dir, '../../../skills/natural-voice/SKILL.md'),
  path.join(process.env.HOME || '', '.agents/skills/natural-voice/SKILL.md'),
];

// High-impact hot-path crib. This is the always-on subset. Per the skill's own
// detection-priority research, structural burstiness is ~40% of detection score,
// so the burstiness target leads. Banned phrases (not just words) matter more
// than single words. Everything here is actionable in one pass.
const HOT_PATH = [
  '[Voice] Natural-voice is ACTIVE. Before sending any user-facing prose, self-check:',
  '- Burstiness: mix sentence lengths. At least one under 8 words AND one over 20. No uniform runs.',
  '- Fragments OK. One-sentence paragraphs OK. Vary openings (never same starter 3x).',
  '- Banned words: delve, robust, seamless, leverage, navigate, comprehensive, facilitate, ensuring, realm, pivotal, meticulous, foster, landscape, underscore, tapestry, nuanced, vibrant, showcase.',
  '- Banned phrases: "rather than", "such as", "it\'s important to note", "plays a crucial role", "in conclusion", "Moreover/Furthermore/Additionally".',
  '- Lead with the punchline. Skip obvious transitions. Take a position, don\'t fence-sit.',
  '- Emotion shapes structure: excitement runs long, frustration goes short and blunt.',
  '- Indonesian: particles (sih/dong/nih/kan/ya/deh/kok), contractions (nggak/udah/gimana/kayak), code-switch for technical terms.',
  '- Friend test: would a knowledgeable friend say it this way, or a customer service bot?',
  '- For depth (numeric targets, replacement table, cognitive simulation): load the natural-voice skill.',
].join('\n');

// Rotating drift-check nudges. One per turn, cycled. Keeps the reminder from
// becoming wallpaper the model stops reading (instruction attenuation).
const DRIFT_CHECKS = [
  'Drift check: still using particles and contractions, or drifting formal?',
  'Drift check: opinions present, or just listing balanced options?',
  'Drift check: sentence lengths actually varied, or settling into uniform medium?',
  'Drift check: leading with the answer, or burying it under preamble?',
  'Drift check: matched their energy and length, or over-explaining?',
];

export default function createVoice() {
  let cribCache = null;
  let turn = 0;

  function loadCrib() {
    if (cribCache !== null) return cribCache;
    // We don't inject the whole skill (too heavy every turn). The hot-path crib
    // IS the enforcement. We only touch the file to confirm the skill exists so
    // the "load the skill for depth" pointer is honest.
    let skillExists = false;
    for (const p of SKILL_CANDIDATES) {
      try {
        if (fs.existsSync(p)) { skillExists = true; break; }
      } catch { /* ignore */ }
    }
    cribCache = skillExists
      ? HOT_PATH
      : HOT_PATH.replace('\n- For depth (numeric targets, replacement table, cognitive simulation): load the natural-voice skill.', '');
    return cribCache;
  }

  return {
    inject(messages) {
      const crib = loadCrib();
      const nudge = DRIFT_CHECKS[turn % DRIFT_CHECKS.length];
      turn++;
      const block = `${crib}\n[Voice] ${nudge}`;
      const sys = messages.find(m => m.role === 'system');
      if (sys) sys.content += '\n\n' + block;
      return messages;
    },

    dispose() {},
    tools: {},
  };
}
