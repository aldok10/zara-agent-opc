# Architecture Anti-Patterns

## 1. Distributed Monolith

Services that must deploy together. Worst of both worlds: distributed complexity with monolith coupling.

- Symptoms: shared database, synchronous call chains, coordinated deployments, shared libraries with business logic
- Fix: identify true bounded contexts, introduce async communication, give each service its own data store

## 2. Big Ball of Mud

No discernible structure. Everything depends on everything.

- Symptoms: circular dependencies, no clear module boundaries, "I'm afraid to change this"
- Fix: identify seams, introduce module boundaries incrementally, enforce dependency direction

## 3. Golden Hammer

Using one technology or pattern for every problem.

- Symptoms: Kafka for everything (including request-response), microservices for a 2-person team, NoSQL when you need joins
- Fix: match tool to problem. Boring technology that fits > exciting technology that doesn't.

## 4. Resume-Driven Development

Choosing tech because it looks good on a resume, not because it solves the problem.

- Symptoms: Kubernetes for 3 containers, event sourcing for a CRUD app, GraphQL for a single client
- Fix: justify every technology choice with concrete requirements. "What problem does this solve that simpler alternatives don't?"

## 5. Premature Microservices

Splitting before understanding domain boundaries.

- Symptoms: constantly moving code between services, distributed transactions, services that can't function independently
- Fix: start monolith (or modular monolith), split when boundaries are proven and team size demands it

## 6. Speculative Generality (YAGNI)

Building for hypothetical future needs.

- Symptoms: plugin systems nobody extends, abstraction layers with one implementation, "we might need this later"
- Fix: build for today's requirements. Refactoring working code is cheaper than maintaining unused abstractions.

## 7. Architecture Astronaut

Abstraction layers nobody asked for. Solving meta-problems instead of real ones.

- Symptoms: more framework code than business code, simple operations require traversing 8 layers, "enterprise patterns" in a startup
- Fix: count the layers between a request and the database. If > 4, question each one.

## 8. Distributed Transaction Hell

2PC across services or sagas without proper compensation logic.

- Symptoms: inconsistent states after partial failures, timeouts causing data corruption, impossible-to-debug state machines
- Fix: design for eventual consistency from the start. Idempotent operations. Compensation handlers tested as thoroughly as happy path.

## 9. Shared Database Integration

Coupling services via shared database tables.

- Symptoms: multiple services reading/writing same tables, schema changes break unrelated services, no clear data ownership
- Fix: one service owns each table. Others access via API. Migrate incrementally.

## 10. Chatty Services

N+1 calls across network boundaries.

- Symptoms: single user request triggers 50+ inter-service calls, latency dominated by network hops, cascading timeouts
- Fix: batch APIs, data denormalization, BFF (Backend for Frontend) pattern, or merge the chatty services back together
