// Phase Gating — enforces discuss→plan→execute→review for complex tasks
// Persistent state in ~/.zara/flow/phases.json

import fs from 'fs';
import path from 'path';
import { HOME, ensure, atomicWrite } from '../infra/store.mjs';

const PHASES_FILE = path.join(HOME, 'flow', 'phases.json');
const PHASES = ['discuss', 'plan', 'execute', 'review'];

function loadPhases() {
  try { return JSON.parse(fs.readFileSync(PHASES_FILE, 'utf-8')); }
  catch { return { active: null, phase: null, task: null, history: [] }; }
}

function savePhases(data) {
  ensure(path.dirname(PHASES_FILE));
  atomicWrite(PHASES_FILE, JSON.stringify(data, null, 2));
}

/** Start a gated task */
export function startGated(taskName) {
  const state = loadPhases();
  state.active = true;
  state.phase = 'discuss';
  state.task = taskName;
  state.startedAt = new Date().toISOString();
  savePhases(state);
  return state;
}

/** Advance to next phase (requires explicit call) */
export function advancePhase() {
  const state = loadPhases();
  if (!state.active) return null;
  const idx = PHASES.indexOf(state.phase);
  if (idx >= PHASES.length - 1) {
    state.history.push({ task: state.task, completedAt: new Date().toISOString() });
    state.active = false;
    state.phase = null;
    state.task = null;
  } else {
    state.phase = PHASES[idx + 1];
  }
  savePhases(state);
  return state;
}

/** Get current phase state */
export function currentPhase() {
  return loadPhases();
}

/** Check if action is allowed in current phase */
export function isAllowed(action) {
  const state = loadPhases();
  if (!state.active) return true;
  if ((state.phase === 'discuss' || state.phase === 'plan') && (action === 'edit' || action === 'write')) {
    return false;
  }
  return true;
}

/** Clear gating (abort or override) */
export function clearGate() {
  savePhases({ active: null, phase: null, task: null, history: loadPhases().history || [] });
}
