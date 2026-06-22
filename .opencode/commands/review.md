---
description: Code review - staged or last commit, grounded in knowledge, auto-bug-security routing
agent: code-reviewer
subtask: true
---

Review the recent changes for code quality, bugs, security, and maintainability.

## Pre-flight

1. `skill("code-review")` - load review workflow
2. `knowledge_passage(query: "code review checklist common bugs")` - ground in proven patterns

## Sources

Check these for changes (in priority order):
1. `git diff --staged --stat` - staged changes
2. `git diff HEAD~1 --stat` - last commit if nothing staged
3. `git log --oneline -5` - recent context

`!git diff --staged --stat`
`!git log --oneline -3`

## Review Criteria

Go beyond surface level. For each change area:

### Logic & Correctness
- Does the change handle edge cases? Empty states, nil, zero, overflow?
- Are there off-by-one errors, race conditions, deadlocks?
- Does error handling actually handle, not just return?

### Security (Auto-Route to @shield)
If changes touch any of: auth, crypto, input validation, SQL, file I/O, network, secrets, permissions, tokens:
→ `task(subagent_type: "security-reviewer", prompt: "Security review of changes in [files]:\n` + `git diff --staged"`)`
Wait for security review and include findings in final report.

### Maintainability
- Would a new team member understand this in 5 minutes?
- Are there magic numbers, deep nesting, side effects?
- Is there duplicated logic that could be unified?

### Performance
- Are there N+1 queries, unnecessary allocations, hot loops?
- Is caching used where appropriate?

### Test Coverage
- Are there tests for the new code?
- Do existing tests still pass? (Check: `!go test ./...` or equivalent)

## Output Format

```
## Review: [branch/commit]

### 🔴 Critical (fix before merge)
- <issue>

### 🟡 Warning (should fix)
- <issue>

### 🔵 Suggestion (nice to have)
- <issue>

### Security Review (if dispatched)
- <findings from @shield>
```

Be concise. One issue per line. Skip praise. Focus on what matters.
