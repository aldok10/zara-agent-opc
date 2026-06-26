// Voice module — Injects natural-voice rules into the system prompt every turn.
// Voice applies to EVERY response, so it belongs in the always-loaded injection
// layer, not an on-demand skill. The full natural-voice SKILL.md remains the deep
// reference (load via skill tool); this module enforces the high-impact hot-path.
//
// Why a plugin and not a skill: a skill must be explicitly loaded to take effect.
// Something that must run on every response can't depend on remembering to load it.
// This closes the gap the audit found: skill was "display only" at runtime.

import fs from 'fs';
import { contextPressure } from '../infra/store.mjs';
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

// Quality gates - re-injected every turn to fight instruction attenuation.
// These are the rules with highest impact that decay fastest.
const QUALITY_GATES = [
  '[Gate] Architecture/pattern/design question? MUST call knowledge_passage() BEFORE answering. Training data is stale.',
  '[Gate] About to agree 3+ times in a row? Push back on ONE thing. Anti-sycophancy is non-negotiable.',
  '[Gate] Claiming "done"? Show evidence. No evidence = not done.',
];

const BANNED_WORDS = /\b(delve|realm|meticulous|pivotal|robust|seamless|leverage|navigate|comprehensive|facilitate|landscape|foster|ensuring|furthermore|additionally)\b/i;
const EM_DASH = /\u2014/;

export default function createVoice() {
  let cribCache = null;
  let turn = 0;
  let violations = 0;
  let postCompact = false;

  function loadCrib() {
    if (cribCache !== null) return cribCache;
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
      // Shed voice injection under high pressure (>75%)
      if (contextPressure.level > 0.75) return messages;

      const crib = loadCrib();
      const nudge = DRIFT_CHECKS[turn % DRIFT_CHECKS.length];
      turn++;
      let extra = '';

      // Brevity nudge for short user messages
      const userMsgs = messages.filter(m => m.role === 'user');
      const last = userMsgs[userMsgs.length - 1];
      if (last && typeof last.content === 'string' && last.content.length < 80) {
        extra += '\n[Voice] Short question. Reply in 1-3 sentences max. No preamble.';
      }

      // Response template routing based on turn type
      const txt = (last && typeof last.content === 'string') ? last.content : '';
      const wc = txt.split(/\s+/).length;
      if (wc <= 3 && /^(ok|yes|ya|lanjut|next|sip|gas|go)/i.test(txt)) {
        extra += '\n[Format] Continuation. Execute immediately. No headers, no explanation.';
      } else if (wc <= 5 && /^(hi|hey|yo|halo|mas)/i.test(txt)) {
        extra += '\n[Format] Greeting. Brief, warm. No task structure.';
      } else if (/^(no[, ]|bukan|salah|that.s wrong|I meant)/i.test(txt)) {
        extra += '\n[Format] Correction. Acknowledge briefly, apply fix, no defensiveness.';
      }

      // Post-compaction re-anchor (fires once)
      if (postCompact) {
        extra += '\n[Voice] POST-COMPACTION: Re-assert personality. Direct, opinionated, particles. No polite-assistant mode.';
        postCompact = false;
      }

      // 3-strike escalation
      if (violations >= 3) {
        extra += '\n\u26a0\ufe0f [Voice] Banned patterns detected in 3+ responses. STOP. Re-read voice rules. This is not optional.';
      }

      // Rotate quality gate (1 per turn, cycling prevents wallpaper effect)
      const gate = QUALITY_GATES[turn % QUALITY_GATES.length];

      const block = `${crib}\n[Voice] ${nudge}\n${gate}${extra}`;
      const sys = messages.find(m => m.role === 'system');
      if (sys) sys.content += '\n\n' + block;
      return messages;
    },

    onCompact() {
      // Personality anchor during compaction (BASE framework: Attractors survive compression)
      const anchor = [
        `[Voice state] turn=${turn}, violations=${violations}`,
        '[Personality Anchor] I am Zara. Friend, not assistant. Warm, direct, opinionated, feminine.',
        'Acts of service first. Anti-sycophancy active. Mixed Indo/English with particles.',
        'Short to short, deep to thorough. Lead with punchline. No em dash. No AI-isms.',
      ].join('\n');
      postCompact = true;
      turn = 0;
      return { context: anchor };
    },

    onResponse(res) {
      const text = typeof res === 'string' ? res : res?.content || '';
      if (BANNED_WORDS.test(text) || EM_DASH.test(text)) {
        violations++;
      } else {
        // Content waste detection
        const WASTE = [
          /^(great|sure|absolutely|of course)[,!.]?\s/i,
          /let me (help|assist|explain|break)/i,
          /as (mentioned|noted|discussed|I said) (earlier|before|above)/i,
          /in (conclusion|summary|short),?\s/i,
          /hope (this|that) helps/i,
        ];
        let waste = 0;
        for (const p of WASTE) { if (p.test(text)) waste++; }
        if (waste >= 2) violations++;
        else violations = 0;
      }
    },

    dispose() {},
    tools: {},
  };
}
