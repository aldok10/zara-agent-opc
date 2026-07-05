---
type: subskill
title: "Data Contracts"
---

# Data Contracts

Schema contracts, SLAs, data ownership, and enforcement mechanisms between producers and consumers.

## When to Load

- Establishing agreements between data producers and consumers
- Implementing schema validation at ingestion boundaries
- Defining and monitoring data SLAs
- Building enforcement mechanisms that prevent breaking changes

## Key Concepts

**What is a Data Contract**
- Formal agreement between data producer and consumer
- Defines: schema, semantics, quality expectations, SLAs, ownership
- Machine-readable (YAML/JSON) so it can be enforced automatically
- Versioned and managed like an API contract

**Contract Components**
- Schema: columns, types, nullability, constraints
- Semantics: what each field means (business glossary reference)
- Quality: freshness, completeness, validity thresholds
- SLA: delivery time, availability, support response time
- Ownership: producer team, consumer teams, escalation contacts
- Evolution rules: how and when schema can change

**Compatibility Rules**
- Backward compatible (safe): add nullable columns, relax constraints
- Forward compatible (safe for consumers): remove unused columns (with deprecation)
- Breaking: rename columns, change types, add not-null without default
- Migration period: old and new schema available simultaneously

**Enforcement Points**
- Producer CI: validate output matches contract before deploy
- Ingestion layer: reject data that violates contract schema
- Consumer CI: validate expectations against contract definition
- Runtime monitoring: alert when SLA metrics degrade

## Patterns

```yaml
# data-contract.yml
apiVersion: v1
kind: DataContract
metadata:
  name: orders
  version: 2.1.0
  owner: order-platform-team
  domain: commerce
  tags: [critical, pii]

schema:
  type: object
  properties:
    order_id:
      type: string
      format: uuid
      description: "Unique order identifier"
      pii: false
    customer_id:
      type: string
      format: uuid
      description: "Reference to customer entity"
      pii: true
    order_amount:
      type: number
      minimum: 0
      maximum: 1000000
      description: "Total order amount in cents (USD)"
    status:
      type: string
      enum: [pending, confirmed, shipped, delivered, cancelled]
    created_at:
      type: string
      format: date-time
      description: "ISO 8601 timestamp of order creation"
  required: [order_id, customer_id, order_amount, status, created_at]

quality:
  freshness:
    max_delay_minutes: 30
  completeness:
    customer_id: 100%
    order_amount: 100%
    status: 100%
  volume:
    min_daily_records: 1000

sla:
  availability: 99.9%
  support_response_hours: 4
  breaking_change_notice_days: 30

consumers:
  - team: analytics
    usage: "Revenue reporting"
  - team: marketing
    usage: "Customer segmentation"
```

```python
# Contract validation at ingestion
from dataclasses import dataclass

@dataclass
class ContractViolation:
    field: str
    rule: str
    actual: str
    expected: str

def validate_against_contract(record: dict, contract: dict) -> list[ContractViolation]:
    violations = []
    schema = contract["schema"]["properties"]
    required = contract["schema"].get("required", [])

    for field in required:
        if field not in record or record[field] is None:
            violations.append(ContractViolation(
                field=field, rule="required",
                actual="missing/null", expected="present"
            ))

    for field, value in record.items():
        if field not in schema:
            continue
        spec = schema[field]
        if "enum" in spec and value not in spec["enum"]:
            violations.append(ContractViolation(
                field=field, rule="enum",
                actual=str(value), expected=str(spec["enum"])
            ))
        if "minimum" in spec and isinstance(value, (int, float)):
            if value < spec["minimum"]:
                violations.append(ContractViolation(
                    field=field, rule="minimum",
                    actual=str(value), expected=f">= {spec['minimum']}"
                ))

    return violations
```

## Gotchas

- Contracts without enforcement are just documentation (they drift)
- Too strict contracts slow down producer velocity -- find the balance
- Breaking changes need migration periods, not just announcements
- Schema registries (Confluent, AWS Glue) enforce at serialization time -- not business rules
- Contract ownership must be clear -- "everyone owns it" means no one does
- Consumer discovery: know who uses your data before making changes

## Verification

- Contract definition exists for all critical data products
- CI pipeline blocks deploys that violate contract schema
- SLA metrics are monitored and alerting is configured
- Breaking change attempted: confirm enforcement blocks it
- Consumer list is current (no unknown downstream dependencies)
