"""Production FastAPI service with Pydantic models, DI, error handling, structured logging."""

from contextlib import asynccontextmanager
from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated, AsyncGenerator

import structlog
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# --- Configuration ---

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_")

    database_url: str
    redis_url: str = "redis://localhost:6379"
    debug: bool = False
    log_level: str = "INFO"


settings = Settings()  # type: ignore[call-arg]


# --- Database ---

engine = create_async_engine(settings.database_url, pool_pre_ping=True)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        async with session.begin():
            yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]


# --- Domain Errors ---


class AppError(Exception):
    def __init__(self, message: str, code: str, status_code: int = 400) -> None:
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class OrderNotFound(AppError):
    def __init__(self, order_id: int) -> None:
        super().__init__(
            message=f"Order {order_id} not found",
            code="ORDER_NOT_FOUND",
            status_code=404,
        )


# --- Schemas ---


class OrderItemCreate(BaseModel):
    model_config = ConfigDict(strict=True)

    product_id: int = Field(gt=0)
    quantity: int = Field(ge=1, le=1000)
    unit_price: Decimal = Field(ge=0, decimal_places=2)


class OrderCreate(BaseModel):
    model_config = ConfigDict(strict=True)

    customer_id: int = Field(gt=0)
    items: list[OrderItemCreate] = Field(min_length=1, max_length=50)
    notes: str = Field(default="", max_length=500)

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, v: str) -> str:
        return v.strip()


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    status: str
    total: Decimal
    created_at: datetime


# --- Service ---


class OrderService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._log = structlog.get_logger()

    async def create(self, payload: OrderCreate) -> OrderResponse:
        total = sum(item.unit_price * item.quantity for item in payload.items)
        # In real code: create ORM model, add to session
        self._log.info(
            "order_created",
            customer_id=payload.customer_id,
            item_count=len(payload.items),
            total=str(total),
        )
        return OrderResponse(
            id=1,
            customer_id=payload.customer_id,
            status="pending",
            total=total,
            created_at=datetime.now(UTC),
        )


async def get_order_service(session: SessionDep) -> OrderService:
    return OrderService(session)


OrderServiceDep = Annotated[OrderService, Depends(get_order_service)]


# --- App ---


@asynccontextmanager
async def lifespan(app: FastAPI):
    structlog.get_logger().info("service_starting")
    yield
    await engine.dispose()
    structlog.get_logger().info("service_stopped")


app = FastAPI(
    title="Order Service",
    version="1.0.0",
    lifespan=lifespan,
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


# --- Routes ---


@app.post("/api/v1/orders", status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    service: OrderServiceDep,
) -> OrderResponse:
    return await service.create(payload)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
