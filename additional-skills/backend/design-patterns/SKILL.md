---
name: design-patterns
description: "GoF, SOLID, DDD tactical patterns, refactoring patterns. Language-agnostic design guidance."
---

# Design Patterns

## Scope

Gang of Four patterns (creational, structural, behavioral), SOLID principles, DDD tactical patterns (Entity, Value Object, Aggregate, Repository, Domain Event), and refactoring toward patterns. Language-agnostic with idiomatic adaptation per target language.

## First Action

Identify the problem being solved before choosing a pattern. Read the existing code structure to understand current abstractions, then determine if the pattern addresses a real pain point (duplication, coupling, rigidity) rather than adding complexity speculatively.

## Constraints

1. Pattern must solve an existing problem -- never apply speculatively
2. Prefer composition over inheritance
3. Keep patterns language-idiomatic (Go interfaces differ from Java)
4. Name types after domain concepts, not pattern names (OrderRepository not RepositoryPattern)
5. One pattern per abstraction layer -- avoid stacking
6. Value Objects are immutable by default
7. Aggregates enforce invariants at their boundary
8. Repository interface belongs to the domain, implementation to infrastructure
9. Domain Events are past-tense facts, not commands
10. Factory methods over constructors when creation logic is non-trivial
11. Prefer explicit dependency injection over service locators
12. Keep inheritance depth to max 2 levels
13. Interface segregation -- small, focused interfaces
14. Open/Closed via composition and strategy, not class hierarchies
15. Railway/Result pattern for error handling without exceptions (map success/failure pipelines)
16. Effect pattern (algebraic effects) for isolating side effects from pure logic
17. Event modeling pipeline: Event Storming -> Event Sourcing -> CQRS as design discovery tool
18. Actor pattern (Akka/Pekko, Elixir GenServer, Cloudflare Durable Objects) for stateful concurrency
19. Flag AI anti-patterns: over-abstraction (too many interfaces), unnecessary DI layers, pattern-stuffing (applying patterns because AI suggests them, not because the problem demands it)

## DO NOT

1. Use Singleton for dependency injection (use DI container instead)
2. Create AbstractFactoryFactoryBuilder layers
3. Apply patterns without identifying the forces that justify them
4. Name classes after patterns when domain names are clearer
5. Use inheritance where composition suffices
6. Create God objects that violate Single Responsibility
7. Mix domain logic into infrastructure code
8. Expose aggregate internals through getters
9. Create anemic domain models (logic-free data containers)

## Route to Subskill

| Signal | Subskill |
|--------|----------|
| Object creation complexity | knowledge/creational-patterns.md |
| SOLID violations | knowledge/solid-principles.md |
| Domain modeling | knowledge/ddd-tactical.md |
| Go-specific patterns | examples/patterns-go.go |
| Refactoring toward patterns | tools/refactoring-prompt.md |

## Verification

- [ ] Pattern addresses identified code smell or design force
- [ ] New abstraction reduces coupling (not just adds indirection)
- [ ] Types named after domain concepts
- [ ] No circular dependencies introduced
- [ ] Tests cover both happy path and invariant enforcement
- [ ] Existing code adapted incrementally (not big-bang rewrite)
- [ ] Pattern usage documented in ADR if non-obvious

## Knowledge

- knowledge/creational-patterns.md -- Factory, Builder, Singleton, Pool
- knowledge/solid-principles.md -- S/O/L/I/D with examples
- knowledge/ddd-tactical.md -- Entity, VO, Aggregate, Repository, Domain Event

## AI-Era Context (2026)

LLMs tend to over-apply patterns and create unnecessary abstraction layers. Push back when generated code introduces a pattern without clear justification. AI-generated domain models often produce anemic objects -- ensure behavior lives with data. When using AI for refactoring, validate that the pattern preserves existing behavior through tests before and after.

AI generates pattern-heavy code by default. Push back on unnecessary abstraction. Ask: does this pattern solve a REAL problem here, or was it applied by habit?

## Related Skills

- golang-expert (Go-idiomatic patterns)
- typescript-expert (TS-idiomatic patterns)
- system-design (architectural patterns)
