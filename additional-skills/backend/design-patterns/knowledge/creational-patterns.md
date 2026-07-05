---
type: fact
title: "Creational Patterns"
---

# Creational Patterns

## Factory Method

Delegate object creation to subclasses or functions, hiding concrete types from callers.

**When to use:** Multiple implementations of an interface, creation logic varies by type, or construction requires context the caller shouldn't know about.

```go
type Notifier interface {
    Send(ctx context.Context, msg Message) error
}

func NewNotifier(channel string, cfg Config) (Notifier, error) {
    switch channel {
    case "email":
        return &EmailNotifier{smtp: cfg.SMTP}, nil
    case "sms":
        return &SMSNotifier{provider: cfg.SMSProvider}, nil
    case "push":
        return &PushNotifier{fcm: cfg.FCMClient}, nil
    default:
        return nil, fmt.Errorf("unknown channel: %s", channel)
    }
}
```

```python
class PaymentProcessor(Protocol):
    def charge(self, amount: Decimal, currency: str) -> ChargeResult: ...

def create_processor(provider: str, config: Config) -> PaymentProcessor:
    match provider:
        case "stripe":
            return StripeProcessor(api_key=config.stripe_key)
        case "square":
            return SquareProcessor(access_token=config.square_token)
        case _:
            raise ValueError(f"Unknown provider: {provider}")
```

## Builder

Construct complex objects step-by-step, separating construction from representation.

**When to use:** Object has many optional parameters, construction involves validation, or you need different representations from the same construction process.

```go
type QueryBuilder struct {
    table   string
    wheres  []string
    args    []any
    orderBy string
    limit   int
}

func NewQuery(table string) *QueryBuilder {
    return &QueryBuilder{table: table}
}

func (q *QueryBuilder) Where(clause string, args ...any) *QueryBuilder {
    q.wheres = append(q.wheres, clause)
    q.args = append(q.args, args...)
    return q
}

func (q *QueryBuilder) OrderBy(col string) *QueryBuilder {
    q.orderBy = col
    return q
}

func (q *QueryBuilder) Limit(n int) *QueryBuilder {
    q.limit = n
    return q
}

func (q *QueryBuilder) Build() (string, []any, error) {
    if q.table == "" {
        return "", nil, errors.New("table required")
    }
    // assemble SQL from parts
    ...
}
```

## Singleton (Use Sparingly)

Ensure a class has exactly one instance with global access.

**Modern approach:** Avoid global state. Use dependency injection to pass shared instances. Reserve true singletons for infrastructure that genuinely requires single-instance semantics (connection pools, config loaders at startup).

```go
var (
    poolOnce sync.Once
    pool     *pgxpool.Pool
)

func GetPool(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
    var initErr error
    poolOnce.Do(func() {
        pool, initErr = pgxpool.New(ctx, dsn)
    })
    return pool, initErr
}
```

## Object Pool

Reuse expensive-to-create objects instead of allocating and discarding them.

**When to use:** High allocation rate, expensive initialization, bounded concurrency needs.

```go
var bufPool = sync.Pool{
    New: func() any {
        return new(bytes.Buffer)
    },
}

func ProcessRequest(data []byte) []byte {
    buf := bufPool.Get().(*bytes.Buffer)
    defer func() {
        buf.Reset()
        bufPool.Put(buf)
    }()
    // use buf for processing
    buf.Write(data)
    return buf.Bytes()
}
```

## Abstract Factory

Provide an interface for creating families of related objects without specifying concrete classes.

**When to use:** System must work with multiple families of related products, and you want to enforce that products from the same family are used together.

```python
class CloudFactory(Protocol):
    def create_storage(self) -> ObjectStorage: ...
    def create_queue(self) -> MessageQueue: ...
    def create_cache(self) -> CacheStore: ...

class AWSFactory:
    def create_storage(self) -> ObjectStorage:
        return S3Storage(...)
    def create_queue(self) -> MessageQueue:
        return SQSQueue(...)
    def create_cache(self) -> CacheStore:
        return ElastiCacheStore(...)
```

## Selection Guide

| Problem | Pattern |
|---------|---------|
| Hide which concrete type to create | Factory Method |
| Many optional construction params | Builder |
| Expensive object reuse | Pool |
| Families of related objects | Abstract Factory |
| One instance required (rare) | Singleton via sync.Once / module-level |
