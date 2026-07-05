---
type: fact
title: "Data Contracts"
---

# Data Contracts

## What Is a Data Contract

A formal agreement between a data producer and its consumers that defines the structure, semantics, quality, and delivery guarantees of a dataset. Shifts data quality responsibility upstream to the team that owns the source.

## Core Components

### Schema Definition
- Field names, types, nullability, constraints
- Nested structure specification
- Format: JSON Schema, Protobuf, Avro, or YAML-based DSL
- Versioned alongside application code

### Semantic Metadata
- Business definitions for each field
- Valid value ranges and enumeration values
- Relationships to other entities
- Classification: PII, financial, internal-only

### Quality Expectations
- Freshness: data arrives within X minutes of event
- Completeness: field X is non-null for >99% of records
- Uniqueness: field X has no duplicates
- Volume: row count within expected range
- Custom rules: business-specific invariants

### SLAs (Service Level Agreements)
- Delivery schedule: every 15 min, hourly, daily at 06:00 UTC
- Latency: max delay between event and availability
- Availability: uptime percentage for the data feed
- Support response time for issues

## Schema-as-Code

### Contract File Example (YAML)
```yaml
apiVersion: v1
kind: DataContract
metadata:
  name: orders
  owner: checkout-team
  domain: commerce
  version: 2.1.0

schema:
  type: object
  properties:
    order_id:
      type: string
      format: uuid
      description: Unique order identifier
      pii: false
    customer_id:
      type: string
      format: uuid
      pii: true
    total_amount:
      type: number
      minimum: 0
      description: Order total in cents
    status:
      type: string
      enum: [pending, confirmed, shipped, delivered, cancelled]
    created_at:
      type: string
      format: date-time

quality:
  freshness:
    max_delay_minutes: 30
  completeness:
    - field: customer_id
      threshold: 0.99
    - field: total_amount
      threshold: 1.0
  volume:
    min_rows_per_hour: 100
    max_rows_per_hour: 50000

sla:
  delivery: every 15 minutes
  availability: 99.5%
  support: business-hours, 4hr response
```

### Tooling
- Schemata: open source data contract specification
- DataContract CLI: validate, test, generate docs from contract files
- Buf (Protobuf): schema registry with breaking change detection
- Confluent Schema Registry: Avro/Protobuf/JSON Schema for Kafka

## Ownership Model

### Producer Responsibilities
- Define and publish contract
- Validate data against contract before publishing
- Notify consumers of planned changes
- Maintain SLA commitments
- Fix contract violations within agreed timeline

### Consumer Responsibilities
- Discover and subscribe to contracts
- Implement defensive reading (handle optional fields gracefully)
- Report violations through defined channels
- Migrate to new contract versions within deprecation window

### Data Product Ownership
- Each dataset has one owning team
- Owner decides schema, quality rules, access policies
- Consumers request changes through defined process (PR to contract repo)
- Platform team provides tooling, not data governance decisions

## Breaking Changes and Versioning

### What Constitutes a Breaking Change
- Removing a field
- Changing field type (string to int)
- Narrowing enum values (removing options)
- Changing field semantics (meaning changes)
- Tightening constraints in ways consumers rely on

### Non-Breaking Changes
- Adding new optional fields
- Expanding enum values (adding options)
- Relaxing constraints (nullable where previously required)
- Adding new quality checks

### Versioning Strategy
- Semantic versioning: MAJOR.MINOR.PATCH
- MAJOR: breaking changes (new topic/table, parallel publishing)
- MINOR: backward-compatible additions
- PATCH: documentation, quality rule adjustments
- Deprecation window: announce N weeks before removing old version

### Migration Process
1. Publish new version alongside old version
2. Notify all consumers with migration guide
3. Monitor consumer adoption
4. Deprecation deadline: stop old version after window
5. Post-mortem: any consumers impacted by migration?

## Enforcement in Pipelines

### Producer-Side Validation
- Validate every record/batch against schema before publishing
- Reject or dead-letter invalid records
- CI check: contract definition valid and backward-compatible

### Consumer-Side Validation
- Validate incoming data matches expected contract
- Alert on schema drift or quality degradation
- Graceful handling: don't crash on unexpected fields

### Contract Testing in CI/CD
- Unit tests: schema validates sample records
- Integration tests: producer output matches contract
- Breaking change detection: diff against published version
- Gate: block deployment if contract violation detected

## Platform Implementation

### Contract Registry
- Central catalog of all active contracts
- Discovery: search by domain, owner, field name
- Dependency graph: who produces, who consumes
- Version history and changelog

### Monitoring and Alerting
- Automated quality checks run on every batch/window
- Freshness monitoring: alert if data stops arriving
- Schema drift detection: compare actual vs declared schema
- Violation dashboard: which contracts are healthy/unhealthy

### Self-Service
- Producers register contracts via PR to central repo
- Consumers subscribe via catalog UI or API
- Automated notification on contract changes
- Documentation generated from contract definition
