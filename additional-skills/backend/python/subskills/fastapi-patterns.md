# FastAPI Patterns

Production FastAPI: routers, dependencies, middleware, OpenAPI customization, background tasks, lifespan events.

## Router Organization

```python
# app/api/v1/routes/orders.py
from fastapi import APIRouter, Depends, status
from app.domain.orders.service import OrderService
from app.api.deps import get_order_service

router = APIRouter(prefix="/orders", tags=["orders"])

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: CreateOrderRequest,
    service: OrderService = Depends(get_order_service),
) -> OrderResponse:
    order = await service.create(payload)
    return OrderResponse.model_validate(order)
```

Split by domain, not by HTTP method. One router per aggregate. Version via prefix (`/api/v1/`).

## Dependency Injection

```python
# app/api/deps.py
from typing import Annotated, AsyncGenerator
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session

SessionDep = Annotated[AsyncSession, Depends(get_session)]

async def get_order_service(session: SessionDep) -> OrderService:
    repo = OrderRepository(session)
    return OrderService(repo)
```

Use `Annotated` type aliases to reduce boilerplate. Dependencies compose -- declare sub-dependencies as parameters.

## Lifespan (replaces on_event)

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.db_pool = await create_pool()
    app.state.redis = await create_redis()
    yield
    # Shutdown
    await app.state.db_pool.dispose()
    await app.state.redis.close()

app = FastAPI(lifespan=lifespan)
```

Never use `@app.on_event("startup")` -- deprecated, doesn't support cleanup.

## Middleware

```python
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import structlog, time

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        structlog.contextvars.bind_contextvars(
            request_id=request.headers.get("x-request-id", ""),
            method=request.method,
            path=request.url.path,
        )
        response = await call_next(request)
        duration = time.perf_counter() - start
        structlog.get_logger().info("request_completed", status=response.status_code, duration_ms=round(duration * 1000))
        structlog.contextvars.unbind_contextvars("request_id", "method", "path")
        return response
```

Order matters: add CORS first, then logging, then auth. For pure ASGI middleware (better perf), implement `__call__` directly.

## Exception Handling

```python
from fastapi import Request
from fastapi.responses import JSONResponse

class AppError(Exception):
    def __init__(self, message: str, code: str, status: int = 400):
        self.message = message
        self.code = code
        self.status = status

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"error": {"code": exc.code, "message": exc.message}},
    )
```

Domain errors -> structured JSON. Never expose stack traces in production.

## Background Tasks

```python
from fastapi import BackgroundTasks

@router.post("/orders/{order_id}/confirm")
async def confirm_order(
    order_id: int,
    background_tasks: BackgroundTasks,
    service: OrderService = Depends(get_order_service),
) -> OrderResponse:
    order = await service.confirm(order_id)
    background_tasks.add_task(send_confirmation_email, order.email, order.id)
    return OrderResponse.model_validate(order)
```

For fire-and-forget. For reliable async work, use a task queue (celery, arq, or TaskIQ).

## OpenAPI Customization

```python
app = FastAPI(
    title="Order Service",
    version="1.0.0",
    openapi_tags=[
        {"name": "orders", "description": "Order management"},
    ],
    responses={
        422: {"description": "Validation Error"},
        500: {"description": "Internal Server Error"},
    },
)
```

Add `response_model_exclude_none=True` on routes to keep payloads clean. Use `Field(examples=[...])` in Pydantic models for rich docs.

## Rules

1. One router per domain aggregate, grouped in `api/v1/routes/`
2. All dependencies via `Depends()` -- never import services directly in route
3. `Annotated[X, Depends(fn)]` type aliases for repeated deps
4. Lifespan context manager for startup/shutdown
5. Domain exceptions with structured error responses
6. Response models always explicit -- never return raw dicts
7. Status codes explicit on every route
8. Path operations ordered: POST, GET (list), GET (detail), PUT/PATCH, DELETE
