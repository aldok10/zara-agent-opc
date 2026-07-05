---
type: fact
title: "Four-Phase Debugging Process"
---
# Four-Phase Debugging Process

## Phase 1: Root Cause Investigation

### Error Reading

- Read the FULL error message, not just the first line
- Stack traces read bottom-up (root cause is often deepest frame)
- Note the error type/class -- it narrows the search space
- Check if the error message contains a file path and line number

### Reproduction

```bash
# Reproduce with minimal setup
# 1. Isolate the failing case
# 2. Strip away unrelated code/config
# 3. Confirm the error is deterministic

# If intermittent: check for race conditions, timing, external dependencies
```

Key questions:
- When did this last work? What changed since then?
- Does it fail in all environments or just one?
- Is it data-dependent? Try different inputs.
- Is it timing-dependent? Try adding delays or running under load.

### Recent Changes

```bash
# What changed recently?
git log --oneline --since="3 days ago"
git diff HEAD~5 -- src/

# Who touched the failing file?
git log --oneline -10 -- path/to/failing/file

# What was deployed recently?
git log --oneline main..HEAD
```

### Evidence Gathering

- Collect logs from the failure window
- Check monitoring dashboards (error rates, latency spikes)
- Review recent deployments and config changes
- Check external dependency status pages

## Phase 2: Pattern Analysis

### Find Working Examples

```bash
# Find similar code that works
grep -r "similar_pattern" --include="*.ts" src/
# Compare working vs broken invocations
```

### Compare Working vs Broken

Create a diff between working and broken states:

| Aspect | Working | Broken |
|--------|---------|--------|
| Input data | ... | ... |
| Config | ... | ... |
| Environment | ... | ... |
| Dependencies | ... | ... |
| Timing | ... | ... |

### Identify Differences

Focus on what's DIFFERENT, not what's the same.
The bug lives in the delta between working and broken.

Common difference categories:
- Data shape (null field, missing key, wrong type)
- Environment (env var, service version, network)
- Timing (race condition, timeout, ordering)
- State (stale cache, corrupted state, resource exhaustion)

## Phase 3: Hypothesis Testing

### Rules

1. One hypothesis at a time -- never change two things
2. State your hypothesis BEFORE testing it
3. Design a test that could DISPROVE the hypothesis
4. If disproved, revert and try next hypothesis

### Minimal Test

```typescript
// Isolate the suspected cause
// BAD: changing 5 things and seeing if it works
// GOOD: adding one log statement to verify your assumption

console.log('Value at failure point:', JSON.stringify(suspectedVar));

// Or use a conditional breakpoint
// Or write a unit test that exercises the exact path
```

### Verification Checklist

- [ ] Hypothesis stated explicitly before testing
- [ ] Only one variable changed
- [ ] Result either confirms or eliminates hypothesis
- [ ] If confirmed: write a failing test that proves it
- [ ] If eliminated: revert change, try next hypothesis

## Phase 4: Implementation

### Write a Failing Test First

```typescript
// This test should FAIL with the bug present and PASS after the fix
test('handles null user.email without crashing', () => {
  const user = { id: '123', email: null };
  expect(() => processUser(user)).not.toThrow();
});
```

### Single Fix

- Fix ONLY the root cause
- Do not refactor surrounding code in the same change
- Keep the diff minimal and reviewable

### Verify

```bash
# 1. Failing test now passes
npm test -- --grep "handles null"

# 2. No regressions
npm test

# 3. Original reproduction case works
# (manually or via integration test)
```

## Red Flags: You're Doing It Wrong

- **Shotgun debugging**: changing random things hoping something works
- **Fix and forget**: not understanding WHY it works
- **Too many changes**: modifying multiple things between test runs
- **Ignoring the error**: adding try/catch without fixing the cause
- **Blame displacement**: "it must be the library/OS/hardware"
- **Tunnel vision**: stuck on one hypothesis for 30+ minutes

## Decision Tree: When to Escalate

```
Is the bug reproducible?
├── No → Add instrumentation, wait for next occurrence
│         If critical: add circuit breaker, escalate for pair debugging
└── Yes
    └── Do you understand the root cause?
        ├── No (after 3 hypotheses failed) → Pair with domain expert
        └── Yes
            └── Is the fix within your expertise?
                ├── No → Describe root cause, hand off to owner
                └── Yes → Implement fix (Phase 4)
```

When to escalate immediately:
- Security vulnerability (active exploitation)
- Data corruption (stop the bleeding first)
- Multiple services affected (coordination needed)
- Root cause in third-party code you cannot modify
