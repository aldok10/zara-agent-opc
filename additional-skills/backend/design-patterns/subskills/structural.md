# Structural Patterns

Patterns that compose classes and objects into larger structures while keeping them flexible and efficient.

## When to Load

- Integrating incompatible interfaces
- Adding behavior without modifying existing classes
- Simplifying complex subsystem interactions
- Controlling access to objects

## Key Concepts

**Adapter** -- Convert one interface into another that clients expect. Use when integrating third-party libraries or legacy code with different interfaces.

**Decorator** -- Attach additional responsibilities dynamically. Use when subclassing would create an explosion of combinations (e.g., logging + caching + retry).

**Facade** -- Provide a simplified interface to a complex subsystem. Use to reduce coupling between client code and internal module structure.

**Proxy** -- Control access to an object. Types: virtual (lazy loading), protection (access control), remote (network abstraction), caching.

**Composite** -- Treat individual objects and compositions uniformly via a tree structure. Use for file systems, UI components, org hierarchies.

## Patterns

```
// Decorator (function composition)
const fetchUser = pipe(
  withRetry({ attempts: 3 }),
  withCache({ ttl: 60 }),
  withLogging("fetchUser"),
)(baseFetchUser);

// Adapter
class StripeAdapter implements PaymentGateway {
  constructor(private stripe: Stripe) {}
  async charge(amount: Money): Promise<Receipt> {
    const result = await this.stripe.charges.create({...});
    return this.toReceipt(result);
  }
}

// Proxy (lazy loading)
class LazyImage implements Image {
  private loaded: RealImage | null = null;
  display() {
    if (!this.loaded) this.loaded = new RealImage(this.path);
    return this.loaded.display();
  }
}
```

## Gotchas

- Decorator ordering matters -- logging wrapping cache behaves differently than cache wrapping logging
- Facade that grows too large becomes a "god object" -- split by domain
- Adapter hiding too much difference signals a deeper design mismatch
- Proxy transparency: callers should not need to know they have a proxy (Liskov)
- Composite with mixed leaf/node behavior leads to no-op methods on leaves

## Verification

- Adapter: does replacing the adaptee require zero changes in client code?
- Decorator: can you stack/remove decorators independently without side effects?
- Facade: does the facade have a single clear responsibility?
- Proxy: does it satisfy the same interface contract as the real subject?
- Composite: can you traverse the tree uniformly without type-checking nodes?
