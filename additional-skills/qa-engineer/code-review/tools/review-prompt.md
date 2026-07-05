---
type: tool
title: "Structured Code Review Prompt"
---

# Structured Code Review Prompt

## Purpose
Perform a structured code review with consistent quality and actionable feedback.

## Inputs Required
- Code diff or file(s) to review
- PR description / context of the change
- Language and framework
- Any specific concerns to focus on

## Review Process

### Step 1: Understand Intent
Before looking at code:
- What problem is this solving?
- What's the expected behavior change?
- What tests should exist?

### Step 2: High-Level Assessment
- Is the approach appropriate for the problem?
- Is the scope right (not too big, not incomplete)?
- Does it fit the existing architecture?

### Step 3: Detailed Review

#### Correctness
- [ ] Logic handles happy path correctly
- [ ] Edge cases: null, empty, zero, negative, overflow
- [ ] Error cases: network, timeout, permission, not-found
- [ ] Concurrency: race conditions, deadlocks, stale reads
- [ ] State transitions: valid sequences, invalid prevented

#### Security
- [ ] Input validated (type, range, format)
- [ ] Output encoded/sanitized
- [ ] Queries parameterized
- [ ] Auth checked on protected operations
- [ ] No secrets in code
- [ ] File paths validated (no traversal)

#### Performance
- [ ] No N+1 queries
- [ ] Unbounded collections paginated
- [ ] Heavy operations async where possible
- [ ] Appropriate indexes for new queries
- [ ] No blocking calls in hot paths

#### Maintainability
- [ ] Names reveal intent
- [ ] Functions do one thing
- [ ] No code duplication introduced
- [ ] Tests cover new behavior
- [ ] Error messages are actionable

### Step 4: Formulate Feedback

#### Comment Template
```
[SEVERITY] [CATEGORY]: [summary]

[explanation of the concern]

[suggestion or question]

Example:
🔴 BLOCKING - Security: SQL injection risk
The query uses string interpolation with user input.
Suggest: Use parameterized query: db.query('SELECT * FROM users WHERE id = $1', [userId])
```

#### Severity Levels
- 🔴 **Blocking**: Must fix before merge (bugs, security, data loss)
- 🟡 **Concern**: Should fix, but can merge with follow-up issue
- 🟢 **Suggestion**: Take it or leave it (style, minor optimization)
- 💬 **Question**: Seeking understanding, not requesting change

### Step 5: Summary

```markdown
## Review Summary

### Overall Assessment: [APPROVE / REQUEST CHANGES / COMMENT]

### Strengths
- [What's done well]

### Blocking Issues ([count])
1. [Issue + location]

### Suggestions ([count])
1. [Suggestion + rationale]

### Questions
1. [Clarification needed]

### Testing Gaps
- [Missing test scenarios]
```

## Output Format

```markdown
## Code Review: [PR/File name]

### Context Understanding
[1-2 sentences: what this change does]

### Findings

#### Critical (must fix)
| # | File:Line | Issue | Suggestion |
|---|-----------|-------|------------|

#### Important (should fix)
| # | File:Line | Issue | Suggestion |
|---|-----------|-------|------------|

#### Nits (optional)
| # | File:Line | Issue | Suggestion |
|---|-----------|-------|------------|

### Verdict: [APPROVE / CHANGES REQUESTED]
[1 sentence rationale]
```
