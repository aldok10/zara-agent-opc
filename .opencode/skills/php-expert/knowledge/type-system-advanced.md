---
type: fact
title: "PHP Type System, Attributes, SPL, Enums - Advanced Reference"
---

# PHP Advanced: Types, Attributes, SPL, Enums

Continuation of advanced PHP mechanisms. Covers type system internals, attributes, serialization, SPL data structures, late static binding, enums, lazy objects, and error handling patterns.

## Type System Advanced Features

### Variance (Covariance & Contravariance, PHP 7.4+)

```php
// Covariance: child can NARROW return type
interface AnimalShelter {
    public function adopt(): Animal;
}
class CatShelter implements AnimalShelter {
    public function adopt(): Cat { ... }  // Cat extends Animal - VALID (covariant return)
}

// Contravariance: child can WIDEN parameter type
interface Logger {
    public function log(CatEvent $event): void;
}
class GeneralLogger implements Logger {
    public function log(AnimalEvent $event): void { ... }  // WIDER param - VALID (contravariant param)
}

// Rules:
// - Return types: covariant (can be more specific in child)
// - Parameter types: contravariant (can be more general in child)
// - Property types: invariant (must be exact same)
// - This matches Liskov Substitution Principle exactly
```

### Union & Intersection Types

```php
// Union (PHP 8.0+): A OR B
function process(int|string $input): array|false { ... }

// Intersection (PHP 8.1+): A AND B
function handle(Countable&Iterator $collection): void { ... }
// $collection must implement BOTH interfaces

// DNF (Disjunctive Normal Form, PHP 8.2+): combine both
function process((Countable&Iterator)|null $input): void { ... }
// Either (implements both Countable AND Iterator) OR null

// Type hierarchy:
// never < nothing (bottom type, function never returns)
// void = function returns but no value
// mixed = any type (top type)
// null = only null
// true/false = literal bool subtypes (8.0+)
```

### Generics (Workarounds, since PHP has no native generics)

```php
// PHPStan/Psalm template annotations (static analysis only, no runtime)

/**
 * @template T
 * @param class-string<T> $class
 * @return T
 */
function create(string $class): object {
    return new $class();
}

/**
 * @template T
 * @param T[] $items
 * @param callable(T): bool $predicate
 * @return T|null
 */
function findFirst(array $items, callable $predicate): mixed {
    foreach ($items as $item) {
        if ($predicate($item)) return $item;
    }
    return null;
}

// Runtime enforcement: assert/instanceof checks at boundaries
// Static enforcement: phpstan level 9+ catches misuse
```

---

## Attributes (Reflection-Based Metadata, PHP 8.0+)

### How Attributes Work Internally

```
Attributes are:
1. Compiled into opcodes (zero runtime cost if not read)
2. Stored in class/method/property/parameter metadata
3. Accessed ONLY via Reflection API (explicit opt-in)
4. Instantiated as objects when read (constructor args from attribute)

Key: attributes are INERT until reflected upon.
A framework/library must explicitly read them.
```

### Custom Attribute (Full Pattern)

```php
#[Attribute(Attribute::TARGET_METHOD | Attribute::IS_REPEATABLE)]
final class Route {
    public function __construct(
        public readonly string $path,
        public readonly string $method = 'GET',
        public readonly array $middleware = [],
    ) {}
}

#[Attribute(Attribute::TARGET_PROPERTY)]
final class Validate {
    public function __construct(
        public readonly string $rule,
        public readonly ?string $message = null,
    ) {}
}

// Usage
class UserController {
    #[Route('/users', method: 'GET')]
    #[Route('/users/{id}', method: 'GET')]
    public function list(): Response { ... }
}

// Reading (framework bootstrap)
$ref = new ReflectionMethod(UserController::class, 'list');
$routes = $ref->getAttributes(Route::class);
foreach ($routes as $attr) {
    $route = $attr->newInstance(); // instantiates Route object
    $router->register($route->method, $route->path, [UserController::class, 'list']);
}
```

### Attribute Targets & Flags

