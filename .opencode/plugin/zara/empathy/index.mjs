// Empathy module — Longitudinal emotional tracking, sentiment analysis, burnout detection
// Tracks user energy, sentiment, frustration signals across sessions for adaptive interaction

import { FileStore } from '../infra/store.mjs';
import { tool } from '@opencode-ai/plugin';

const z = tool.schema;

// ─── Emotion Record ───────────────────────────────────────────────────────────

class EmotionRecord {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.energy = 0.5;
    this.sentiment = 0.5;
    this.frustrationSignals = 0;
    this.correctionCount = 0;
    this.messageCount = 0;
    this.avgMessageLength = 0;
    this.startedAt = new Date().toISOString();
  }
}

// ─── Trend Analyzer ───────────────────────────────────────────────────────────

class TrendAnalyzer {
  isDeclining(values) {
    if (values.length < 3) return false;
    const half = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const secondHalf = values.slice(half).reduce((a, b) => a + b, 0) / (values.length - half);
    return secondHalf < firstHalf * 0.85;
  }

  detectBurnout(sessions) {
    if (sessions.length < 3) return { alert: false, reason: 'insufficient data' };
    const recent = sessions.slice(-7);
    const signals = {
      energy: this.isDeclining(recent.map(s => s.energy ?? 0.5)),
      sentiment: this.isDeclining(recent.map(s => s.sentiment ?? 0.5)),
      duration: this.isDeclining(recent.map(s => s.duration ?? 0)),
      messageLength: this.isDeclining(recent.map(s => s.avgMessageLength ?? 0)),
    };
    const signalCount = Object.values(signals).filter(Boolean).length;
    return { alert: signalCount >= 2, signals, signalCount };
  }
}

// ─── Text Analysis Helpers ────────────────────────────────────────────────────

function analyzeEnergy(text) {
  if (!text || text.length < 10) return 0.3;
  if (text.length > 200) return 0.7;
  const capsRatio = text.replace(/[^A-Z]/g, '').length / Math.max(text.length, 1);
  const exclaimCount = (text.match(/!/g) || []).length;
  if (capsRatio > 0.3) return 0.8;
  if (exclaimCount > 2) return 0.7;
  if (text.includes('...') || text.includes('…')) return 0.3;
  return 0.5;
}

function analyzeSentiment(text) {
  if (!text) return 0.5;
  const lower = text.toLowerCase();
  const positive = ['nice', 'good', 'great', 'awesome', 'thanks', 'mantap', 'bagus', 'keren', 'suka', 'sip', 'ok', 'done'];
  const negative = ['bad', 'wrong', 'error', 'fail', 'awful', 'susah', 'sulit', 'capek', 'lelah', 'frustrating', 'annoying', 'broken'];
  const posCount = positive.filter(w => lower.includes(w)).length;
  const negCount = negative.filter(w => lower.includes(w)).length;
  if (posCount + negCount === 0) return 0.5;
  return posCount / (posCount + negCount);
}

