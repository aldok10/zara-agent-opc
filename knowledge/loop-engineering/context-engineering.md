# Context Engineering for Loops

65% of enterprise AI agent failures trace to context drift or memory loss, not model capability. The model is only as good as what's in its window.

## Definition

Context engineering is the deliberate design of everything in the context window: instructions, memory, tool results, conversation history. Not just what goes in, but what stays, what gets refreshed, and what gets pruned.

## The 5 Context Layers

```
1. System instructions (persistent, high priority)
2. User input (current turn, highest relevance)
3. Retrieved knowledge (on-demand, task-specific)
4. Tool outputs (fresh observations, replace assumptions)
5. Persistent memory (cross-session, relationship, decisions)
```

Each layer competes for the same finite window. Design deliberately.

## Context Budget

Treat the context window as a scarce resource. Every token should earn its place.

**High-signal tokens**: current task requirements, relevant code, fresh tool output, active constraints.

**Low-signal tokens**: old conversation turns, verbose explanations, irrelevant documentation, redundant information.

Rule: if a token doesn't help the current decision, it's actively hurting by displacing one that would.

## Context Refresh

After meaningful observations, refresh assumptions. The initial plan is a hypothesis, not a contract.

```
Before: "I think the function is in utils.ts"
After reading: "The function is in helpers/parse.ts line 42"
→ Update all subsequent reasoning from the observation, not the assumption
```

Don't carry stale context forward. Each loop iteration should work from fresh observations.

## Practical Techniques

**Load on demand.** Don't stuff everything upfront. Load knowledge when the task needs it.

**Summarize intermediate results.** After a tool returns 200 lines, extract the 3 relevant facts.

**Discard completed context.** Once a subtask is done, its detailed context can be summarized or dropped.

**Scope retrieval.** Search for what's relevant to THIS step, not everything related to the project.

**Refresh after failure.** When an approach fails, re-read the actual state. Don't reason from memory of what you think the state is.

## Anti-Patterns

| Anti-pattern | Fix |
|---|---|
| Stuffing irrelevant docs | Retrieve only what current step needs |
| Never pruning history | Summarize old turns, keep recent |
| Treating initial plan as sacred | Refresh from observations |
| Ignoring tool output in favor of assumptions | Observations override beliefs |
| Loading entire files when you need 5 lines | Use offset/limit, grep first |
| Accumulating error logs without resolution | Summarize, extract actionable info |

## Context and Loops

Each loop iteration should:
1. Start with fresh observation (not stale memory of last iteration)
2. Include only context relevant to current step
3. Carry forward decisions and constraints (summarized)
4. Drop completed work details
5. Maintain clear objective throughout

## The Context Death Spiral

When context fills with errors, retries, and debugging traces, the agent loses sight of the original objective. This is "The Gutter." Prevention: summarize and prune after each failed attempt. Keep the goal visible.
