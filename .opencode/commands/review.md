---
description: Quick code review of recent changes (staged or last commit)
agent: code-reviewer
subtask: true
---

Review the recent changes for code quality, bugs, and improvements.

Check these sources for changes:
1. `git diff --staged` (if there are staged files)
2. Otherwise `git diff HEAD~1` (last commit)

Focus on:
- Bugs or logic errors
- Security concerns
- Readability issues
- Missing error handling
- Anything that would trip up the next developer

Be concise. One issue per line. Skip praise.

!`git diff --staged --stat`
!`git log --oneline -3`
