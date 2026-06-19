# DevIQ Knowledge Summary

Quick-reference condensed summaries of all 12 DevIQ sections.

## Antipatterns (37 articles)
**Core idea**: Common but counterproductive approaches that lead to poor outcomes.
**Key articles**: Big Ball of Mud, Spaghetti Code, Golden Hammer, Feature Creep, Analysis Paralysis, Death March, Copy-Paste Programming, Magic Strings, Service Locator, Not Invented Here, Mushroom Management, Duct Tape Coder, Static Cling, Smoke and Mirrors, Waterfall, Witches' Brew Architecture

## Architecture (8 articles)
**Core idea**: High-level structural patterns for organizing code.
**Key articles**: Clean Architecture, Modular Monolith, Event-Driven Architecture, Vertical Slice Architecture, Layered Architecture, N-Tier Architecture, Web-Queue-Worker Architecture, Competing Consumers
**Central principle**: Separation of Concerns with dependency direction pointing inward

## Code Smells (39 articles)
**Core idea**: Surface-level indicators of deeper problems in code.
**Key articles**: Long Method, Primitive Obsession, Feature Envy, Shotgun Surgery, Switch Statements, Dead Code, Duplicate Code, Data Clumps, Long Parameter List, Message Chains, Middle Man, Inappropriate Intimacy, Divergent Change, Conditional Complexity, Speculative Generality, Poorly Written Tests

## Design Patterns (39 articles)
**Core idea**: Reusable solutions to common problems with well-known tradeoffs.
**Key articles**: Strategy, Factory Method, Abstract Factory, Builder, Singleton, Adapter, Facade, Composite, Decorator, Proxy, Observer, Command, Chain of Responsibility, State, Template Method, Visitor, Mediator, Memento, Iterator, Flyweight, CQRS, Repository, Specification, Domain Events, Unit of Work, Strangler Fig, Guard Clause, Null Object, Object Mother

## Domain-Driven Design (16 articles)
**Core idea**: Aligning software design with domain understanding.
**Key patterns**: Aggregate, Entity, Value Object, Domain Events, Bounded Context, Ubiquitous Language, Context Mapping, Anti-Corruption Layer, Shared Kernel, Event Storming, Domain Storytelling
**Key antipattern**: Anemic Domain Model
**Sections**: Strategic Design (bounded contexts, context maps), Tactical Design (entities, value objects, aggregates, domain events)

## Laws (20 articles)
**Core idea**: Immutable principles that describe how systems and organizations behave.
**Key laws**: Conway's Law (systems mirror communication), Brooks' Law (adding people to late project makes it later), Goodhart's Law (metric becomes useless when it becomes a target), Law of Demeter (talk only to immediate friends), Amdahl's Law (speedup limited by serial portion), Gall's Law (complex systems evolve from simple systems), Hofstadter's Law (everything takes longer than expected), Parkinson's Law (work expands to fill available time), Cunningham's Law (best way to get right answer is to post wrong one)

## Practices (33 articles)
**Core idea**: Proven engineering practices that improve outcomes.
**Key articles**: Test-Driven Development, Continuous Integration, Refactoring, Dependency Injection, Pair Programming, Collective Code Ownership, Simple Design, Naming Things, Rubber Duck Debugging, Timeboxing, Shipping is a Feature, Pain-Driven Development, Red-Green-Refactor, Code Readability, Defensive Programming, Observability, Vertical Slices, Whole Team Activity

## Principles (26 articles)
**Core idea**: Design principles that guide software structure decisions.
**Key articles**: SOLID (SRP, OCP, LSP, ISP, DIP), DRY, YAGNI, Separation of Concerns, Encapsulation, Fail Fast, Tell Don't Ask, Explicit Dependencies Principle, Hollywood Principle (Don't Call Us, We'll Call You), Boy Scout Rule, Least Astonishment, Persistence Ignorance, Stable Dependencies, Make Illegal States Unrepresentable, Once and Only Once, Architectural Agility

## Terms (7 articles)
**Core idea**: Glossary of important software engineering concepts.
**Key articles**: Technical Debt, Cohesion, Cyclomatic Complexity, Cognitive Complexity, Bus Factor, Aggregate Complexity, Kinds of Models

## Testing (7 articles)
**Core idea**: Systematic approaches to verifying software correctness.
**Key articles**: Testing Pyramid, Unit Tests, Integration Tests, Functional Tests, Front-End Tests, Automated Tests, Arrange-Act-Attend
**Key concept**: Pyramid shape — many unit tests, fewer integration tests, fewest end-to-end tests

## Tools (2 articles)
**Core idea**: Developer tools that enable engineering workflows.
**Key articles**: Build Server, Version Control

## Values (5 articles)
**Core idea**: Human values that underpin effective engineering teams.
**Key values**: Communication, Courage, Feedback, Respect, Simplicity
**Source**: XP values — these are the human foundation that makes practices work
