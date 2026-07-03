# PHP Code Review Subskill

## Activation Triggers
- Code review, SOLID, refactoring, code smell, naming, design principles
- "Is this clean", "review this", "improve this code", code quality

## Senior DNA
- Good code reads like well-written prose. If you need comments to explain it, rewrite it.
- strict_types in every file. No exceptions.
- Readonly by default. Mutability must be justified.
- Guard clauses eliminate nesting. Early return is your friend.

---

## SOLID in PHP

**SRP**: One reason to change.
```php
// BAD: Order handles persistence + email + PDF
// GOOD: Order holds state, OrderRepository persists, OrderMailer sends
```

**OCP**: Extend via strategy, not modification.
```php
interface DiscountStrategy {
    public function apply(Money $price): Money;
}
// Add new discounts without touching existing code
```

**LSP**: Subtypes must honor parent contracts.
```php
// If parent returns Collection, child cannot return null
```

**ISP**: Small, focused interfaces.
```php
// BAD: interface Repository { find(); save(); delete(); export(); import(); }
// GOOD: interface Readable { find(); } interface Writable { save(); delete(); }
```

**DIP**: Depend on abstractions.
```php
// Constructor takes PaymentGateway (interface), not StripeClient (concrete)
```

---

## Law of Demeter

```php
// BAD: reaching through objects
$city = $order->getCustomer()->getAddress()->getCity();

// GOOD: ask, don't dig
$city = $order->shippingCity();
```

---

## Tell Don't Ask

```php
// BAD: query then act
if ($account->getBalance() >= $amount) {
    $account->setBalance($account->getBalance() - $amount);
}

// GOOD: tell the object what to do
$account->withdraw($amount); // Throws if insufficient
```

---

## Immutability

```php
readonly class DateRange
{
    public function __construct(
        public DateTimeImmutable $start,
        public DateTimeImmutable $end,
    ) {
        if ($start > $end) {
            throw new InvalidDateRange();
        }
    }

    public function extend(DateInterval $interval): self
    {
        return new self($this->start, $this->end->add($interval));
    }
}
```

---

## Guard Clauses

```php
// BAD: deep nesting
function process(Order $order): void {
    if ($order->isPaid()) {
        if ($order->hasItems()) {
            if (!$order->isShipped()) {
                // actual logic buried here
            }
        }
    }
}

// GOOD: guard and return early
function process(Order $order): void {
    if (!$order->isPaid()) return;
    if (!$order->hasItems()) return;
    if ($order->isShipped()) return;

    // actual logic at top level
}
```

---

## Type Safety

```php
declare(strict_types=1); // Every. Single. File.

// No mixed unless interfacing with untyped libraries
// Use union types sparingly: string|int is a smell - use a value object
// Enums over string constants
enum OrderStatus: string {
    case Pending = 'pending';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
}
```

---

## Naming Conventions

- PER Coding Style (PSR-12 successor)
- PSR-4 autoloading
- Classes: `PascalCase`, methods: `camelCase`
- No abbreviations: `$repository` not `$repo`, `$transaction` not `$txn`
- Booleans: `isActive`, `hasPermission`, `canDelete`
- Collections: plural (`$orders`), single item: singular (`$order`)

---

## Code Smells Checklist

| Smell | Fix |
|-------|-----|
| God class (>300 lines) | Extract classes by responsibility |
| Feature envy | Move method to the class it envies |
| Primitive obsession | Value objects (Email, Money, UserId) |
| Shotgun surgery | Consolidate related logic |
| Long parameter list (>3) | Parameter object or builder |
| Boolean parameters | Split into two methods |
| Magic strings/numbers | Enums or named constants |

---

## No Magic

```php
// AVOID in application code:
__get, __set     // Hidden property access, breaks IDE
__call           // Hidden methods, untraceable
__toString       // Implicit conversion, surprising behavior

// ACCEPTABLE in framework/library code only (Eloquent, Doctrine proxies)
```
