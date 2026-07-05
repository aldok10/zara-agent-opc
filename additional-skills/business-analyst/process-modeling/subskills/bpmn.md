---
type: subskill
title: "BPMN"
---

# BPMN

Business Process Model and Notation -- gateways, events, subprocesses, pools, and lanes for process documentation.

## When to Load

- Modeling business processes formally
- Communicating workflows between technical and business teams
- Analyzing process efficiency and bottlenecks
- Documenting as-is and to-be process states

## Key Concepts

**Activities** -- Tasks (atomic) and subprocesses (compound). Types: user task, service task, manual task, script task. Each has a performer and inputs/outputs.

**Gateways** -- Control flow branching and merging. Exclusive (XOR, diamond with X: one path), Parallel (AND, diamond with +: all paths), Inclusive (OR, diamond with O: one or more paths), Event-based (wait for first event).

**Events** -- Start (circle), intermediate (double circle), end (thick circle). Triggers: message, timer, error, signal, conditional, escalation. Events drive process behavior.

**Pools and Lanes** -- Pool = organization/participant. Lane = role within a pool. Messages cross pool boundaries (inter-org). Sequence flows stay within a pool.

**Subprocesses** -- Collapsed (hide complexity) or expanded (show detail inline). Use for reusable process fragments, error handling boundaries, and transaction scopes.

## Patterns

```
# Order Fulfillment Process (BPMN elements)

Pool: E-Commerce Company
  Lane: Customer Service
    [Start: Order Received] --> (Validate Order)
    (Validate Order) --> <XOR: Valid?>
      Yes --> (Check Inventory)
      No --> (Notify Customer) --> [End: Order Rejected]

  Lane: Warehouse
    (Check Inventory) --> <XOR: In Stock?>
      Yes --> (Pick & Pack)
      No --> (Backorder) --> (Timer: 3 days) --> (Check Inventory)
    (Pick & Pack) --> (Ship Order) --> [End: Order Shipped]

  Lane: Finance
    (Validate Order) --> (Process Payment) [parallel with Check Inventory]
    (Process Payment) --> <XOR: Payment OK?>
      Yes --> (continue)
      No --> (Notify Customer) --> [End: Payment Failed]

Pool: Shipping Provider
  [Message: Ship Request] --> (Deliver Package) --> [Message: Delivery Confirmation]
```

```
# Gateway decision table
| Gateway Type | Symbol | Behavior | Use When |
|-------------|--------|----------|----------|
| Exclusive (XOR) | X | Exactly one path | If/else decisions |
| Parallel (AND) | + | All paths execute | Concurrent activities |
| Inclusive (OR) | O | One or more paths | Multiple optional paths |
| Event-based | Pentagon | First event wins | Waiting for external triggers |
```

## Gotchas

- Mixing sequence flows across pools -- only message flows cross pool boundaries
- Missing end events on all paths creates ambiguity about process completion
- Overusing subprocesses to hide complexity instead of simplifying the process
- Gateway without matching merge gateway creates unclear process state
- Timer events without escalation path means the process can wait forever

## Verification

- Every path from start reaches an end event (no dead ends)
- Gateways have matching merge points (or explicit termination on each branch)
- Message flows only cross pool boundaries, sequence flows stay within
- Process can be traced by a non-technical stakeholder reading lane by lane
- Happy path and 2-3 exception paths are explicitly modeled
