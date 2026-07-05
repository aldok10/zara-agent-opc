# Dependency Injection in FastAPI

FastAPI Depends(), dependency overrides for testing, scoped dependencies, sub-dependencies.

## Basic Depends

```python
from fastapi import Depends, APIRouter
from typing import Annotated

async def get_current_user(token: str = Header(alias="Authorization")) -> User:
    user = await verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

CurrentUser = Annotated[User, Depends(get_current_user)]

router = APIRouter()

@router.get("/me")
async def get_profile(user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(user)
```

`Annotated` type aliases eliminate repeated `Depends()` calls.

## Sub-Dependencies (Composition)

```python
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        async with session.begin():
            yield session

SessionDep = Annotated[AsyncSession, Depends(get_session)]

async def get_order_repo(session: SessionDep) -> OrderRepository:
    return OrderRepository(session)

async def get_order_service(
    repo: OrderRepository = Depends(get_order_repo),
    notifier: Notifier = Depends(get_notifier),
) -> OrderService:
    return OrderService(repo, notifier)

OrderServiceDep = Annotated[OrderService, Depends(get_order_service)]

@router.post("/orders")
async def create_order(
    payload: CreateOrderRequest,
    service: OrderServiceDep,
) -> OrderResponse:
    return await service.create(payload)
```

Dependencies compose automatically. FastAPI resolves the graph and caches per-request.

## Scoping: Per-Request Caching

```python
# Same dependency used in multiple places within one request
# FastAPI caches by default (same instance per request)

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session

# Both repos get the SAME session instance in a single request
async def get_order_repo(session: SessionDep) -> OrderRepository: ...
async def get_inventory_repo(session: SessionDep) -> InventoryRepository: ...
```

To disable caching: `Depends(get_session, use_cache=False)`.

## Class-Based Dependencies

```python
class Pagination:
    def __init__(self, page: int = 1, size: int = 20):
        self.offset = (page - 1) * size
        self.limit = min(size, 100)

PaginationDep = Annotated[Pagination, Depends()]

@router.get("/orders")
async def list_orders(
    pagination: PaginationDep,
    session: SessionDep,
) -> list[OrderResponse]:
    stmt = select(Order).offset(pagination.offset).limit(pagination.limit)
    ...
```

`Depends()` with no argument on a class uses `__init__` params as query params.

## Permission Dependencies

```python
class RequireRole:
    def __init__(self, *roles: str):
        self.roles = roles

    async def __call__(self, user: CurrentUser) -> User:
        if user.role not in self.roles:
            raise HTTPException(403, "Insufficient permissions")
        return user

AdminOnly = Annotated[User, Depends(RequireRole("admin"))]
StaffOrAdmin = Annotated[User, Depends(RequireRole("staff", "admin"))]

@router.delete("/orders/{id}")
async def delete_order(id: int, user: AdminOnly) -> None: ...
```

## Dependency Overrides for Testing

```python
# tests/conftest.py
import pytest
from httpx import ASGITransport, AsyncClient

@pytest.fixture
async def client(test_session):
    """Override dependencies for testing."""
    from app.main import app
    from app.api.deps import get_session, get_current_user

    app.dependency_overrides[get_session] = lambda: test_session
    app.dependency_overrides[get_current_user] = lambda: User(id=1, role="admin")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
```

Override at the exact function reference. Clear after test to avoid leaks.

## Router-Level Dependencies

```python
router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(RequireRole("admin"))],
)

# All routes under this router require admin role
@router.get("/users")
async def list_all_users(session: SessionDep) -> list[UserResponse]: ...
```

## Rules

1. `Annotated[X, Depends(fn)]` for all reusable dependencies
2. Compose via sub-dependencies -- avoid deep nesting
3. Session dependency yields inside transaction boundary
4. Per-request caching is default -- single session per request
5. Override dependencies in tests -- never mock FastAPI internals
6. Class dependencies for query params with validation logic
7. Router-level `dependencies=` for cross-cutting concerns (auth, rate limit)
8. Clear `dependency_overrides` in test teardown
