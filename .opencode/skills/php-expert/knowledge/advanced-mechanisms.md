---
type: fact
title: "Advanced PHP Mechanisms - Generators, Closures, Type System, Attributes"
---

# Advanced PHP Mechanisms

Expert-level PHP features and their internals. Load when dealing with generators, closures, type variance, attributes, serialization, or functional patterns.

## Generators & yield (Deep Dive)

### Internals

```
Generator = special function that returns a Generator object (implements Iterator).
When called, the function body does NOT execute immediately.
Instead: compiler creates a Generator object with suspended execution state.

Each yield:
1. Saves current execution frame (opline, local vars, stack)
2. Returns yielded value to caller
3. Next call to ->next() / ->send() resumes from saved state

Memory: only ONE frame active at a time. O(1) regardless of iteration count.
Unlike arrays: no need to build entire dataset in memory.
```

### Generator as Coroutine (Bidirectional Communication)

```php
// yield can RECEIVE values (via send()) and RETURN a final value

function accumulator(): Generator {
    $total = 0;
    while (true) {
        $value = yield $total;  // yield current total, receive new value
        if ($value === null) break;
        $total += $value;
    }
    return $total;  // final return value (accessible via getReturn())
}

$gen = accumulator();
$gen->current();       // 0 (first yield)
$gen->send(10);        // sends 10, resumes, yields 10
$gen->send(20);        // sends 20, resumes, yields 30
$gen->send(null);      // sends null, breaks loop
$gen->getReturn();     // 30 (final return value)
```

### yield from (Delegation)

```php
// Delegates to another generator or Traversable
function innerGenerator(): Generator {
    yield 1;
    yield 2;
    return 'inner-result';  // returned to delegator, not to outer caller
}

function outerGenerator(): Generator {
    $result = yield from innerGenerator();  // yields 1, 2
    // $result === 'inner-result'
    yield 3;
}

// yield from:
// - Forwards ->send() to inner generator
// - Forwards ->throw() to inner generator
// - Flattens the iteration (no nesting)
// - Captures inner return value

// Recursive tree traversal with O(1) extra memory:
function walkTree(Node $node): Generator {
    yield $node->value;
    foreach ($node->children as $child) {
        yield from walkTree($child);  // O(depth) stack, not O(nodes) memory
    }
}
```

### Generator Patterns

```php
// Pattern 1: Lazy pipeline (Unix pipes in PHP)
function lines(string $file): Generator {
    $f = fopen($file, 'r');
    try {
        while (($line = fgets($f)) !== false) {
            yield rtrim($line, "\n");
        }
    } finally {
        fclose($f);  // cleanup when generator is destroyed
    }
}

function grep(Generator $input, string $pattern): Generator {
    foreach ($input as $line) {
        if (preg_match($pattern, $line)) {
            yield $line;
        }
    }
}

function take(Generator $input, int $n): Generator {
    $i = 0;
    foreach ($input as $item) {
        if ($i++ >= $n) return;
        yield $item;
    }
}

// Compose: processes one line at a time, O(1) memory
$results = take(grep(lines('/var/log/syslog'), '/error/i'), 10);
foreach ($results as $line) {
    echo $line . "\n";
}

// Pattern 2: Batched processing (chunk large datasets)
function batch(iterable $items, int $size): Generator {
    $batch = [];
    foreach ($items as $item) {
        $batch[] = $item;
        if (count($batch) === $size) {
            yield $batch;
            $batch = [];
        }
    }
    if ($batch) yield $batch;
}

// Process 1M rows in batches of 1000
foreach (batch(queryAllUsers(), 1000) as $chunk) {
    insertBulk($chunk);
}

// Pattern 3: Async-like with generators (pre-Fiber pattern)
// Historical: ReactPHP/AMPHP v2 used generators as coroutines
// Modern: use Fibers (PHP 8.1+). Generators for data streaming only.
```

