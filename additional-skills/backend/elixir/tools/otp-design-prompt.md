---
type: tool
title: "OTP Supervision Tree Design"
---

# OTP Supervision Tree Design

## Purpose

Design OTP supervision trees with appropriate restart strategies, process organization, and fault isolation boundaries. Ensures the system self-heals correctly and failures don't cascade.

## When to Use

- Designing a new GenServer/Supervisor hierarchy
- Choosing restart strategies for process groups
- Isolating failures between subsystems
- Debugging unexpected process restarts or cascading crashes
- Scaling a supervision tree for concurrent workloads

## Prompt Template

```
CONTEXT:
- Application type: [web app | data pipeline | IoT gateway | real-time system]
- Key processes: [list GenServers, Agents, Tasks with their responsibilities]
- State requirements: [which processes hold critical state]
- Failure domains: [what can fail independently]
- External dependencies: [databases, APIs, message brokers]
- Concurrency needs: [pool size, dynamic children, rate limiting]

DESIGN DECISIONS:
1. Restart strategy per supervisor
   - :one_for_one: independent children
   - :one_for_all: coupled children that must restart together
   - :rest_for_one: ordered dependencies
   - DynamicSupervisor: variable child count

2. Process organization
   - Group by failure domain (not by type)
   - Separate stateful from stateless
   - Isolate external dependency wrappers
   - Registry for named/dynamic processes

3. State recovery
   - ETS for shared readable state
   - Persistent storage for critical state
   - Process initialization from external source
   - State handoff during restart

4. Fault boundaries
   - Max restarts / max seconds configuration
   - Escalation behavior when limits exceeded
   - Circuit breaker for external calls
   - Backpressure with GenStage or Broadway

5. Observability
   - Telemetry events for process lifecycle
   - Logger metadata per process
   - Health check aggregation

ANTI-PATTERNS:
- Single supervisor with 20+ children
- :one_for_all with unrelated processes
- Storing irreplaceable state only in process memory
- Synchronous calls to potentially slow processes in init/1
```

## Output Format

```
## Supervision Tree: [application name]

### Tree Diagram
[ASCII tree showing supervisor/worker hierarchy]

### Strategy Rationale
| Supervisor | Strategy | Max Restarts | Reason |
|-----------|----------|--------------|--------|
| ... | ... | ... | ... |

### Process Responsibilities
| Process | Type | State | Recovery |
|---------|------|-------|----------|
| ... | GenServer/Agent/Task | ... | ... |

### Failure Scenarios
| Failure | Affected | Recovery Path | User Impact |
|---------|----------|---------------|-------------|
| ... | ... | ... | ... |

### Scaling Notes
- [How to scale specific parts of the tree]
- [DynamicSupervisor usage for pools]
```
