# Creational Patterns

Patterns that abstract object instantiation, making systems independent of how objects are created, composed, and represented.

## When to Load

- Designing object creation logic that needs flexibility
- Reducing coupling between client code and concrete classes
- Managing complex initialization or resource pooling

## Key Concepts

**Factory Method** -- Define an interface for creating objects, let subclasses decide which class to instantiate. Use when a class cannot anticipate the type it needs to create.

**Abstract Factory** -- Produce families of related objects without specifying concrete classes. Use when the system must work with multiple product families interchangeably.

**Builder** -- Separate construction of a complex object from its representation. Use when construction involves many steps or the object has many optional parameters.

**Singleton** -- Ensure a class has exactly one instance with a global access point. Use sparingly -- prefer dependency injection. Valid for connection pools, config registries, thread pools.

**Object Pool** -- Reuse expensive-to-create objects from a pre-initialized pool. Use for database connections, thread workers, or GPU buffers where allocation cost dominates.

## Patterns

```
// Factory Method
interface PaymentProcessor { charge(amount: number): Result }
class PaymentFactory {
  create(type: string): PaymentProcessor { ... }
}

// Builder
const query = new QueryBuilder()
  .select("users")
  .where("active", true)
  .limit(10)
  .build();

// Object Pool
const pool = new ConnectionPool({ min: 5, max: 20, idleTimeout: 30000 });
const conn = await pool.acquire();
try { await conn.query(sql); }
finally { pool.release(conn); }
```

## Gotchas

- Singleton makes testing hard -- always inject dependencies instead of importing globals
- Abstract Factory over-engineering: don't use when you only have one product family
- Builder without validation: always validate required fields in `build()`
- Object Pool without health checks leads to returning broken connections
- Factory explosion: if you have 20+ product types, consider a registry pattern instead

## Verification

- Factory: can you add a new product type without modifying existing client code?
- Builder: does `build()` throw on invalid/incomplete state?
- Singleton: is it injected (testable) or imported (coupled)?
- Pool: does it handle exhaustion gracefully (queue, timeout, or reject)?
- All: do unit tests pass without needing concrete implementations?
