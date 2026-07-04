// Stuck Loop Detector — detects doom loops, A-B-A-B alternation, no-op, planning paralysis
// Integrated into ProactiveMonitor for nudge delivery

export class StuckLoopDetector {
  #history = []; // { tool, argsHash, output hash, ts }
  #noToolTurns = 0;

  static MAX_HISTORY = 20;
  static SAME_CALL_THRESHOLD = 2;  // same exact call 2x = stuck
  static ALTERNATION_MIN = 4;      // need 4 entries to detect A-B-A-B
  static NO_TOOL_THRESHOLD = 3;    // 3 turns without tool = planning paralysis
  static NO_OP_THRESHOLD = 2;      // 2 actions with no state change = no-op

  record(tool, argsHash, outputHash, success) {
    this.#history.push({ tool, argsHash, outputHash, success, ts: Date.now() });
    if (this.#history.length > StuckLoopDetector.MAX_HISTORY) this.#history.shift();
    // Reset no-tool counter on any tool call
    this.#noToolTurns = 0;
  }

  recordTurnWithoutTool() {
    this.#noToolTurns++;
  }

  resetNoToolCounter() {
    this.#noToolTurns = 0;
  }

  // Reset all per-session state. Called on session.created to prevent
  // cross-session state bleed.
  reset() {
    this.#history = [];
    this.#noToolTurns = 0;
  }

  /**
   * Detect stuck patterns. Returns null or { type, message, severity }
   */
  detect() {
    // 1. Same exact call repeated (doom loop)
    const doom = this.#detectDoomLoop();
    if (doom) return doom;

    // 2. A-B-A-B alternation
    const alt = this.#detectAlternation();
    if (alt) return alt;

    // 3. No-op (action produces no state change)
    const noop = this.#detectNoOp();
    if (noop) return noop;

    // 4. Planning paralysis (no tool calls)
    const paralysis = this.#detectPlanningParalysis();
    if (paralysis) return paralysis;

    return null;
  }

  #detectDoomLoop() {
    if (this.#history.length < StuckLoopDetector.SAME_CALL_THRESHOLD) return null;
    const last = this.#history[this.#history.length - 1];
    const prev = this.#history[this.#history.length - 2];
    if (last.tool === prev.tool && last.argsHash === prev.argsHash) {
      return {
        type: 'doom_loop',
        message: `[Loop-Detect] Same call repeated: ${last.tool}. Diagnose root cause. Try fundamentally different approach.`,
        severity: 'high',
      };
    }
    return null;
  }

  #detectAlternation() {
    if (this.#history.length < StuckLoopDetector.ALTERNATION_MIN) return null;
    const last4 = this.#history.slice(-4);
    // A-B-A-B pattern: [0]==[2] and [1]==[3] and [0]!=[1]
    if (
      last4[0].tool === last4[2].tool && last4[0].argsHash === last4[2].argsHash &&
      last4[1].tool === last4[3].tool && last4[1].argsHash === last4[3].argsHash &&
      last4[0].argsHash !== last4[1].argsHash
    ) {
      const sameTool = last4[0].tool === last4[1].tool;
      const message = sameTool
        ? `[Loop-Detect] Alternating between two ${last4[0].tool} calls with different args. Both variants failing. Step back, try a third approach.`
        : `[Loop-Detect] A-B-A-B pattern between ${last4[0].tool} and ${last4[1].tool}. Both approaches failing. Step back, try a third approach.`;
      return {
        type: 'alternation',
        message,
        severity: 'high',
      };
    }
    return null;
  }

  #detectNoOp() {
    if (this.#history.length < StuckLoopDetector.NO_OP_THRESHOLD) return null;
    const recent = this.#history.slice(-StuckLoopDetector.NO_OP_THRESHOLD);
    // All recent calls produced same output hash = no state change
    const allSameOutput = recent.every(e => e.outputHash === recent[0].outputHash);
    const allSameTool = recent.every(e => e.tool === recent[0].tool);
    if (allSameOutput && allSameTool && recent[0].outputHash) {
      return {
        type: 'no_op',
        message: `[Loop-Detect] ${recent[0].tool} producing identical results. Action has no effect. Change approach.`,
        severity: 'medium',
      };
    }
    return null;
  }

  #detectPlanningParalysis() {
    if (this.#noToolTurns >= StuckLoopDetector.NO_TOOL_THRESHOLD) {
      return {
        type: 'planning_paralysis',
        message: `[Loop-Detect] ${this.#noToolTurns} turns without tool calls. Stop planning, take an action. Read a file, run a command, or make an edit.`,
        severity: 'medium',
      };
    }
    return null;
  }

  // Get summary stats
  stats() {
    return {
      historyLength: this.#history.length,
      noToolTurns: this.#noToolTurns,
      lastTool: this.#history.length ? this.#history[this.#history.length - 1].tool : null,
    };
  }
}
