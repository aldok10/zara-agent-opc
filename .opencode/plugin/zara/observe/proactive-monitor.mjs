// Proactive Monitor — nudge budgeting, repetition detection, verify/skill gates, stuck loop detection
// Encapsulates the proactive-intelligence concern so observe/index.mjs stays a
// thin composition root.

import { hash } from '../infra/store.mjs';
import { SkillSuggester } from './skill-suggest.mjs';
import { scorePatch, trustLevel } from './trust-score.mjs';
import { FlowDetector } from '../empathy/flow-detector.mjs';
import { StuckLoopDetector } from './stuck-detector.mjs';

class NudgeBudget {
  #count = 0;
  #lastTurn = -Infinity;
  #turn = 0;
  #fired = new Set();
  #flow;
  constructor(flowDetector) { this.#flow = flowDetector; }
  tick() { this.#turn++; }
  canNudge(key) {
    if (this.#count >= 5) return false; // raised from 3 to 5 for loop detection needs
    if (this.#turn - this.#lastTurn < 3) return false; // reduced gap from 5 to 3 for faster stuck detection
    if (this.#fired.has(key)) return false;
    if (this.#flow.isInFlow()) return false;
    return true;
  }
  spend(key) { this.#count++; this.#lastTurn = this.#turn; this.#fired.add(key); }
  // Allow re-firing loop detection nudges (they should fire each time a new pattern occurs)
  clear(key) { this.#fired.delete(key); }
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
  #stuckDetector = new StuckLoopDetector();
  #skillSuggester = new SkillSuggester();
  #flowDetector = new FlowDetector();
  #pendingNudges = [];

  // Verification gate
  #VERIFY_RE = /\b(test|jest|vitest|mocha|pytest|go\s+test|cargo\s+test|npm\s+test|node\s+--test|make\s+test|lint|eslint|tsc|golangci-lint|phpstan|phpunit)\b/i;
  #editsSinceVerify = 0;
  #verifyNudgeSent = false;

  // Skill routing gate
  #skillLoaded = false;
  #codeEditsWithoutSkill = 0;
  #skillGateNudged = false;

  // Premature termination detection
  #lastAssistantHadNextSteps = false;
  #lastAssistantEndedWithSummary = false;

  constructor() {
    this.#budget = new NudgeBudget(this.#flowDetector);
  }

  // Reset all per-session state. Called on session.created so a new session
  // starts with fresh counters (edits, stuck history, nudge budget, gates).
  resetSession() {
    this.#budget = new NudgeBudget(this.#flowDetector);
    this.#repetition = new RepetitionDetector();
    this.#stuckDetector = new StuckLoopDetector();
    this.#pendingNudges = [];
    this.#editsSinceVerify = 0;
    this.#verifyNudgeSent = false;
    this.#skillLoaded = false;
    this.#codeEditsWithoutSkill = 0;
    this.#skillGateNudged = false;
    this.#lastAssistantHadNextSteps = false;
    this.#lastAssistantEndedWithSummary = false;
  }

  // Called from afterTool: track repetition, stuck loops, verify/skill gates, trust scoring
  recordTool(toolName, input, output, success) {
    const argsHash = hash(JSON.stringify(input?.args || ''));
    const outputHash = output?.output ? hash(typeof output.output === 'string' ? output.output.slice(0, 500) : '') : '';

    // Stuck loop detection
    this.#stuckDetector.record(toolName, argsHash, outputHash, success);
    const stuck = this.#stuckDetector.detect();
    if (stuck) {
      const budgetKey = `stuck:${stuck.type}`;
      // Always clear previous stuck nudge of same type to allow re-firing
      this.#budget.clear(budgetKey);
      if (this.#budget.canNudge(budgetKey)) {
        this.#pendingNudges.push(stuck.message);
        this.#budget.spend(budgetKey);
      }
    }

    // Legacy repetition detection (3x same failed tool)
    this.#repetition.record(toolName, argsHash, success);
    const repKey = this.#repetition.detect();
    if (repKey && this.#budget.canNudge(repKey)) {
      this.#pendingNudges.push('[Observe] Same tool failed 3x consecutively. Step back and diagnose root cause.');
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
        this.#pendingNudges.push(`[Trust] Risky edit detected (${filePath}, score ${trust.toFixed(2)}). Verify before continuing.`);
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

    // Reset no-tool counter since we got a tool call
    this.#stuckDetector.resetNoToolCounter();
  }

  // Called when assistant responds without any tool calls
  recordResponseWithoutTools(content) {
    this.#stuckDetector.recordTurnWithoutTool();

    // Detect premature termination patterns
    if (typeof content === 'string') {
      this.#lastAssistantHadNextSteps = /next\s+steps?[:]/i.test(content) || /here'?s?\s+what\s+(you|we)\s+(could|can|should)/i.test(content);
      this.#lastAssistantEndedWithSummary = /let\s+me\s+know/i.test(content) || /if\s+you\s+(need|want)\s+(anything|help)/i.test(content);
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

    // Stuck loop nudges (highest priority)
    if (this.#pendingNudges.length) {
      parts.push(...this.#pendingNudges);
      this.#pendingNudges = [];
    }

    // Planning paralysis check
    const stuckCheck = this.#stuckDetector.detect();
    if (stuckCheck && stuckCheck.type === 'planning_paralysis') {
      const budgetKey = 'stuck:planning_paralysis';
      this.#budget.clear(budgetKey);
      if (this.#budget.canNudge(budgetKey)) {
        parts.push(stuckCheck.message);
        this.#budget.spend(budgetKey);
      }
    }

    // Premature termination nudge
    if (this.#lastAssistantHadNextSteps && this.#budget.canNudge('premature-stop')) {
      parts.push('[Loop-Enforce] You listed next steps but stopped. Execute them now. Do not stop until the task is complete or you are genuinely blocked.');
      this.#budget.spend('premature-stop');
      this.#lastAssistantHadNextSteps = false;
    }

    if (this.#lastAssistantEndedWithSummary && this.#budget.canNudge('summary-drift')) {
      parts.push('[Loop-Enforce] You ended with a summary/offer pattern instead of completing work. If work remains, continue executing. If truly done, show verification evidence.');
      this.#budget.spend('summary-drift');
      this.#lastAssistantEndedWithSummary = false;
    }

    // Skill nudges
    const skillNudge = this.#skillSuggester.suggest();
    if (skillNudge && this.#budget.canNudge('skill')) { parts.push(skillNudge); this.#budget.spend('skill'); }
    else if (this.#skillSuggester.gapDetected && this.#budget.canNudge('skill-gap')) {
      parts.push('[Skill-Gap] No skill matches. Research or create one if recurring.');
      this.#budget.spend('skill-gap');
    }

    // Verification gate nudge
    if (this.#editsSinceVerify >= 3 && !this.#verifyNudgeSent && this.#budget.canNudge('verify-gate')) {
      parts.push(`[Verify] ${this.#editsSinceVerify} edits without test/lint. Run verification before claiming done.`);
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
