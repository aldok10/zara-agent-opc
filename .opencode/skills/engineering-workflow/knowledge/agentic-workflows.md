---
type: fact
title: "Agentic Workflows"
---
# Agentic Workflows

## Plan-Code-Verify Loop

The fundamental cycle for AI-assisted development:

1. **Plan** -- Understand the problem, read relevant code, identify the approach
2. **Code** -- Implement the change (edit files, write new code)
3. **Verify** -- Run tests, lint, typecheck. Confirm behavior matches intent.

Never skip step 3. Never declare done without verification evidence.
If verification fails, return to step 1 with new information.

**Quality bar for each phase:**
- Plan: Can state the approach in one testable sentence
- Code: Change is minimal and follows existing patterns
- Verify: Tests pass, linter clean, behavior confirmed

## Context Engineering for Agent Dispatch

Effective dispatch means giving a sub-agent exactly what it needs -- no more.

**Context budget: <1000 tokens per dispatch.** Include:
- Task: One sentence goal
- Context: Relevant file paths, function names, constraints
- Acceptance: How to know it's done (testable criteria)
- Return format: What structure to return

**What to include:**
- Specific file paths (not "find the relevant files")
- Function signatures or type definitions when relevant
- Constraints (don't modify X, must be backward-compatible)
- Expected output format

**What to exclude:**
- Conversation history
- Unrelated context from earlier in the session
- Implementation details of other systems
- Your reasoning about why this task exists

## Loop Engineering Patterns

### Gather > Act > Verify > Repeat

The core loop for any non-trivial task:

```
while not done:
    gather()   # Read code, search, understand current state
    act()      # Make one change or small batch of related changes
    verify()   # Run tests, check output, confirm correctness
    assess()   # Are we done? What's next?
```

**Rules:**
- Each iteration should be independently verifiable
- If verify fails twice on the same approach, switch strategies
- Never batch more than 3-4 related changes before verifying
- After 8+ tool calls without user input, re-read the original request

### Convergence Pattern

For tasks with clear end states:

```
target = define_success_criteria()
while distance(current, target) > threshold:
    identify_gap()
    close_gap()
    measure_progress()
```

### Exploration Pattern

For tasks requiring discovery:

```
hypotheses = generate_candidates()
for h in prioritized(hypotheses):
    evidence = test_hypothesis(h)
    if evidence.confirms(h):
        return build_on(h)
    else:
        refine(hypotheses, evidence)
```

## Multi-Agent Orchestration

### When to dispatch sub-agents:
- Task has 3+ independent sub-problems
- Sub-problem requires deep context that would pollute main thread
- Parallel execution would save time
- Task requires a specialized skill set

### When to stay inline:
- Single-file edit
- One grep/read needed
- Faster than formulating dispatch
- Context is already loaded

### Dispatch patterns:

**Parallel fan-out:** Multiple independent tasks dispatched simultaneously.
Wait for all to complete. Combine results.

**Sequential pipeline:** Output of one agent feeds the next.
Each agent has a narrow, well-defined role.

**Competitive:** Same task given to 2+ agents with different approaches.
Take the best result. Use for high-stakes decisions.

### Agent budgets:
- Analysts (scout, atlas, lens, shield): 15 steps max
- Hive (parallel coordinator): 20 steps max
- Forge (implementation): 30 steps max
- Approaching budget limit: wrap up partial results + BUDGET_EXHAUSTED

## Verification Before Completion

Never declare a task done without evidence. Types of verification:

**Automated:**
- Tests pass (unit, integration, e2e as appropriate)
- Linter clean
- Type checker passes
- Build succeeds

**Manual confirmation:**
- Read the diff -- does it match intent?
- Check edge cases mentioned in the request
- Verify no unintended side effects in adjacent code

**Evidence format:**
- "Tests pass: 47 passed, 0 failed"
- "Lint clean, no warnings"
- "Verified: endpoint returns 200 with expected payload"

## Failure Modes and Circuit Breakers

### Stuck detection:
- Same error after 2 attempts -> diagnose root cause, switch approach
- 3 distinct failed approaches -> STOP, escalate to user
- 8+ tool calls without progress -> pause, re-read original request

### Circuit breakers:
- **Timeout:** If a sub-task exceeds its step budget, wrap up partial
- **Repetition:** If making the same edit/command twice, stop and think
- **Drift:** After 8+ calls, verify still solving the original problem
- **Contradiction:** If findings contradict each other, surface the conflict

### Recovery patterns:
- Partial result + explicit gaps > total failure
- State what was tried and why it failed
- Recommend next steps even if you can't complete them
- Log failures for learning (episode reflect)
