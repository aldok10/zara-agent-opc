import { FileStore } from '../infra/store.mjs';
import { tool } from '@opencode-ai/plugin';

const z = tool.schema;

const flowStore = new FileStore('flow');
const stateStore = new FileStore('state');

function getTimeUntilBed(bedtime) {
  const now = new Date();
  const [h, m] = bedtime.split(':').map(Number);
  const bed = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  if (h < 6 && now.getHours() >= 6) bed.setDate(bed.getDate() + 1);
  const diff = bed - now;
  const minsLeft = Math.round(diff / 60000);
  return { minsLeft, isPast: minsLeft < 0 };
}

class LoopService {
  load() { return flowStore.readJSON('loops.json', []); }
  save(loops) { flowStore.writeJSON('loops.json', loops); }

  parseInterval(interval) {
    const match = interval.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return null;
    const [, num, unit] = match;
    return parseInt(num) * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];
  }

  start(prompt, interval = '10m') {
    const ms = this.parseInterval(interval);
    if (!ms) return 'Invalid interval. Use: 30s, 5m, 1h, 1d';
    const loops = this.load();
    const id = Math.random().toString(36).slice(2, 8);
    const loop = { id, interval, ms, prompt, startedAt: new Date().toISOString(), nextFire: new Date(Date.now() + ms).toISOString(), fireCount: 0 };
    loops.push(loop);
    this.save(loops);
    return `Loop [${id}]: "${prompt}" every ${interval}\nNext: ${new Date(loop.nextFire).toLocaleTimeString()}`;
  }

  stop(target) {
    if (!target) return 'Need loop ID or prompt text to stop.';
    const loops = this.load();
    const idx = loops.findIndex(l => l.id === target || l.prompt.includes(target));
    if (idx === -1) return 'Loop not found.';
    const removed = loops.splice(idx, 1)[0];
    this.save(loops);
    return `Stopped loop: "${removed.prompt}"`;
  }

  list() {
    const loops = this.load();
    if (!loops.length) return 'No active loops.';
    return loops.map((l, i) => `${i + 1}. [${l.id}] every ${l.interval}: "${l.prompt}" (next: ${new Date(l.nextFire).toLocaleTimeString()})`).join('\n');
  }

  clear() { this.save([]); return 'All loops cleared.'; }

  check() {
    const loops = this.load();
    const now = Date.now();
    const fired = loops.filter(l => now >= new Date(l.nextFire).getTime());
    if (!fired.length) return 'No loops due yet.';
    for (const l of fired) {
      l.nextFire = new Date(now + l.ms).toISOString();
      l.fireCount = (l.fireCount || 0) + 1;
    }
    this.save(loops);
    return 'LOOP REMINDERS:\n' + fired.map(l => `• [${l.id}] ${l.prompt}`).join('\n');
  }

  getDue() {
    const loops = this.load();
    const now = Date.now();
    return { loops, due: loops.filter(l => now >= new Date(l.nextFire).getTime()) };
  }
}

class GoalService {
  load() { return flowStore.readJSON('goal.json', { active: false }); }
  save(goal) { flowStore.writeJSON('goal.json', goal); }

  set(condition, maxTurns = 20) {
    const goal = { active: true, condition, turns: 0, maxTurns, startedAt: new Date().toISOString(), history: [] };
    this.save(goal);
    return `Goal: "${condition}"\nMax ${maxTurns} turns. Use goal check after each step.`;
  }

  check(progress) {
    const goal = this.load();
    if (!goal.active) return 'No active goal.';
    goal.turns++;
    if (progress) goal.history.push(`[${goal.turns}] ${progress}`);
    this.save(goal);
    if (goal.turns >= goal.maxTurns) return `Turn ${goal.turns}/${goal.maxTurns} — max reached.\nGoal: "${goal.condition}"\nReassess: is this achievable?`;
    return `${goal.turns}/${goal.maxTurns} — "${goal.condition}"\nContinue until condition is met.`;
  }

  done() {
    const goal = this.load();
    if (!goal.active) return 'No active goal.';
    const msg = `Done: "${goal.condition}" in ${goal.turns} turns.`;
    this.save({ active: false, lastCompleted: goal.condition, completedAt: new Date().toISOString() });
    return msg;
  }

  status() {
    const goal = this.load();
    if (!goal.active) return 'No active goal.';
    const lines = [`"${goal.condition}"`, `Turns: ${goal.turns}/${goal.maxTurns}`];
    if (goal.history.length) lines.push('Recent:', ...goal.history.slice(-3).map(h => `  ${h}`));
    return lines.join('\n');
  }

