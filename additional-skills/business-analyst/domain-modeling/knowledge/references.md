# References

## DDD Core Concepts (10 refs)
- **Domain-Driven Design Reference** -- https://www.domainlanguage.com/ddd/reference/ -- Eric Evans' DDD reference summary
- **Bounded Contexts** -- https://martinfowler.com/bliki/BoundedContext.html -- Martin Fowler's explanation of bounded contexts
- **Context Mapping** -- https://github.com/ddd-crew/context-mapping -- Patterns for context relationships
- **Ubiquitous Language** -- https://martinfowler.com/bliki/UbiquitousLanguage.html -- Shared language between domain experts and developers
- **Aggregates** -- https://www.domainlanguage.com/ddd/reference/ -- Consistency boundaries and aggregate roots
- **Domain Events** -- https://martinfowler.com/eaaDev/DomainEvent.html -- Capturing significant domain occurrences
- **Value Objects** -- https://martinfowler.com/bliki/ValueObject.html -- Immutable domain concepts
- **Entities** -- https://www.domainlanguage.com/ddd/reference/ -- Objects with identity and lifecycle
- **Repositories** -- https://martinfowler.com/eaaCatalog/repository.html -- Collection-like interfaces for aggregate access
- **Domain Services** -- https://www.domainlanguage.com/ddd/reference/ -- Stateless operations that don't belong to entities

## Event Storming (8 refs)
- **Event Storming** -- https://www.eventstorming.com/ -- Alberto Brandolini's collaborative modeling technique
- **Big Picture Event Storming** -- https://github.com/ddd-crew/eventstorming-glossary-cheat-sheet -- Sticky note colors and conventions
- **Process Modeling** -- https://github.com/ddd-crew/eventstorming-glossary-cheat-sheet -- From events to process flows
- **Design Level Event Storming** -- https://www.eventstorming.com/ -- From big picture to bounded context design
- **Facilitation Guide** -- https://github.com/mariuszgil/awesome-eventstorming -- Resources for running sessions
- **Remote Event Storming** -- https://miro.com/templates/event-storming/ -- Running sessions with distributed teams
- **Event Storming to Code** -- https://github.com/ddd-crew/ddd-starter-modelling-process -- From workshop to implementation
- **Hotspots** -- https://www.eventstorming.com/ -- Identifying areas of confusion or conflict

## Strategic Design (8 refs)
- **Context Map Patterns** -- https://github.com/ddd-crew/context-mapping -- Shared Kernel, Customer-Supplier, ACL, etc.
- **Anti-Corruption Layer** -- https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer -- Protecting domain from external models
- **Subdomains** -- https://www.domainlanguage.com/ddd/reference/ -- Core, supporting, and generic subdomains
- **Strategic Classification** -- https://github.com/ddd-crew/core-domain-charts -- Core domain charts for investment decisions
- **Team Topologies + DDD** -- https://teamtopologies.com/key-concepts -- Aligning teams with bounded contexts
- **Bubble Contexts** -- https://medium.com/nick-tune-tech-strategy-blog/modelling-bounded-contexts-with-the-bounded-context-design-canvas-cc62a9c3c98d -- Bounded Context Canvas
- **Legacy System Integration** -- https://martinfowler.com/bliki/StranglerFigApplication.html -- Gradually replacing legacy domains
- **Domain Storytelling** -- https://domainstorytelling.org/ -- Visual collaborative modeling technique

## Tactical Patterns (9 refs)
- **Aggregate Design** -- https://www.dddcommunity.org/library/vernon_2011/ -- Vaughn Vernon's aggregate rules
- **CQRS** -- https://martinfowler.com/bliki/CQRS.html -- Command Query Responsibility Segregation
- **Event Sourcing** -- https://martinfowler.com/eaaDev/EventSourcing.html -- Storing state as event sequences
- **Saga Pattern** -- https://microservices.io/patterns/data/saga.html -- Distributed transaction management
- **Specification Pattern** -- https://en.wikipedia.org/wiki/Specification_pattern -- Composable business rules
- **Factory Pattern** -- https://www.domainlanguage.com/ddd/reference/ -- Complex aggregate creation
- **Domain Events in Practice** -- https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/domain-events-design-implementation -- Microsoft's implementation guide
- **Hexagonal Architecture** -- https://alistair.cockburn.us/hexagonal-architecture/ -- Ports and adapters for domain isolation
- **Clean Architecture** -- https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html -- Domain at the center of dependency rings
