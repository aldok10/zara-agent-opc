# Modern PHP Patterns (8.4+)

> PHP 8.4/8.5 language features replace boilerplate patterns. Use the LANGUAGE, not the pattern, when the language supports it directly.

## The Pattern-First Trap

Before PHP 8.4, we needed getters/setters/DTOs/builders because the language lacked features. Now:
- Property hooks replace getters/setters
- Asymmetric visibility replaces private property + getter
- `readonly` replaces immutable value object boilerplate
- `match` replaces strategy pattern for simple dispatch
- Enums replace state machines for finite states
- Pipe operator (8.5) replaces decorator chains for data transformation

**Rule**: If a language feature does it, don't wrap it in a pattern.

---

## Property Hooks (PHP 8.4+) - Replaces Getters/Setters

```php
// BEFORE (boilerplate)
class User {
    private string $email;
    public function getEmail(): string { return $this->email; }
    public function setEmail(string $email): void {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new \InvalidArgumentException();
        $this->email = strtolower($email);
    }
}

// AFTER (property hook - same behavior, zero boilerplate)
class User {
    public string $email {
        set => strtolower($value);
    }

    public string $fullName {
        get => "{$this->firstName} {$this->lastName}";
    }
}
```

**When to use**: Validation on set, computed values on get, formatting, lazy loading.
**When NOT to use**: Complex business logic (keep that in methods).

---

## Asymmetric Visibility (PHP 8.4+) - Replaces Private + Getter

```php
// BEFORE
class Order {
    private OrderStatus $status;
    public function getStatus(): OrderStatus { return $this->status; }
}

// AFTER - readable publicly, writable only internally
class Order {
    public private(set) OrderStatus $status = OrderStatus::Pending;

    public function ship(): void {
        if ($this->status !== OrderStatus::Paid) {
            throw new \DomainException('Cannot ship unpaid order');
        }
        $this->status = OrderStatus::Shipped;
    }
}

// Outside: $order->status (read OK), $order->status = ... (ERROR)
```

**Rule**: Use `public private(set)` as default for entity state. Expose for reading, protect mutation behind domain methods.

---

## Modern Value Objects (readonly + named args)

```php
// PHP 8.2+ - immutable, typed, self-validating
final readonly class Money
{
    public function __construct(
        public int $amount,
        public Currency $currency,
    ) {
        if ($amount < 0) throw new \DomainException('Negative amount');
    }

    public function add(self $other): self
    {
        if ($this->currency !== $other->currency) {
            throw new \DomainException('Currency mismatch');
        }
        return new self($this->amount + $other->amount, $this->currency);
    }

    public function equals(self $other): bool
    {
        return $this->amount === $other->amount
            && $this->currency === $other->currency;
    }
}

// Usage: new Money(amount: 1000, currency: Currency::USD)
```

---

## Modern DTOs (readonly + fromRequest)

```php
final readonly class CreateOrderDTO
{
    public function __construct(
        public string $customerId,
        /** @var list<array{productId: string, quantity: int}> */
        public array $items,
        public ?string $couponCode = null,
    ) {}

    public static function fromRequest(StoreOrderRequest $request): self
    {
        return new self(
            customerId: $request->validated('customer_id'),
            items: $request->validated('items'),
            couponCode: $request->validated('coupon_code'),
        );
    }
}
```

**Rule**: DTOs are `final readonly`. Named constructor (`fromRequest`, `fromArray`). No behavior beyond construction.

---

## Enums as State Machines

```php
enum OrderStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';

    /** @return list<self> */
    public function allowedTransitions(): array
    {
        return match($this) {
            self::Pending => [self::Paid, self::Cancelled],
            self::Paid => [self::Shipped, self::Cancelled],
            self::Shipped => [self::Delivered],
            self::Delivered, self::Cancelled => [],
        };
    }

    public function canTransitionTo(self $new): bool
    {
        return in_array($new, $this->allowedTransitions(), true);
    }

    public function transitionTo(self $new): self
    {
        if (!$this->canTransitionTo($new)) {
            throw new \DomainException("Cannot transition from {$this->value} to {$new->value}");
        }
        return $new;
    }
}
```