  clear() { this.save({ active: false }); return 'Goal cleared.'; }
}

class ShutdownService {
  load() { return flowStore.readJSON('shutdown.json', { bedtime: '23:00', enabled: true, snoozed: false, snoozeUntil: null }); }
  save(ritual) { flowStore.writeJSON('shutdown.json', ritual); }

  configure(bedtime) {
    const ritual = this.load();
    if (bedtime) ritual.bedtime = bedtime;
    ritual.enabled = true;
    this.save(ritual);
    return `Bedtime set: ${ritual.bedtime}. I'll watch the clock for you.`;
  }

  status() {
    const ritual = this.load();
    const { minsLeft, isPast } = getTimeUntilBed(ritual.bedtime);
    const timeStr = isPast ? `${Math.abs(minsLeft)}min PAST bedtime` : `${minsLeft}min until bedtime`;
    return `Bedtime: ${ritual.bedtime} (${timeStr})\nEnabled: ${ritual.enabled} | Snoozed: ${ritual.snoozed}`;
  }

  check() {
    const ritual = this.load();
    if (!ritual.enabled) return 'Shutdown ritual disabled.';
    const now = Date.now();
    if (ritual.snoozed && ritual.snoozeUntil && now < new Date(ritual.snoozeUntil).getTime()) {
      const left = Math.round((new Date(ritual.snoozeUntil).getTime() - now) / 60000);
      return `Snoozed. ${left}min remaining.`;
    }
    if (ritual.snoozed) { ritual.snoozed = false; this.save(ritual); }
    const { minsLeft, isPast } = getTimeUntilBed(ritual.bedtime);
    if (isPast) return `${Math.abs(minsLeft)}min PAST bedtime!\n\n1. Save state\n2. Parking lot — dump unfinished thoughts\n3. Play sleep music\n4. Close editor\n\nUse \`shutdown trigger\` or \`shutdown snooze\`.`;
    if (minsLeft <= 30) return `${minsLeft}min until bedtime.\n\n• Finish current micro-task only\n• Don't start anything new\n• Write tomorrow's first task`;
    return `${minsLeft}min until wind-down. You're good.`;
  }

  snooze(minutes = 15) {
    const ritual = this.load();
    ritual.snoozed = true;
    ritual.snoozeUntil = new Date(Date.now() + minutes * 60000).toISOString();
    this.save(ritual);
    return `Snoozed ${minutes}min. But every snooze costs tomorrow's sharpness.`;
  }

  trigger() {
    const ritual = this.load();
    ritual.lastTriggered = new Date().toISOString();
    this.save(ritual);
    return `SHUTDOWN RITUAL\n\n1. State save: what you did, what's next\n2. Parking lot: ideas, questions, loose threads\n3. Switch to sleep music\n4. Close in 5 min\n5. No screens\n\nGood work today. Tomorrow you'll be sharper.`;
  }
}

class HandoffService {
  load() { return flowStore.readJSON('handoff.json', null); }
  save(state) { flowStore.writeJSON('handoff.json', state); }

  saveSession(args) {
    if (!args.task) return 'Need at least a task description.';
    const state = {
      task: args.task,
      progress: args.progress || [],
      next_steps: args.next_steps || [],
      decisions: args.decisions || [],
      blockers: args.blockers || [],
      files_touched: args.files_touched || [],
      context: args.context || '',
      savedAt: new Date().toISOString(),
    };
    this.save(state);
    return `Session state saved.\nTask: ${state.task}\nNext: ${state.next_steps.join(' → ') || 'none specified'}`;
  }

  loadSession() {
    const state = this.load();
    if (!state) return 'No saved session state.';
    const age = Math.round((Date.now() - new Date(state.savedAt).getTime()) / 3600000);
    const lines = [`## Session State (saved ${age}h ago)`, `**Task**: ${state.task}`];
    if (state.progress?.length) lines.push(`**Done**: ${state.progress.join(', ')}`);
    if (state.next_steps?.length) lines.push(`**Next**: ${state.next_steps.join(' → ')}`);
    if (state.decisions?.length) lines.push(`**Decisions**: ${state.decisions.join('; ')}`);
    if (state.blockers?.length) lines.push(`**Blockers**: ${state.blockers.join(', ')}`);
    if (state.files_touched?.length) lines.push(`**Files**: ${state.files_touched.join(', ')}`);
    if (state.context) lines.push(`**Context**: ${state.context}`);
    return lines.join('\n');
  }

