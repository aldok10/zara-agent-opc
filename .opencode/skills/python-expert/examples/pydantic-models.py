from datetime import UTC, datetime
from enum import StrEnum
from typing import Annotated, Self
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class Currency(StrEnum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"


class Money(BaseModel):
    model_config = ConfigDict(frozen=True)

    amount_cents: int = Field(ge=0)
    currency: Currency

    @classmethod
    def usd(cls, cents: int) -> "Money":
        return cls(amount_cents=cents, currency=Currency.USD)

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            msg = f"Cannot add {self.currency} and {other.currency}"
            raise ValueError(msg)
        return Money(amount_cents=self.amount_cents + other.amount_cents, currency=self.currency)


class Address(BaseModel):
    model_config = ConfigDict(frozen=True)

    street: str = Field(min_length=1, max_length=200)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=2, max_length=2)
    zip_code: str = Field(pattern=r"^\d{5}(-\d{4})?$")
    country: str = Field(default="US", min_length=2, max_length=2)

    @field_validator("state")
    @classmethod
    def validate_state(cls, v: str) -> str:
        return v.upper()


class OrderItem(BaseModel):
    model_config = ConfigDict(frozen=True)

    product_id: UUID
    quantity: Annotated[int, Field(gt=0, le=999)]
    unit_price: Money


class Order(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: UUID = Field(default_factory=uuid4)
    customer_id: UUID
    items: list[OrderItem] = Field(min_length=1)
    shipping_address: Address
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @model_validator(mode="after")
    def check_no_duplicate_products(self) -> Self:
        product_ids = [item.product_id for item in self.items]
        if len(product_ids) != len(set(product_ids)):
            msg = "Duplicate products in order"
            raise ValueError(msg)
        return self

    @property
    def total(self) -> Money:
        if not self.items:
            return Money.usd(0)
        amounts = [
            Money(
                amount_cents=item.unit_price.amount_cents * item.quantity,
                currency=item.unit_price.currency,
            )
            for item in self.items
        ]
        result = amounts[0]
        for amount in amounts[1:]:
            result = result.add(amount)
        return result
