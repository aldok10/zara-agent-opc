# DDD Tactical Patterns

## Entity

Objects defined by identity, not attributes. Two entities with identical attributes but different IDs are different objects.

```go
type Order struct {
    id        OrderID
    customer  CustomerID
    items     []LineItem
    status    OrderStatus
    createdAt time.Time
}

func (o *Order) ID() OrderID { return o.id }

func (o *Order) AddItem(product ProductID, qty int, price Money) error {
    if o.status != OrderStatusDraft {
        return ErrOrderNotModifiable
    }
    o.items = append(o.items, LineItem{
        Product:  product,
        Quantity: qty,
        Price:    price,
    })
    return nil
}
```

Key traits:
- Has a unique identifier that persists across state changes
- Equality based on ID, not attribute comparison
- Encapsulates behavior that enforces its own invariants
- Lifecycle tracked (created, modified, archived)

## Value Object

Defined by attributes, not identity. Immutable. Two VOs with the same attributes are equal.

```go
type Money struct {
    amount   int64  // cents
    currency string
}

func NewMoney(amount int64, currency string) (Money, error) {
    if currency == "" {
        return Money{}, errors.New("currency required")
    }
    return Money{amount: amount, currency: currency}, nil
}

func (m Money) Add(other Money) (Money, error) {
    if m.currency != other.currency {
        return Money{}, errors.New("currency mismatch")
    }
    return Money{amount: m.amount + other.amount, currency: m.currency}, nil
}

func (m Money) Equals(other Money) bool {
    return m.amount == other.amount && m.currency == other.currency
}
```

Key traits:
- Immutable -- operations return new instances
- Equality by value (all fields)
- Self-validating at construction
- No identity or lifecycle

## Aggregate

Cluster of entities and value objects with a single root entity. External references only point to the root. The root enforces all invariants for the cluster.

```go
type ShoppingCart struct {
    id        CartID
    customerID CustomerID
    items     []CartItem      // internal entity
    maxItems  int
}

func (c *ShoppingCart) AddProduct(p ProductID, qty int, price Money) error {
    if len(c.items) >= c.maxItems {
        return ErrCartFull
    }
    if qty <= 0 {
        return ErrInvalidQuantity
    }
    for i, item := range c.items {
        if item.ProductID == p {
            c.items[i].Quantity += qty
            return nil
        }
    }
    c.items = append(c.items, CartItem{ProductID: p, Quantity: qty, Price: price})
    return nil
}
```

Design rules:
- Keep aggregates small (prefer fewer entities per aggregate)
- Reference other aggregates by ID, not direct object reference
- One transaction per aggregate (eventual consistency between aggregates)
- Root is the only entry point for modifications

## Repository

Provides collection-like access to aggregates. Interface in domain layer, implementation in infrastructure.

```go
// Domain layer -- defines the contract
type OrderRepository interface {
    FindByID(ctx context.Context, id OrderID) (*Order, error)
    FindByCustomer(ctx context.Context, customerID CustomerID) ([]*Order, error)
    Save(ctx context.Context, order *Order) error
}

// Infrastructure layer -- implements the contract
type PostgresOrderRepository struct {
    db *pgxpool.Pool
}

func (r *PostgresOrderRepository) Save(ctx context.Context, order *Order) error {
    query := `INSERT INTO orders (id, customer_id, status, created_at)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (id) DO UPDATE SET status = $3`
    _, err := r.db.Exec(ctx, query, order.id, order.customer, order.status, order.createdAt)
    return err
}
```

Key traits:
- One repository per aggregate root
- Hides persistence details from domain
- Returns fully reconstituted aggregates
- No query logic leaks into domain layer

## Domain Event

A record of something that happened in the domain. Immutable, past-tense named.

```go
type OrderPlaced struct {
    OrderID    OrderID
    CustomerID CustomerID
    Total      Money
    OccurredAt time.Time
}

type OrderCancelled struct {
    OrderID    OrderID
    Reason     string
    OccurredAt time.Time
}

// Aggregate collects events during its operation
func (o *Order) Place() error {
    if len(o.items) == 0 {
        return ErrEmptyOrder
    }
    o.status = OrderStatusPlaced
    o.events = append(o.events, OrderPlaced{
        OrderID:    o.id,
        CustomerID: o.customer,
        Total:      o.calculateTotal(),
        OccurredAt: time.Now(),
    })
    return nil
}

func (o *Order) DomainEvents() []DomainEvent {
    return o.events
}

func (o *Order) ClearEvents() {
    o.events = nil
}
```

Key traits:
- Named in past tense (OrderPlaced, not PlaceOrder)
- Immutable once created
- Contains all data needed by consumers
- Published after aggregate is persisted (outbox pattern)
- Enables eventual consistency between bounded contexts

## Pattern Relationships

```
Aggregate Root (Entity)
  ├── contains Value Objects
  ├── contains child Entities
  ├── accessed via Repository
  └── emits Domain Events
```
