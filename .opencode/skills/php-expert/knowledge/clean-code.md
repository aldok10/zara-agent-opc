# Clean Code PHP - Complete Guard Rails

Source: [aldok10/clean-code-php](https://github.com/aldok10/clean-code-php)

Apply ALL these rules to every PHP code generated. No exceptions.

## Senior DNA Applied

- **Gall's Law**: Start with the simplest implementation that passes tests. Refactor when pain emerges.
- **Pain-Driven Development**: Extract abstractions at 3 occurrences, not 1. Wrong abstraction > duplication.
- **Premature Optimization**: Write readable code first. Profile later. Never optimize "because it might be slow."
- **Not Invented Here**: Check PHP stdlib (`str_contains`, `array_filter`, `json_validate`). Check Composer packages. Only build custom when nothing fits YOUR domain need.
- **Speculative Generality**: Don't build interfaces for single implementations. Don't create abstract classes "for the future."
- **Law of Demeter**: `$order->getShippingCity()` not `$order->getCustomer()->getAddress()->getCity()`
- **Tell Don't Ask**: `$account->withdraw($amount)` not `if ($account->getBalance() >= $amount) { ... }`
- **Fail Fast**: Validate at the boundary (Form Request, type declarations). Never let invalid data propagate deep.

---

## Variables

### Use meaningful names
```php
// BAD
$ymdstr = $moment->format('y-m-d');
$l = ['Austin', 'New York'];
for ($i = 0; $i < count($l); $i++) { $li = $l[$i]; dispatch($li); }

// GOOD
$currentDate = $moment->format('y-m-d');
$locations = ['Austin', 'New York'];
foreach ($locations as $location) { dispatch($location); }
```

### Same vocabulary for same concept
```php
// BAD - inconsistent naming
getUserInfo(); getUserData(); getUserRecord();

// GOOD - one name, one concept
getUser();
```

### Named constants, not magic numbers
```php
// BAD
if ($user->access & 4) { ... }

// GOOD
if ($user->access & User::ACCESS_UPDATE) { ... }
```

### No unneeded context
```php
// BAD - stuttering
class Car { public $carMake; public $carModel; }

// GOOD
class Car { public $make; public $model; }
```

### Guard clauses - return early, avoid nesting
```php
// BAD - deeply nested
function isShopOpen($day): bool {
    if ($day) {
        if (is_string($day)) {
            $day = strtolower($day);
            if ($day === 'friday') { return true; }
            elseif ($day === 'saturday') { return true; }
        }
    }
    return false;
}

// GOOD - flat, early return
function isShopOpen(string $day): bool {
    if (empty($day)) return false;
    return in_array(strtolower($day), ['friday', 'saturday', 'sunday'], true);
}
```

---

## Functions

### 2 or fewer arguments (use value objects/DTOs for more)
```php
// BAD - 8 args
class Questionnaire {
    public function __construct(string $first, string $last, string $region, string $city, string $phone, string $email, ...) {}
}

// GOOD - grouped into value objects
class Questionnaire {
    public function __construct(
        private readonly Name $name,
        private readonly Address $address,
        private readonly Contact $contact,
    ) {}
}
```

### Names say what they do
```php
// BAD
$message->handle(); // handle what?

// GOOD
$message->send();
```

### No boolean flags - split into separate functions
```php
// BAD - flag controls behavior
function createFile(string $name, bool $temp = false): void { ... }

// GOOD - explicit functions
function createFile(string $name): void { ... }
function createTempFile(string $name): void { ... }
```

### No side effects - pure where possible
```php
// BAD - mutates global
function splitName(): void { global $name; $name = explode(' ', $name); }

// GOOD - returns new value
function splitName(string $name): array { return explode(' ', $name); }
```

### Encapsulate conditionals
```php
// BAD
if ($article->state === 'published') { ... }

// GOOD
if ($article->isPublished()) { ... }
```

### Avoid negative conditionals
```php
// BAD
if (!isDOMNodeNotPresent($node)) { ... }

// GOOD
if (isDOMNodePresent($node)) { ... }
```

### Use polymorphism over type checking
```php
// BAD - switch on type
function getCruisingAltitude(): int {
    switch ($this->type) {
        case '777': return $this->getMaxAltitude() - $this->getPassengerCount();
        case 'Cessna': return $this->getMaxAltitude() - $this->getFuelExpenditure();
    }
}

// GOOD - each class knows its behavior
interface Airplane { public function getCruisingAltitude(): int; }
class Boeing777 implements Airplane {
    public function getCruisingAltitude(): int {
        return $this->getMaxAltitude() - $this->getPassengerCount();
    }
}
```

### Use type declarations - not manual type checking
```php
// BAD
function combine($val1, $val2): int {
    if (!is_numeric($val1) || !is_numeric($val2)) throw new Exception('Must be Number');
    return $val1 + $val2;
}

// GOOD - PHP enforces types
function combine(int $val1, int $val2): int {
    return $val1 + $val2;
}
```

### Delete dead code
Git remembers. Dead code confuses readers. Remove it.

---

## Objects & Classes

### Private by default
```php
// BAD
class Employee { public $name; }

// GOOD
class Employee {
    public function __construct(private readonly string $name) {}
    public function getName(): string { return $this->name; }
}
```

### Composition over inheritance
```php
// BAD - "has-a" modeled as "is-a"
class EmployeeTaxData extends Employee { ... }

// GOOD - composition
class Employee {
    private EmployeeTaxData $taxData;
    public function setTaxData(EmployeeTaxData $data): void { $this->taxData = $data; }
}
```

### Prefer `final` classes with interface
```php
// GOOD - prevents uncontrolled inheritance, encourages composition
interface Vehicle { public function getColor(): string; }

final class Car implements Vehicle {
    public function __construct(private readonly string $color) {}
    public function getColor(): string { return $this->color; }
}
```

### No Singletons - use DI
```php
// BAD - hidden dependency, untestable
$db = DBConnection::getInstance();

// GOOD - injected, testable, explicit
class UserRepository {
    public function __construct(private readonly PDO $db) {}
}
```

### No fluent interfaces (in domain code)
Fluent breaks encapsulation, decorators, and mocking. Use for builders only (query builders are OK).

---

## SOLID

### SRP - One reason to change
```php
// BAD - auth + settings in one class
class UserSettings {
    public function changeSettings(array $s): void {
        if ($this->verifyCredentials()) { /* change */ }
    }
    private function verifyCredentials(): bool { ... }
}

// GOOD - separated
class UserAuth { public function verify(): bool { ... } }
class UserSettings {
    public function __construct(private readonly UserAuth $auth) {}
    public function change(array $s): void {
        if ($this->auth->verify()) { /* change */ }
    }
}
```

### OCP - Extend via interfaces, don't modify
```php
// GOOD - new adapters don't touch HttpRequester
interface Adapter { public function request(string $url): Response; }
class HttpRequester {
    public function __construct(private readonly Adapter $adapter) {}
    public function fetch(string $url): Response { return $this->adapter->request($url); }
}
```

### LSP - Subtypes must be substitutable
Don't let Square extend Rectangle. Use interfaces for shared contracts.

### ISP - Small interfaces
```php
// BAD - fat interface
interface Employee { public function work(): void; public function eat(): void; }

// GOOD - split by capability
interface Workable { public function work(): void; }
interface Feedable { public function eat(): void; }
```

### DIP - Depend on abstractions
```php
// BAD - depends on concrete
class PasswordReminder {
    public function __construct(private MySQLConnection $db) {}
}

// GOOD - depends on interface
class PasswordReminder {
    public function __construct(private DatabaseConnection $db) {}
}
```

---

## DRY - But with judgment

Don't repeat yourself - extract when you've seen it **3+ times**. But: a wrong abstraction is worse than duplication. If two pieces of code look similar but evolve differently, keep them separate.

---

## Comparison

- Always `===` (never `==`)
- Use null coalescing: `$x = $a ?? $b ?? 'default'`
- Use match (not switch): strict comparison, returns value, no fall-through

---

## Senior DNA Summary

| Principle | Rule |
|-----------|------|
| Naming | Meaningful, pronounceable, searchable, no abbreviations |
| Functions | ≤2 args, one level of abstraction, no flags, no side effects |
| Classes | Final + interface, private by default, composition over inheritance |
| SOLID | Every class: one responsibility, depend on abstractions |
| Types | `declare(strict_types=1)`, type everything, let PHP enforce |
| Dead code | Delete it. Git remembers. |
| Conditionals | Encapsulate in methods, avoid negatives, use polymorphism |
| DRY | Extract at 3 occurrences, not before |