### Generator Gotchas

| Gotcha | Problem | Fix |
|--------|---------|-----|
| Return type | Generator function returns `Generator`, not the yielded type | Annotate: `@return Generator<int, string, mixed, void>` |
| `yield` in expression | Needs parentheses: `$x = (yield $v)` | Always parenthesize yield in expressions |
| Generator consumed once | Cannot rewind a generator | Create new generator instance |
| Exception in generator | Uncaught exception = generator dead | Use try/finally for cleanup |
| Memory of closed generator | Generator closes = frame freed | Close early with `->throw()` if not consuming all |

---

## Closures & Callables (Deep Dive)

### Closure Internals

```
Closure in PHP = instance of the Closure class (final, internal).
Not just a function pointer. Has:
- Bound scope (class context for $this and private access)
- Bound $this (object context)
- Captured variables (use clause, by-value or by-reference)
- Parameter signature and return type
```

### First-Class Callables (PHP 8.1+)

```php
// Create Closure from any callable
$fn = strlen(...);              // Closure from function
$fn = $obj->method(...);       // Closure from method
$fn = MyClass::staticMethod(...); // Closure from static method

// Advantage: type-safe, works with static analysis
// Old way: 'strlen' (string), [$obj, 'method'] (array) - no type checking
```

### Closure::bind and Closure::call

```php
// bind(): create new closure with different $this and scope
$reader = Closure::bind(
    function () { return $this->privateProperty; },
    $object,
    get_class($object)  // scope for private access
);
$value = $reader();

// call(): bind and execute in one step (faster, no intermediate Closure)
$value = Closure::fromCallable(function () {
    return $this->privateProperty;
})->call($object);

// Use case: testing (access private state), serialization libraries, ORMs
```

### Variable Capture Semantics

```php
$x = 1;

// By value (copy at definition time)
$fn = function () use ($x) { return $x; };
$x = 2;
$fn(); // 1 (captured the value at definition)

// By reference (shares the variable)
$fn = function () use (&$x) { return $x; };
$x = 2;
$fn(); // 2 (shares reference)

// Arrow functions: auto-capture by VALUE (PHP 7.4+)
$fn = fn() => $x;  // captures $x by value, no explicit use()
$x = 2;
$fn(); // 1 (captured at definition)

// Arrow functions CANNOT capture by reference (use regular closure for that)
```

### Higher-Order Functions

```php
// Functions that take/return functions

// Memoization
function memoize(Closure $fn): Closure {
    $cache = [];
    return function () use ($fn, &$cache): mixed {
        $key = serialize(func_get_args());
        return $cache[$key] ??= $fn(...func_get_args());
    };
}

// Retry with backoff
function retry(int $times, Closure $fn, int $delayMs = 100): mixed {
    $lastException = null;
    for ($i = 0; $i < $times; $i++) {
        try {
            return $fn();
        } catch (\Throwable $e) {
            $lastException = $e;
            usleep($delayMs * 1000 * (2 ** $i));
        }
    }
    throw $lastException;
}

// Compose (left-to-right, like pipe)
function compose(Closure ...$fns): Closure {
    return function (mixed $value) use ($fns): mixed {
        foreach ($fns as $fn) {
            $value = $fn($value);
        }
        return $value;
    };
}
```

### Pipe Operator (PHP 8.5+) & Partial Application (8.6+)

```php
// Pipe: left-to-right function composition
$result = $input
    |> strtolower(...)
    |> trim(...)
    |> fn($s) => str_replace(' ', '-', $s);

// PHP 8.6: Partial Application
$slug = $input
    |> strtolower(?)           // partial: pipe value fills ?
    |> trim(?)
    |> str_replace(' ', '-', ?, ?);  // partial: first ? from pipe

// Before pipe (PHP 8.4-):
$result = str_replace(' ', '-', trim(strtolower($input)));
// or:
$result = compose(
    strtolower(...),
    trim(...),
    fn($s) => str_replace(' ', '-', $s),
)($input);
```

