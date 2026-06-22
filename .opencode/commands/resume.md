---
description: Resume previous session - full context reconstruction from memory, git, and metrics
---

# Resume - Full Context Restoration

Reconstructs previous session state from every available source.

## Check All Sources

Run in parallel:

### 1. Memory Layer
- `memory_recall(query: "session handoff")` - session episodes
- `memory_recall(query: "session_active_task")` - what was in progress
- `memory_recall(query: "session_next_step")` - what's next
- `memory_recall(query: "session_branch")` - git branch
- `memory_recall(query: "session_files")` - files touched
- `memory_recall(query: "session_blockers")` - blockers
- `memory_recall(query: "thread")` - open threads/follow-ups
- `memory_recall(query: "current_focus")` - focus state
- `memory_recall(query: "current_goal")` - goal state
- `memory_recall(type: "decision")` - key decisions from last session

### 2. Git Layer
- `git branch --show-current` - confirm branch
- `git log --oneline -10` - recent commits
- `git diff --stat` - uncommitted changes
- `git stash list` - stashed work
- `git status --short` - working tree state

### 3. Metrics Layer
- `metrics_today` - usage patterns, what got done
- `zara_evolve_status` - learning progress, pattern scores

## Reconstruct & Present

Build a unified picture:

```
## Session Resume

**Last session**: [date/time]
**Branch**: [branch]
**Was working on**: [activeTask]
**Completed**: [steps done]
**Next up**: [nextStep]
**Blockers**: [blockers]

**Open threads**:
• [thread 1]
• [thread 2]

**Recent git activity**:
• [commit 1]
• [commit 2]
• [uncommitted: file1.go, file2.go]

**Shall I continue where we left off?**
```

## Optional: Auto-Restore

If user confirms continuation:
1. `skill("skill-gate")` - reload route table
2. `goal(action: "set", condition: "[activeTask]")` - re-set goal
3. `session_log(action: "start", context: "[activeTask]")` - track new session
4. `todowrite` - re-create step list from memory
5. If there were active loops: `loop start` - restore reminders
6. If relevant skill is known: `skill("[relevant-skill]")` - reload domain expertise
