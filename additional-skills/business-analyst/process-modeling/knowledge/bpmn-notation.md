---
type: fact
title: "BPMN 2.0 Notation"
---

# BPMN 2.0 Notation

## Core Elements

### Activities

Activities represent work performed in a process.

| Symbol | Name | Use |
|--------|------|-----|
| Rounded rectangle | Task | Single unit of work |
| Rounded rectangle + marker | Subprocess | Contains sub-process flow |
| Rounded rectangle + loop | Loop task | Repeats until condition met |
| Rounded rectangle + parallel | Multi-instance | Executes multiple times in parallel |

#### Task Types

- **User Task**: Performed by a human with system assistance
- **Service Task**: Automated, executed by software
- **Script Task**: Executes a script or business rule
- **Manual Task**: Performed without system support
- **Send Task**: Sends a message to external participant
- **Receive Task**: Waits for incoming message

### Events

Events represent something that happens during the process.

#### Start Events (thin circle)

| Variant | Trigger |
|---------|---------|
| None | Process begins manually or by schedule |
| Message | External message received |
| Timer | Scheduled time or recurring interval |
| Signal | Broadcast signal received |
| Conditional | Business condition becomes true |

#### End Events (thick circle)

| Variant | Effect |
|---------|--------|
| None | Process flow ends |
| Message | Sends message on completion |
| Error | Process ends with error |
| Terminate | Kills all parallel flows immediately |
| Signal | Broadcasts signal on completion |

#### Intermediate Events (double circle)

- **Catching**: Pauses flow until event occurs (timer, message)
- **Throwing**: Produces an event and continues (signal, message)
- **Boundary**: Attached to activity, triggers on interruption or timeout

### Gateways (diamond shape)

| Type | Behavior |
|------|----------|
| Exclusive (X) | One path based on condition (if/else) |
| Parallel (+) | All paths execute simultaneously |
| Inclusive (O) | One or more paths based on conditions |
| Event-based | Waits for first of several possible events |
| Complex | Custom routing logic |

#### Gateway Rules

- Exclusive: exactly one outgoing path evaluates to true
- Parallel split: all outgoing paths activate; parallel join: waits for ALL
- Inclusive split: at least one path; inclusive join: waits for all active paths
- Always label outgoing sequence flows from exclusive/inclusive gateways

### Sequence Flow

- **Normal flow**: Solid arrow connecting activities
- **Conditional flow**: Arrow with diamond, condition must be true
- **Default flow**: Arrow with slash mark, taken when no other condition matches

### Message Flow

Dashed arrow between pools (different participants/organizations). Shows communication, not control flow.

## Pools and Lanes

### Pool

Represents a participant (organization, system, role). Separate pools communicate via message flow only -- no sequence flow crosses pool boundaries.

### Lane

Subdivision within a pool. Represents a role, department, or system within the same participant. Sequence flow CAN cross lane boundaries.

## Subprocess Patterns

### Embedded Subprocess

Contained within the parent process. Shares the parent's data context.

### Call Activity

References a reusable process defined elsewhere. Like a function call.

### Event Subprocess

Triggered by events (error, timer, message) within the parent. Can be interrupting (stops parent) or non-interrupting (runs in parallel).

### Transaction Subprocess

Atomic group of activities. Either all complete successfully, or all roll back via compensation.

## Data Objects

- **Data Object**: Single piece of data (document, record)
- **Data Store**: Persistent storage (database, file system)
- **Data Input/Output**: Process-level input or output

## Compensation

When a transaction fails mid-way:
1. Compensation events trigger on rollback
2. Each activity can have a compensation handler
3. Handlers undo the work of completed activities
4. Executed in reverse order of original completion

## Best Practices

- One start event per process (unless event-driven)
- Every path must reach an end event
- Label all gateway conditions
- Keep processes under 15-20 activities (decompose into subprocesses)
- Use pools for external parties, lanes for internal roles
- Avoid crossing sequence flows (redesign the layout)
- Name activities with verb-noun format: "Review Application", "Send Invoice"
