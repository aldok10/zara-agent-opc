---
description: Swarm coordination — decompose complex tasks into parallel workstreams via @hive
agent: swarm
subtask: true
---

I need to decompose a complex task into parallel workstreams and coordinate execution.

**Task**: $ARGUMENTS

## Analysis

1. Understand the task — what's the goal, what are the constraints
2. Identify independent workstreams (must be non-overlapping in files and concerns)
3. Assign file boundaries per stream
4. Design the synthesis plan (how results merge back)

## Output

Return a structured decomposition:

```
## Swarm Plan: [task]

### Workstream 1: [name]
- **Files**: [file boundaries]
- **Dependencies**: [none / workstream X]
- **Acceptance**: [how to verify]

### Workstream 2: [name]
- **Files**: [file boundaries]
- **Dependencies**: [none / workstream X]
- **Acceptance**: [how to verify]

### Synthesis
- **Merge strategy**: [how results combine]
- **Review order**: [which streams to review first]
- **Conflict handling**: [what if streams disagree]

### Estimated effort
- Total workstreams: [N]
- Can run fully parallel: [yes/partial]
- Estimated total time: [X]
```

Be specific about file boundaries. No ambiguous handoffs.
