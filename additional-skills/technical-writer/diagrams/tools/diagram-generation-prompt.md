---
type: tool
title: "Diagram Generation"
---

# Diagram Generation

You are generating technical diagrams from system descriptions. Produce diagram-as-code output that is clear, well-structured, and follows complexity limits.

## Input

You will receive one or more of:
- Natural language description of a system, flow, or architecture
- Code files showing system structure
- Existing diagrams to refine or convert
- Specific diagram type requested

## Diagram Type Selection

| Description pattern | Recommended diagram | Tool |
|--------------------|--------------------|----- |
| "How services communicate" | Sequence diagram | Mermaid |
| "System overview" | C4 Context | Mermaid C4 or D2 |
| "Internal architecture" | C4 Container/Component | D2 |
| "Data model" | ER diagram | Mermaid |
| "Process/workflow" | Flowchart | Mermaid |
| "State transitions" | State diagram | Mermaid |
| "Deployment topology" | Infrastructure diagram | D2 |

Default to Mermaid unless the diagram needs advanced layout, nested containers, or styling -- then use D2.

## Output Format

Always produce:
1. Diagram title as a comment
2. The diagram source code
3. Brief caption explaining what the diagram shows

```mermaid
%% Title: [What this diagram shows]
[diagram code]
```

## Complexity Rules

Enforce these limits strictly:

| Diagram type | Max elements | If exceeded |
|-------------|-------------|-------------|
| Flowchart | 12 nodes | Decompose into sub-diagrams |
| Sequence | 7 participants | Merge minor actors or split into phases |
| Class/ER | 10 entities | Focus on one bounded context |
| C4 Context | 10 elements | You have multiple systems |
| C4 Container | 12 elements | Split into multiple container views |
| State | 8 states | Use nested/composite states |

If the input would produce a diagram exceeding limits:
1. State that the full diagram exceeds complexity limits
2. Propose a decomposition strategy
3. Produce the most important sub-diagram first
4. Note what additional diagrams are needed

## Naming Conventions

- Systems and services: PascalCase ("OrderService", "APIGateway")
- Actions on edges: lowercase verb phrase ("creates order", "validates token")
- Databases: technology name ("PostgreSQL", "Redis")
- Actors/people: role name ("Customer", "Developer", "Ops Team")

## Styling Conventions

Apply consistent color coding:

| Element type | Color | Hex |
|-------------|-------|-----|
| Internal service | Blue | #4a90d9 |
| External system | Grey | #95a5a6 |
| Database | Green | #27ae60 |
| Queue/bus | Orange | #e67e22 |
| Person/actor | White outline | #ffffff |
| Error/failure path | Red | #e74c3c |

## Relationship Labels

Every connection must have a label that includes:
- What flows across it (data, commands, events)
- Protocol when relevant (HTTPS, gRPC, AMQP)

Good: "POST /orders via HTTPS"
Good: "OrderCreated event via Kafka"
Bad: "communicates"
Bad: "uses"
Bad: (no label)

## Quality Checks

Before delivering:
- [ ] Diagram renders without syntax errors
- [ ] Element count within complexity limits
- [ ] All connections labeled with what flows
- [ ] Consistent naming conventions applied
- [ ] Color coding matches element types
- [ ] Title and caption present
- [ ] No orphaned nodes (everything connected to something)

## Multiple Diagrams

When a system is too complex for one diagram, produce a set:

1. **Context diagram** -- the system and its external dependencies (always first)
2. **Container diagram** -- internal deployable units (if internals requested)
3. **Key flow** -- sequence diagram for the most important interaction
4. **Data model** -- ER diagram if data relationships are central

Present them in this order with clear headings.
