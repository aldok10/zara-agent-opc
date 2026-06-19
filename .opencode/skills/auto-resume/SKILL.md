---
name: auto-resume
description: Use when Zara activates to check for saved session state — detects incomplete work and proactively offers to resume without user prompting
tags:
  - zara
  - auto-resume
  - continuation
  - session-management
---

# Skill: Auto-Resume for Zara

**Trigger**: On Zara activation or `/resume` command
**Tags**: zara, auto-resume, continuation

## Context

Zara saves session state to track ongoing work across sessions.
State is stored in this priority order:

1. **Global**: `~/.zara/state/current-session.json` — shared across all projects
2. **Local**: `{project_root}/.zara/state/current-session.json` — project-specific fallback
3. **Temp**: System temp directory — last resort if both are unavailable

The `plugins/zara-auto-resume.mjs` plugin handles auto-detection and fallback.
This skill tells Zara how to use that saved state.

## Steps

### 1. Check for Saved State

```javascript
// Check where state might be stored
const path = require('path');
const os = require('os');
const fs = require('fs');

const possiblePaths = [
  path.join(os.homedir(), '.zara', 'state', 'current-session.json'),
  path.join(process.cwd(), '.zara', 'state', 'current-session.json'),
];

for (const stateFile of possiblePaths) {
  if (fs.existsSync(stateFile)) {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    if (!state.completed && state.activeTask) {
      // Proceed to resume
      break;
    }
  }
}
```

### 2. Announce Context

Present a clear summary to the user:
```
I see we were working on [activeTask] last time.
Completed: [completedSteps]
Current step: [currentStep]
Key decisions: [summary]

Shall I pick up where I left off?
```

### 3. Handle User Response

| Response | Action |
|----------|--------|
| Yes / Continue | Restore decisions, re-engage sub-agents, continue from currentStep |
| No / Fresh start | Clear saved state, start new task |
| Silent (no response) | Wait 10s, then auto-continue proactively |

### 4. Save Checkpoints

As work progresses, save intermediate state:
```javascript
// Update current step, decisions, files touched
saveSessionState({
  ...currentState,
  progress: {
    completedSteps: [...],
    currentStep: '...',
    remainingSteps: [...]
  },
  lastActivity: new Date().toISOString()
});
```

### 5. Complete Work

When work is finished:
```javascript
saveSessionState({ ...state, completed: true });
// Or call markComplete(sessionId) from the plugin
```

## Verification

- After activation, Zara should announce any saved state within first response
- State file should update as progress is made
- `/handoff` should save complete handoff state
- Plugin should auto-continue stalled sessions

## Files

- `plugins/zara-auto-resume.mjs` — Plugin that monitors sessions
- `~/.zara/state/current-session.json` — Global session state (primary)
- `./.zara/state/current-session.json` — Local session state (fallback)
- `~/.zara/state/session-history.jsonl` — Session history
- `.opencode/commands/resume.md` — Resume command prompt
- `.opencode/commands/handoff.md` — Handoff command prompt
