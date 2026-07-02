// Empathy module — Longitudinal emotional tracking, sentiment analysis, burnout detection
// Tracks user energy, sentiment, frustration signals across sessions for adaptive interaction

import { FileStore, contextPressure } from '../infra/store.mjs';
import { tool } from '@opencode-ai/plugin';
import { FlowDetector } from './flow-detector.mjs';

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
}

// ─── Module Export ───────────────────────────────────────────────────────────

export default function createEmpathy({ client, directory } = {}) {
  const store = new FileStore('empathy');
  const trendAnalyzer = new TrendAnalyzer();
  const flowDetector = new FlowDetector();
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

      flowDetector.recordMessage();
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
      // Shed empathy injection under high pressure (>70%)
      if (contextPressure.level > 0.70) return messages;
      // Flow-state protection: suppress proactive nudges when user is in deep flow
      if (flowDetector.isInFlow()) return messages;

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

    onCompact() {
      if (!currentSession) return null;
      const e = (currentSession.energy * 100).toFixed(0);
      const s = (currentSession.sentiment * 100).toFixed(0);
      return { context: `[Empathy state] energy=${e}% sentiment=${s}% frustration=${currentSession.frustrationSignals} msgs=${currentSession.messageCount}` };
    },

    dispose() {},

    tools: {
      zara_empathy_status: tool({
        description: 'Current emotional state.',
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

      // ── Growth Tracking Tools ──────────────────────────────────────────

      zara_growth_record: tool({
        description: 'Record skill observation (1-5).',
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

    },
  };
}
