# Agentic Orchestration - Leadership Patterns

## The Lead Agent as Engineering Manager

A lead agent in a multi-agent system is functionally an engineering manager:
- Decomposes ambiguous goals into clear tasks
- Matches tasks to the right specialist
- Reviews quality before accepting
- Maintains shared context
- Knows when to escalate

**Key principle** (Azure Architecture): "Use the lowest level of complexity that reliably meets your requirements."

---

## Five Orchestration Topologies

| Pattern | When | Lead Role | Example |
|---------|------|-----------|---------|
| **Sequential** (A→B→C) | Linear dependencies | Pipeline controller | Code → Test → Deploy |
| **Parallel** (fan-out/fan-in) | Independent sub-tasks | Result merger | Research 5 topics simultaneously |
| **Hierarchical** (manager→workers) | Complex decomposition | Delegator + reviewer | Feature with frontend + backend + tests |
| **Handoff** (routing) | Domain-specific expertise | Router/classifier | "This is a security question" → Shield |
| **Loop** (iterate + evaluate) | Refinement needed | Evaluator/terminator | Code review → fix → review → accept |

### Choosing a Topology

```
Is the task decomposable?
├── No → Do it yourself (single agent)
├── Yes → Are sub-tasks independent?
│   ├── Yes → Parallel (fan-out/fan-in)
│   └── No → Are they strictly ordered?
│       ├── Yes → Sequential (pipeline)
│       └── No → Hierarchical (manager pattern)
```

---

## Decision Delegation Protocol

```
1. DECOMPOSE → identify sub-components
2. CLASSIFY → rate complexity + risk per sub-task
3. MATCH → assign to agent with strongest capability
4. CONSTRAIN → set boundaries (time, scope, permissions)
5. MONITOR → track progress without micromanaging
6. VALIDATE → check output meets acceptance criteria
7. SYNTHESIZE → merge results into coherent whole
```

### Authority Levels for Delegation

| Level | Description | Use When |
|---|---|---|
| L1: Tell | "Do exactly X" | Critical path, irreversible |
| L2: Sell | "Do X because Y" | Important, need buy-in |
| L3: Consult | "I'm thinking X, what do you see?" | High complexity, need input |
| L4: Agree | "Let's decide together" | Shared ownership needed |
| L5: Advise | "I suggest X, you decide" | Worker has more context |
| L6: Inquire | "You decide, tell me what you chose" | Routine, reversible |
| L7: Delegate | "You decide, no need to tell me" | Trusted, fully delegated |

---

## Quality Gate Pattern

```
Worker Output → Schema Check → Factual Validation → Style Check → Accept/Reject/Revise
```

**Gates should be:**
- Automated where possible (lint, type-check, test)
- Sampled for judgment calls
- Bounded in revision rounds (max 3)
- Escalation-aware (failed gate → appropriate response)

### Gate Criteria

| Gate | Checks | Auto/Manual |
|---|---|---|
| Completeness | Did it address all requirements? | Manual |
| Correctness | Does it work? Tests pass? | Auto |
| Consistency | Matches existing style/patterns? | Auto (lint) + Manual |
| Clarity | Would a stranger understand this? | Manual |
| Safety | Any security/privacy concerns? | Auto (scan) + Manual |

---

## Escalation Tiers

| Tier | Risk | Example | Behavior |
|------|------|---------|----------|
| 0 | None | Read, search, analyze | Auto-proceed |
| 1 | Low | Install dependency, modify config | Proceed + notify |
| 2 | Medium | Change auth, modify schema | Show plan → confirm |
| 3 | High | Production deploy, data delete | Full context + options → explicit approval |

### When to Escalate

- Confidence drops below 70%
- Novel situation - no precedent in knowledge
- Conflicting outputs from multiple workers
- Scope creep detected - task expanding beyond original boundary
- Ethical/safety concern surfaced

---

## Anti-Patterns in Orchestration

| Anti-Pattern | Symptom | Fix |
|---|---|---|
| **Infinite loops** | Agent keeps refining without converging | Max iterations + quality threshold + termination criteria |
| **Over-delegation** | Lead never reviews, just passes through | Review gate on every output |
| **Under-delegation** | Lead does everything, agents idle | Trust within bounded scope |
| **No shared state** | Agents contradict each other | Central state + version tracking |
| **Premature multi-agent** | One agent would suffice | Start simple, add agents when bottleneck proven |
| **Silent failure** | Agent fails, nobody notices | Require explicit success/failure signals |
| **Context starvation** | Worker lacks info to decide well | Provide relevant context upfront |
| **Kitchen sink delegation** | "Just figure it out" with no constraints | Clear scope, criteria, boundaries |

---

## The Empathetic Orchestrator

An empathetic lead agent differs from a cold orchestrator:

| Cold Orchestrator | Empathetic Orchestrator |
|---|---|
| Assigns tasks | Assigns tasks with context on WHY |
| Rejects bad output | Rejects with specific, actionable feedback |
| Tracks progress | Tracks progress AND detects blockers proactively |
| Synthesizes results | Synthesizes AND acknowledges effort |
| Escalates problems | Escalates with a proposed solution path |

### The READ → ROUTE → REVIEW → RESPOND Pattern

1. **READ**: Detect emotional + contextual signals from the human
2. **ROUTE**: Match task to right specialist/approach based on classification
3. **REVIEW**: Validate output quality AND assess human impact
4. **RESPOND**: Deliver with appropriate tone calibrated to the person's state

---

## Coordination Principles for Zara Swarm

1. **Decompose thoughtfully** - Break work at natural seams, not arbitrary lines
2. **File ownership** - Each worker owns specific files. No overlap = no merge conflicts
3. **Context budget** - Workers get enough to decide, not a context dump
4. **Review everything** - Every worker output passes quality gate before synthesis
5. **Bounded iteration** - Max 3 revision rounds per worker
6. **Explicit termination** - Define "done" before starting. No "keep going until perfect"
7. **State preservation** - Coordinator maintains running state for session handoff
8. **Human alignment** - Check with user before major scope changes
