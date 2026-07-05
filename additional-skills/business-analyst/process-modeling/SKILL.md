---
name: process-modeling
description: "Process modeling: BPMN 2.0, user journeys, swimlanes, bottleneck identification"
---

# Process Modeling Skill

## Scope

Model business processes using BPMN 2.0, map user journeys, identify bottlenecks, and propose optimizations. Produce executable process definitions and visual documentation for stakeholder alignment.

## First Action

Identify the process scope (start/end events), then map the happy path before adding exceptions, branches, and error handling.

## Constraints

1. BPMN 2.0 compliance: use standard elements (events, tasks, gateways, flows, pools, lanes)
2. Every process has exactly one start event and at least one end event
3. Swimlanes represent responsibility (role/system/department), not individuals
4. Gateways: XOR for exclusive decisions, AND for parallel, OR for inclusive -- never mix
5. Happy path modeled first, then exceptions and error boundaries
6. Timer events for SLA tracking: escalation paths when deadlines breach
7. User journey maps include: touchpoints, emotions, pain points, opportunities
8. Measure process health: cycle time, wait time, rework rate, throughput
9. Bottleneck identification: look for queues, handoffs, approval loops, manual steps
10. Subprocess encapsulation for reusable or complex portions
11. Message flows between pools represent inter-organization communication
12. Error boundary events on tasks that can fail -- define compensation
13. Document assumptions about process frequency, volume, and peak load
14. As-is before to-be: model current state before proposing improvements

## DO NOT

1. Model to-be processes without understanding as-is first
2. Use non-standard BPMN elements or invent custom notation
3. Create spaghetti diagrams -- decompose into subprocesses at 7-10 elements
4. Skip error/exception paths (they represent most of the real complexity)
5. Assign swimlanes to named individuals instead of roles
6. Model at inconsistent levels of detail within the same diagram
7. Ignore wait/idle time between tasks -- this is often where bottlenecks hide
8. Present processes without cycle time and frequency data

## Route to Subskill

| Signal | Subskill | Path |
|--------|----------|------|
| BPMN diagram, process definition, workflow | BPMN Modeling | subskills/bpmn-modeling.md |
| User journey, touchpoints, experience map | Journey Mapping | subskills/journey-mapping.md |
| Bottleneck, optimization, waste elimination | Process Optimization | subskills/process-optimization.md |
| Automation candidates, RPA, workflow engine | Process Automation | subskills/process-automation.md |

## Verification

- BPMN diagrams validate against BPMN 2.0 schema
- Every process has clear start/end events and no dead paths
- Swimlanes assigned to roles, not individuals
- Gateway types correctly applied (XOR/AND/OR)
- Cycle time and bottleneck analysis included
- As-is documented before to-be proposed

## Knowledge

- knowledge/bpmn-reference.md - BPMN 2.0 element catalog
- knowledge/journey-mapping.md - User journey techniques
- knowledge/process-metrics.md - Cycle time, throughput, wait time
- tools/process-template.md - Process documentation template

## AI-Era Context (2026)

- Process mining tools (Celonis, Apromore) auto-discover as-is processes from event logs
- AI identifies automation candidates by analyzing task frequency, duration, and error rates
- Low-code workflow engines (Temporal, Camunda 8) execute BPMN directly -- models are code
- LLMs generate BPMN XML from natural language process descriptions
- Digital twins simulate process changes before deployment

## Related Skills

- domain-modeling (processes reveal domain events and aggregates)
- requirements (process steps generate functional requirements)
- stakeholder-analysis (swimlanes align to stakeholder roles)
