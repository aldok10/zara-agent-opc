---
type: fact
title: "PHP Database Patterns"
---
# PHP Database Patterns

## Doctrine ORM

### Entity Definition
```php
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: 'users')]
class User
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid')]
    private string $id;

    #[ORM\Column(length: 255)]
    private string $name;

    #[ORM\Column(length: 255, unique: true)]
    private string $email;

    #[ORM\OneToMany(targetEntity: Order::class, mappedBy: 'user', cascade: ['persist'])]
    private Collection $orders;
}
```

### Repository Pattern (Doctrine)
```php
class UserRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    public function findActiveByEmail(string $email): ?User
    {
        return $this->createQueryBuilder('u')
            ->where('u.email = :email')
            ->andWhere('u.active = true')
            ->setParameter('email', $email)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
```

### DQL (Doctrine Query Language)
```php
$query = $em->createQuery(
    'SELECT u, o FROM App\Entity\User u
     JOIN u.orders o
     WHERE o.createdAt > :since
     ORDER BY o.total DESC'
);
$query->setParameter('since', new \DateTimeImmutable('-30 days'));
$results = $query->getResult();
```

### Migrations
```bash
php bin/console doctrine:migrations:diff    # generate from entity changes
php bin/console doctrine:migrations:migrate # apply pending
php bin/console doctrine:migrations:status  # check state
```

## Eloquent (Laravel)

### Model Basics
```php
class Order extends Model
{
    protected $fillable = ['user_id', 'status', 'total'];

    protected $casts = [
        'total' => 'integer',
        'metadata' => 'array',
        'shipped_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
```

### Scopes
```php
class Order extends Model
{
    public function scopeRecent(Builder $query): Builder
    {
        return $query->where('created_at', '>', now()->subDays(30));
    }

    public function scopeByStatus(Builder $query, OrderStatus $status): Builder
    {
        return $query->where('status', $status->value);
    }
}

// Usage
Order::recent()->byStatus(OrderStatus::Pending)->get();
```

### Events and Observers
```php
class OrderObserver
{
    public function created(Order $order): void
    {
        event(new OrderCreated($order));
    }

    public function updating(Order $order): void
    {
        if ($order->isDirty('status')) {
            $order->status_changed_at = now();
        }
    }
}
```

## Query Optimization

### N+1 Detection
```php
// BAD: N+1 queries
$orders = Order::all();
foreach ($orders as $order) {
    echo $order->user->name; // query per iteration
}

// GOOD: eager loading
$orders = Order::with('user')->get();
foreach ($orders as $order) {
    echo $order->user->name; // no additional queries
}
```

### Preventing N+1 in Development
```php
// Laravel: add to AppServiceProvider
Model::preventLazyLoading(!app()->isProduction());
```

### Eager Loading Strategies
```php
Order::with(['user', 'items.product'])->get();           // nested eager
Order::with(['items' => fn($q) => $q->where('qty', '>', 1)])->get(); // constrained
Order::withCount('items')->get();                         // count without loading
```

### Indexing Best Practices
- Index columns used in WHERE, JOIN, and ORDER BY
- Composite indexes: order matters (leftmost prefix rule)
- Don't index columns with low cardinality (boolean, status with 3 values)
- Monitor slow queries: enable slow query log

## Database Testing

### Factories
```php
class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'status' => fake()->randomElement(['pending', 'shipped', 'delivered']),
            'total' => fake()->numberBetween(1000, 100000),
        ];
    }

    public function shipped(): static
    {
        return $this->state(['status' => 'shipped', 'shipped_at' => now()]);
    }
}
```

### Seeders
```php
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::factory()
            ->count(10)
            ->has(Order::factory()->count(5))
            ->create();
    }
}
```

### In-Memory SQLite for Speed
```php
// phpunit.xml
<env name="DB_CONNECTION" value="sqlite"/>
<env name="DB_DATABASE" value=":memory:"/>
```

Caveats: SQLite lacks some PostgreSQL/MySQL features (JSON operators, full-text, some DDL). Use real DB for integration tests, SQLite for unit tests only.

## Migration Strategies (Zero-Downtime)

### Safe DDL Operations
- ADD COLUMN with nullable or default: safe
- DROP COLUMN: remove code references first, then drop in next deploy
- RENAME COLUMN: add new, copy data, update code, drop old
- ADD INDEX: use CONCURRENTLY (PostgreSQL) or ALGORITHM=INPLACE (MySQL)

### Multi-Step Migration Pattern
1. Deploy: add new column (nullable)
2. Deploy: write to both old and new columns
3. Backfill: migrate existing data
4. Deploy: read from new column
5. Deploy: drop old column

### Laravel Example
```php
// Step 1: Add column
Schema::table('users', function (Blueprint $table) {
    $table->string('display_name')->nullable();
});

// Step 3: Backfill (run as job, not in migration)
User::query()->whereNull('display_name')->chunkById(1000, function ($users) {
    foreach ($users as $user) {
        $user->update(['display_name' => $user->first_name . ' ' . $user->last_name]);
    }
});
```
