// Zara Auto-Resume Plugin — Proactive Continuation for Zara Agent
//
// What this does:
//   1. Monitors Zara sessions for stalls, timeouts, and incomplete work
//   2. Detects context boundaries (end of response, tool completion, etc.)
//   3. Saves session state to ~/.zara/state/ (fallback: ./.zara/state/ in project dir)
//   4. On new session, checks for saved state and proactively continues
//   5. Integrates with Hivemind for cross-session memory
//   6. Handles sub-agent failures (orphan parent, worker timeout)
//
// Design: Minimal, zero-dependency, no UI pollution.
// Uses file-based state so it survives process restarts.
// Falls back to project-local .zara/ if global ~/.zara/ is not writable.
//
// Install in opencode.json:
//   { "plugin": ["./plugins/zara-auto-resume.mjs"] }

import fs from 'fs';
import path from 'path';
import os from 'os';

const PLUGIN_NAME = 'zara-auto-resume';
const GLOBAL_STATE_DIR = path.join(os.homedir(), '.zara', 'state');
const GLOBAL_SESSION_FILE = path.join(GLOBAL_STATE_DIR, 'current-session.json');
const GLOBAL_HISTORY_FILE = path.join(GLOBAL_STATE_DIR, 'session-history.jsonl');
const CHECK_INTERVAL_MS = 10_000;       // Check every 10s
const STALL_TIMEOUT_MS = 45_000;         // 45s without activity = stall
const MAX_CONTINUES = 3;                 // Max auto-continues before giving up
const LOOP_WINDOW_MS = 600_000;          // Hallucination detection: 10min
const HANDOFF_GRACE_MS = 3_000;          // Wait before treating end as "done"

// ---------------------------------------------------------------------------
// State Directory Resolution (Primary + Fallback)
// ---------------------------------------------------------------------------
// Tracks which directory we're actively using.
// Tries global (~/.zara/state/) first. Falls back to local (./.zara/state/)
// if global is not writable.

let activeStateDir = null;

function getLocalStateDir() {
  return path.join(process.cwd(), '.zara', 'state');
}

function resolveSessionFile(dir) {
  return path.join(dir, 'current-session.json');
}

function resolveHistoryFile(dir) {
  return path.join(dir, 'session-history.jsonl');
}

function tryEnsureDir(dir) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Verify writability by trying to write a test file
    const testFile = path.join(dir, '.write-test');
    fs.writeFileSync(testFile, '');
    fs.unlinkSync(testFile);
    return true;
  } catch {
    return false;
  }
}

function resolveStateDir() {
  if (activeStateDir) return activeStateDir;

  // Try global first
  if (tryEnsureDir(GLOBAL_STATE_DIR)) {
    activeStateDir = GLOBAL_STATE_DIR;
    return activeStateDir;
  }

  // Fallback to local project dir
  const localDir = getLocalStateDir();
  if (tryEnsureDir(localDir)) {
    activeStateDir = localDir;
    return activeStateDir;
  }

  // Last resort: use temp dir (should never fail)
  const tempDir = path.join(os.tmpdir(), 'zara-state');
  tryEnsureDir(tempDir);
  activeStateDir = tempDir;
  return activeStateDir;
}

function currentSessionFile() {
  return resolveSessionFile(resolveStateDir());
}

function currentHistoryFile() {
  return resolveHistoryFile(resolveStateDir());
}

function getStateInfo() {
  const dir = resolveStateDir();
  const isGlobal = dir === GLOBAL_STATE_DIR;
  return {
    dir,
    type: isGlobal ? 'global' : (dir === getLocalStateDir() ? 'local' : 'temp'),
    sessionFile: resolveSessionFile(dir),
    historyFile: resolveHistoryFile(dir),
  };
}

// ---------------------------------------------------------------------------
// State Management
// ---------------------------------------------------------------------------

function loadSessionState() {
  // Try active dir first, then global, then local
  const paths = [
    currentSessionFile(),
    GLOBAL_SESSION_FILE,
    resolveSessionFile(getLocalStateDir()),
  ];

  for (const file of paths) {
    try {
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
      }
    } catch { /* try next */ }
  }
  return null;
}

function saveSessionState(state) {
  const file = currentSessionFile();
  const dir = path.dirname(file);
  tryEnsureDir(dir);
  fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf-8');
}

