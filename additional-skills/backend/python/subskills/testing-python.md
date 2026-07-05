# Testing Python

pytest: fixtures, parametrize, mocking, async tests, hypothesis, coverage, conftest patterns.

## Fixture Patterns

```python
# conftest.py
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="session")
async def engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest.fixture
async def session(engine) -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSession(engine, expire_on_commit=False) as session:
        async with session.begin():
            yield session
            await session.rollback()  # Each test gets clean state

@pytest.fixture
async def client(app, session) -> AsyncGenerator[AsyncClient, None]:
    app.dependency_overrides[get_session] = lambda: session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
```

## Async Tests

```python
import pytest

@pytest.mark.anyio
async def test_create_order(client: AsyncClient):
    response = await client.post("/api/v1/orders", json={
        "customer_id": 1,
        "items": [{"product_id": 10, "quantity": 2}],
    })
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert len(data["items"]) == 1
```

Use `pytest-anyio` (or `pytest-asyncio` with `mode=auto`). Mark async tests explicitly.

## Parametrize

```python
@pytest.mark.parametrize(
    "input_status,expected_code",
    [
        ("pending", 200),
        ("active", 200),
        ("cancelled", 200),
        ("invalid", 422),
    ],
    ids=["pending-ok", "active-ok", "cancelled-ok", "invalid-rejected"],
)
async def test_get_by_status(client: AsyncClient, input_status: str, expected_code: int):
    response = await client.get(f"/api/v1/orders?status={input_status}")
    assert response.status_code == expected_code
```

Always add `ids=` for readable test output. Combine with fixtures for matrix testing.

## Factory Pattern

```python
# tests/factories.py
from dataclasses import dataclass, field
from app.domain.orders.models import Order

@dataclass
class OrderFactory:
    customer_id: int = 1
    status: str = "pending"
    items: list = field(default_factory=lambda: [{"product_id": 1, "quantity": 1}])

    def build(self, **overrides) -> Order:
        data = {**self.__dict__, **overrides}
        return Order(**data)

    async def create(self, session: AsyncSession, **overrides) -> Order:
        order = self.build(**overrides)
        session.add(order)
        await session.flush()
        return order
```

Factories over raw fixtures for entity creation. Override only what the test cares about.

## Mocking

```python
from unittest.mock import AsyncMock, patch

async def test_send_notification(order_service):
    mock_sender = AsyncMock()
    mock_sender.send.return_value = {"id": "msg_123"}

    with patch.object(order_service, "_notifier", mock_sender):
        await order_service.confirm(order_id=1)

    mock_sender.send.assert_called_once_with(
        template="order_confirmed",
        recipient="user@example.com",
    )
```

Mock at boundaries (external services, I/O). Never mock the thing you're testing. Prefer dependency override over `patch` when using FastAPI.

## Hypothesis (Property-Based)

```python
from hypothesis import given, strategies as st
from app.domain.pricing import calculate_discount

@given(
    price=st.decimals(min_value=0, max_value=10000, places=2),
    quantity=st.integers(min_value=1, max_value=100),
)
def test_discount_never_exceeds_total(price, quantity):
    total = price * quantity
    discount = calculate_discount(price, quantity)
    assert 0 <= discount <= total
```

Use hypothesis for business logic invariants. Not for integration tests.

## Coverage Configuration

```toml
# pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
markers = ["integration: marks integration tests", "slow: marks slow tests"]

[tool.coverage.run]
source = ["src"]
omit = ["*/migrations/*", "*/conftest.py"]

[tool.coverage.report]
fail_under = 80
exclude_lines = ["if TYPE_CHECKING:", "assert_never"]
```

## Rules

1. Each test tests ONE behavior -- name it `test_<action>_<condition>_<expected>`
2. Fixture scope: session for expensive setup, function for mutable state
3. Transaction rollback per test -- never rely on test ordering
4. Dependency overrides over monkeypatch for FastAPI services
5. Factories for entities, parametrize for input variations
6. Mock boundaries, not internals
7. 80% coverage minimum, but coverage != quality -- test behavior not lines
8. Separate unit/integration with markers, run fast tests in CI first
