---
type: fact
title: "SQLAlchemy Async"
---

# SQLAlchemy Async

SQLAlchemy 2.0 async: session management, eager loading, relationship patterns, Alembic integration.

## Engine and Session Setup

```python
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost/db",
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    echo=False,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
```

`expire_on_commit=False` prevents lazy-load attempts after commit (which fail in async).

## Session as Dependency

```python
from typing import AsyncGenerator

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        async with session.begin():
            yield session
            # Auto-commits on success, rollbacks on exception
```

One session per request. Transaction boundary at the handler level.

## Model Declaration (2.0 Style)

```python
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, String
from datetime import datetime, UTC

class Base(DeclarativeBase):
    pass

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", lazy="raise")

class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    product_id: Mapped[int]
    quantity: Mapped[int]
    order: Mapped["Order"] = relationship(back_populates="items", lazy="raise")
```

`lazy="raise"` prevents accidental lazy loading (which fails in async). Always load explicitly.

## Queries (2.0 Style)

```python
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def get_order_with_items(session: AsyncSession, order_id: int) -> Order | None:
    stmt = (
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items))
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()

async def list_orders(session: AsyncSession, customer_id: int, limit: int = 50) -> list[Order]:
    stmt = (
        select(Order)
        .where(Order.customer_id == customer_id)
        .order_by(Order.created_at.desc())
        .limit(limit)
        .options(selectinload(Order.items))
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
```

Never use legacy `session.query()`. Always `select()` + `session.execute()`.

## Eager Loading Strategies

| Strategy | When | Query Pattern |
|----------|------|---------------|
| `selectinload` | 1-to-many, separate SELECT | Default choice |
| `joinedload` | 1-to-1 or few rows, single JOIN | `joinedload(Order.customer)` |
| `subqueryload` | Many-to-many, subquery | Avoids cartesian product |
| `raiseload` | Prevent lazy loading | Set on relationship |

## Alembic Async Migrations

```python
# alembic/env.py
from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine
from app.models import Base

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations():
    engine = create_async_engine(settings.database_url)
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()

asyncio.run(run_async_migrations())
```

```bash
alembic revision --autogenerate -m "add orders table"
alembic upgrade head
```

## Rules

1. `expire_on_commit=False` always for async sessions
2. `lazy="raise"` on all relationships -- load explicitly with options
3. `selectinload` as default eager strategy
4. 2.0 query style only: `select()` + `execute()`
5. Session per request, transaction at handler boundary
6. Alembic for all schema changes -- never `create_all()` in production
7. `pool_pre_ping=True` for connection health checks
