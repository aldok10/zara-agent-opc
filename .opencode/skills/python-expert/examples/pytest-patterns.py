from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def order_id() -> UUID:
    return uuid4()


@pytest.fixture
def sample_order(order_id: UUID) -> dict:
    return {
        "id": str(order_id),
        "customer_id": str(uuid4()),
        "items": ["item-1", "item-2"],
        "total_cents": 4999,
        "status": "pending",
        "created_at": datetime.now(UTC).isoformat(),
    }


@pytest.fixture
def mock_order_service() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
async def client(mock_order_service: AsyncMock) -> AsyncGenerator[AsyncClient]:
    from app.main import app, get_order_service

    app.dependency_overrides[get_order_service] = lambda: mock_order_service
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


class TestCreateOrder:
    async def test_returns_201_on_success(
        self, client: AsyncClient, mock_order_service: AsyncMock, sample_order: dict
    ) -> None:
        mock_order_service.create_order.return_value = sample_order
        response = await client.post("/orders", json={
            "customer_id": sample_order["customer_id"],
            "items": sample_order["items"],
            "total_cents": sample_order["total_cents"],
        })
        assert response.status_code == 201

    async def test_validates_empty_items(self, client: AsyncClient) -> None:
        response = await client.post("/orders", json={
            "customer_id": "cust-123",
            "items": [],
            "total_cents": 100,
        })
        assert response.status_code == 422

    async def test_validates_negative_total(self, client: AsyncClient) -> None:
        response = await client.post("/orders", json={
            "customer_id": "cust-123",
            "items": ["item-1"],
            "total_cents": -1,
        })
        assert response.status_code == 422


class TestGetOrder:
    async def test_returns_order_when_found(
        self, client: AsyncClient, mock_order_service: AsyncMock, sample_order: dict
    ) -> None:
        mock_order_service.get_order.return_value = sample_order
        response = await client.get(f"/orders/{sample_order['id']}")
        assert response.status_code == 200
        assert response.json()["id"] == sample_order["id"]

    async def test_returns_404_when_not_found(
        self, client: AsyncClient, mock_order_service: AsyncMock
    ) -> None:
        mock_order_service.get_order.return_value = None
        response = await client.get(f"/orders/{uuid4()}")
        assert response.status_code == 404


@pytest.mark.parametrize(
    ("input_cents", "expected_display"),
    [
        (100, "$1.00"),
        (4999, "$49.99"),
        (0, "$0.00"),
        (1, "$0.01"),
    ],
)
def test_format_price(input_cents: int, expected_display: str) -> None:
    formatted = f"${input_cents / 100:.2f}"
    assert formatted == expected_display