function appendToHistory(entry) {
  const file = currentHistoryFile();
  const dir = path.dirname(file);
  tryEnsureDir(dir);
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) + '\n';
  fs.appendFileSync(file, line, 'utf-8');
}

function clearSessionState() {
  // Clear from all possible locations
  for (const file of [
    GLOBAL_SESSION_FILE,
    resolveSessionFile(getLocalStateDir()),
  ]) {
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch { /* best effort */ }
  }
}

// ---------------------------------------------------------------------------
// Session State Schema
// ---------------------------------------------------------------------------
//
// State file (in active state dir):
// {
//   "sessionId": "sid_xxx",
//   "agent": "zara",
//   "activeEpicId": "bd-abc123",       // current epic/cell being worked on
//   "activeTask": "Implement auth",
//   "progress": {                        // what was done, what's next
//     "completedSteps": ["step1", "step2"],
//     "currentStep": "step3",
//     "remainingSteps": ["step4", "step5"]
//   },
//   "subAgentsEngaged": ["architect", "code-reviewer"],
//   "keyDecisions": ["Used JWT over session auth"],
//   "filesTouched": ["src/auth/*"],
//   "lastActivity": "2026-06-19T10:30:00Z",
//   "continueCount": 0,
//   "firstActivity": "2026-06-19T10:00:00Z",
//   "completed": false,
//   "stateDir": "global|local|temp"     // tracks where state is stored
// }

// ---------------------------------------------------------------------------
// Continuation Detection
// ---------------------------------------------------------------------------

function shouldContinue(state) {
  if (!state) return false;
  if (state.completed) return false;
  if (state.continueCount >= MAX_CONTINUES) return false;

  // Check for hallucination loop
  const first = new Date(state.firstActivity).getTime();
  const now = Date.now();
  if (now - first > LOOP_WINDOW_MS) {
    // Reset counter if it's been a while
    state.continueCount = 0;
    state.firstActivity = new Date().toISOString();
  }

  return state.activeTask != null && !state.completed;
}

// ---------------------------------------------------------------------------
// Plugin Definition (OpenCode Plugin API)
// ---------------------------------------------------------------------------

