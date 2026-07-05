# Modular Monolith Structure

Project layout showing clear module boundaries with internal APIs and persistence isolation.

## Go Project Structure

```
ecommerce/
├── cmd/
│   └── server/
│       └── main.go                 # Entry point, wires all modules
├── internal/
│   ├── orders/                     # --- Orders Module ---
│   │   ├── api.go                  # Public API (exported interface)
│   │   ├── service.go              # Business logic (unexported)
│   │   ├── repository.go           # Data access (unexported)
│   │   ├── models.go               # Domain models
│   │   ├── events.go               # Events this module publishes
│   │   └── handler.go              # HTTP handlers (if module exposes routes)
│   ├── payments/                   # --- Payments Module ---
│   │   ├── api.go                  # Public API
│   │   ├── service.go
│   │   ├── repository.go
│   │   ├── models.go
│   │   └── gateway.go              # External payment provider adapter
│   ├── inventory/                  # --- Inventory Module ---
│   │   ├── api.go
│   │   ├── service.go
│   │   ├── repository.go
│   │   └── models.go
│   ├── notifications/              # --- Notifications Module ---
│   │   ├── api.go
│   │   ├── service.go
│   │   └── templates/
│   └── platform/                   # --- Shared Platform (minimal!) ---
│       ├── eventbus/               # In-process event bus
│       │   └── bus.go
│       ├── auth/                   # Auth middleware
│       │   └── middleware.go
│       └── types/                  # Shared value objects
│           └── money.go
├── migrations/
│   ├── orders/                     # Module-scoped migrations
│   │   ├── 001_create_orders.sql
│   │   └── 002_add_status_index.sql
│   ├── payments/
│   │   └── 001_create_payments.sql
│   └── inventory/
│       └── 001_create_inventory.sql
├── go.mod
└── go.sum
```

## Module Public API (api.go)

```go
// internal/orders/api.go
package orders

import "context"

// Service is the public API for the orders module.
// Other modules depend on this interface, never on internal types.
type Service interface {
    PlaceOrder(ctx context.Context, req PlaceOrderRequest) (Order, error)
    GetOrder(ctx context.Context, id string) (Order, error)
    CancelOrder(ctx context.Context, id string) error
}

// PlaceOrderRequest is the public input type.
type PlaceOrderRequest struct {
    CustomerID string
    Items      []OrderItem
}

// Order is the public output type (may differ from internal domain model).
type Order struct {
    ID         string
    CustomerID string
    Status     string
    Total      int64 // cents
}

type OrderItem struct {
    ProductID string
    Quantity  int
    Price     int64
}
```

## Module Wiring (main.go)

```go
// cmd/server/main.go
package main

import (
    "ecommerce/internal/inventory"
    "ecommerce/internal/notifications"
    "ecommerce/internal/orders"
    "ecommerce/internal/payments"
    "ecommerce/internal/platform/eventbus"
)

func main() {
    // Infrastructure
    db := connectDB()
    bus := eventbus.New()

    // Wire modules (dependency injection, no framework)
    inventorySvc := inventory.New(db, bus)
    paymentsSvc := payments.New(db, bus)
    notificationsSvc := notifications.New(bus)
    ordersSvc := orders.New(db, bus, paymentsSvc, inventorySvc)

    // Subscribe to events (loose coupling between modules)
    bus.Subscribe("OrderPlaced", notificationsSvc.OnOrderPlaced)
    bus.Subscribe("OrderPlaced", inventorySvc.OnOrderPlaced)

    // Start HTTP server with module routes
    mux := http.NewServeMux()
    orders.RegisterRoutes(mux, ordersSvc)
    payments.RegisterRoutes(mux, paymentsSvc)

    // ...
}
```

## Key Rules Demonstrated

1. **No cross-module imports of internal types**  -  only `api.go` types are used externally.
2. **Persistence per module**  -  separate migration directories, separate schemas.
3. **Platform is minimal**  -  only event bus, auth, and shared value objects.
4. **Event-based coupling**  -  modules subscribe to events, don't call each other for side effects.
5. **Function call for queries**  -  orders calls payments/inventory directly when it needs a response.
6. **Extraction ready**  -  swap `paymentsSvc` with gRPC client to extract payments as service.
