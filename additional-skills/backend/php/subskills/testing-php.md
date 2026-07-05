---
type: subskill
title: "PHP Testing"
---

# PHP Testing

## When to Load

Pest, PHPUnit 11, Infection mutation testing, architecture tests, Testcontainers, test strategy.

## Test Pyramid

```
         E2E (few)          -- Browser/HTTP full-stack
       Integration (some)   -- Database, queues, external
     Unit (many)            -- Domain logic, pure functions
```

## Pest (Preferred for New Projects)

### Structure

```php
describe('CreateOrder', function () {
    beforeEach(fn () => $this->action = new CreateOrder(new InMemoryOrderRepo()));

    it('creates order with valid items', function () {
        $result = $this->action->execute(items: [Item::create('SKU-1', 2)]);
        expect($result)->toBeInstanceOf(Order::class)
            ->and($result->items)->toHaveCount(1)
            ->and($result->total->amount)->toBe(2000);
    });

    it('rejects empty items', function () {
        expect(fn () => $this->action->execute(items: []))
            ->toThrow(ValidationException::class, 'Items cannot be empty');
    });
});
```

### Key Features

- `expect()->` fluent assertions with chaining.
- `describe/it` for BDD-style grouping.
- Higher-order tests: `it('has name')->expect(fn () => $user->name)->toBe('John')`.
- Datasets: `it('validates', fn (string $email) => ...)->with(['bad', '', 'no@domain'])`.
- Architectural: `pest()->arch()` tests (see below).

## PHPUnit 11

### Attributes Over Annotations

```php
#[Test]
#[DataProvider('invalidEmails')]
#[CoversClass(EmailValidator::class)]
public function rejectsInvalidEmails(string $email): void
{
    $this->assertFalse($this->validator->isValid($email));
}
```

### Key Changes in PHPUnit 11

- `#[Test]` attribute replaces `test` prefix convention.
- `#[DataProvider]` attribute replaces `@dataProvider` annotation.
- Strict mode default: undeclared dependencies fail.
- Return type `void` required on test methods.

## Infection (Mutation Testing)

### Purpose

Tests that pass are not proof of quality. Mutation testing modifies your code and checks if tests catch it. Uncaught mutations = weak tests.

### Configuration (`infection.json5`)

```json5
{
  "$schema": "vendor/infection/infection/resources/schema.json",
  "source": { "directories": ["src/Domain", "src/Application"] },
  "mutators": { "@default": true },
  "minMsi": 80,
  "minCoveredMsi": 90
}
```

### Key Metrics

- **MSI** (Mutation Score Indicator): % of mutations killed. Target: >80%.
- **Covered MSI**: MSI only for covered code. Target: >90%.
- Run on CI: `vendor/bin/infection --min-msi=80 --threads=4`.

## Architecture Tests

### Pest Arch Tests

```php
arch('domain has no framework deps')
    ->expect('App\Domain')
    ->not->toUse('Illuminate')
    ->not->toUse('Symfony');

arch('controllers are invokable')
    ->expect('App\Http\Controllers')
    ->toBeInvokable();

arch('value objects are readonly')
    ->expect('App\Domain\ValueObject')
    ->toBeReadonly();

arch('enums are backed')
    ->expect('App\Domain\Enum')
    ->toBeStringBackedEnum();
```

### PHPat (PHPStan Extension)

```php
Rule::that('Domain')
    ->shouldNotDependOn()
    ->andRule('Infrastructure');
```

## Testcontainers

- Spin up real databases/services in Docker for integration tests.
- `testcontainers-php` package for PHP.
- Use for: PostgreSQL, Redis, RabbitMQ, Elasticsearch integration tests.
- Clean state per test: truncate or transaction rollback.

## Patterns

### Test Doubles Hierarchy

1. **Stub**: returns canned data (use for queries).
2. **Mock**: verifies interactions (use for commands sparingly).
3. **Fake**: working implementation (in-memory repo, preferred for domain tests).
4. **Spy**: records calls for later assertion.

### Rule: Fake > Mock

- In-memory repository fakes for domain tests  -  no framework, fast, readable.
- Mocks only when verifying interaction is the actual requirement.
- Never mock what you don't own (wrap in adapter, mock adapter).

## Verify

- `vendor/bin/pest --coverage --min=80`  -  coverage threshold.
- `vendor/bin/infection --min-msi=80`  -  mutation testing passes.
- Architecture tests green  -  layer boundaries enforced.
- No `@depends` chains (tests must be independent).
