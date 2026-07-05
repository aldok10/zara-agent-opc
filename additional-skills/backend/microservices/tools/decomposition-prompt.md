---
type: tool
title: "Microservice Boundary Design"
---

# Microservice Boundary Design

## Purpose

Design microservice boundaries using domain-driven design principles. Evaluates bounded contexts, data ownership, communication patterns, and decomposition strategy.

## When to Use

- Splitting a monolith into services
- Defining boundaries for a new service
- Evaluating data ownership and shared state
- Choosing sync vs async communication between services

## Prompt Template

```
CONTEXT:
- Current state: [monolith | modular monolith | existing microservices]
- Domain: [e-commerce | fintech | SaaS | etc.]
- Bounded contexts identified: [list contexts/aggregates]
- Team structure: [teams, ownership areas]
- Data stores: [shared DB | per-service DB | event store]
- Communication: [REST | gRPC | events | mixed]

EVALUATE DECOMPOSITION:
1. Bounded context alignment: each service owns one context,
   no shared domain models across services
2. Data ownership: single writer per entity, no shared tables,
   data duplication with eventual consistency where needed
3. API boundaries: public contract vs internal implementation,
   anti-corruption layers at boundaries
4. Communication patterns: sync for queries needing immediate response,
   async events for state changes, saga/choreography for workflows
5. Transaction boundaries: no distributed transactions,
   compensating actions, outbox pattern for event publishing
6. Team alignment: Conway's law, independent deployability,
   team cognitive load per service
7. Size heuristic: small enough for one team, large enough to be meaningful,
   avoid nano-services
8. Shared concerns: auth, logging, tracing as platform (not shared library coupling)

DECOMPOSITION SMELLS:
- Services that always deploy together
- Circular dependencies between services
- Shared database tables
- Distributed monolith (high coupling, low cohesion)
- Service that only proxies to another
- Chatty inter-service communication for single operations
```

## Output Format

```
## Service Boundary: [domain/feature area]

### Context Map
[Bounded contexts and relationships: upstream/downstream, conformist/ACL]

### Proposed Services
| Service | Owns | Exposes | Consumes |
|---------|------|---------|----------|
| ...     | [entities] | [API/events] | [from other services] |

### Communication Design
| Interaction | Pattern | Rationale |
|-------------|---------|-----------|
| A -> B      | sync/async | ... |

### Data Ownership
- [Entity]: owned by [service], replicated to [consumers] via [mechanism]

### Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| ...  | ...    | ...        |
```
