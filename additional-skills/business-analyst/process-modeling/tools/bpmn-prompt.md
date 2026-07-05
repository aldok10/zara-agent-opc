---
type: tool
title: "BPMN Diagram Design Prompt"
---

# BPMN Diagram Design Prompt

Use this prompt to design BPMN process diagrams with correct notation and complete coverage.

## Prompt

```
You are a process modeling expert creating a BPMN 2.0 diagram specification. Produce a complete, standards-compliant process design.

Input:
- Process name: [what business process]
- Trigger: [what starts this process]
- End state(s): [what are the successful and failed outcomes]
- Participants: [roles, departments, systems involved]
- Existing documentation: [paste any text descriptions, SOPs, or interview notes]

Design the BPMN diagram covering:

1. SWIM LANES (POOLS & LANES)
   - One pool per organization (or collapse if single org)
   - One lane per role/system that performs activities
   - Order lanes by frequency of interaction (most active at top)
   - External participants as separate collapsed pools with message flows

2. EVENTS
   - Start events: what triggers the process? (message, timer, signal, manual)
   - Intermediate events: waiting points, escalations, timer delays
   - End events: success (none), error (terminate), cancel, message sent
   - Boundary events: timeouts on tasks, error handling, escalation

3. GATEWAYS
   - Exclusive (XOR): exactly one path based on condition
   - Parallel (AND): all paths execute simultaneously
   - Inclusive (OR): one or more paths based on conditions
   - Event-based: wait for one of several events
   - Label every outgoing sequence flow from a gateway with its condition
   - Default flow: mark one path as default (no condition needed)

4. ACTIVITIES
   - Tasks: atomic work units (user, service, script, manual, send, receive)
   - Sub-processes: collapsed (reference) or expanded (inline detail)
   - Call activities: reusable processes invoked here
   - Multi-instance: parallel or sequential repetition
   - Each task name: verb + noun (e.g., "Review Application", "Calculate Score")

5. EXCEPTION HANDLING
   - What happens on timeout? (boundary timer event)
   - What happens on system failure? (boundary error event)
   - What happens on business rule violation? (exclusive gateway to error end)
   - Compensation: can completed steps be undone?
   - Escalation: when does a manager/system get involved?

6. DATA & ARTIFACTS
   - Data objects: what information flows between tasks?
   - Data stores: which databases or systems are read/written?
   - Annotations: clarify complex business rules on gateways

Output format:
- Process metadata: name, owner, version, last updated
- Participant list with lane assignments
- BPMN element table: ID | Type | Name | Description | Incoming | Outgoing
- Gateway conditions table: gateway ID | condition | target
- Exception table: task | event type | handler path
- Textual flow description (numbered steps for each happy path and exception)
- Suggested sub-processes (tasks complex enough to expand)
- Metrics: expected cycle time per path, SLA checkpoints
```
