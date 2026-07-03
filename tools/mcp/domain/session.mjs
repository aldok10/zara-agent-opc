import path from 'path';
import { HOME, loadJson, saveJson } from '../infra.mjs';
import { dreamConsolidate, detectContradictionsAsync } from '../../memory-db.mjs';
import { resolveBest, discoverAll, persistIdentity } from './identity.mjs';
import { recalledKeys } from './reflection.mjs';

class SessionTools {
  get tools() {
    return {
      user_profile: {
        description: 'Get or update user profile. action="discover" resolves identity from env/git/OS/memory.',
        inputSchema: { type: 'object', properties: { update: { type: 'object', description: 'Fields to merge (omit to read)' }, action: { type: 'string', enum: ['get', 'discover'] }, persist: { type: 'boolean' }, name: { type: 'string' } } },
        handler: (args) => args?.action === 'discover' ? this.#handleDiscover(args) : this.#handleUserProfile(args),
      },
      session_log: {
        description: 'Log session start/end with context (tracks work duration for rest reminders)',
        inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['start', 'end', 'check'] }, context: { type: 'string' } }, required: ['action'] },
        handler: (args) => this.#handleSessionLog(args),
      },
      goal: {
        description: 'Set a goal/exit condition for the current session.',
        inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['set', 'check', 'done', 'status', 'clear'] }, condition: { type: 'string' }, max_turns: { type: 'number' }, notes: { type: 'string' } }, required: ['action'] },
        handler: (args) => this.#handleGoal(args),
      },
      shutdown_ritual: {
        description: 'Wind-down helper for vibecoding sessions.',
        inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['configure', 'check', 'trigger', 'status', 'snooze'] }, bedtime: { type: 'string' }, snooze_minutes: { type: 'number' } }, required: ['action'] },
        handler: (args) => this.#handleShutdownRitual(args),
      },
    };
  }

  #handleUserProfile(args) {
    const file = path.join(HOME, 'user-profile.json');
    const defaultName = (() => { try { return resolveBest().name; } catch { return 'there'; } })();
    const profile = loadJson(file, { name: defaultName, goals: [], activeProjects: [], energy: 'unknown', lastSeen: null, sessionCount: 0 });
    if (args.update) {
      const sanitize = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        const clean = Array.isArray(obj) ? [] : {};
        for (const [k, v] of Object.entries(obj)) {
          if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
          clean[k] = typeof v === 'object' && v !== null ? sanitize(v) : v;
        }
        return clean;
      };
      Object.assign(profile, sanitize(args.update));
      profile.lastUpdated = new Date().toISOString();
      saveJson(file, profile);
      return `Profile updated: ${Object.keys(args.update).join(', ')}`;
    }
    return JSON.stringify(profile, null, 2);
  }

  #handleDiscover(args) {
    if (args?.name) {
      persistIdentity(args.name, 'user_explicit');
      return `Canonical identity set: "${args.name}" (saved to ~/.zara/identity.json).`;
    }
    const candidates = discoverAll();
    const best = candidates.length ? candidates.sort((a, b) => b.confidence - a.confidence)[0] : { name: 'there', source: 'fallback', confidence: 0 };
    if (args?.persist && best.source !== 'fallback') persistIdentity(best.name, best.source);
    const lines = [`Best match: **${best.name}** (via ${best.source}, confidence ${best.confidence.toFixed(2)})`];
    if (candidates.length > 1) {
      lines.push('', 'All sources:');
      for (const c of candidates) lines.push(`  - ${c.name} <- ${c.source} (${c.confidence.toFixed(2)})`);
    }
    if (args?.persist && best.source !== 'fallback') lines.push('', 'Persisted as canonical identity.');
    return lines.join('\n');
  }

  async #handleSessionLog(args) {
    const file = path.join(HOME, 'session.json');
    const session = loadJson(file, { active: false, startedAt: null, context: '', totalToday: 0 });

    // TTL fallback: auto-end stale sessions (>12h without explicit end)
    const MAX_SESSION_MS = 12 * 3600000;
    if (session.active && session.startedAt && (Date.now() - new Date(session.startedAt).getTime()) > MAX_SESSION_MS) {
      session.active = false;
      session.startedAt = null;
      session.lastEnded = new Date().toISOString();
      saveJson(file, session);
    }

    if (args.action === 'start') {
      session.active = true;
      session.startedAt = new Date().toISOString();
      session.context = args.context || '';
      recalledKeys.clear(); // Prevent cross-session trust contamination
      saveJson(file, session);
      // Warm embedder in background (eliminates cold-start lag on first recall)
      import('../../embedder.mjs').then(mod => mod.SemanticEmbedder.instance().embed('warmup')).catch(() => {});
      return `Session started: ${session.context || 'general'}`;
    }
    if (args.action === 'end') {
      if (!session.active || !session.startedAt) return 'No active session.';
      const mins = Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000);
      session.totalToday += mins;
      session.active = false;
      session.startedAt = null;
      session.lastEnded = new Date().toISOString();
      saveJson(file, session);

      // Increment session count in user profile
      const profileFile = path.join(HOME, 'user-profile.json');
      const profile = loadJson(profileFile, { sessionCount: 0 });
      profile.sessionCount = (profile.sessionCount || 0) + 1;
      profile.lastSeen = new Date().toISOString();
      profile.lastUpdated = new Date().toISOString();
      saveJson(profileFile, profile);

      // Deterministic session-end maintenance: consolidation + contradiction scan.
      let maintenance = '';
      try {
        const r = await dreamConsolidate();
        const bits = [];
        if (r.merged || r.archived || r.reinforced) bits.push(`${r.merged} merged, ${r.archived} archived, ${r.reinforced} promoted`);
        if (bits.length) maintenance = `\nMemory maintained: ${bits.join('; ')}.`;
      } catch (e) { process.stderr.write(`[mcp:session] end-of-session consolidation failed: ${e.message}\n`); }

      // Contradiction scan: async/semantic with high threshold to avoid false positives
      try {
        const conflicts = await detectContradictionsAsync(0.95);
        if (conflicts.length > 0) {
          const top = conflicts.slice(0, 3).map(c => `  - "${c.a}" vs "${c.b}" (sim: ${c.sim.toFixed(2)})`).join('\n');
          maintenance += `\n⚠️ ${conflicts.length} potential contradiction(s):\n${top}`;
        }
      } catch { /* embedder unavailable, skip silently */ }

      return `Session ended. Duration: ${mins}min. Total today: ${session.totalToday}min.${maintenance}`;
    }
    if (!session.active || !session.startedAt) return 'No active session.';
    const mins = Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000);
    const warnings = [];
    if (mins >= 120) warnings.push('⚠️ 2+ jam kerja tanpa istirahat. Sarankan break.');
    if (mins >= 180) warnings.push('🚨 3+ jam non-stop. Strongly suggest rest.');
    return `Active: ${mins}min on "${session.context}". Total today: ${session.totalToday + mins}min.${warnings.length ? '\n' + warnings.join('\n') : ''}`;
  }

  #handleGoal(args) {
    const file = path.join(HOME, 'goal.json');
    const goal = loadJson(file, { active: false, condition: null, turns: 0, maxTurns: 20, history: [] });
    if (args.action === 'set') {
      if (!args.condition) return 'Need a condition/goal.';
      saveJson(file, { active: true, condition: args.condition, turns: 0, maxTurns: args.max_turns || 20, startedAt: new Date().toISOString(), history: [] });
      return `🎯 Goal set: "${args.condition}"\nMax turns: ${args.max_turns || 20}.`;
    }
    if (args.action === 'status') {
      if (!goal.active) return 'No active goal.';
      return `🎯 Goal: "${goal.condition}"\nTurns: ${goal.turns}/${goal.maxTurns}`;
    }
    if (args.action === 'check') {
      if (!goal.active) return 'No active goal.';
      goal.turns++;
      if (args.notes) goal.history.push(`[${goal.turns}] ${args.notes}`);
      saveJson(file, goal);
      if (goal.turns >= goal.maxTurns) return `⚠️ Max turns reached (${goal.maxTurns}). Goal: "${goal.condition}"`;
      return `📍 Turn ${goal.turns}/${goal.maxTurns}. Goal: "${goal.condition}"`;
    }
    if (args.action === 'done') {
      if (!goal.active) return 'No active goal.';
      goal.active = false;
      goal.completedAt = new Date().toISOString();
      saveJson(file, goal);
      return `✅ Goal achieved: "${goal.condition}" in ${goal.turns} turns.`;
    }
    if (args.action === 'clear') {
      saveJson(file, { active: false, condition: null, turns: 0, maxTurns: 20, history: [] });
      return '🗑 Goal cleared.';
    }
    return 'Unknown action.';
  }

  #handleShutdownRitual(args) {
    const file = path.join(HOME, 'shutdown-ritual.json');
    const ritual = loadJson(file, { bedtime: '23:00', snoozed: false, snoozeUntil: null, lastTriggered: null, enabled: true });
    const now = new Date();
    const [h, m] = ritual.bedtime.split(':').map(Number);
    const bedtime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);

    if (args.action === 'configure') {
      if (args.bedtime) ritual.bedtime = args.bedtime;
      ritual.enabled = true;
      saveJson(file, ritual);
      return `🌙 Shutdown ritual configured. Bedtime: ${ritual.bedtime}.`;
    }
    if (args.action === 'status') {
      const diff = Math.round((bedtime - now) / 60000);
      return `🌙 Bedtime: ${ritual.bedtime} (${diff > 0 ? `${diff}min left` : `${Math.abs(diff)}min PAST`})\nEnabled: ${ritual.enabled}`;
    }
    if (args.action === 'check') {
      if (!ritual.enabled) return 'Disabled.';
      if (ritual.snoozed && ritual.snoozeUntil && now < new Date(ritual.snoozeUntil)) return 'Snoozed.';
      if (now >= bedtime) return `🚨 PAST BEDTIME (${ritual.bedtime}). Time to shutdown.`;
      const warn = new Date(bedtime.getTime() - 30 * 60000);
      if (now >= warn) return `⚡ ${Math.round((bedtime - now) / 60000)}min until bedtime. Start wrapping up.`;
      return `✅ ${Math.round((warn - now) / 60000)}min until wind-down warning.`;
    }
    if (args.action === 'snooze') {
      ritual.snoozed = true;
      ritual.snoozeUntil = new Date(Date.now() + (args.snooze_minutes || 15) * 60000).toISOString();
      saveJson(file, ritual);
      return `😴 Snoozed ${args.snooze_minutes || 15}min.`;
    }
    if (args.action === 'trigger') {
      ritual.lastTriggered = new Date().toISOString();
      saveJson(file, ritual);
      return `🌙 SHUTDOWN RITUAL TRIGGERED\n1. Save state\n2. Close loops\n3. Sleep music\n4. Step away`;
    }
    return 'Unknown action.';
  }
}

export default new SessionTools().tools;
