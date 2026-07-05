# PHP 8.4 Features

## Property Hooks

Define get/set logic inline on properties — replaces magic methods and boilerplate getters/setters.

```php
final class User
{
    public string $fullName {
        get => "{$this->firstName} {$this->lastName}";
    }

    public string $email {
        set(string $value) => strtolower(trim($value));
    }

    public DateTimeImmutable $birthDate {
        set(DateTimeImmutable|string $value) => match (true) {
            $value instanceof DateTimeImmutable => $value,
            default => new DateTimeImmutable($value),
        };
    }
}
```

- Virtual properties (get-only without backing store) don't use memory.
- Set hooks can type-widen the input (accept string, store DateTimeImmutable).
- Hooks are inherited and can be overridden with `#[Override]`.

## Asymmetric Visibility

Control read vs write access separately.

```php
final class Config
{
    public private(set) string $dsn;           // public read, private write
    public protected(set) array $options = []; // public read, protected write
}
```

- Replaces `readonly` in many cases (allows internal mutation).
- Works with property hooks.
- `private(set)` is the most common — expose value, control mutation.

## #[\Deprecated] Attribute

```php
#[\Deprecated("Use newMethod() instead", since: "2.1")]
public function oldMethod(): void { /* ... */ }
```

- Triggers `E_USER_DEPRECATED` at call site.
- Static analysis tools (PHPStan) can read and report.
- `since` parameter for versioning.

## Lazy Objects

```php
$proxy = ReflectionClass::newLazyProxy(User::class, function () {
    return $this->repository->findExpensive($id); // only called on first access
});
```

- `newLazyGhost()`: initializes in-place (same instance).
- `newLazyProxy()`: delegates to a real instance.
- Use cases: Doctrine entities, service containers, expensive initialization.
- Properties not accessed = no initialization triggered.

## `new` Without Parentheses

```php
$date = new DateTimeImmutable->modify('+1 day');
$items = new Collection->push($item)->filter(fn ($i) => $i->isActive());
```

- Shorthand when immediately chaining on new instance.
- Parentheses still required if passing constructor args: `new Foo($bar)->method()`.

## Array Functions

```php
$found = array_find($items, fn ($item) => $item->id === $targetId);
$any = array_any($items, fn ($item) => $item->isExpired());
$all = array_all($items, fn ($item) => $item->isValid());
$key = array_find_key($items, fn ($item) => $item->isPrimary());
```

## Other Notable Changes

- `Deprecated` attribute on classes, methods, constants, parameters.
- `mb_trim()`, `mb_ltrim()`, `mb_rtrim()` — multibyte-safe trimming.
- `request_parse_body()` — parse multipart form data outside POST.
- `http_get_last_response_headers()` / `http_clear_last_response_headers()`.
- DOM: `Dom\HTMLDocument` and `Dom\XMLDocument` (spec-compliant HTML5 parsing).
- BCMath: `BcMath\Number` object with operator overloading.
- PDO subclasses: `Pdo\Mysql`, `Pdo\Pgsql`, `Pdo\Sqlite` with driver-specific methods.
