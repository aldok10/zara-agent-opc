from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    version: str


class CreateOrderRequest(BaseModel):
    customer_id: str = Field(min_length=1, max_length=64)
    items: list[str] = Field(min_items=1, max_items=100)
    total_cents: int = Field(gt=0)


class OrderResponse(BaseModel):
    id: str
    customer_id: str
    items: list[str]
    total_cents: int
    status: str


class OrderService:
    def __init__(self, db_pool) -> None:
        self._db = db_pool

    async def create_order(self, request: CreateOrderRequest) -> OrderResponse:
        order_id = await self._db.execute(
            "INSERT INTO orders (customer_id, items, total_cents, status) "
            "VALUES ($1, $2, $3, 'pending') RETURNING id",
            request.customer_id,
            request.items,
            request.total_cents,
        )
        return OrderResponse(
            id=order_id,
            customer_id=request.customer_id,
            items=request.items,
            total_cents=request.total_cents,
            status="pending",
        )

    async def get_order(self, order_id: str) -> OrderResponse | None:
        row = await self._db.fetchrow(
            "SELECT id, customer_id, items, total_cents, status FROM orders WHERE id = $1",
            order_id,
        )
        if row is None:
            return None
        return OrderResponse(**dict(row))


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    app.state.order_service = OrderService(db_pool=app.state.db_pool)
    yield


app = FastAPI(title="Order Service", version="1.0.0", lifespan=lifespan)


def get_order_service(app_state=Depends(lambda: app.state)) -> OrderService:
    return app_state.order_service


OrderServiceDep = Annotated[OrderService, Depends(get_order_service)]


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", version="1.0.0")


@app.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(request: CreateOrderRequest, svc: OrderServiceDep) -> OrderResponse:
    return await svc.create_order(request)


@app.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, svc: OrderServiceDep) -> OrderResponse:
    order = await svc.get_order(order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order
