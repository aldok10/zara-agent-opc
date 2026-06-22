---
description: End session with full state capture for seamless continuation
---

# Handoff — Full Session Capture

Ends the session with complete state: MCP memory, git state, file changes, open threads.

## Process

Run these in order:

### 1. Capture Git State
- `git branch --show-current` — what branch
- `git status --short` — uncommitted changes
- `git log --oneline -5` — recent work
- `git stash list` — any stashed work
- `glob .opencode/commands/*.md` — commands changed (if applicable)
- Build a picture of files touched this session

### 2. Capture Session State

| Field | How | Example |
|-------|-----|---------|
| `activeTask` | From current context | "Refactoring auth middleware" |
| `completedSteps` | From session context | "Extracted JWT logic, added tests" |
| `currentStep` | What was next | "Wire into router" |
| `remainingSteps` | Still outstanding | "Integration test, docs" |
| `keyDecisions` | `memory_recall(type:"decision")` | "Moved to Bearer token" |
| `filesTouched` | From git + glob | "auth.go, auth_test.go" |
| `learnings` | Key insights this session | "Don't use stdlib parse for JWTs" |
| `blockers` | Anything blocking | "Awaiting API key from security" |
| `openThreads` | From memory | "Follow up on rate limiting design" |

### 3. Persist to Memory
1. `memory_episode(event: "Session ended: [activeTask]", outcome: "partial")` with tags `session`, `handoff`
2. `memory_learn(type: "fact", key: "session_branch", value: "[branch]")`
3. `memory_learn(type: "fact", key: "session_active_task", value: "[activeTask]")`
4. `memory_learn(type: "fact", key: "session_next_step", value: "[currentStep]")`
5. `memory_learn(type: "fact", key: "session_files", value: "[filesTouched]")`
6. `memory_learn(type: "fact", key: "session_blockers", value: "[blockers]")`
7. For each open thread: `memory_learn(type: "fact", key: "thread_[topic]", value: "[detail]")`

### 4. Reflect & Consolidate
1. `reflect(task: "[activeTask]", outcome: "partial", pattern: key learnings)`
2. `memory_consolidate` — clean up duplicates

### 5. Close Session
1. `session_log(action: "end", context: "[activeTask]")`
2. Present a clean continuation summary
