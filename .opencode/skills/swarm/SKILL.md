---
name: swarm
description: Use when coordinating multi-agent parallel work on complex tasks with 3+ independent workstreams, large refactoring, or when multiple specialists needed simultaneously
---

# Swarm Coordination Skill

## When to Use

- Task has 3+ independent workstreams
- Multiple files need changes that can be parallelized
- Different specialists needed simultaneously (atlas + probe + shield)
- Large refactoring, feature implementation, or migration

## When NOT to Use

- Simple tasks (< 3 steps)
- Sequential work where order matters
- Single-file changes
- Tasks that only need one specialist

## Workflow

### 1. Analyze & Decompose

Before decomposing, ask:
- Can this be done sequentially instead? (prefer simple)
- Are the workstreams truly independent?
- Will workers conflict on files?

Decompose into subtasks with:
- Clear title and scope
- File boundaries (no overlap)
- Acceptance criteria
- Assigned specialist type

### 2. Create Progress Ledger

Create `.tasks/progress.md` tracking all subtasks:
```markdown
# Progress Ledger

| # | Task | Status | Agent | Spec | Quality | Notes |
|---|------|--------|-------|------|---------|-------|
| 1 | Auth middleware | DONE | atlas | PASS | PASS | |
| 2 | User endpoints | IN_PROGRESS | task | - | - | |
| 3 | DB migrations | PENDING | task | - | - | |
```

### 3. Spawn Workers

Delegate using `task` tool with isolated subtask prompts:
- Each worker gets ONE subtask with clear scope
- Include acceptance criteria and file boundaries
- Workers must implement, test, and report back

### 4. Review Gate

Each worker result goes through two-pillar review:
1. **Spec compliance** — Does it match acceptance criteria?
2. **Code quality** — Clean, tested, follows conventions?

Max 3 review rounds. If still failing → mark blocked, escalate.

### 5. Synthesize & Record

After all workers complete:
- Merge all approved outputs
- Resolve cross-worker conflicts
- Run full test suite
- Record via `reflect` + `memory_episode`
- Save key decisions via `memory_learn`

## Topology Patterns

### Fan-Out (default)
```
Coordinator → Worker 1, Worker 2, Worker 3 → Review → Synthesize
```

### Pipeline (sequential dependencies)
```
Worker 1 (design) → Worker 2 (implement) → Worker 3 (test)
```

### Nested (complex)
```
Coordinator → Sub-Coordinator 1 → Workers...
            → Sub-Coordinator 2 → Workers...
```

## Quality Checklist

Before marking epic complete:
- [ ] All subtasks done or explicitly blocked
- [ ] No file conflicts between workers
- [ ] Combined output is coherent
- [ ] Tests pass (if applicable)
- [ ] Learnings recorded via `reflect` + `memory_learn`

## Integration with Zara

Zara activates swarm mode via:
1. `@hive` agent mention for complex parallel tasks
2. Auto-detection when task has 3+ independent workstreams
3. Load `dispatching-parallel-agents` skill for coordination patterns

Hive coordinates; Zara synthesizes the final response to user.