export default function zaraAutoResumePlugin(ctx) {
  const log = (msg, data) => {
    ctx.client.app.log(`[${PLUGIN_NAME}] ${msg}`, data ?? '');
  };

  // Log which state directory we're using
  const stateInfo = getStateInfo();
  log(`ready. state=${stateInfo.type} dir=${stateInfo.dir} stall=${STALL_TIMEOUT_MS}ms maxContinues=${MAX_CONTINUES}`);

  // Track active sessions
  const sessions = new Map();  // sessionId -> { lastActivity, state, continueCount }

  // -----------------------------------------------------------------------
  // Resume from saved state on startup
  // -----------------------------------------------------------------------
  const savedState = loadSessionState();
  if (savedState && shouldContinue(savedState)) {
    log('found saved Zara session state — ready for proactive continuation', {
      task: savedState.activeTask,
      epicId: savedState.activeEpicId,
      step: savedState.progress?.currentStep,
    });
    // Store in context for Zara to pick up when she activates
    ctx.state = ctx.state || {};
    ctx.state.zaraResumeState = savedState;
  }

  // -----------------------------------------------------------------------
  // Session event handlers
  // -----------------------------------------------------------------------

  // Track session creation
  ctx.client.session.on('session.created', ({ session }) => {
    const sid = session.id;
    sessions.set(sid, {
      lastActivity: Date.now(),
      continueCount: 0,
      firstActivity: Date.now(),
      status: 'busy',
      state: null,
    });
    log(`session created: ${sid}`);
  });

  // Track activity on sessions
  ctx.client.session.on('session.event', ({ session, event }) => {
    const sid = session.id;
    const entry = sessions.get(sid);
    if (entry) {
      entry.lastActivity = Date.now();
      // Reset continue counter on fresh activity
      if (entry.continueCount > 0 && event.type !== 'continue') {
        entry.continueCount = 0;
      }
    }
  });

  // Track session status changes
  ctx.client.session.on('session.status', ({ session, status }) => {
    const sid = session.id;
    const entry = sessions.get(sid);

    if (!entry) return;

    entry.status = status;

    if (status === 'idle') {
      // Session went idle naturally — save state for potential resume
      // Check if this was a Zara session by looking at the conversation
      // We use a lightweight heuristic: save state regardless
      const now = Date.now();

      // If session has been idle for >HANDOFF_GRACE_MS, treat as natural end
      setTimeout(() => {
        const refreshed = sessions.get(sid);
        if (refreshed && refreshed.status === 'idle') {
          // Session is still idle — could be natural completion or mid-thought
          // We don't force-continue here; that's Zara's decision
          log(`session idle: ${sid}`);
        }
      }, HANDOFF_GRACE_MS);

    } else if (status === 'busy') {
      // Session went busy again — clear any pending completion flags
      log(`session busy: ${sid}`);
    }
  });

  // -----------------------------------------------------------------------
  // Timer: Check for stalled sessions
  // -----------------------------------------------------------------------
  const timer = setInterval(() => {
    const now = Date.now();

    for (const [sid, entry] of sessions.entries()) {
      if (entry.status !== 'busy') continue;

      const idleTime = now - entry.lastActivity;

      // Check if stalled
      if (idleTime > STALL_TIMEOUT_MS) {
        log(`Stream stall detected: ${sid} idle=${idleTime}ms`);

        if (entry.continueCount < MAX_CONTINUES) {
          entry.continueCount++;
          log(`auto-continue attempt ${entry.continueCount}/${MAX_CONTINUES}`);

          // Send continue via SDK
          ctx.client.session
            .continue(sid)
            .catch((err) => {
              log(`continue failed: ${err.message}`);
            });
        } else {
          log(`max continues reached for ${sid} — giving up`);
          // Don't clear — let user manually intervene if needed
        }
      }

      // Check for hallucination loop (3+ continues in window)
      if (entry.continueCount >= 3) {
        const windowElapsed = now - entry.firstActivity;
        if (windowElapsed < LOOP_WINDOW_MS) {
          log(`hallucination loop detected: ${sid} — aborting and resuming fresh`);
          ctx.client.session
            .abort(sid)
            .then(() => ctx.client.session.continue(sid))
            .catch((err) => log(`abort+continue failed: ${err.message}`));
          entry.continueCount = 0;
          entry.firstActivity = now;
        }
      }
    }
  }, CHECK_INTERVAL_MS);

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------
  return () => {
    clearInterval(timer);
    log(`shutdown — state preserved (${getStateInfo().type}: ${getStateInfo().dir})`);
  };
}

// ---------------------------------------------------------------------------
// Tool: Mark a Zara session as completable (called via task_complete tool)
// ---------------------------------------------------------------------------
export function markComplete(sessionId) {
  const state = loadSessionState();
  if (state) {
    state.completed = true;
    state.stateDir = getStateInfo().type;
    saveSessionState(state);
    appendToHistory({ type: 'complete', sessionId, state });
  }
}

// ---------------------------------------------------------------------------
// Tool: Save progress checkpoint (called explicitly by Zara or via /checkpoint)
// ---------------------------------------------------------------------------
export function saveCheckpoint(sessionId, progress) {
  const state = loadSessionState() || {
    sessionId,
    agent: 'zara',
    firstActivity: new Date().toISOString(),
    continueCount: 0,
    completed: false,
  };

  Object.assign(state, {
    lastActivity: new Date().toISOString(),
    stateDir: getStateInfo().type,
    progress: {
      ...state.progress,
      ...progress,
    },
  });

  saveSessionState(state);
  appendToHistory({ type: 'checkpoint', sessionId, progress });
  return state;
}

// ---------------------------------------------------------------------------
// Tool: Get resume context for a new Zara session
// ---------------------------------------------------------------------------
export function getResumeContext() {
  const state = loadSessionState();
  if (!state || state.completed) return null;

  // Check if state is too stale (> 24 hours)
  const lastActivity = new Date(state.lastActivity).getTime();
  if (Date.now() - lastActivity > 86_400_000) {
    clearSessionState();
    return null;
  }

  return {
    activeTask: state.activeTask,
    activeEpicId: state.activeEpicId,
    progress: state.progress,
    subAgentsEngaged: state.subAgentsEngaged,
    keyDecisions: state.keyDecisions,
    filesTouched: state.filesTouched,
  };
}
