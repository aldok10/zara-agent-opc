# PHP Testing Subskill

## Activation Triggers
- PHPUnit, Pest, testing, mutation testing, Infection, PHPStan, Psalm, Rector
- TDD, test doubles, mocking, code coverage, architecture testing

## Senior DNA
- Test what scares you. Skip trivial getters/setters.
- Mutation testing (Infection) proves your tests actually catch bugs. Coverage alone lies.
- Pest arch() replaces manual dependency rule enforcement.
- PHPStan level 9 + strict_types catches more bugs than most test suites.
- **Concurrency testing is mandatory for Swoole/coroutine projects**: Race conditions, deadlocks, and data corruption only surface under concurrent load.

---

## Concurrency Testing (Swoole/Coroutine Projects)

When your project uses Swoole, OpenSwoole, Hyperf, or any coroutine-based server, you MUST test for concurrency issues. PHP coroutines share memory within a worker process - race conditions are real.

### Test for Data Races (shared state)

```php
use Swoole\Coroutine;
use Swoole\Coroutine\WaitGroup;

test('counter is safe under concurrent access', function () {
    $counter = new AtomicCounter(); // your implementation
    $wg = new WaitGroup();
    $concurrency = 100;

    for ($i = 0; $i < $concurrency; $i++) {
        $wg->add();
        Coroutine::create(function () use ($counter, $wg) {
            for ($j = 0; $j < 1000; $j++) {
                $counter->increment();
            }
            $wg->done();
        });
    }

    $wg->wait();
    expect($counter->value())->toBe(100_000); // if not, you have a race
});
```

### Test for Deadlocks (timeout detection)

```php
test('channel operation does not deadlock', function () {
    $completed = false;

    $channel = new Swoole\Coroutine\Channel(1);

    Coroutine::create(function () use ($channel, &$completed) {
        $result = $channel->pop(3.0); // 3 second timeout
        if ($result === false) {
            throw new RuntimeException('Deadlock: channel pop timed out');
        }
        $completed = true;
    });

    Coroutine::create(function () use ($channel) {
        usleep(100_000); // simulate work
        $channel->push('data');
    });

    // Wait for coroutines to finish
    Coroutine::sleep(1);
    expect($completed)->toBeTrue();
});
```

### Test Connection Pool Under Load

```php
test('connection pool handles concurrent requests without exhaustion', function () {
    $pool = new ConnectionPool(size: 5);
    $wg = new WaitGroup();
    $errors = [];

    for ($i = 0; $i < 50; $i++) { // 50 coroutines, 5 connections
        $wg->add();
        Coroutine::create(function () use ($pool, $wg, &$errors) {
            try {
                $conn = $pool->get(timeout: 5.0);
                Coroutine::sleep(0.01); // simulate query
                $pool->put($conn);
            } catch (\Throwable $e) {
                $errors[] = $e->getMessage();
            } finally {
                $wg->done();
            }
        });
    }

    $wg->wait();
    expect($errors)->toBeEmpty();
    expect($pool->available())->toBe(5); // all connections returned
});
```

### Test Static State Isolation

```php
test('static state does not leak between requests', function () {
    // Simulate two "requests" in same worker
    $results = [];

    Coroutine::create(function () use (&$results) {
        RequestContext::set('user_id', 'user-A');
        Coroutine::sleep(0.01); // yield to other coroutine
        $results['first'] = RequestContext::get('user_id');
    });

    Coroutine::create(function () use (&$results) {
        RequestContext::set('user_id', 'user-B');
        Coroutine::sleep(0.01);
        $results['second'] = RequestContext::get('user_id');
    });

    Coroutine::sleep(0.1);
    // Each coroutine must see its OWN context
    expect($results['first'])->toBe('user-A');
    expect($results['second'])->toBe('user-B');
});
```

### Concurrency Test Checklist (Swoole/PHP)

- [ ] Test shared state (counters, caches) with N coroutines writing simultaneously
- [ ] Test Channel operations with timeout (detect deadlocks)
- [ ] Test connection pool exhaustion and recovery under load
- [ ] Test that request-scoped data doesn't leak between coroutines
- [ ] Test graceful shutdown - drain active coroutines, verify no orphans
- [ ] Run tests with `SWOOLE_HOOK_ALL` enabled (matches production behavior)
- [ ] Use `Co\run()` wrapper in test to enable coroutine context

