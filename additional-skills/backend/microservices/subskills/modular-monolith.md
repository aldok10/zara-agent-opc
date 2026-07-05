# Modular Monolith

A well-structured monolith with clear module boundaries. Each module owns its domain, data, and behavior. Modules communicate via defined internal APIs. Designed for extraction readiness  -  can become microservices when evidence demands it.

## Why Modular Monolith First

1. **Single deployment**  -  no distributed system complexity (network, consistency, observability).
2. **Simple debugging**  -  stack traces, breakpoints, single process.
3. **Refactoring freedom**  -  move code between modules cheaply (same process).
4. **Extraction readiness**  -  when a module needs independent scaling or deployment, extract it.
5. **Team velocity**  -  fewer moving parts, faster iteration in early stages.

## Module Boundaries

A module is a self-contained unit with:

- **Public API**: the only way other modules interact with it. Functions, interfaces, or internal events.
- **Private internals**: domain logic, repositories, models. Hidden from other modules.
- **Own persistence**: separate schema/tables. No cross-module JOINs.
- **No circular dependencies**: module A -> B is OK. A -> B -> A is not.

### Boundary Enforcement

```
Techniques:
- Package/namespace visibility (Go: internal/, Java: module-info, TS: barrel exports)
- ArchUnit / dependency-lint rules in CI
- Separate database schemas per module
- Code review: reject cross-module internal access
```

## Internal APIs

Modules communicate through defined contracts, not direct DB access:

### Function Calls (Simplest)

```go
// orders module calls payments module
type PaymentService interface {
    ProcessPayment(ctx context.Context, req PaymentRequest) (PaymentResult, error)
}
```

### Internal Events (Looser Coupling)

```go
// orders module publishes event
type OrderPlaced struct {
    OrderID    string
    CustomerID string
    Total      Money
}

// inventory module subscribes (in-process event bus)
func (h *InventoryHandler) OnOrderPlaced(ctx context.Context, e OrderPlaced) error {
    return h.reserveItems(ctx, e.OrderID)
}
```

### When to Use Which

- **Function calls**: synchronous, simple, caller needs response.
- **Internal events**: async-capable, loose coupling, multiple subscribers.

## Persistence Isolation

Each module owns its tables. Rules:

1. No cross-module foreign keys.
2. No cross-module JOINs (query via module API instead).
3. Separate schemas or table prefixes per module.
4. Module can use different storage if needed (PostgreSQL for one, Redis for another).
5. Migrations scoped to module (module owns its schema evolution).

## Extraction Readiness Checklist

A module is ready to extract when:

- [ ] All communication with other modules goes through public API (no internal shortcuts)
- [ ] Own persistence (no shared tables with other modules)
- [ ] No in-process state sharing (no shared singletons or global state)
- [ ] Internal events can become external events (add serialization + transport)
- [ ] Health and readiness can be checked independently
- [ ] Module can be tested in isolation

## When to Extract

Extract a module to a service when you have evidence of:

1. **Independent scaling**: this module needs 10x resources, others don't.
2. **Independent deployment**: this module changes daily, others are stable.
3. **Team ownership**: separate team owns and operates this domain.
4. **Technology mismatch**: this module needs different runtime (GPU, different language).
5. **Fault isolation**: this module's failures must not affect the rest.

If none of these apply, keep it as a module. Extraction has cost (network, consistency, ops).

## Strangler Fig Extraction

When extracting, use strangler fig pattern:

1. Deploy new service alongside monolith.
2. Route subset of traffic to new service (by feature flag or header).
3. New service handles its domain; delegates rest back to monolith.
4. Gradually shift traffic until new service handles 100%.
5. Remove old module code from monolith.

Never big-bang rewrite. Always incremental.

## Project Structure Example

```
/
├── cmd/server/main.go          # Entry point, wires modules
├── internal/
│   ├── orders/                 # Orders module
│   │   ├── api.go              # Public API (interface)
│   │   ├── service.go          # Business logic
│   │   ├── repository.go       # Data access
│   │   ├── models.go           # Domain models
│   │   └── events.go           # Events this module publishes
│   ├── payments/               # Payments module
│   │   ├── api.go
│   │   ├── service.go
│   │   ├── repository.go
│   │   └── models.go
│   ├── inventory/              # Inventory module
│   │   └── ...
│   └── shared/                 # Shared kernel (minimal!)
│       ├── events/bus.go       # Internal event bus
│       └── types/money.go      # Value objects used by multiple modules
├── migrations/
│   ├── orders/
│   ├── payments/
│   └── inventory/
└── go.mod
```

## Anti-Patterns

- **Distributed monolith**: modules share DB tables and call each other's internals. Worst of both.
- **Shared kernel bloat**: too much in shared/. Each addition is coupling. Keep minimal.
- **No enforcement**: boundaries exist only in documentation. Need CI checks.
- **Premature extraction**: extracting before boundaries are clean creates distributed mess.
- **God module**: one module that everything depends on. Decompose it.

## Verification

- No cross-module imports of internal packages (CI lint rule).
- Each module's tests pass in isolation (mock other modules' APIs).
- No cross-module database queries (check SQL for cross-schema access).
- Module can be extracted by swapping in-process call for network call (API compatibility).
- Event bus can be replaced with message broker without changing module logic.
