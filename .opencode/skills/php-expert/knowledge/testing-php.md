---
type: fact
title: "PHP Testing"
---
# PHP Testing

## PHPUnit 11

### Attributes (Replacing Annotations)
```php
use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Depends;
use PHPUnit\Framework\Attributes\Group;

#[Test]
#[Group('unit')]
public function calculatesOrderTotal(): void
{
    $order = new Order();
    $order->addItem(new Item('Widget', 1000));
    $order->addItem(new Item('Gadget', 2500));
    $this->assertSame(3500, $order->total());
}
```

### Data Providers
```php
#[DataProvider('emailProvider')]
public function testValidatesEmail(string $email, bool $expected): void
{
    $this->assertSame($expected, EmailValidator::isValid($email));
}

public static function emailProvider(): array
{
    return [
        'valid'       => ['user@example.com', true],
        'no at sign'  => ['userexample.com', false],
        'no domain'   => ['user@', false],
        'empty'       => ['', false],
    ];
}
```

### Assertions
```php
$this->assertSame($expected, $actual);       // strict type + value
$this->assertEquals($expected, $actual);     // loose comparison
$this->assertTrue($condition);
$this->assertCount(3, $collection);
$this->assertInstanceOf(User::class, $result);
$this->assertArrayHasKey('email', $data);
$this->expectException(InvalidArgumentException::class);
$this->expectExceptionMessage('Invalid input');
```

## Pest PHP

### Expressive Syntax
```php
test('user can be created with valid data', function () {
    $user = User::create(['name' => 'Alice', 'email' => 'alice@test.com']);
    expect($user)->toBeInstanceOf(User::class)
        ->and($user->name)->toBe('Alice')
        ->and($user->email)->toBe('alice@test.com');
});

it('throws on invalid email', function () {
    User::create(['name' => 'Bob', 'email' => 'invalid']);
})->throws(ValidationException::class);
```

### Expectations
```php
expect($value)->toBe(42);
expect($array)->toHaveCount(3);
expect($string)->toContain('hello');
expect($user)->toHaveProperty('name', 'Alice');
expect($collection)->each->toBeInstanceOf(Order::class);
expect($fn)->toThrow(RuntimeException::class);
```

### Architectural Testing
```php
arch('controllers should not use models directly')
    ->expect('App\Http\Controllers')
    ->not->toUse('App\Models');

arch('domain has no framework dependencies')
    ->expect('App\Domain')
    ->not->toUse('Illuminate');

arch('value objects are final')
    ->expect('App\Domain\ValueObjects')
    ->toBeFinal();
```

## PHPStan / Psalm

### PHPStan Levels
- Level 0: basic checks (unknown classes, functions, methods)
- Level 1: possibly undefined variables
- Level 2: unknown methods on all expressions (not just $this)
- Level 3: return types
- Level 4: dead code
- Level 5: argument types
- Level 6: missing typehints
- Level 7: union types
- Level 8: nullable types
- Level 9: mixed type strictness (max)

### Baseline Strategy
- Start at level 5-6 for existing projects
- Generate baseline: `phpstan analyse --generate-baseline`
- All NEW code must pass without baseline entries
- Gradually reduce baseline over time
- CI fails on new errors only

### Custom Rules
```neon
rules:
    - App\PHPStan\NoDirectDatabaseAccessInControllers
    - App\PHPStan\RequireReadonlyDTOs
```

## Infection (Mutation Testing)

### Concept
- Modifies your code (mutants) and runs tests
- If tests still pass with a mutant, your tests are weak
- MSI (Mutation Score Indicator) = killed / total mutants
- Target: MSI > 80% for critical business logic

### Configuration
```json
{
    "source": { "directories": ["src"] },
    "logs": { "text": "infection.log" },
    "mutators": { "@default": true },
    "minMsi": 80,
    "minCoveredMsi": 90
}
```

### Running
```bash
infection --threads=4 --show-mutations --min-msi=80
infection --filter=OrderService  # test specific class
```

## Mocking

### Mockery
```php
$gateway = Mockery::mock(PaymentGateway::class);
$gateway->shouldReceive('charge')
    ->once()
    ->with(1000, 'usd')
    ->andReturn(new PaymentResult(success: true));

$service = new OrderService($gateway);
$result = $service->checkout($order);

Mockery::close();
```

### PHPUnit Mocks
```php
$repo = $this->createMock(UserRepository::class);
$repo->method('findById')
    ->with('user-1')
    ->willReturn(new User('user-1', 'Alice'));

$repo->expects($this->once())
    ->method('save')
    ->with($this->isInstanceOf(User::class));
```

### When NOT to Mock
- Value objects (just use real ones)
- Simple data transformations
- The class under test itself
- Third-party HTTP APIs (use recorded responses or test containers)

## Integration Testing with Database

### Laravel RefreshDatabase
```php
use Illuminate\Foundation\Testing\RefreshDatabase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_order_with_items(): void
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->postJson('/api/orders', [...]);
        $response->assertCreated();
        $this->assertDatabaseHas('orders', ['user_id' => $user->id]);
    }
}
```

### Transaction Wrapping
```php
use Illuminate\Foundation\Testing\DatabaseTransactions;

class OrderTest extends TestCase
{
    use DatabaseTransactions; // faster than RefreshDatabase, wraps in transaction
}
```

### Test Factories
```php
User::factory()
    ->has(Order::factory()->count(3)->has(OrderItem::factory()->count(2)))
    ->create();
```
