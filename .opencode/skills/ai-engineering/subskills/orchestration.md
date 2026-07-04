# Orchestration

Multi-agent coordination patterns. You are the orchestrator; agents execute.

## Orchestration vs execution

Your job: decompose, delegate, verify, synthesize. The agents do the typing. Think in terms of workstreams, not lines of code.

## Parallel patterns

- **Independent tasks**: dispatch simultaneously, merge results (e.g., refactor 3 unrelated files)
- **Sequential with dependency**: output of A feeds B (e.g., design API schema → implement endpoints)
- **Fan-out/fan-in**: one task decomposed into N subtasks, results aggregated (e.g., research from multiple angles)

## Coordination strategies

- **Shared context**: all agents see the same project context (architecture docs, constraints). Consistency, higher token cost.
- **Isolated context**: each agent gets only what it needs. Reduces noise, prevents confusion.
- **Layered**: orchestrator holds full context, workers get a task-specific subset. Best default for large tasks.

## Quality gates between stages

Never feed stage 1 output into stage 2 without verification. Bad output propagates and compounds. Each handoff is a checkpoint.

## When to intervene

- Conflicting outputs from agents
- Confidence < 70%
- Novel or irreversible decisions
- Security-sensitive changes

## When to let them work

- Routine tasks
- Demonstrated competence on similar work
- Clear success criteria
- Reversible actions

## Tools

Claude Code subagents, OpenCode multi-agent, custom orchestration scripts.

## Cost awareness

Parallel agents = parallel cost. Set a budget per task. Kill agents that are spinning (repeating the same failed action, no progress).

## Anti-patterns

- Serial execution when parallel is possible
- No verification between stages
- Agents with unbounded scope
- No cost tracking
