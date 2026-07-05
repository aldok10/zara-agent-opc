"""Async repository pattern with SQLAlchemy 2.0 and proper session management."""

from datetime import UTC, datetime
from typing import Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, selectinload

# --- Base ---


class Base(DeclarativeBase):
    pass


# --- Models ---


class OrderModel(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(index=True)
    status: Mapped[str] = mapped_column(default="pending")
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
    items: Mapped[list["OrderItemModel"]] = relationship(
        back_populates="order", lazy="raise", cascade="all, delete-orphan"
    )


class OrderItemModel(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column()
    product_id: Mapped[int]
    quantity: Mapped[int]
    order: Mapped["OrderModel"] = relationship(back_populates="items", lazy="raise")


# --- Generic Repository ---

ModelT = TypeVar("ModelT", bound=Base)


class AsyncRepository(Generic[ModelT]):
    """Base async repository with common CRUD operations."""

    def __init__(self, session: AsyncSession, model_class: type[ModelT]) -> None:
        self._session = session
        self._model = model_class

    async def get_by_id(self, id: int) -> ModelT | None:
        stmt = select(self._model).where(self._model.id == id)  # type: ignore[attr-defined]
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(self, *, limit: int = 50, offset: int = 0) -> list[ModelT]:
        stmt = select(self._model).limit(limit).offset(offset)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def add(self, entity: ModelT) -> ModelT:
        self._session.add(entity)
        await self._session.flush()
        return entity

    async def delete(self, entity: ModelT) -> None:
        await self._session.delete(entity)
        await self._session.flush()


# --- Order Repository ---


class OrderRepository(AsyncRepository[OrderModel]):
    """Order-specific queries with eager loading."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, OrderModel)

    async def get_with_items(self, order_id: int) -> OrderModel | None:
        stmt = (
            select(OrderModel)
            .where(OrderModel.id == order_id)
            .options(selectinload(OrderModel.items))
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_customer(
        self,
        customer_id: int,
        *,
        limit: int = 50,
    ) -> list[OrderModel]:
        stmt = (
            select(OrderModel)
            .where(OrderModel.customer_id == customer_id)
            .order_by(OrderModel.created_at.desc())
            .limit(limit)
            .options(selectinload(OrderModel.items))
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def update_status(self, order_id: int, status: str) -> OrderModel | None:
        order = await self.get_by_id(order_id)
        if order is None:
            return None
        order.status = status
        await self._session.flush()
        return order


# --- Session Factory (app-level setup) ---


def create_session_factory(database_url: str) -> async_sessionmaker[AsyncSession]:
    engine = create_async_engine(
        database_url,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True,
    )
    return async_sessionmaker(engine, expire_on_commit=False)


# --- Usage in FastAPI dependency ---


async def get_order_repo(session: AsyncSession) -> OrderRepository:
    return OrderRepository(session)
