// Zara HITL — Human In The Loop for AI agents
//
// What this does:
//   1. Approval Gates — Before risky operations, asks for human confirmation
//   2. QRSPI Workflow — Questions → Research → Structure → Plan → Implement
//   3. Task Context — Tracks what's happening, why, what's at stake
//   4. Human Escalation — When stuck, escalate to human with context
//   5. Confidence Scoring — Rate confidence before proceeding
//
// Design: Zero external dependencies. File-based state.
// Integrates with zara-auto-resume for cross-session continuity.
//
// Install in opencode.json:
//   { "plugin": ["./plugins/zara-hitl.mjs"] }

import fs from 'fs';
import path from 'path';
import os from 'os';

const HITL_DIR = path.join(os.homedir(), '.zara', 'hitl');
const GATES_FILE = path.join(HITL_DIR, 'gates.json');
const WORKFLOWS_FILE = path.join(HITL_DIR, 'workflows.json');
const DECISIONS_FILE = path.join(HITL_DIR, 'decisions.jsonl');

function ensure() {
  if (!fs.existsSync(HITL_DIR)) fs.mkdirSync(HITL_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Approval Levels
// ---------------------------------------------------------------------------
const APPROVAL_LEVELS = {
  // Safe operations — no approval needed
  safe: {
    label: 'Safe',
    level: 0,
    autoApprove: true,
  },
  // Confirm — one-line confirmation
  confirm: {
    label: 'Confirm',
    level: 1,
    autoApprove: false,
    prompt: 'I need a quick confirm on this:',
  },
  // Review — show details before allowing
  review: {
    label: 'Review',
    level: 2,
    autoApprove: false,
    prompt: 'Please review the following before I proceed:',
  },
  // Escalate — hand off to human
  escalate: {
    label: 'Escalate',
    level: 3,
    autoApprove: false,
    prompt: 'I need your input on this decision:',
  },
};

const RISK_MAP = {
  // Map operations to approval levels
  destructive: 'review',          // rm -rf, DROP TABLE, etc.
  production: 'review',           // Production changes
  permission: 'confirm',          // chmod, chown, sudo
  bulk: 'confirm',                // Mass operations
  config: 'confirm',              // Config changes
  dependency: 'confirm',          // Adding/removing deps
  auth: 'review',                 // Auth changes
  data_loss: 'escalate',          // Potential data loss
  architectural: 'review',        // Big architectural changes
  security: 'review',             // Security-related
  unknown: 'confirm',             // Default for unclassified risky ops
};

// ---------------------------------------------------------------------------
// QRSPI Workflow Phases
// ---------------------------------------------------------------------------
const QRSPI_PHASES = {
  questions: {
    label: 'Questions',
    order: 1,
    description: 'Generate clarifying questions before any code is written',
    checklist: [
      'What is the actual problem?',
      'Who is the user?',
      'What are the constraints?',
      'What does success look like?',
      'What is NOT in scope?',
    ],
  },
  research: {
    label: 'Research',
    order: 2,
    description: 'Map the codebase, dependencies, and surrounding patterns',
    checklist: [
      'What existing code touches this area?',
      'What patterns are already established?',
      'What dependencies are involved?',
      'What tests exist?',
    ],
  },
  structure: {
    label: 'Structure',
    order: 3,
    description: 'Break into phased, verifiable implementation steps',
    checklist: [
      'What are the smallest independent pieces?',
      'What order must they be done in?',
      'How do I verify each piece?',
      'What can fail?',
    ],
  },
  plan: {
    label: 'Plan',
    order: 4,
    description: 'Detailed plan with file paths, test cases, acceptance criteria',
    checklist: [
      'Which files need to change?',
      'What are the test cases?',
      'What are the acceptance criteria?',
      'What is the rollback plan?',
    ],
  },
  implement: {
    label: 'Implement',
    order: 5,
    description: 'Execute with continuous feedback and verification',
    checklist: [
      'Implement one piece at a time',
      'Verify each piece',
      'Commit when stable',
      'Review holistically at the end',
    ],
  },
};

// ---------------------------------------------------------------------------
// 1. Approval Gates API
// ---------------------------------------------------------------------------
function requestApproval(gate) {
  ensure();

  const gates = loadGates();
  const entry = {
    id: `gate-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ts: new Date().toISOString(),
    status: 'pending',
    ...gate,
    level: gate.level || RISK_MAP[gate.risk] || 'confirm',
  };

  gates.push(entry);
  saveGates(gates);
  logDecision('approval_requested', entry);
  return entry;
}

function approveGate(gateId, reason) {
  const gates = loadGates();
  const gate = gates.find(g => g.id === gateId);
  if (!gate) return { ok: false, error: `Gate not found: ${gateId}` };

  gate.status = 'approved';
  gate.resolvedAt = new Date().toISOString();
  gate.reason = reason || 'Approved by user';
  saveGates(gates);
  logDecision('gate_approved', { gateId, reason });
  return { ok: true, gate };
}

function rejectGate(gateId, reason) {
  const gates = loadGates();
  const gate = gates.find(g => g.id === gateId);
  if (!gate) return { ok: false, error: `Gate not found: ${gateId}` };

  gate.status = 'rejected';
  gate.resolvedAt = new Date().toISOString();
  gate.reason = reason || 'Rejected by user';
  saveGates(gates);
  logDecision('gate_rejected', { gateId, reason });
  return { ok: true, gate };
}

function getPendingGates() {
  return loadGates().filter(g => g.status === 'pending');
}

// ---------------------------------------------------------------------------
// 2. QRSPI Workflow API
// ---------------------------------------------------------------------------
function createWorkflow(task, phase) {
  ensure();

  const workflows = loadWorkflows();
  const wf = {
    id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ts: new Date().toISOString(),
    task,
    currentPhase: phase || 'questions',
    completedPhases: [],
    artifacts: [],
    decisions: [],
    status: 'active',
  };

  workflows.push(wf);
  saveWorkflows(workflows);
  return wf;
}

function advancePhase(workflowId) {
  const workflows = loadWorkflows();
  const wf = workflows.find(w => w.id === workflowId);
  if (!wf) return { ok: false, error: `Workflow not found: ${workflowId}` };

  const currentOrder = QRSPI_PHASES[wf.currentPhase]?.order || 0;
  const nextOrder = currentOrder + 1;
  const nextPhase = Object.entries(QRSPI_PHASES).find(([, v]) => v.order === nextOrder);

  if (!nextPhase) {
    wf.status = 'completed';
    saveWorkflows(workflows);
    logDecision('workflow_completed', { workflowId });
    return { ok: true, workflow: wf, completed: true };
  }

  wf.completedPhases.push(wf.currentPhase);
  wf.currentPhase = nextPhase[0];
  saveWorkflows(workflows);
  logDecision('phase_advanced', { workflowId, from: wf.completedPhases.at(-1), to: wf.currentPhase });
  return { ok: true, workflow: wf };
}

function addArtifact(workflowId, artifact) {
  const workflows = loadWorkflows();
  const wf = workflows.find(w => w.id === workflowId);
  if (!wf) return { ok: false, error: `Workflow not found: ${workflowId}` };

  wf.artifacts.push({
    id: `art-${Date.now()}`,
    ts: new Date().toISOString(),
    ...artifact,
  });
  saveWorkflows(workflows);
  return { ok: true, artifact: wf.artifacts.at(-1) };
}

function getCurrentPhaseInfo(workflowId) {
  const workflows = loadWorkflows();
  const wf = workflows.find(w => w.id === workflowId);
  if (!wf) return null;

  const phase = QRSPI_PHASES[wf.currentPhase];
  return {
    workflowId,
    task: wf.task,
    currentPhase: wf.currentPhase,
    phaseLabel: phase?.label,
    phaseDescription: phase?.description,
    checklist: phase?.checklist || [],
    completedPhases: wf.completedPhases.map(p => QRSPI_PHASES[p]?.label || p),
    artifacts: wf.artifacts,
    status: wf.status,
  };
}

// ---------------------------------------------------------------------------
// 3. Human Escalation
// ---------------------------------------------------------------------------
function escalate(issue) {
  ensure();

  const escalation = {
    id: `esc-${Date.now()}`,
    ts: new Date().toISOString(),
    type: issue.type || 'stuck',           // stuck, ambiguous, blocked, error
    context: issue.context || '',
    question: issue.question || 'What should I do?',
    options: issue.options || [],           // Suggested options for resolution
    severity: issue.severity || 'medium',   // low, medium, high, critical
    status: 'open',
    resolvedAt: null,
    resolution: null,
  };

  logDecision('escalation', escalation);
  return escalation;
}

// ---------------------------------------------------------------------------
// 4. Confidence Scoring
// ---------------------------------------------------------------------------
function rateConfidence(factors) {
  // factors: { codeQuality, understandingChange, testCoverage, riskLevel, familiarity }
  const weights = {
    codeQuality: 0.25,
    understandingChange: 0.25,
    testCoverage: 0.2,
    riskLevel: 0.2,        // inverted: low risk = high confidence
    familiarity: 0.1,
  };

  let score = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const val = factors[key] || 0.5;
    if (key === 'riskLevel') {
      score += (1 - val) * weight;
    } else {
      score += val * weight;
    }
  }

  const confidence = Math.round(score * 100);

  return {
    confidence,
    level: confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low',
    action: confidence >= 80 ? 'proceed' : confidence >= 50 ? 'review_first' : 'do_not_proceed',
    factors,
  };
}

// ---------------------------------------------------------------------------
// 5. Decision Logging
// ---------------------------------------------------------------------------
function logDecision(type, data) {
  ensure();
  const line = JSON.stringify({ type, ts: new Date().toISOString(), data }) + '\n';
  fs.appendFileSync(DECISIONS_FILE, line, 'utf-8');
}

function getDecisionHistory(limit = 20) {
  try {
    if (!fs.existsSync(DECISIONS_FILE)) return [];
    const lines = fs.readFileSync(DECISIONS_FILE, 'utf-8').trim().split('\n');
    return lines.slice(-limit).map(l => JSON.parse(l)).reverse();
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------
function loadGates() {
  ensure();
  try {
    if (fs.existsSync(GATES_FILE)) return JSON.parse(fs.readFileSync(GATES_FILE, 'utf-8'));
  } catch {}
  return [];
}

function saveGates(gates) {
  ensure();
  fs.writeFileSync(GATES_FILE, JSON.stringify(gates, null, 2), 'utf-8');
}

function loadWorkflows() {
  ensure();
  try {
    if (fs.existsSync(WORKFLOWS_FILE)) return JSON.parse(fs.readFileSync(WORKFLOWS_FILE, 'utf-8'));
  } catch {}
  return [];
}

function saveWorkflows(workflows) {
  ensure();
  fs.writeFileSync(WORKFLOWS_FILE, JSON.stringify(workflows, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------
export default function zaraHitlPlugin(ctx) {
  const log = (msg, data) => {
    ctx.client.app.log(`[zara-hitl] ${msg}`, data ?? '');
  };

  // Restore pending gates and active workflows on startup
  const pendingGates = getPendingGates();
  if (pendingGates.length > 0) {
    log(`restored ${pendingGates.length} pending approval gates`, {
      gates: pendingGates.map(g => ({ id: g.id, action: g.action, risk: g.risk })),
    });
  }

  const workflows = loadWorkflows();
  const active = workflows.filter(w => w.status === 'active');
  if (active.length > 0) {
    log(`restored ${active.length} active workflows`, {
      workflows: active.map(w => ({ id: w.id, task: w.task, phase: w.currentPhase })),
    });
  }

  log('ready');

  return () => {
    log('shutdown');
  };
}

// ---------------------------------------------------------------------------
// Named exports for direct tool calling
// ---------------------------------------------------------------------------
export {
  APPROVAL_LEVELS,
  RISK_MAP,
  QRSPI_PHASES,
  requestApproval,
  approveGate,
  rejectGate,
  getPendingGates,
  createWorkflow,
  advancePhase,
  addArtifact,
  getCurrentPhaseInfo,
  escalate,
  rateConfidence,
  getDecisionHistory,
};
