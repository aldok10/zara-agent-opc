// Proactive Monitor — nudge budgeting, repetition detection, verify/skill gates
// Encapsulates the proactive-intelligence concern so observe/index.mjs stays a
// thin composition root.

import { hash } from '../infra/store.mjs';
import { SkillSuggester } from './skill-suggest.mjs';
import { scorePatch, trustLevel } from './trust-score.mjs';
import { FlowDetector } from '../empathy/flow-detector.mjs';

class NudgeBudget {
  #count = 0;
  #lastTurn = -Infinity;
  #turn = 0;
  #fired = new Set();
  #flow;
  constructor(flowDetector) { this.#flow = flowDetector; }
  tick() { this.#turn++; }
  canNudge(key) {
    if (this.#count >= 3) return false;
    if (this.#turn - this.#lastTurn < 5) return false;
    if (this.#fired.has(key)) return false;
    if (this.#flow.isInFlow()) return false;
    return true;
  }
  spend(key) { this.#count++; this.#lastTurn = this.#turn; this.#fired.add(key); }
}

class RepetitionDetector {
  #ring = []; // last 10: { tool, argsHash, success }

  record(tool, argsHash, success) {
    this.#ring.push({ tool, argsHash, success });
    if (this.#ring.length > 10) this.#ring.shift();
  }

  detect() {
    if (this.#ring.length < 3) return null;
    const last3 = this.#ring.slice(-3);
    if (last3.every(e => !e.success && e.tool === last3[0].tool)) {
      return 'repetition:' + last3[0].tool;
    }
    return null;
  }
}

export class ProactiveMonitor {
  #budget;
  #repetition = new RepetitionDetector();
  #skillSuggester = new SkillSuggester();
  #flowDetector = new FlowDetector();
  #pendingNudge = null;

  // Verification gate
  #VERIFY_RE = /\b(test|jest|vitest|mocha|pytest|go\s+test|cargo\s+test|npm\s+test|node\s+--test|make\s+test|lint|eslint|tsc|golangci-lint|phpstan|phpunit)\b/i;
  #editsSinceVerify = 0;
  #verifyNudgeSent = false;

  // Skill routing gate
  #skillLoaded = false;
  #codeEditsWithoutSkill = 0;
  #skillGateNudged = false;

  constructor() {
    this.#budget = new NudgeBudget(this.#flowDetector);
  }

  // Called from afterTool: track repetition, verify/skill gates, trust scoring
  recordTool(toolName, input, output, success) {
    // Repetition detection
    this.#repetition.record(toolName, hash(JSON.stringify(input?.args || '')), success);
    const repKey = this.#repetition.detect();
    if (repKey && this.#budget.canNudge(repKey)) {
      this.#pendingNudge = '[Observe] Same tool failed 3x consecutively. Step back and diagnose root cause.';
      this.#budget.spend(repKey);
    }

    // Verification gate: track edits vs verification commands
    if ((toolName === 'edit' || toolName === 'write') && success) {
      this.#editsSinceVerify++;
      // Trust scoring for edits
      const filePath = input?.args?.filePath || input?.args?.path || '';
      const content = input?.args?.content || input?.args?.newString || '';
      const linesChanged = (content.match(/\n/g) || []).length + 1;
      const trust = scorePatch({ filePath, linesChanged, toolName });
      const level = trustLevel(trust);
      if (level === 'dangerous') {
        this.#pendingNudge = `[Trust] Risky edit detected (${filePath}, score ${trust.toFixed(2)}). Verify before continuing.`;
      }
      this.#verifyNudgeSent = false;
      if (!this.#skillLoaded) this.#codeEditsWithoutSkill++;
    } else if (toolName === 'bash' && success) {
      const cmd = input?.args?.command || '';
      if (this.#VERIFY_RE.test(cmd)) {
        this.#editsSinceVerify = 0;
        this.#verifyNudgeSent = false;
      }
    } else if (toolName === 'skill' && success) {
      this.#skillLoaded = true;
      this.#codeEditsWithoutSkill = 0;
      this.#skillGateNudged = false;
    }
  }

  // Called from inject: advance turn, feed suggester, return nudge strings
  collectNudges(messages) {
    this.#budget.tick();
    this.#flowDetector.recordMessage();

    // Feed user messages to skill suggester
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser?.content && typeof lastUser.content === 'string') {
      this.#skillSuggester.addMessage(lastUser.content);
    }

    // Surface proactive nudges
    const parts = [];
    if (this.#pendingNudge) { parts.push(this.#pendingNudge); this.#pendingNudge = null; }
    const skillNudge = this.#skillSuggester.suggest();
    if (skillNudge && this.#budget.canNudge('skill')) { parts.push(skillNudge); this.#budget.spend('skill'); }
    else if (this.#skillSuggester.gapDetected && this.#budget.canNudge('skill-gap')) {
      parts.push('[Skill-Gap] No skill matches. Research or create one if recurring.');
      this.#budget.spend('skill-gap');
    }

    // Verification gate nudge
    if (this.#editsSinceVerify >= 3 && !this.#verifyNudgeSent && this.#budget.canNudge('verify-gate')) {
      parts.push(`[Verify] ${this.#editsSinceVerify} edits without test. Verify before done.`);
      this.#verifyNudgeSent = true;
      this.#budget.spend('verify-gate');
    }

    // Skill routing gate nudge
    if (this.#codeEditsWithoutSkill >= 2 && !this.#skillGateNudged && this.#budget.canNudge('skill-gate')) {
      parts.push('[Skill-Gate] Code edits without skill. Load relevant skill.');
      this.#skillGateNudged = true;
      this.#budget.spend('skill-gate');
    }

    return parts;
  }
}
