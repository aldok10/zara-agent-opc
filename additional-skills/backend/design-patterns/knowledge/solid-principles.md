# SOLID Principles

## Single Responsibility Principle (SRP)

A module should have one, and only one, reason to change.

**Violation:**
```python
class UserService:
    def create_user(self, data: UserData) -> User: ...
    def send_welcome_email(self, user: User) -> None: ...
    def generate_pdf_report(self, user: User) -> bytes: ...
```

**Fixed:**
```python
class UserService:
    def create_user(self, data: UserData) -> User: ...

class WelcomeNotifier:
    def send(self, user: User) -> None: ...

class UserReportGenerator:
    def generate_pdf(self, user: User) -> bytes: ...
```

**Test:** If you can't describe what a class does without using "and," it has too many responsibilities.

## Open/Closed Principle (OCP)

Software entities should be open for extension, closed for modification.

**Violation:**
```go
func CalculateDiscount(orderType string, amount float64) float64 {
    switch orderType {
    case "regular":
        return amount * 0.05
    case "premium":
        return amount * 0.10
    case "vip":          // must modify this function for every new type
        return amount * 0.15
    }
    return 0
}
```

**Fixed:**
```go
type DiscountStrategy interface {
    Calculate(amount float64) float64
}

type RegularDiscount struct{}
func (d RegularDiscount) Calculate(amount float64) float64 { return amount * 0.05 }

type PremiumDiscount struct{}
func (d PremiumDiscount) Calculate(amount float64) float64 { return amount * 0.10 }

// New types added without modifying existing code
```

## Liskov Substitution Principle (LSP)

Subtypes must be substitutable for their base types without altering program correctness.

**Violation:**
```python
class Rectangle:
    def set_width(self, w: float) -> None:
        self.width = w
    def set_height(self, h: float) -> None:
        self.height = h

class Square(Rectangle):
    def set_width(self, w: float) -> None:
        self.width = w
        self.height = w  # breaks caller expectations
```

**Fixed:** Use separate types or a common `Shape` interface with `area()` method.

**Test:** Can you replace parent with child in all tests without failures? If not, LSP is violated.

## Interface Segregation Principle (ISP)

Clients should not be forced to depend on interfaces they do not use.

**Violation:**
```go
type Repository interface {
    Find(id string) (*Entity, error)
    FindAll() ([]*Entity, error)
    Create(e *Entity) error
    Update(e *Entity) error
    Delete(id string) error
    BulkInsert(entities []*Entity) error
    Archive(id string) error
    GenerateReport() ([]byte, error)
}
```

**Fixed:**
```go
type Reader interface {
    Find(id string) (*Entity, error)
    FindAll() ([]*Entity, error)
}

type Writer interface {
    Create(e *Entity) error
    Update(e *Entity) error
    Delete(id string) error
}

type ReadWriter interface {
    Reader
    Writer
}
```

**Test:** Does every implementer use every method? If some implementations leave methods as no-ops or panics, the interface is too wide.

## Dependency Inversion Principle (DIP)

High-level modules should not depend on low-level modules. Both should depend on abstractions.

**Violation:**
```python
class OrderService:
    def __init__(self):
        self.db = PostgresDatabase()      # concrete dependency
        self.mailer = SendGridMailer()     # concrete dependency
```

**Fixed:**
```python
class OrderService:
    def __init__(
        self,
        repo: OrderRepository,       # interface
        notifier: OrderNotifier,     # interface
    ) -> None:
        self.repo = repo
        self.notifier = notifier
```

**Test:** Can you instantiate the class in a test without real infrastructure? If not, DIP is violated.

## Applying SOLID Together

```go
// ISP: small, focused interface
type OrderPricer interface {
    CalculateTotal(items []LineItem) (Money, error)
}

// OCP: new pricing strategies without modifying existing code
// DIP: depends on abstraction, not concrete implementation
type CheckoutService struct {
    pricer    OrderPricer
    inventory InventoryChecker
    payments  PaymentGateway
}

// SRP: CheckoutService only orchestrates checkout flow
func (s *CheckoutService) Checkout(ctx context.Context, order Order) (*Receipt, error) {
    total, err := s.pricer.CalculateTotal(order.Items)
    if err != nil {
        return nil, err
    }
    // orchestration logic only
    ...
}
```

## SOLID Warning Signs

| Smell | Likely Violation |
|-------|-----------------|
| God class with 20+ methods | SRP |
| Switch on type in multiple places | OCP |
| Subclass throws "not supported" | LSP |
| Mock with 15 unused methods | ISP |
| Cannot test without database | DIP |
