// Voice module — Minimal violation detection only.
// No injection. Voice rules live in agent prompt (system.md + zara.md).
// This module only tracks response quality and flags violations.

import { contextPressure } from '../infra/store.mjs';

const BANNED_WORDS = /\b(delve|realm|meticulous|pivotal|robust|seamless|leverage|navigate|comprehensive|facilitate|landscape|foster|ensuring|furthermore|additionally)\b/i;
const EM_DASH = /\u2014/;
const WASTE = [
  /^(great|sure|absolutely|of course)[,!.]?\s/i,
  /let me (help|assist|explain|break)/i,
  /as (mentioned|noted|discussed|I said) (earlier|before|above)/i,
  /in (conclusion|summary|short),?\s/i,
  /hope (this|that) helps/i,
];

export default function createVoice() {
  let violations = 0;
  let postCompact = false;

  return {
    inject(messages) {
      // Only inject on 3+ violations or post-compaction (minimal cost)
      if (violations < 3 && !postCompact) return messages;

      const sys = messages.find(m => m.role === 'system');
      if (!sys) return messages;

      if (postCompact) {
        sys.content += '\n\n[Voice] Post-compaction: stay direct, opinionated, mixed Indo/English.';
        postCompact = false;
      }

      if (violations >= 3) {
        sys.content += '\n\n[Voice] Banned patterns detected 3x. No em dashes. No filler words. Lead with punchline.';
        violations = 0;
      }

      return messages;
    },

    onCompact() {
      postCompact = true;
      violations = 0;
      return { context: '[Voice] Direct, opinionated, mixed Indo/English. No em dashes. No AI-isms.' };
    },

    onResponse(res) {
      const text = typeof res === 'string' ? res : res?.content || '';
      if (BANNED_WORDS.test(text) || EM_DASH.test(text)) {
        violations++;
      } else {
        let waste = 0;
        for (const p of WASTE) { if (p.test(text)) waste++; }
        if (waste >= 2) violations++;
        else violations = Math.max(0, violations - 1);
      }
    },

    dispose() {},
    tools: {},
  };
}