---

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

### Object Serialization

```php
// __serialize() / __unserialize() (PHP 7.4+, replaces __sleep/__wakeup)
class Connection {
    private \PDO $pdo;
    private string $dsn;

    public function __serialize(): array {
        return ['dsn' => $this->dsn]; // only serialize what's needed
    }

    public function __unserialize(array $data): void {
        $this->dsn = $data['dsn'];
        $this->pdo = new \PDO($this->dsn); // reconnect on unserialize
    }
}

// NEVER unserialize untrusted data (RCE via __destruct/__wakeup chains)
// Use json_encode/json_decode for data interchange
```

### Cloning Deep Dive

```php
// clone = shallow copy (copies properties, not nested objects)
$a = new Order(items: [new Item('A'), new Item('B')]);
$b = clone $a;
$b->items[0]->name = 'C'; // ALSO changes $a->items[0] (shared reference!)

// Deep clone via __clone
class Order {
    public function __clone(): void {
        // Deep copy nested objects
        $this->items = array_map(fn($item) => clone $item, $this->items);
        $this->createdAt = new DateTimeImmutable();
    }
}

// PHP 8.3+: readonly property modification in __clone()
class Immutable {
    public function __construct(
        public readonly string $name,
        public readonly DateTimeImmutable $createdAt,
    ) {}

    public function __clone(): void {
        $this->createdAt = new DateTimeImmutable(); // allowed in __clone since 8.3
    }
}

// PHP 8.5+: clone with property override
$updated = clone($original, title: 'New Title', updatedAt: new DateTimeImmutable());
// Cleaner than: $new = clone $original; $new->title = 'New'; (doesn't work with readonly)
```

---

## SPL Data Structures (When Arrays Aren't Enough)

### When to Use SPL

| Need | Use | Why |
|------|-----|-----|
| Large numeric array (fixed size) | `SplFixedArray` | 50% less memory, no hash table |
| Stack (LIFO) | `SplStack` | Type-safe, clear intent |
| Queue (FIFO) | `SplQueue` | O(1) enqueue/dequeue |
| Priority queue | `SplPriorityQueue` | Heap-based, O(log n) insert |
| Doubly-linked list | `SplDoublyLinkedList` | O(1) insert/remove at ends |
| Object storage (set) | `SplObjectStorage` | O(1) contains, attach metadata |
| Heap (min/max) | `SplMinHeap` / `SplMaxHeap` | Efficient top-K, scheduling |

```php
// SplFixedArray: 50% less memory for large numeric arrays
$arr = new SplFixedArray(1_000_000);
$arr[0] = 'value';
// No hash table, no string keys, direct index. 8 bytes/element vs 16+ for array.

// SplPriorityQueue: process highest priority first
$queue = new SplPriorityQueue();
$queue->insert('critical-job', 100);
$queue->insert('low-job', 1);
$queue->insert('medium-job', 50);
$queue->extract(); // 'critical-job' (highest priority first)

// SplObjectStorage: set of objects with optional metadata
$listeners = new SplObjectStorage();
$listeners->attach($listener, ['priority' => 10]);
$listeners->contains($listener); // true, O(1)
$listeners->detach($listener);
```

---

## Late Static Binding

```php
// static:: resolves to the RUNTIME class (late binding)
// self:: resolves to the DEFINITION class (early binding)

class Base {
    public static function create(): static {
        return new static(); // returns instance of called class
    }

    public static function className(): string {
        return static::class; // resolved at call time
    }
}

class Child extends Base {}

Base::create();       // Base instance
Child::create();      // Child instance (static:: resolved to Child)
Base::className();    // "Base"
Child::className();   // "Child"

// Use case: factory methods, fluent interfaces, active record patterns
// return type `static` (PHP 8.0+) = covariant with late binding
```

