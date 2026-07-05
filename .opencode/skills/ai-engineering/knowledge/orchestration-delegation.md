---
type: fact
title: "Orchestration & Delegation"
---
# Orchestration & Delegation

Technical reference for multi-agent architectures, context management, handoff protocols, and specialization design.

---

## Multi-Agent Orchestration Patterns

### Supervisor (Hub-and-Spoke)

One orchestrator dispatches to specialist agents. All communication flows through the supervisor.

```
                  [Supervisor]
                 /     |      \
          [Agent A] [Agent B] [Agent C]
```

Pros: centralized control, clear routing, easy to audit.
Cons: supervisor is bottleneck, single point of failure, context duplication.

Best for: well-defined task taxonomies, compliance-heavy domains.

### Peer-to-Peer (Mesh)

Agents communicate directly. Each agent decides when to hand off and to whom.

```
          [Agent A] <---> [Agent B]
              \               /
               \             /
                [Agent C]
```

Pros: lower latency, no bottleneck, emergent collaboration.
Cons: hard to debug, coordination overhead, potential infinite loops.

Best for: exploratory tasks, creative workflows, small agent counts (2-4).

### Hierarchical (Tree)

Multiple supervisor layers. Top-level routes to mid-level coordinators, which manage leaf workers.

```
              [Director]
             /          \
      [Team Lead A]  [Team Lead B]
       /       \         /      \
    [W1]     [W2]     [W3]    [W4]
```

Pros: scales to many agents, natural decomposition, bounded blast radius.
Cons: communication overhead, deeper = slower, context loss at each level.

Best for: complex multi-domain tasks, large codebases, production systems.

---

## Context Budget Management

### The Core Problem

Each agent has finite context. Passing full conversation history to sub-agents wastes tokens and introduces noise.

### Strategies

| Strategy | Technique | Token Cost |
|---|---|---|
| Summarization | Compress history before handoff | Low |
| Selective context | Pass only relevant snippets | Low |
| Shared memory | External store agents read/write | Variable |
| Scoped dispatch | Task + minimal context only | Lowest |

### Implementation Pattern

```python
class ContextBudget:
    def __init__(self, max_tokens: int = 1000):
        self.max_tokens = max_tokens

    def prepare_dispatch(self, task: str, full_context: dict) -> str:
        essential = self._extract_essential(task, full_context)
        if self._count_tokens(essential) > self.max_tokens:
            essential = self._summarize(essential, self.max_tokens)
        return essential

    def _extract_essential(self, task: str, context: dict) -> str:
        relevant_keys = self._identify_relevant(task, context.keys())
        return "\n".join(f"{k}: {context[k]}" for k in relevant_keys)
```

Rule of thumb: sub-agent context should be <1000 tokens. Include: task description, acceptance criteria, file paths, constraints. Exclude: conversation history, prior attempts (unless diagnosing failure), unrelated context.

---

## Handoff Protocols

### Dispatch Format (Standardized)

```
Task: [single sentence goal]
Context: [relevant data, file paths, constraints -- under 1000 tokens]
Acceptance: [testable done criteria]
Constraints: [budget, tools allowed, scope boundaries]
Return: [expected output format]
```

### Return Format (All Agents)

```
[structured output per agent specification]
EXIT: COMPLETED | BLOCKED | BUDGET_EXHAUSTED | ESCALATED
Confidence: high | med | low -- [basis for confidence level]
```

### Exit Code Semantics

| Code | Meaning | Orchestrator Action |
|---|---|---|
| COMPLETED | Task done, acceptance met | Integrate result |
| BLOCKED | Missing permission/resource | Escalate to user or provide resource |
| BUDGET_EXHAUSTED | Step limit hit, partial result | Decide: continue with new budget or accept partial |
| ESCALATED | Needs human decision | Surface to user with options |

### Handoff State Machine

```
IDLE -> DISPATCHED -> WORKING -> {COMPLETED | BLOCKED | BUDGET_EXHAUSTED | ESCALATED}
                         |
                         v (if retry needed)
                      DISPATCHED
```

Max retries: 1 for same approach, then escalate or switch strategy.

---

## When to Delegate vs Handle Inline

### Delegate When

- Task is independent and parallelizable
- Task needs deep exploration (>15 tool calls)
- Context isolation prevents confusion
- Different expertise needed (security review vs implementation)
- Multiple files/systems need simultaneous investigation

### Handle Inline When

- Single file edit or lookup
- Context is already loaded
- Faster than formulating a dispatch
- Task is trivial (< 3 tool calls)
- Result is needed immediately for next step

### Decision Heuristic

```
if task.tool_calls_estimate > 10:
    delegate()
elif task.requires_different_expertise:
    delegate()
elif task.can_parallelize_with_other_tasks:
    delegate()
else:
    handle_inline()
```

---

## Agent Specialization Design

### Principles

1. **Single responsibility**: each agent excels at one domain
2. **Clear boundaries**: no overlapping capabilities between agents
3. **Composability**: agents can be combined for complex tasks
4. **Graceful degradation**: agent reports limits rather than guessing

### Specialization Taxonomy

| Agent Type | Scope | Example |
|---|---|---|
| Analyst | Read-only investigation | Code review, architecture analysis |
| Implementer | Write code, run tests | Feature development, bug fixes |
| Validator | Verify correctness | Test runner, linter, type checker |
| Researcher | External information | Doc lookup, web search, API exploration |
| Coordinator | Route and decompose | Task planning, dependency resolution |

### Anti-Patterns

- **God agent**: one agent does everything (context overflow, poor quality)
- **Over-specialization**: too many agents for simple tasks (overhead exceeds benefit)
- **Circular delegation**: A delegates to B delegates back to A (detect with call stack)
- **Context telephone**: information degrades through too many handoffs

### Designing Agent Boundaries

Ask: "If I gave this task to a new developer, what would they need to know?" That is the context. "What would they deliver back?" That is the return format. "What could go wrong?" That is the exit conditions.