---

## PHPUnit 11

```php
use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\DataProvider;

class OrderServiceTest extends TestCase
{
    #[Test]
    public function it_calculates_total_with_discount(): void
    {
        $order = new Order(items: [new Item(price: 100), new Item(price: 50)]);
        $order->applyDiscount(Discount::percentage(10));

        self::assertSame(135.0, $order->total());
    }

    #[Test]
    #[DataProvider('invalidQuantities')]
    public function it_rejects_invalid_quantities(int $qty): void
    {
        $this->expectException(InvalidQuantity::class);
        new OrderLine(product: $this->product, quantity: $qty);
    }

    public static function invalidQuantities(): array
    {
        return [[-1], [0], [10001]];
    }
}
```

**Parallel execution**:
```bash
composer require --dev brianium/paratest
vendor/bin/paratest --processes=8
```

---

## Pest

```php
// Expressive syntax
test('order total includes tax', function () {
    $order = Order::create(items: [Item::make(price: 100)]);

    expect($order->totalWithTax())->toBe(121.0);
});

// Higher-order tests
test('guest cannot access dashboard')
    ->get('/dashboard')
    ->assertRedirect('/login');

// Expectations API
expect($user)
    ->name->toBe('Aldo')
    ->email->toEndWith('@example.com')
    ->posts->toHaveCount(3);

// Architecture testing
arch('domain has no framework dependencies')
    ->expect('App\Domain')
    ->toUseNothing()
    ->ignoring('App\Domain\Shared');

arch('controllers are invokable')
    ->expect('App\Http\Controllers')
    ->toBeInvokable();

arch('no debugging functions in production code')
    ->expect(['dd', 'dump', 'var_dump', 'ray'])
    ->not->toBeUsed();
```

---

## Mutation Testing (Infection)

```json
{
    "source": { "directories": ["src"] },
    "logs": { "text": "infection.log" },
    "mutators": { "@default": true },
    "minMsi": 80,
    "minCoveredMsi": 90
}
```

```bash
vendor/bin/infection --threads=8 --min-msi=80
```

MSI (Mutation Score Indicator): % of mutants killed. 80%+ is solid. 100% is rarely worth pursuing.

What it proves: Your tests actually verify behavior, not just execute code paths.

---

## Integration Testing

```php
// HTTP tests (Laravel example)
test('create order', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/orders', ['product_id' => 1, 'quantity' => 2])
        ->assertCreated()
        ->assertJsonPath('data.total', 200.0);

    $this->assertDatabaseHas('orders', ['user_id' => $user->id]);
});

// Fakes
Queue::fake();
Event::fake([OrderCreated::class]);
Mail::fake();

// Assert after action
Queue::assertPushed(ProcessOrder::class);
Event::assertDispatched(OrderCreated::class);
Mail::assertSent(OrderConfirmation::class);
```

---

## Static Analysis

```bash
# PHPStan - levels 0 (loose) to 9 (strictest)
vendor/bin/phpstan analyse src --level=9

# Psalm - taint analysis (security)
vendor/bin/psalm --taint-analysis

# Rector - automated refactoring
vendor/bin/rector process src
```

**PHPStan level guide**:
- Level 5: Good baseline for existing projects
- Level 8: Strict, catches most type issues
- Level 9: Maximum strictness, requires clean codebase

```neon
# phpstan.neon
parameters:
    level: 9
    paths: [src]
    checkGenericClassInNonGenericObjectType: false
```

**Psalm taint analysis** detects SQL injection, XSS by tracking user input through code flow. Run in CI.

**Rector** for automated upgrades:
```php
// rector.php
return RectorConfig::configure()
    ->withPaths([__DIR__ . '/src'])
    ->withPhpSets(php83: true)
    ->withPreparedSets(deadCode: true, codeQuality: true);
```

---

## Testing Strategy

1. **Unit**: Domain logic, value objects, pure functions. Fast, no I/O.
2. **Integration**: Service + DB, HTTP endpoints, queue processing.
3. **Architecture**: Pest arch() for dependency rules.
4. **Mutation**: Verify test quality after coverage is high.
5. **Static**: PHPStan 9 + Psalm taint in CI pipeline.

Skip: Testing framework internals, testing getters, testing what static analysis already catches.