---

## Enums Advanced (PHP 8.1+)

```php
// Backed enum with interface implementation
enum OrderStatus: string implements HasLabel {
    case Pending = 'pending';
    case Paid = 'paid';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';

    // Methods on enum
    public function label(): string {
        return match ($this) {
            self::Pending => 'Awaiting Payment',
            self::Paid => 'Payment Received',
            self::Shipped => 'In Transit',
            self::Delivered => 'Delivered',
            self::Cancelled => 'Cancelled',
        };
    }

    // State machine: which transitions are valid
    public function canTransitionTo(self $next): bool {
        return match ($this) {
            self::Pending => in_array($next, [self::Paid, self::Cancelled]),
            self::Paid => in_array($next, [self::Shipped, self::Cancelled]),
            self::Shipped => $next === self::Delivered,
            self::Delivered, self::Cancelled => false,
        };
    }

    // Enum as collection
    public static function active(): array {
        return array_filter(self::cases(), fn(self $s) => !in_array($s, [self::Cancelled]));
    }
}

// from/tryFrom
$status = OrderStatus::from('paid');         // OrderStatus::Paid (throws on invalid)
$status = OrderStatus::tryFrom('invalid');   // null (no throw)

// Enum in match (exhaustiveness checked by static analysis)
$color = match ($status) {
    OrderStatus::Pending => 'yellow',
    OrderStatus::Paid, OrderStatus::Shipped => 'blue',
    OrderStatus::Delivered => 'green',
    OrderStatus::Cancelled => 'red',
};
```

---

## Named Arguments & Variadic Deep Patterns

```php
// Named args: skip optional parameters, self-documenting
$result = array_slice(
    array: $data,
    offset: 5,
    length: 10,
    preserve_keys: true,  // skipped the middle params
);

// Spread with named args
function createUser(string $name, string $email, string $role = 'user'): User { ... }

$defaults = ['role' => 'admin'];
$userData = ['name' => 'John', 'email' => 'john@example.com'];
$user = createUser(...$userData, ...$defaults);  // named spread

// Variadic with type enforcement
function sum(int ...$numbers): int {
    return array_sum($numbers);
}
sum(1, 2, 3); // 6
sum(1, 'a');  // TypeError (strict_types enforced per-element)
```

---

## Lazy Objects (PHP 8.4+)

```php
// Lazy initialization: object not fully created until first property access
// Two strategies: ghost objects and proxy objects

// Ghost object: the object itself is initialized lazily
$reflector = new ReflectionClass(HeavyService::class);
$ghost = $reflector->newLazyGhost(function (HeavyService $obj): void {
    // Called on first property access
    $obj->__construct(expensiveConnection());
});
// $ghost exists but constructor hasn't run yet
$ghost->doWork(); // NOW constructor runs, then method executes

// Proxy object: separate proxy delegates to real object
$proxy = $reflector->newLazyProxy(function (): HeavyService {
    return new HeavyService(expensiveConnection());
});

// Use case: dependency injection containers, ORMs (lazy-loaded relations)
// Replaces custom __get/__isset proxy patterns
```

---

## Error Handling Expert Patterns

```php
// Match exception granularity to recovery action
// Never catch \Exception or \Throwable blindly in domain code

// Hierarchy design
abstract class DomainException extends \RuntimeException {
    public function __construct(
        string $message,
        public readonly array $context = [],
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }
}

class InsufficientFunds extends DomainException {}
class OrderNotFound extends DomainException {}

// set_exception_handler for truly unhandled
set_exception_handler(function (\Throwable $e): never {
    // Log, notify, render error page
    error_log($e->getMessage());
    http_response_code(500);
    exit(1);
});

// Error to Exception promotion (global, once)
set_error_handler(function (int $severity, string $message, string $file, int $line): never {
    throw new \ErrorException($message, 0, $severity, $file, $line);
});
```
