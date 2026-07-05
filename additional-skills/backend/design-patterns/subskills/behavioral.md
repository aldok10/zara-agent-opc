# Behavioral Patterns

Patterns that define how objects communicate, assign responsibilities, and encapsulate algorithms.

## When to Load

- Encapsulating varying algorithms or business rules
- Decoupling event producers from consumers
- Managing object state transitions
- Building undo/redo or command queues

## Key Concepts

**Strategy** -- Define a family of algorithms, encapsulate each, make them interchangeable. Use when behavior varies by context (pricing rules, sort algorithms, auth methods).

**Observer** -- One-to-many dependency where dependents are notified of state changes. Use for event systems, reactive UI, pub/sub messaging.

**Command** -- Encapsulate a request as an object. Enables queuing, logging, undo, and macro composition. Use for task queues, CQRS write side, CLI actions.

**State** -- Object alters behavior when internal state changes, appearing to change class. Use for workflows, order status, connection lifecycle.

**Chain of Responsibility** -- Pass requests along a chain of handlers until one processes it. Use for middleware pipelines, validation chains, event bubbling.

## Patterns

```
// Strategy
interface PricingStrategy { calculate(order: Order): Money }
class BulkDiscount implements PricingStrategy { ... }
class LoyaltyDiscount implements PricingStrategy { ... }

// Command
interface Command { execute(): void; undo(): void }
class TransferFunds implements Command {
  execute() { this.from.debit(this.amount); this.to.credit(this.amount); }
  undo() { this.to.debit(this.amount); this.from.credit(this.amount); }
}

// State
class OrderState {
  static Pending = { cancel() { return OrderState.Cancelled; } };
  static Shipped = { cancel() { throw new Error("Cannot cancel shipped"); } };
}

// Chain of Responsibility
const pipeline = [authMiddleware, rateLimit, validate, handler];
const result = pipeline.reduce((req, mw) => mw(req), request);
```

## Gotchas

- Observer memory leaks: always unsubscribe/dispose when listener lifecycle ends
- Strategy without a default leads to null pointer errors on missing config
- Command undo complexity: compensating actions are not always the inverse
- State explosion: 10+ states with many transitions need a state machine library
- Chain with no terminal handler silently drops requests -- always add a fallback

## Verification

- Strategy: can you swap implementations at runtime without changing callers?
- Observer: are listeners cleaned up on component/service destruction?
- Command: does undo restore the exact prior state (test with property-based tests)?
- State: are all transitions explicitly defined? Are invalid transitions rejected?
- Chain: does every request reach exactly one handler or a defined fallback?
