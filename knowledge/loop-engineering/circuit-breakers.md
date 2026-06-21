# Circuit Breakers and Stop Conditions

A loop without stop conditions is a runaway process. Claude Code recursion burned $16K-$50K in 5 hours with no crash, no exception. Just no stopping rule.

## The Math

A 2% per-tool error rate compounds. With 10 steps per session: 1 - (0.98^10) = 18% session failure rate. With 50 steps: 64% chance at least one fails. Without detection, errors cascade silently.

## Types of Circuit Breakers

**Max iterations cap.** Hard limit on loop cycles. If you haven't converged in N iterations, something is wrong. Typical: 3-5 for inner loops, 10-20 for session-level.

**Token budget.** Total tokens consumed per task. Prevents runaway context accumulation. Set per-task and per-session limits.

**Time budget.** Wall-clock limit. Catches infinite loops, hanging commands, slow external services.

**Cost budget.** Dollar limit per session/task. The ultimate safety net for paid API usage.

**Same-error detection.** If the same error appears 3 times, the current approach is wrong. Don't retry. Step back.

**Progress detection.** If N iterations pass with no measurable progress toward the goal, stop and reassess.

## The Gutter

When context fills with error logs, retry attempts, and debugging traces, the agent forgets its original objective. It's now debugging its debugging. This is the most common failure mode for autonomous agents.

Prevention: after 2 failed attempts, summarize what was tried, clear the noise, restate the objective.

## Retry Storms

Each retry resubmits the full context. 10 retries = 10x the tokens of a single attempt. The context gets longer with each failure (accumulating error messages), making each subsequent attempt more expensive and less likely to succeed.

Fix: cap retries per tool, summarize errors instead of accumulating them.

## Five Fixes

1. **max_iterations**: hard cap on every loop. Non-negotiable.
2. **Per-tool timeouts**: no single tool call runs forever. Kill after threshold.
3. **Error detection instructions**: teach the agent to recognize when it's stuck.
4. **Watchdog**: external process monitoring agent behavior, kills runaway sessions.
5. **Tool quarantine**: if a tool fails 3x, stop calling it. Try alternatives.

## Silent Failures

The most dangerous failures don't throw exceptions.

- HTTP 200 with error body
- Empty string return instead of null/exception
- Command exits 0 but produces no output
- Test passes but doesn't actually test anything (empty assertion)

Design observations to detect these. Check for positive evidence of success, not just absence of failure.

## Stop Condition Design

Every loop needs explicit answers to:
- What does "done" look like? (Success criteria)
- What does "stuck" look like? (Failure detection)
- What's the absolute maximum effort? (Resource caps)
- What triggers escalation? (Human-in-the-loop threshold)
