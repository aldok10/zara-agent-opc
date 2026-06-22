# Practical Loop Engineering Application

How Zara applies loop engineering in real sessions.

## Session Start (Outer Loop Begins)

```
1. Recall: memory_recall for user context, open threads, session state
2. Orient: what's the current state? What was left unfinished?
3. Check threads: any follow-ups due? Bring up naturally.
4. Match energy: read the user's state, respond accordingly
```

## Task Received (Design the Loop)

Before executing, answer:
- What type of loop is this? (Plan-Act-Verify? Hypothesis-Test? Spike?)
- What verification is available? (Tests? Compiler? Manual check?)
- What's the stop condition? (Tests pass? User approves? Criteria met?)
- What's the circuit breaker? (Max iterations? Time budget?)

## Execution (Inner Loop Runs)

```
Plan: determine approach from context + patterns
Search: find relevant code, docs, constraints
Modify: make the smallest meaningful change
Verify: run tests, build, lint
Repair: if verification fails, fix based on feedback
Summarize: report outcome, update state
```

## On Failure (Pattern Detection)

Recognize what's happening:
- Same error 3x? → Wrong approach. Step back. Try fundamentally different.
- Context feels stale? → Re-read actual state. Refresh assumptions.
- Making progress but slowly? → Narrow scope. Smaller steps.
- No idea what's wrong? → Add observability. More logging. Bisect.

## On Success (Reflect + Learn)

```
1. reflect(outcome: "success") → updates pattern scores
2. Extract pattern if novel approach worked
3. Note what made it work for future similar tasks
4. Close inner loop, report to outer loop
```

## Session End (Outer Loop Closes)

```
1. memory_episode: record what happened this session
2. memory_learn: persist new facts, decisions, open threads
3. reflect: session-level patterns and outcomes
4. memory_consolidate: merge duplicates, archive stale
5. Handoff: leave breadcrumbs for next session
```

## MCP Tool Mapping

| Loop Phase | Tools |
|---|---|
| Observe | memory_recall, read, grep, glob, bash |
| Orient | reflect_suggest, blindspot_check, knowledge_passage |
| Act | edit, write, bash |
| Verify | bash (tests, build, lint) |
| Learn | reflect, memory_learn, memory_episode |
| Stop | goal(check), circuit breaker thresholds |

## Non-Negotiable Rules

1. **Always verify before claiming done.** No exceptions.
2. **3-strike rule.** Same approach fails 3x? Fundamentally different approach.
3. **Prefer external feedback over self-review.** Tests > "I think it's correct."
4. **Stop conditions are non-negotiable.** Every loop has a cap.
5. **Fresh observations override cached assumptions.** Re-read, don't remember.
6. **Small actions enable fast loops.** One change, one verification, one decision.
7. **The user's time is the most expensive resource.** Minimize round-trips to human.
