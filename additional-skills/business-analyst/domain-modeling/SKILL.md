---
name: domain-modeling
description: "Domain modeling: DDD bounded contexts, aggregates, entities, ubiquitous language, event storming"
---

# Domain Modeling Skill

## Scope

Model business domains using Domain-Driven Design. Define bounded contexts, aggregates, entities, value objects, domain events, and ubiquitous language. Translate business knowledge into technical architecture boundaries.

## First Action

Identify the core domain and key domain events, then map bounded contexts with their relationships (upstream/downstream, conformist, anti-corruption layer).

## Constraints

1. Ubiquitous language is non-negotiable -- same terms in code, docs, and conversation
2. Bounded contexts define linguistic boundaries: same word can mean different things across contexts
3. Aggregates enforce consistency boundaries -- one transaction per aggregate
4. Entities have identity and lifecycle; value objects are immutable and equality-by-value
5. Domain events are past-tense facts: OrderPlaced, PaymentReceived, ShipmentDispatched
6. Context mapping patterns: shared kernel, customer-supplier, conformist, ACL, open host, published language
7. Event storming sequence: domain events -> commands -> aggregates -> bounded contexts
8. Aggregate roots are the only entry point; no direct access to child entities
9. Keep aggregates small -- prefer eventual consistency over large transactional boundaries
10. Distinguish core domain (competitive advantage) from supporting and generic subdomains
11. Domain services handle logic that doesn't belong to a single entity
12. Repository pattern per aggregate root -- one repo, one aggregate
13. Integration events cross context boundaries; domain events stay internal

## DO NOT

1. Create God aggregates that span multiple consistency boundaries
2. Use technical names for domain concepts (use business language)
3. Share entities across bounded contexts -- translate at boundaries
4. Skip ubiquitous language glossary
5. Model CRUD operations as domain events (Created/Updated/Deleted are not domain events)
6. Expose aggregate internals -- enforce encapsulation
7. Confuse subdomains with bounded contexts (subdomain = problem space, BC = solution space)
8. Design bounded contexts around team structure alone -- align to domain, not org chart
9. Use eventual consistency where immediate consistency is a business requirement

## Route to Subskill

| Signal | Subskill | Path |
|--------|----------|------|
| Event storming, domain events, commands | Event Storming | subskills/event-storming.md |
| Aggregate design, consistency, invariants | Aggregate Design | subskills/aggregate-design.md |
| Context boundaries, maps, integration | Context Mapping | subskills/context-mapping.md |
| Glossary, term conflicts, language alignment | Ubiquitous Language | subskills/ubiquitous-language.md |

## Verification

- Ubiquitous language glossary exists with no ambiguous terms
- Every aggregate has clear invariants and consistency boundary
- Context map shows all relationships with integration patterns
- Domain events are past-tense, business-meaningful (not CRUD)
- No entity shared across bounded context boundaries
- Core/supporting/generic subdomain classification documented

## Knowledge

- knowledge/ddd-patterns.md - Tactical and strategic patterns
- knowledge/context-mapping.md - Integration pattern reference
- knowledge/event-storming-guide.md - Facilitation guide
- tools/aggregate-checklist.md - Aggregate design validation

## AI-Era Context (2026)

- AI-assisted event storming uses LLMs to suggest domain events from process descriptions
- Code generation from domain models (aggregates to TypeScript/Go/Java) is production-ready
- Event-driven architectures dominate -- domain events map directly to message broker topics
- LLMs extract ubiquitous language candidates from existing documentation and Slack conversations
- Domain model visualization tools auto-generate context maps from code annotations

## Related Skills

- process-modeling (processes reveal domain events)
- requirements (domain model validates requirement completeness)
- acceptance-criteria (domain invariants become AC)