| Flag | Where applicable |
|------|-----------------|
| `TARGET_CLASS` | `#[Attr]` on class |
| `TARGET_METHOD` | `#[Attr]` on method |
| `TARGET_FUNCTION` | `#[Attr]` on function |
| `TARGET_PROPERTY` | `#[Attr]` on property |
| `TARGET_CLASS_CONSTANT` | `#[Attr]` on const |
| `TARGET_PARAMETER` | `#[Attr]` on param |
| `TARGET_ALL` | Any location |
| `IS_REPEATABLE` | Same attribute multiple times |

---

## Serialization & Cloning

```php
// __serialize() / __unserialize() (PHP 7.4+, replaces __sleep/__wakeup)
class Connection {
    private \PDO $pdo;
    private string $dsn;

    public function __serialize(): array {
        return ['dsn' => $this->dsn];
    }

    public function __unserialize(array $data): void {
        $this->dsn = $data['dsn'];
        $this->pdo = new \PDO($this->dsn);
    }
}

// NEVER unserialize untrusted data (RCE via __destruct/__wakeup chains)
// Use json_encode/json_decode for data interchange

// clone = shallow copy. Deep clone via __clone:
class Order {
    public function __clone(): void {
        $this->items = array_map(fn($item) => clone $item, $this->items);
    }
}

// PHP 8.3+: readonly property modification in __clone()
// PHP 8.5+: clone with property override
$updated = clone($original, title: 'New Title', updatedAt: new DateTimeImmutable());
```

---

## SPL Data Structures

| Need | Use | Why |
|------|-----|-----|
| Large numeric array (fixed size) | `SplFixedArray` | 50% less memory |
| Stack (LIFO) | `SplStack` | Type-safe, clear intent |
| Queue (FIFO) | `SplQueue` | O(1) enqueue/dequeue |
| Priority queue | `SplPriorityQueue` | Heap-based, O(log n) |
| Object storage (set) | `SplObjectStorage` | O(1) contains |
| Heap (min/max) | `SplMinHeap` / `SplMaxHeap` | Top-K, scheduling |

---

## Late Static Binding

```php
// static:: resolves to RUNTIME class (late binding)
// self:: resolves to DEFINITION class (early binding)

class Base {
    public static function create(): static {
        return new static();
    }
}

class Child extends Base {}

Child::create(); // Child instance (static:: resolved to Child)
// return type `static` (PHP 8.0+) = covariant with late binding
```

---

## Enums Advanced (PHP 8.1+)

```php
enum OrderStatus: string implements HasLabel {
    case Pending = 'pending';
    case Paid = 'paid';
    case Shipped = 'shipped';

    public function label(): string {
        return match ($this) {
            self::Pending => 'Awaiting Payment',
            self::Paid => 'Payment Received',
            self::Shipped => 'In Transit',
        };
    }

    // State machine
    public function canTransitionTo(self $next): bool {
        return match ($this) {
            self::Pending => in_array($next, [self::Paid]),
            self::Paid => $next === self::Shipped,
            self::Shipped => false,
        };
    }
}

// from/tryFrom
$status = OrderStatus::from('paid');       // throws on invalid
$status = OrderStatus::tryFrom('invalid'); // null
```

---

## Lazy Objects (PHP 8.4+)

```php
// Ghost object: initialized lazily on first property access
$reflector = new ReflectionClass(HeavyService::class);
$ghost = $reflector->newLazyGhost(function (HeavyService $obj): void {
    $obj->__construct(expensiveConnection());
});
$ghost->doWork(); // NOW constructor runs

// Use case: DI containers, ORMs (lazy-loaded relations)
// Replaces custom __get/__isset proxy patterns
```

---

## Error Handling Patterns

```php
// Hierarchy: match granularity to recovery action
abstract class DomainException extends \RuntimeException {
    public function __construct(
        string $message,
        public readonly array $context = [],
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }
}

// Error to Exception promotion (global, once)
set_error_handler(function (int $severity, string $message, string $file, int $line): never {
    throw new \ErrorException($message, 0, $severity, $file, $line);
});
```
