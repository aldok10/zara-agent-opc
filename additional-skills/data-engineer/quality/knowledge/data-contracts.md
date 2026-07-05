# Data Contracts

Schema contracts, SLAs, ownership, and governance patterns for data-as-a-product.

## What is a Data Contract

A formal agreement between a data producer and its consumers specifying:
- **Schema**: exact structure, types, and constraints
- **SLA**: freshness, availability, quality thresholds
- **Semantics**: what columns mean (not just their names)
- **Ownership**: who is responsible when things break

## Contract Structure

```yaml
apiVersion: datacontract/v1.0
id: orders-contract
info:
  title: Order Events
  version: 2.1.0
  owner: platform-team
  contact: platform-team@company.com
  description: Completed order events from checkout service

servers:
  production:
    type: bigquery
    project: analytics-prod
    dataset: warehouse
    table: fct_orders

schema:
  type: object
  properties:
    order_id:
      type: string
      format: uuid
      required: true
      unique: true
      description: Globally unique order identifier
    customer_id:
      type: string
      required: true
      description: FK to dim_customers
    amount:
      type: number
      format: decimal(12,2)
      required: true
      minimum: 0
      description: Net order value after discounts, in USD
    order_date:
      type: date
      required: true
      description: Date the order was placed (UTC)
    status:
      type: string
      required: true
      enum: [completed, refunded, partial_refund]
    created_at:
      type: timestamp
      required: true
      description: When this record was created in warehouse

quality:
  freshness:
    max_delay_minutes: 60
    measured_at_field: created_at
  completeness:
    threshold: 0.99
    critical_fields: [order_id, customer_id, amount]
  accuracy:
    rules:
      - field: amount
        rule: "amount >= 0 AND amount < 1000000"
      - field: order_date
        rule: "order_date <= CURRENT_DATE()"
  uniqueness:
    fields: [order_id]

sla:
  availability: 99.9%
  query_response_p95: 5s
  update_frequency: hourly
  backfill_policy: "Producer notifies 24h before backfill; max 7 days"

terms:
  usage: "Analytics and reporting only. Not for real-time decisioning."
  retention: "3 years from order_date"
  pii_fields: [customer_id]
  classification: internal
```

## Implementation Approaches

### Schema Enforcement at Producer

```python
from pydantic import BaseModel, Field
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

class OrderEvent(BaseModel):
    order_id: UUID
    customer_id: str = Field(min_length=1)
    amount: Decimal = Field(ge=0, decimal_places=2)
    order_date: date
    status: Literal["completed", "refunded", "partial_refund"]
    created_at: datetime

def validate_before_publish(event: dict) -> OrderEvent:
    return OrderEvent(**event)
```

### Schema Enforcement at Consumer (dbt)

```yaml
models:
  - name: fct_orders
    config:
      contract:
        enforced: true
    columns:
      - name: order_id
        data_type: string
        constraints:
          - type: not_null
          - type: unique
      - name: amount
        data_type: numeric(12, 2)
        constraints:
          - type: not_null
          - type: check
            expression: "amount >= 0"
```

### Schema Registry (Kafka/Streaming)

- Avro/Protobuf schemas registered per topic
- Backward compatibility enforced (can't remove fields)
- Schema evolution tracked with versioning
- Producers fail-fast if schema violates contract

## Ownership Model

| Role | Responsibility |
|------|---------------|
| Producer | Schema correctness, freshness SLA, backfill communication |
| Consumer | Validate expectations via tests, report contract violations |
| Platform | Enforcement tooling, monitoring, alerting |
| Data Steward | Business semantics, classification, retention policies |

## SLA Tiers

| Tier | Freshness | Availability | Support |
|------|-----------|-------------|---------|
| Critical | <15 min | 99.95% | PagerDuty, 15-min response |
| Standard | <1 hour | 99.9% | Business hours, 4-hour response |
| Best-effort | <24 hours | 99% | Next business day |

## Versioning

- **Minor version** (2.1 -> 2.2): additive changes (new nullable column)
- **Major version** (2.x -> 3.0): breaking changes (column removal, type change)
- Breaking changes require: 30-day deprecation notice + parallel running + consumer migration

## Monitoring Contract Compliance

```sql
-- Freshness check
SELECT
    MAX(created_at) AS latest_record,
    TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(created_at), MINUTE) AS delay_minutes,
    CASE
        WHEN TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(created_at), MINUTE) > 60
        THEN 'SLA_BREACH'
        ELSE 'OK'
    END AS freshness_status
FROM warehouse.fct_orders;

-- Completeness check
SELECT
    COUNT(*) AS total_rows,
    COUNTIF(order_id IS NULL) AS null_order_id,
    COUNTIF(amount IS NULL) AS null_amount,
    COUNTIF(amount < 0) AS negative_amount
FROM warehouse.fct_orders
WHERE order_date = CURRENT_DATE() - 1;
```

## Anti-Patterns

- Implicit contracts (assumptions without documentation)
- Producer owns consumer experience (consumers should validate independently)
- Schema changes without version bump
- SLAs without monitoring
- Contracts without enforcement (aspirational, not operational)
- Single contract for all consumers (different consumers have different needs)
