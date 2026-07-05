# Python Architecture Patterns

## Repository Pattern

```python
from abc import ABC, abstractmethod
from typing import Protocol

class UserRepository(Protocol):
    async def get(self, user_id: int) -> User | None: ...
    async def save(self, user: User) -> User: ...
    async def find_by_email(self, email: str) -> User | None: ...

class SQLAlchemyUserRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get(self, user_id: int) -> User | None:
        return await self._session.get(User, user_id)

    async def save(self, user: User) -> User:
        self._session.add(user)
        await self._session.flush()
        return user
```

Benefits: testable (swap with in-memory impl), decouples domain from persistence.

## Dependency Injection

Manual (function-based, no framework):
```python
def create_service(config: Config) -> UserService:
    engine = create_async_engine(config.database_url)
    session_factory = async_sessionmaker(engine)
    repo = SQLAlchemyUserRepository(session_factory)
    return UserService(repo)
```

dependency-injector library:
```python
from dependency_injector import containers, providers

class Container(containers.DeclarativeContainer):
    config = providers.Configuration()
    db = providers.Singleton(Database, url=config.db_url)
    user_repo = providers.Factory(SQLAlchemyUserRepository, session=db.provided.session)
    user_service = providers.Factory(UserService, repo=user_repo)
```

FastAPI native DI via `Depends()` is sufficient for request-scoped dependencies.

## Clean Architecture / Hexagonal

Layer structure:
```
src/
  domain/          # Entities, value objects, domain events
  application/     # Use cases, ports (interfaces)
  infrastructure/  # Adapters (DB, HTTP clients, queues)
  presentation/    # API routes, CLI, webhooks
```

Rules:
- Domain has zero external imports (no SQLAlchemy, no FastAPI)
- Application defines ports (Protocol classes), infrastructure implements them
- Presentation calls application use cases, never domain directly
- Dependencies point inward (infrastructure depends on application, not reverse)

```python
# application/ports.py
class NotificationPort(Protocol):
    async def send(self, user_id: int, message: str) -> None: ...

# application/use_cases.py
class CreateOrder:
    def __init__(self, orders: OrderRepository, notify: NotificationPort):
        self._orders = orders
        self._notify = notify

    async def execute(self, cmd: CreateOrderCommand) -> Order:
        order = Order.create(cmd.user_id, cmd.items)
        await self._orders.save(order)
        await self._notify.send(cmd.user_id, f"Order {order.id} created")
        return order
```

## Domain-Driven Design Tactical Patterns

Entities (identity-based):
```python
@dataclass
class Order:
    id: OrderId
    status: OrderStatus
    items: list[OrderItem]
    _events: list[DomainEvent] = field(default_factory=list)

    def confirm(self) -> None:
        if self.status != OrderStatus.PENDING:
            raise InvalidStateError("Cannot confirm non-pending order")
        self.status = OrderStatus.CONFIRMED
        self._events.append(OrderConfirmed(order_id=self.id))
```

Value Objects (equality by value):
```python
@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise CurrencyMismatch()
        return Money(self.amount + other.amount, self.currency)
```

Aggregates: cluster of entities with a root that enforces invariants.

## CQRS Implementation

Separate read and write models:
```python
# Commands (write side)
@dataclass(frozen=True)
class PlaceOrder:
    user_id: int
    items: list[OrderItemDTO]

class PlaceOrderHandler:
    async def handle(self, cmd: PlaceOrder) -> OrderId:
        order = Order.create(cmd.user_id, cmd.items)
        await self._repo.save(order)
        return order.id

# Queries (read side)
@dataclass(frozen=True)
class GetOrderSummary:
    order_id: int

class GetOrderSummaryHandler:
    async def handle(self, query: GetOrderSummary) -> OrderSummaryDTO:
        row = await self._read_db.fetch_one(SUMMARY_SQL, query.order_id)
        return OrderSummaryDTO(**row)
```

Mediator pattern for dispatch:
```python
class Mediator:
    def __init__(self):
        self._handlers: dict[type, Any] = {}

    def register(self, cmd_type: type, handler: Any) -> None:
        self._handlers[cmd_type] = handler

    async def send(self, command: Any) -> Any:
        handler = self._handlers[type(command)]
        return await handler.handle(command)
```

## Event-Driven with asyncio

```python
class EventBus:
    def __init__(self):
        self._subscribers: dict[type, list[Callable]] = defaultdict(list)

    def subscribe(self, event_type: type, handler: Callable) -> None:
        self._subscribers[event_type].append(handler)

    async def publish(self, event: DomainEvent) -> None:
        handlers = self._subscribers.get(type(event), [])
        await asyncio.gather(*(h(event) for h in handlers))
```

For durable events, publish to a message broker (Redis Streams, RabbitMQ, Kafka) instead of in-process dispatch. Use the outbox pattern to ensure atomicity between DB writes and event publishing.
