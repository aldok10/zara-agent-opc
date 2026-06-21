# Loop Engineering Fundamentals

One-shot generation fails for real projects. Hidden constraints, legacy code, flaky tests, ambiguous requirements. Loop engineering designs iterative feedback loops where agents plan, act, observe, and adjust until the task is actually done.

## Definition

Loop engineering is the discipline of designing complete iteration cycles for AI agents. Where prompt engineering shapes the input, loop engineering shapes the entire process: how an agent gathers context, takes action, interprets results, and decides what to do next.

## The 5-Stage Loop

```
Intent → Context → Action → Observation → Adjustment
```

1. **Intent**: What are we trying to achieve? Clear, measurable objective.
2. **Context**: What do we know? Relevant code, docs, constraints, history.
3. **Action**: What's the smallest meaningful step? One change, one command, one query.
4. **Observation**: What happened? Test output, compiler errors, runtime behavior.
5. **Adjustment**: What do we do differently? Fix, retry, escalate, or stop.

The loop repeats until: objective met, stop condition hit, or escalation triggered.

## Loop Engineering vs Prompt Engineering

| Prompt Engineering | Loop Engineering |
|---|---|
| Shapes one input | Shapes the full process |
| Optimizes single generation | Optimizes iterative convergence |
| Quality of one response | Quality of final outcome |
| Static | Dynamic, adaptive |
| "Say the right thing" | "Do the right thing, repeatedly" |

Prompt engineering is a subset. You still need good prompts inside the loop. But the loop structure determines whether good prompts lead to good outcomes.

## Key Properties of Well-Designed Loops

**Clear objectives.** The agent must know what "done" looks like. Vague goals produce infinite loops. Acceptance criteria are stop conditions.

**Relevant context.** Only high-signal information in the window. Irrelevant context dilutes attention and wastes tokens.

**Small actions.** Each step should be independently verifiable. Large actions compound errors and make debugging impossible.

**Reliable observability.** The agent must see the real result of its action. If feedback is noisy, delayed, or absent, the loop cannot converge.

**Stopping rules.** Every loop needs explicit termination conditions: success criteria, max iterations, error thresholds, time/cost budgets. Without these, loops run forever or burn resources.

## Why This Matters

A well-prompted agent with no loop structure will:
- Generate plausible but untested code
- Miss edge cases that only appear at runtime
- Fail to recover from unexpected errors
- Produce work that looks done but isn't verified

A loop-engineered agent will:
- Discover constraints through iteration
- Self-correct based on real feedback
- Converge on working solutions
- Stop when actually done (or know when to ask for help)

The gap between "impressive demo" and "production-reliable agent" is almost entirely loop engineering.
