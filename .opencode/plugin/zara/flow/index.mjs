import { FileStore } from '../infra/store.mjs';
import { tool } from '@opencode-ai/plugin';
import { execSync } from 'node:child_process';

const z = tool.schema;

const flowStore = new FileStore('flow');
const stateStore = new FileStore('state');
// Root store: goal.json + shutdown-ritual.json are OWNED by the MCP session
// domain (~/.zara/goal.json). Read from the same file so the inject reminder
// reflects the real goal set via the `goal` tool (no split-brain).
const rootStore = new FileStore('');

function getTimeUntilBed(bedtime) {
  const now = new Date();
  const [h, m] = bedtime.split(':').map(Number);
  const bed = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  if (h < 6 && now.getHours() >= 6) bed.setDate(bed.getDate() + 1);
  const diff = bed - now;
  const minsLeft = Math.round(diff / 60000);
  return { minsLeft, isPast: minsLeft < 0 };
}

class GoalService {
  load() { return rootStore.readJSON('goal.json', { active: false }); }
  save(goal) { rootStore.writeJSON('goal.json', goal); }

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
  load() { return rootStore.readJSON('shutdown-ritual.json', { bedtime: '23:00', enabled: true, snoozed: false, snoozeUntil: null }); }
  save(ritual) { rootStore.writeJSON('shutdown-ritual.json', ritual); }

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
  const goals = new GoalService();
  const shutdown = new ShutdownService();
  const handoff = new HandoffService();
  const resume = new ResumeService(directory || process.cwd());
  let gitContext = null;

  return {
    onEvent(event) {
      if (event.type === 'session.created') {
        resume.onSessionCreated();
        // Git preload
        try {
          const cwd = directory || process.cwd();
          const branch = execSync('git branch --show-current', { cwd, encoding: 'utf8' }).trim();
          const log = execSync('git log --oneline -3', { cwd, encoding: 'utf8' }).trim();
          if (branch) gitContext = `[Session] Branch: ${branch} | Recent: ${log.replace(/\n/g, '; ')}`;
        } catch { /* not a git repo, skip */ }
      }
    },

    inject(messages) {
      const parts = [];

      // Git context (one-shot, first injection only)
      if (gitContext) {
        parts.push(gitContext);
        gitContext = null;
      }

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
  };
}
