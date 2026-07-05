"""Production Lambda handler with structured logging, idempotency, and error handling."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any

from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from aws_lambda_powertools.utilities.batch import (
    BatchProcessor,
    EventType,
    batch_processor,
)
from aws_lambda_powertools.utilities.data_classes import SQSEvent
from aws_lambda_powertools.utilities.idempotency import (
    DynamoDBPersistenceLayer,
    idempotent_function,
)
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.utilities.validation import validate

logger = Logger()
tracer = Tracer()
metrics = Metrics()
processor = BatchProcessor(event_type=EventType.SQS)

IDEMPOTENCY_TABLE = os.environ.get("IDEMPOTENCY_TABLE", "IdempotencyTable")
persistence = DynamoDBPersistenceLayer(table_name=IDEMPOTENCY_TABLE)

INPUT_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["order_id", "customer_id", "items"],
    "properties": {
        "order_id": {"type": "string", "pattern": "^ord_[a-z0-9]+$"},
        "customer_id": {"type": "string"},
        "items": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "required": ["product_id", "quantity", "price_cents"],
                "properties": {
                    "product_id": {"type": "string"},
                    "quantity": {"type": "integer", "minimum": 1},
                    "price_cents": {"type": "integer", "minimum": 0},
                },
            },
        },
    },
}


@dataclass
class OrderItem:
    product_id: str
    quantity: int
    price_cents: int


@dataclass
class OrderRequest:
    order_id: str
    customer_id: str
    items: list[OrderItem]

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> OrderRequest:
        items = [OrderItem(**item) for item in data["items"]]
        return cls(
            order_id=data["order_id"],
            customer_id=data["customer_id"],
            items=items,
        )

    @property
    def total_cents(self) -> int:
        return sum(item.price_cents * item.quantity for item in self.items)


class OrderService:
    @tracer.capture_method
    def process_order(self, request: OrderRequest) -> dict[str, Any]:
        logger.info("Processing order", order_id=request.order_id, total=request.total_cents)
        metrics.add_metric(name="OrdersProcessed", unit=MetricUnit.Count, value=1)
        metrics.add_metric(name="OrderValue", unit=MetricUnit.Count, value=request.total_cents)

        result = self._fulfill_order(request)
        return result

    def _fulfill_order(self, request: OrderRequest) -> dict[str, Any]:
        return {
            "order_id": request.order_id,
            "status": "confirmed",
            "total_cents": request.total_cents,
            "item_count": len(request.items),
        }


service = OrderService()


@idempotent_function(
    data_keyword_argument="record_data",
    persistence_store=persistence,
)
@tracer.capture_method
def process_record(record_data: dict[str, Any]) -> dict[str, Any]:
    validate(event=record_data, schema=INPUT_SCHEMA)
    request = OrderRequest.from_dict(record_data)
    return service.process_order(request)


def record_handler(record) -> None:
    body = json.loads(record.body)
    process_record(record_data=body)


@logger.inject_lambda_context
@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
@batch_processor(record_handler=record_handler, processor=processor)
def handler(event: dict, context: LambdaContext) -> dict:
    return processor.response()
