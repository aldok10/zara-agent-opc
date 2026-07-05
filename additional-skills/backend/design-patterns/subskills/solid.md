# SOLID Principles

Five principles for writing maintainable, extensible object-oriented code that resists rigidity and fragility.

## When to Load

- Reviewing or refactoring class design
- Deciding where to place new functionality
- Evaluating coupling and cohesion
- Designing interfaces and abstractions

## Key Concepts

**Single Responsibility (SRP)** -- A class should have one reason to change. "Reason to change" maps to one actor or stakeholder. Split classes that serve multiple audiences.

**Open/Closed (OCP)** -- Open for extension, closed for modification. Add behavior via new code (polymorphism, composition), not by editing existing code. Strategy and Decorator enable this.

**Liskov Substitution (LSP)** -- Subtypes must be substitutable for their base types without altering correctness. Preconditions cannot be strengthened, postconditions cannot be weakened.

**Interface Segregation (ISP)** -- No client should depend on methods it does not use. Prefer many small interfaces over one large one. Split by consumer need.

**Dependency Inversion (DIP)** -- High-level modules depend on abstractions, not concretions. Low-level modules implement those abstractions. Both depend on the interface boundary.

## Patterns

```
// SRP violation: UserService handles auth AND email AND persistence
// Fix: split into AuthService, NotificationService, UserRepository

// OCP via Strategy
interface TaxCalculator { compute(order: Order): Money }
// Adding new tax rules = new class, not editing existing

// LSP violation
class Rectangle { setWidth(w) { this.w = w } }
class Square extends Rectangle { setWidth(w) { this.w = w; this.h = w } }
// Fix: use a Shape interface, don't inherit

// ISP
interface Readable { read(): Buffer }
interface Writable { write(data: Buffer): void }
// Not: interface ReadWriteCloseSyncAsync { ... }

// DIP
class OrderService {
  constructor(private repo: OrderRepository) {} // abstraction, not PgOrderRepo
}
```

## Gotchas

- SRP taken too far creates "ravioli code" -- hundreds of tiny classes with no cohesion
- OCP does not mean never modify code -- it means design for likely extension points
- LSP violations hide in "is-a" hierarchies that model real-world taxonomy poorly
- ISP: don't split interfaces so fine that you need 10 injections for one operation
- DIP without a DI container leads to manual wiring hell in the composition root

## Verification

- SRP: describe what the class does in one sentence without "and" or "or"
- OCP: can you add the next likely feature without editing existing code?
- LSP: do all tests for the base type pass when run against any subtype?
- ISP: does each interface have exactly one consumer archetype?
- DIP: can you swap implementations (prod, test, mock) by changing only config/wiring?