function detectFrustration(text) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let signals = 0;
  if (/(?:actually|no,|that's not|wrong|bukan|salah|bukan gitu|bukan itu)/i.test(lower)) signals++;
  if (/(?:ugh|argh|whatever|forget it|sudahlah|yaudah|gpp|terserah)/i.test(lower)) signals++;
  if (/(?:you said|you told|you wrote|katamu|kamu bilang)/i.test(lower)) signals++;
  return signals;
}

// ─── Growth Tracker ──────────────────────────────────────────────────────────

class GrowthTracker {
  constructor(data) {
    this.skills = data?.skills || {};
    this.domains = data?.domains || {};
    this.milestones = data?.milestones || [];
    this.domainsBySkill = {};
    for (const [domain, info] of Object.entries(this.domains)) {
      for (const skill of (info.skills || [])) this.domainsBySkill[skill] = domain;
    }
  }

  recordObservation(skill, level, context) {
    const now = new Date().toISOString();
    const prev = this.skills[skill];
    const prevLevel = prev?.level || 0;
    const skillData = {
      level,
      history: [...(prev?.history || []), { level, date: now, context: context || '' }].slice(-20),
      confidence: prev ? Math.min(1, (prev.confidence || 0.5) + 0.1) : 0.5,
      lastAssessed: now,
    };
    this.skills[skill] = skillData;

    // Milestone: level jump ≥ 2 or first time reaching level 3+
    if ((level - prevLevel >= 2) || (level >= 3 && prevLevel < 3)) {
      this.milestones.push({ date: now, description: `${skill} → level ${level}`, skill, context: context || '' });
    }
    return skillData;
  }

  getReport(skillFilter) {
    const entries = skillFilter
      ? Object.entries(this.skills).filter(([k]) => k.includes(skillFilter.toLowerCase()))
      : Object.entries(this.skills);

    if (!entries.length) return null;

    const lines = [];
    for (const [skill, data] of entries.sort((a, b) => b[1].lastAssessed.localeCompare(a[1].lastAssessed))) {
      const hist = data.history || [];
      const first = hist[0]?.level || data.level;
      const current = data.level;
      const change = current - first;
      const trend = change > 0 ? `+${change}` : change < 0 ? `${change}` : '→';
      const direction = change > 0 ? '↑' : change < 0 ? '↓' : '→';
      lines.push(`- **${skill}**: ${first}${direction}${current} (${trend}) — last: ${data.lastAssessed?.split('T')[0] || '?'}`);
    }

    const recentMilestones = this.milestones.slice(-5).reverse();
    const milestoneBlock = recentMilestones.length
      ? `\n**Recent Milestones**\n${recentMilestones.map(m => `- ${m.date?.split('T')[0]}: ${m.description}`).join('\n')}`
      : '';

    return `**Skills Tracked** (${entries.length})\n${lines.join('\n')}${milestoneBlock}`;
  }
}

// ─── Module Export ───────────────────────────────────────────────────────────

export default function createEmpathy({ client, directory } = {}) {
  const store = new FileStore('empathy');
  const trendAnalyzer = new TrendAnalyzer();
  let currentSession = null;
  let growthTracker = null;

  return {
    onEvent(event) {
      if (event.type === 'session.created') {
        currentSession = new EmotionRecord(event.id || Date.now().toString(36));
      }
      if (event.type === 'session.ended' && currentSession) {
        const start = new Date(currentSession.startedAt).getTime();
        const record = { ...currentSession, duration: Date.now() - start, timestamp: new Date().toISOString() };
        store.appendLine('sessions.jsonl', record);

        const sessions = store.readLines('sessions.jsonl', 50);
        const trend = trendAnalyzer.detectBurnout(sessions);
        store.writeJSON('trends.json', { ...trend, updatedAt: new Date().toISOString(), totalSessions: sessions.length });
        currentSession = null;
      }
    },

    onMessage(msg) {
      if (msg.role !== 'user' || !msg.content || !currentSession) return;
      const text = typeof msg.content === 'string' ? msg.content : '';

      currentSession.messageCount++;
      const n = currentSession.messageCount;
      currentSession.avgMessageLength = ((currentSession.avgMessageLength * (n - 1)) + text.length) / n;
      currentSession.energy = (currentSession.energy + analyzeEnergy(text)) / 2;
      currentSession.sentiment = (currentSession.sentiment + analyzeSentiment(text)) / 2;
      currentSession.frustrationSignals += detectFrustration(text);

      if (/(?:correction|actually|no,|bukan|salah)/i.test(text) && text.length < 100) {
        currentSession.correctionCount++;
      }
    },

    inject(messages) {
      if (!currentSession) return messages;
      const sessions = store.readLines('sessions.jsonl', 50);
      const trend = trendAnalyzer.detectBurnout(sessions);
      if (trend.alert) {
        const last = messages[messages.length - 1];
        if (last?.role === 'system') {
          last.content += '\n\n[Empathy: User shows lower-energy pattern. Adjust tone — be supportive, reduce scope, avoid overwhelming.]';
        }
      }
      return messages;
    },

    dispose() {},

    tools: {
      zara_empathy_status: tool({
        description: 'Current session emotional state — energy, sentiment, frustration level',
        args: {},
        async execute() {
          if (!currentSession) return { output: 'No active session.' };
          return {
            output: [
              `**Energy**: ${(currentSession.energy * 100).toFixed(0)}%`,
              `**Sentiment**: ${(currentSession.sentiment * 100).toFixed(0)}%`,
              `**Frustration signals**: ${currentSession.frustrationSignals}`,
              `**Corrections**: ${currentSession.correctionCount}`,
              `**Messages**: ${currentSession.messageCount}`,
            ].join('\n'),
          };
        },
      }),

      zara_empathy_trend: tool({
        description: 'Weekly trend report — burnout detection and behavioral shifts across sessions',
        args: {},
        async execute() {
          const sessions = store.readLines('sessions.jsonl', 50);
          if (sessions.length < 3) return { output: `Need at least 3 sessions for trends (have ${sessions.length}).` };
          const trend = trendAnalyzer.detectBurnout(sessions);
          const recent = sessions.slice(-7);
          const avgEnergy = recent.reduce((s, r) => s + (r.energy ?? 0.5), 0) / recent.length;
          const avgSentiment = recent.reduce((s, r) => s + (r.sentiment ?? 0.5), 0) / recent.length;

          const lines = [
            `**Sessions tracked**: ${sessions.length}`,
            `**Recent avg energy**: ${(avgEnergy * 100).toFixed(0)}%`,
            `**Recent avg sentiment**: ${(avgSentiment * 100).toFixed(0)}%`,
            `**Burnout alert**: ${trend.alert ? '⚠️ Yes' : '✅ No'}`,
          ];
          if (trend.alert) {
            const declining = Object.entries(trend.signals || {}).filter(([, v]) => v).map(([k]) => k);
            lines.push(`**Declining indicators**: ${declining.join(', ')}`);
          }
          return { output: lines.join('\n') };
        },
      }),

      zara_empathy_history: tool({
        description: 'Historical session emotion data for review',
        args: { limit: z.number().min(1).max(50).optional().describe('Sessions to show (default 10)') },
        async execute(args) {
          const sessions = store.readLines('sessions.jsonl', args.limit || 10);
          if (!sessions.length) return { output: 'No session history.' };
          const lines = sessions.reverse().map(s => {
            const date = s.startedAt?.split('T')[0] || '?';
            return `[${date}] E:${(s.energy * 100).toFixed(0)}% S:${(s.sentiment * 100).toFixed(0)}% F:${s.frustrationSignals} C:${s.correctionCount} (${s.messageCount} msgs)`;
          });
          return { output: lines.join('\n') };
        },
      }),

      // ── Growth Tracking Tools ──────────────────────────────────────────

      zara_growth_record: tool({
        description: 'Record a skill observation — track progression over time (1=novice, 5=expert). Auto-detects milestones on level jumps.',
        args: {
          skill: z.string().describe('Skill name (e.g. "go-concurrency", "system-design", "ai-agents")'),
          level: z.number().min(1).max(5).describe('Observed level (1=novice, 5=expert)'),
          context: z.string().optional().describe('What demonstrated this level'),
        },
        async execute(args) {
          if (!growthTracker) {
            const data = store.readJSON('growth.json', null);
            growthTracker = new GrowthTracker(data);
          }
          const result = growthTracker.recordObservation(args.skill.toLowerCase(), args.level, args.context);
          store.writeJSON('growth.json', { skills: growthTracker.skills, domains: growthTracker.domains, milestones: growthTracker.milestones });
          return { output: `Recorded ${args.skill}: level ${result.level} (confidence: ${(result.confidence * 100).toFixed(0)}%)` };
        },
      }),

      zara_growth_report: tool({
        description: 'Growth report with progress trajectory and milestones. Filter by skill name or see all.',
        args: { skill: z.string().optional().describe('Filter by skill name keyword') },
        async execute(args) {
          if (!growthTracker) {
            const data = store.readJSON('growth.json', null);
            growthTracker = new GrowthTracker(data);
          }
          const report = growthTracker.getReport(args.skill);
          if (!report) return { output: args.skill ? `No growth data for "${args.skill}".` : 'No growth data yet. Use zara_growth_record to start tracking.' };
          return { output: report };
        },
      }),
    },
  };
}
