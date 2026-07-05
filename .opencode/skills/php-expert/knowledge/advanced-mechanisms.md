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



See also: `knowledge/type-system-advanced.md` for type variance, attributes, SPL, enums, serialization, lazy objects, and error handling patterns.