---

## Pipe Operator (PHP 8.5+) - Data Transformation

```php
// BEFORE (nested or temp variables)
$slug = strtolower(str_replace(' ', '-', trim($title)));

// AFTER (readable pipeline)
$slug = $title
    |> trim(...)
    |> fn($s) => str_replace(' ', '-', $s)
    |> strtolower(...);

// Real-world: request → DTO → validate → process → response
$response = $request
    |> CreateOrderDTO::fromRequest(...)
    |> $this->validator->validate(...)
    |> $this->orderService->create(...)
    |> OrderResource::from(...);
```

---

## Modern Constructor Patterns

```php
// Constructor promotion + readonly + defaults (PHP 8.2+)
final readonly class DatabaseConfig
{
    public function __construct(
        public string $host = 'localhost',
        public int $port = 5432,
        public string $database = 'app',
        public string $username = 'app',
        #[\SensitiveParameter]
        public string $password = '',
        public int $maxConnections = 20,
    ) {}
}

// Usage with named args - self-documenting
$config = new DatabaseConfig(
    host: env('DB_HOST'),
    password: env('DB_PASSWORD'),
    maxConnections: 50,
);
```

---

## Fibers for Concurrent I/O (PHP 8.1+)

```php
// Using AMPHP v3 (built on fibers)
use function Amp\async;
use function Amp\Future\await;

// Fan-out: 3 API calls run concurrently
$futures = [
    async(fn() => $this->httpClient->get('/api/users')),
    async(fn() => $this->httpClient->get('/api/orders')),
    async(fn() => $this->httpClient->get('/api/notifications')),
];

[$users, $orders, $notifications] = await($futures);
// Total time = slowest call, not sum of all three
```

**Rule**: Use fibers/async ONLY for I/O fan-out (multiple external calls). Sequential code is fine for single operations.

---

## Modern Error Handling

```php
// Result pattern (no exceptions for expected failures)
/** @template T */
final readonly class Result
{
    /** @param T|null $value */
    private function __construct(
        public bool $ok,
        private mixed $value = null,
        private ?string $error = null,
    ) {}

    /** @return self<T> */
    public static function success(mixed $value): self { return new self(true, $value); }
    public static function failure(string $error): self { return new self(false, error: $error); }

    /** @return T */
    public function unwrap(): mixed {
        return $this->ok ? $this->value : throw new \RuntimeException($this->error);
    }
}

// Usage
function findUser(string $id): Result {
    $user = User::find($id);
    return $user ? Result::success($user) : Result::failure("User $id not found");
}

$result = findUser('123');
if (!$result->ok) {
    return response()->json(['error' => $result->error], 404);
}
$user = $result->unwrap();
```

**Rule**: Use exceptions for UNEXPECTED failures (DB down, network timeout). Use Result for EXPECTED failures (user not found, validation failed).

---

## Summary: What Replaces What

| Old Pattern | Modern PHP (8.4+) |
|-------------|-------------------|
| Getter/Setter methods | Property hooks `{ get => ...; set => ...; }` |
| Private prop + getter | `public private(set)` asymmetric visibility |
| Builder pattern (simple) | Named args + constructor promotion |
| Strategy (simple dispatch) | `match` expression |
| State machine class | Enum with `allowedTransitions()` method |
| Decorator chain (data) | Pipe operator `\|>` (8.5+) |
| Null checks everywhere | `?->` nullsafe + `??` coalescing |
| Type checking `instanceof` | Union/intersection types + `match` |
| Abstract factory (simple) | `enum` + `match` → `Enum::create()` |
| Immutable object boilerplate | `final readonly class` + constructor promotion |
