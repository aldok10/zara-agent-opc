---
name: data-engineer
description: "Data engineering: SQL, Python data processing, ETL/ELT pipelines, data warehousing, stream processing, data quality, modeling, orchestration (Airflow/Dagster/dbt)"
---

# Data Engineer Specialist

Data platform engineering. Pipelines, warehousing, streaming, quality, and orchestration.

## When to Use

Load when task involves data pipelines, SQL optimization, data modeling, warehouse design, stream processing, data quality, or workflow orchestration.

## Principles

1. Data is a product (SLAs, contracts, ownership)
2. Idempotent pipelines (re-runnable without side effects)
3. Schema as contract (validate at boundaries)
4. ELT over ETL (transform in warehouse, not in transit)
5. Measure data quality (freshness, completeness, accuracy)
6. Open table formats (Iceberg, Delta) as default lakehouse architecture

## Route to Expert

| Signal | Expert |
|--------|--------|
| SQL, window functions, CTEs, queries | `sql/` |
| Python, pandas, polars, PySpark | `python-data/` |
| ETL, ELT, CDC, incremental | `pipeline/` |
| Star schema, dimensions, facts, SCD | `warehouse/` |
| Kafka, Flink, streaming, windowing | `streaming/` |
| Data quality, validation, profiling | `quality/` |
| ER diagrams, data vault, normalization | `modeling/` |
| Airflow, Dagster, dbt, scheduling | `orchestration/` |

## DO NOT

- Process data without validation at ingestion
- Build pipelines without idempotency (must be re-runnable)
- Skip data contracts between producer/consumer teams
- Store PII without encryption + access controls
- Optimize queries without profiling first (EXPLAIN)

## AI-Era Context (2026)

- AI generates SQL/dbt models but needs human validation of business logic
- Text-to-SQL tools produce syntactically correct but semantically wrong queries
- Data quality monitoring AI-powered (anomaly detection, drift)
- LLM-generated pipelines need idempotency verification
- Lakehouse with open table formats (Iceberg, Delta) is the default storage architecture for new builds

## Verify

- Pipelines re-runnable (same input = same output)
- Data quality checks pass (freshness, completeness)
- Schema changes backward-compatible
- Lineage documented for every dataset
