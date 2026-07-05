---
type: tool
title: "Elixir/OTP Code Review"
---

# Elixir/OTP Code Review

## Purpose

Review Elixir code for OTP correctness, fault tolerance, and idiomatic patterns. Focuses on supervision trees, GenServer design, process architecture, and BEAM-specific concerns.

## When to Use

- Reviewing GenServer, Supervisor, or Agent implementations
- Evaluating supervision tree structure and restart strategies
- Checking for process bottlenecks or mailbox overflow
- Reviewing Phoenix controllers, contexts, or LiveView code

## Prompt Template

```
CONTEXT:
- Elixir version: [1.16+ | 1.17+]
- Framework: [Phoenix | bare OTP | Nerves]
- Code to review: [paste code or file path]
- OTP components: [GenServer | Supervisor | Task | Agent | GenStage]

REVIEW AGAINST:
1. Supervision: restart strategy (one_for_one vs rest_for_one vs one_for_all),
   child spec correctness, max_restarts/max_seconds tuning
2. GenServer: handle_call vs handle_cast correctness, timeout handling,
   state size management, avoiding blocking in callbacks
3. Process design: single-responsibility per process, avoiding god processes,
   process registry usage (Registry vs global)
4. Fault tolerance: let-it-crash philosophy, defensive coding only at boundaries,
   graceful degradation vs hard crash
5. Mailbox: bounded queues, back-pressure with GenStage/Broadway,
   selective receive pitfalls
6. Concurrency: Task.async/await with proper supervision, avoiding orphan tasks,
   ETS vs Agent for shared state
7. Pattern matching: exhaustive clauses, guard usage, avoiding overly nested case
8. Phoenix specifics: context boundaries, changeset validation, Repo usage,
   Ecto multi for transactions

IDENTIFY:
- Single process bottlenecks (serial message processing)
- Unbounded mailbox growth
- Missing supervision (unsupervised processes)
- Blocking calls in GenServer callbacks
- Race conditions between processes
- Incorrect use of Agent for complex state
```

## Output Format

```
## Elixir Review: [module/feature name]

### Summary
[1-2 sentence verdict]

### Supervision Tree
[Text diagram if applicable: Application -> Supervisor -> Workers]

### Issues
| # | Category | Severity | Description | Fix |
|---|----------|----------|-------------|-----|
| 1 | ...      | ...      | ...         | ... |

### OTP Design Notes
- [Process architecture observations]
- [Fault isolation assessment]

### Suggested Changes
1. [Specific improvement with rationale]
2. ...
```