  clear() { this.save(null); return 'Session state cleared.'; }
}

class ResumeService {
  #directory;
  #MAX_AGE = 86_400_000;

  constructor(directory) { this.#directory = directory; }

  loadState() {
    const state = stateStore.readJSON('current-session.json', null);
    if (!state) return null;
    const age = Date.now() - new Date(state.lastActivity || 0).getTime();
    if (age > this.#MAX_AGE) { this.clearState(); return null; }
    return state;
  }

  saveState(state) {
    state.lastActivity = new Date().toISOString();
    stateStore.writeJSON('current-session.json', state);
  }

  clearState() {
    try { stateStore.writeJSON('current-session.json', null); } catch {}
  }

  appendHistory(entry) {
    stateStore.appendLine('session-history.jsonl', { ...entry, ts: new Date().toISOString() });
  }

  saveProgress(args) {
    const state = {
      activeTask: args.task,
      progress: { currentStep: args.currentStep, completedSteps: args.completedSteps || [], remainingSteps: args.remainingSteps || [] },
      keyDecisions: args.keyDecisions || [],
      filesTouched: args.filesTouched || [],
      learnings: args.learnings || [],
      completed: false,
      directory: this.#directory,
    };
    this.saveState(state);
    this.appendHistory({ type: 'checkpoint', task: args.task, learnings: args.learnings });
    return `Progress saved. Task: ${args.task}, Step: ${args.currentStep}${args.learnings?.length ? `, Learnings: ${args.learnings.length}` : ''}`;
  }

  markComplete() {
    const state = this.loadState();
    if (state) {
      state.completed = true;
      this.saveState(state);
      this.appendHistory({ type: 'complete', task: state.activeTask });
    }
    this.clearState();
    return 'Task marked complete. Resume state cleared.';
  }

  resumeStatus() {
    const state = this.loadState();
    if (!state || state.completed) return 'No incomplete work found. Fresh session.';
    return JSON.stringify({ task: state.activeTask, step: state.progress?.currentStep, decisions: state.keyDecisions, files: state.filesTouched }, null, 2);
  }

  onSessionCreated() {
    const state = this.loadState();
    if (state && !state.completed) {
      this.appendHistory({ type: 'resume_available', task: state.activeTask });
    }
  }
}

// ─── Module Export ────────────────────────────────────────────────────────────

export default function createFlow({ client, directory } = {}) {
  const loops = new LoopService();
  const goals = new GoalService();
  const shutdown = new ShutdownService();
  const handoff = new HandoffService();
  const resume = new ResumeService(directory || process.cwd());

  return {
    onEvent(event) {
      if (event.type === 'session.created') {
        resume.onSessionCreated();
      }
    },

    inject(messages) {
      const parts = [];

      const h = handoff.load();
      if (h && h.task) {
        const age = Math.round((Date.now() - new Date(h.savedAt).getTime()) / 3600000);
        if (age < 48) {
          parts.push(`## Pending Work (${age}h ago)\nTask: ${h.task}${h.next_steps?.length ? `\nNext: ${h.next_steps.join(' → ')}` : ''}${h.blockers?.length ? `\nBlockers: ${h.blockers.join(', ')}` : ''}`);
        }
      }

      const g = goals.load();
      if (g.active) {
        parts.push(`## Active Goal\n"${g.condition}" (turn ${g.turns}/${g.maxTurns})\nAfter completing work, call \`goal\` with action="check".`);
      }

      const { loops: allLoops, due } = loops.getDue();
      if (due.length) {
        parts.push(`## Loop Reminders Due\n${due.map(l => `• ${l.prompt}`).join('\n')}\nCall \`loop\` with action="check" to acknowledge.`);
      } else if (allLoops.length) {
        const next = allLoops.sort((a, b) => new Date(a.nextFire) - new Date(b.nextFire))[0];
        const minsUntil = Math.round((new Date(next.nextFire).getTime() - Date.now()) / 60000);
        if (minsUntil <= 5) parts.push(`## Loop reminder in ${minsUntil}min: "${next.prompt}"`);
      }

      const ritual = shutdown.load();
      if (ritual.enabled) {
        const { minsLeft, isPast } = getTimeUntilBed(ritual.bedtime);
        if (isPast) parts.push(`## PAST BEDTIME (${ritual.bedtime}) by ${Math.abs(minsLeft)}min\nGently remind user. Suggest \`shutdown trigger\`.`);
        else if (minsLeft <= 30) parts.push(`## ${minsLeft}min until bedtime\nHelp user wrap up. Don't start big new tasks.`);
      }

      if (parts.length) {
        const last = messages[messages.length - 1];
        if (last && last.role === 'system') {
          last.content += '\n\n' + parts.join('\n\n');
        } else {
          messages.push({ role: 'system', content: parts.join('\n\n') });
        }
      }
      return messages;
    },

    dispose() {},

    tools: {
      loop: tool({
        description: 'Schedule a recurring reminder/task. Examples: loop start "check tests" every 5m.',
        args: {
          action: z.enum(['start', 'stop', 'list', 'clear', 'check']),
          prompt: z.string().optional(),
          interval: z.string().optional(),
          id: z.string().optional(),
        },
        async execute(args) {
          switch (args.action) {
            case 'start': return { output: loops.start(args.prompt, args.interval) };
            case 'stop': return { output: loops.stop(args.id || args.prompt) };
            case 'list': return { output: loops.list() };
            case 'clear': return { output: loops.clear() };
            case 'check': return { output: loops.check() };
            default: return { output: 'Use: start, stop, list, clear, check' };
          }
        },
      }),

      goal: tool({
        description: 'Set an exit condition for the current work. Keep working until the condition is met.',
        args: {
          action: z.enum(['set', 'check', 'done', 'status', 'clear']),
          condition: z.string().optional(),
          max_turns: z.number().optional(),
          notes: z.string().optional(),
        },
        async execute(args) {
          switch (args.action) {
            case 'set': return { output: goals.set(args.condition, args.max_turns) };
            case 'check': return { output: goals.check(args.notes) };
            case 'done': return { output: goals.done() };
            case 'status': return { output: goals.status() };
            case 'clear': return { output: goals.clear() };
            default: return { output: 'Use: set, check, done, status, clear' };
          }
        },
      }),

      shutdown: tool({
        description: 'Wind-down ritual for vibecoding sessions. Manages bedtime awareness.',
        args: {
          action: z.enum(['configure', 'check', 'trigger', 'status', 'snooze']),
          bedtime: z.string().optional(),
          snooze_minutes: z.number().optional(),
        },
        async execute(args) {
          switch (args.action) {
            case 'configure': return { output: shutdown.configure(args.bedtime) };
            case 'check': return { output: shutdown.check() };
            case 'trigger': return { output: shutdown.trigger() };
            case 'status': return { output: shutdown.status() };
            case 'snooze': return { output: shutdown.snooze(args.snooze_minutes) };
            default: return { output: 'Use: configure, check, trigger, snooze, status' };
          }
        },
      }),

      session_handoff: tool({
        description: 'Save/load structured session state for cross-session continuity.',
        args: {
          action: z.enum(['save', 'load', 'clear']),
          task: z.string().optional(),
          progress: z.array(z.string()).optional(),
          next_steps: z.array(z.string()).optional(),
          decisions: z.array(z.string()).optional(),
          blockers: z.array(z.string()).optional(),
          files_touched: z.array(z.string()).optional(),
          context: z.string().optional(),
        },
        async execute(args) {
          switch (args.action) {
            case 'save': return { output: handoff.saveSession(args) };
            case 'load': return { output: handoff.loadSession() };
            case 'clear': return { output: handoff.clear() };
            default: return { output: 'Use: save, load, clear' };
          }
        },
      }),

      zara_save_progress: tool({
        description: 'Save current task progress for cross-session resume.',
        args: {
          task: z.string(),
          currentStep: z.string().optional(),
          completedSteps: z.array(z.string()).optional(),
          remainingSteps: z.array(z.string()).optional(),
          keyDecisions: z.array(z.string()).optional(),
          filesTouched: z.array(z.string()).optional(),
          learnings: z.array(z.string()).optional(),
        },
        async execute(args) { return { output: resume.saveProgress(args) }; },
      }),

      zara_mark_complete: tool({
        description: 'Mark current task as completed (clears resume state)',
        args: {},
        async execute() { return { output: resume.markComplete() }; },
      }),

      zara_resume_status: tool({
        description: 'Check if there is incomplete work from a previous session',
        args: {},
        async execute() { return { output: resume.resumeStatus() }; },
      }),
    },
  };
}
