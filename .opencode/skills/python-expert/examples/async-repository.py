from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


@dataclass(frozen=True, slots=True)
class Product:
    id: UUID
    name: str
    price_cents: int
    stock: int


class ProductRepository(Protocol):
    async def get_by_id(self, product_id: UUID) -> Product | None: ...
    async def list_all(self, *, limit: int = 50, offset: int = 0) -> Sequence[Product]: ...
    async def save(self, product: Product) -> Product: ...
    async def delete(self, product_id: UUID) -> bool: ...


class SQLAlchemyProductRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def get_by_id(self, product_id: UUID) -> Product | None:
        async with self._session_factory() as session:
            from .models import ProductModel

            stmt = select(ProductModel).where(ProductModel.id == product_id)
            result = await session.execute(stmt)
            row = result.scalar_one_or_none()
            if row is None:
                return None
            return Product(
                id=row.id,
                name=row.name,
                price_cents=row.price_cents,
                stock=row.stock,
            )

    async def list_all(self, *, limit: int = 50, offset: int = 0) -> Sequence[Product]:
        async with self._session_factory() as session:
            from .models import ProductModel

            stmt = select(ProductModel).limit(limit).offset(offset).order_by(ProductModel.name)
            result = await session.execute(stmt)
            return [
                Product(id=row.id, name=row.name, price_cents=row.price_cents, stock=row.stock)
                for row in result.scalars()
            ]

    async def save(self, product: Product) -> Product:
        async with self._session_factory() as session:
            from .models import ProductModel

            model = ProductModel(
                id=product.id,
                name=product.name,
                price_cents=product.price_cents,
                stock=product.stock,
            )
            merged = await session.merge(model)
            await session.commit()
            return Product(
                id=merged.id,
                name=merged.name,
                price_cents=merged.price_cents,
                stock=merged.stock,
            )

    async def delete(self, product_id: UUID) -> bool:
        async with self._session_factory() as session:
            from .models import ProductModel

            stmt = select(ProductModel).where(ProductModel.id == product_id)
            result = await session.execute(stmt)
            row = result.scalar_one_or_none()
            if row is None:
                return False
            await session.delete(row)
            await session.commit()
            return True
