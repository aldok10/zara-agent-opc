# Pydantic v2

Validators, model_config, computed fields, discriminated unions, serialization patterns.

## Model Basics

```python
from pydantic import BaseModel, Field, ConfigDict

class OrderItem(BaseModel):
    model_config = ConfigDict(strict=True, frozen=True)

    product_id: int = Field(gt=0)
    quantity: int = Field(ge=1, le=1000)
    unit_price: Decimal = Field(ge=0, decimal_places=2)
```

`strict=True`: no coercion (string "1" won't become int). `frozen=True`: immutable after creation.

## Validators

```python
from pydantic import field_validator, model_validator

class CreateOrder(BaseModel):
    customer_id: int
    items: list[OrderItem] = Field(min_length=1)
    notes: str = Field(default="", max_length=500)

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, v: str) -> str:
        return v.strip()

    @model_validator(mode="after")
    def check_total_quantity(self) -> Self:
        total = sum(item.quantity for item in self.items)
        if total > 10000:
            raise ValueError("Total quantity cannot exceed 10000")
        return self
```

`mode="before"` for raw data transforms. `mode="after"` for cross-field validation.

## Computed Fields

```python
from pydantic import computed_field
from decimal import Decimal

class OrderResponse(BaseModel):
    items: list[OrderItem]
    discount_pct: Decimal = Decimal("0")

    @computed_field
    @property
    def subtotal(self) -> Decimal:
        return sum(i.unit_price * i.quantity for i in self.items)

    @computed_field
    @property
    def total(self) -> Decimal:
        return self.subtotal * (1 - self.discount_pct / 100)
```

Computed fields appear in serialization but aren't stored or accepted as input.

## Discriminated Unions

```python
from typing import Annotated, Literal, Union
from pydantic import Discriminator, Tag

class CreditPayment(BaseModel):
    type: Literal["credit"] = "credit"
    card_last4: str = Field(pattern=r"^\d{4}$")
    amount: Decimal

class BankTransfer(BaseModel):
    type: Literal["bank"] = "bank"
    account_number: str
    amount: Decimal

Payment = Annotated[
    Union[
        Annotated[CreditPayment, Tag("credit")],
        Annotated[BankTransfer, Tag("bank")],
    ],
    Discriminator("type"),
]
```

Discriminated unions give O(1) dispatch and clear error messages on invalid type field.

## Serialization Control

```python
class UserResponse(BaseModel):
    model_config = ConfigDict(ser_json_timedelta="float")

    id: int
    email: str
    created_at: datetime
    internal_notes: str = Field(exclude=True)

    @field_serializer("created_at")
    def serialize_dt(self, dt: datetime) -> str:
        return dt.isoformat()

# Usage
user.model_dump(mode="json", exclude_none=True)
user.model_dump(include={"id", "email"})
```

## BaseSettings for Config

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="APP_",
        case_sensitive=False,
    )

    database_url: str
    redis_url: str = "redis://localhost:6379"
    debug: bool = False
    allowed_origins: list[str] = ["http://localhost:3000"]
```

Reads from env vars with prefix (APP_DATABASE_URL), validates at startup.

## Custom Types

```python
from pydantic import AfterValidator, BeforeValidator
from typing import Annotated

def validate_slug(v: str) -> str:
    if not v.replace("-", "").isalnum():
        raise ValueError("Slug must be alphanumeric with hyphens")
    return v.lower()

Slug = Annotated[str, AfterValidator(validate_slug), Field(max_length=100)]
```

## Rules

1. `BaseModel` for API boundaries, `dataclass` for internals
2. `model_config = ConfigDict(strict=True)` for request models
3. `field_validator` for single-field transforms, `model_validator` for cross-field
4. Discriminated unions over plain `Union` -- better errors and performance
5. `exclude=True` on fields that must never serialize
6. `BaseSettings` for all config -- validated once at startup
7. Custom types via `Annotated` + validators -- reusable across models
