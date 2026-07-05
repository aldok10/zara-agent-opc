"""Advanced pytest fixtures with factories, async, and database transactions."""

from typing import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.main import app
from app.api.deps import get_session
from app.models import Base, OrderModel, OrderItemModel


# --- Engine and Session Fixtures ---


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="session")
async def engine():
    """Create test database engine (session-scoped for performance)."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Per-test session with automatic rollback."""
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        async with session.begin():
            yield session
            await session.rollback()


@pytest.fixture
async def client(session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client with dependency overrides."""
    app.dependency_overrides[get_session] = lambda: session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


# --- Factory Fixtures ---


class OrderFactory:
    """Factory for creating test orders with sensible defaults."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._counter = 0

    async def create(
        self,
        *,
        customer_id: int = 1,
        status: str = "pending",
        item_count: int = 1,
    ) -> OrderModel:
        self._counter += 1
        order = OrderModel(
            customer_id=customer_id,
            status=status,
        )
        self._session.add(order)
        await self._session.flush()

        for i in range(item_count):
            item = OrderItemModel(
                order_id=order.id,
                product_id=100 + i,
                quantity=1 + i,
            )
            self._session.add(item)

        await self._session.flush()
        return order


@pytest.fixture
def order_factory(session: AsyncSession) -> OrderFactory:
    return OrderFactory(session)


# --- Test Examples ---


@pytest.mark.anyio
async def test_create_order(client: AsyncClient):
    """Integration test: create order via API."""
    response = await client.post(
        "/api/v1/orders",
        json={
            "customer_id": 1,
            "items": [{"product_id": 10, "quantity": 2, "unit_price": "19.99"}],
            "notes": "Rush delivery",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert data["customer_id"] == 1


@pytest.mark.anyio
async def test_create_order_validation(client: AsyncClient):
    """Validation error: empty items list."""
    response = await client.post(
        "/api/v1/orders",
        json={"customer_id": 1, "items": []},
    )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_list_orders_by_customer(
    client: AsyncClient,
    order_factory: OrderFactory,
):
    """Factory usage: create multiple orders then query."""
    await order_factory.create(customer_id=42, status="pending")
    await order_factory.create(customer_id=42, status="confirmed")
    await order_factory.create(customer_id=99, status="pending")

    response = await client.get("/api/v1/orders?customer_id=42")
    assert response.status_code == 200
    orders = response.json()
    assert len(orders) == 2
    assert all(o["customer_id"] == 42 for o in orders)


@pytest.mark.parametrize(
    "status_filter,expected_count",
    [
        ("pending", 2),
        ("confirmed", 1),
        ("cancelled", 0),
    ],
    ids=["pending-orders", "confirmed-orders", "no-cancelled"],
)
@pytest.mark.anyio
async def test_filter_by_status(
    client: AsyncClient,
    order_factory: OrderFactory,
    status_filter: str,
    expected_count: int,
):
    """Parametrized test with factory setup."""
    await order_factory.create(status="pending")
    await order_factory.create(status="pending")
    await order_factory.create(status="confirmed")

    response = await client.get(f"/api/v1/orders?status={status_filter}")
    assert response.status_code == 200
    assert len(response.json()) == expected_count


@pytest.mark.anyio
async def test_health(client: AsyncClient):
    """Smoke test: health endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
