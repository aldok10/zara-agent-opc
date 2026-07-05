---
type: fact
title: "Data Quality Frameworks"
---

# Data Quality Frameworks

## Great Expectations (GX)

### Core Concepts
- **Expectation**: a declarative assertion about data (e.g., column is never null)
- **Expectation Suite**: collection of expectations for a dataset
- **Validator**: runs expectations against actual data
- **Checkpoint**: orchestrates validation runs with actions (notify, store results)
- **Data Source**: connection to data (Pandas, Spark, SQL databases)

### Common Expectations
```python
# Column-level
expect_column_values_to_not_be_null(column="order_id")
expect_column_values_to_be_between(column="amount", min_value=0, max_value=1000000)
expect_column_values_to_be_in_set(column="status", value_set=["active", "inactive"])
expect_column_values_to_match_regex(column="email", regex=r".+@.+\..+")
expect_column_values_to_be_unique(column="transaction_id")

# Table-level
expect_table_row_count_to_be_between(min_value=1000, max_value=1000000)
expect_table_columns_to_match_ordered_list(column_list=["id", "name", "created_at"])

# Multi-column
expect_column_pair_values_a_to_be_greater_than_b(column_A="end_date", column_B="start_date")
expect_compound_columns_to_be_unique(column_list=["user_id", "event_date"])
```

### Deployment Pattern
1. Profile data to auto-generate initial expectations
2. Review and refine expectations with domain knowledge
3. Run checkpoint in pipeline (after load, before transform)
4. On failure: alert + quarantine bad data
5. Store validation results for historical tracking

### Strengths
- Rich library of built-in expectations (200+)
- Data Docs: auto-generated HTML documentation
- Pluggable backends: local, S3, GCS, databases
- Custom expectations for business-specific rules

### Limitations
- Configuration-heavy (YAML + Python boilerplate)
- GX 1.0 simplified API but breaking from 0.x
- Overhead for simple use cases
- No real-time / streaming support

## Soda

### Core Concepts
- **Checks**: assertions written in SodaCL (YAML-like DSL)
- **Scan**: executes checks against a data source
- **Data Source**: SQL databases, Spark, Dask, files

### SodaCL Example
```yaml
checks for orders:
  - row_count > 0
  - missing_count(order_id) = 0
  - invalid_percent(status) < 5%:
      valid values: [pending, confirmed, shipped, delivered]
  - duplicate_count(order_id) = 0
  - freshness(created_at) < 2h
  - schema:
      fail:
        when required column missing: [order_id, customer_id, amount]
        when wrong type:
          order_id: varchar
          amount: numeric

  # Anomaly detection
  - anomaly detection for row_count:
      warn: warning_only

  # Reference checks
  - values in (customer_id) must exist in customers (id)
```

### Strengths
- Clean DSL: readable by non-engineers
- Built-in anomaly detection (statistical)
- Freshness checks native
- Soda Cloud: monitoring dashboard, alerting, lineage
- Quick setup: pip install + YAML config

### Integration Points
- dbt: `soda-dbt` package runs checks after dbt models
- Airflow: SodaOperator in DAG
- Prefect/Dagster: Python SDK call
- CI/CD: soda scan in PR pipeline for schema changes

## dbt Tests

### Built-in Tests
```yaml
# schema.yml
models:
  - name: orders
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: status
        tests:
          - accepted_values:
              values: [pending, confirmed, shipped, delivered]
      - name: customer_id
        tests:
          - relationships:
              to: ref('customers')
              field: id
```

### Custom Tests (Generic)
```sql
-- tests/generic/test_positive_values.sql
{% test positive_values(model, column_name) %}
select {{ column_name }}
from {{ model }}
where {{ column_name }} < 0
{% endtest %}
```

### dbt-expectations Package
- Port of Great Expectations to dbt (SQL-based)
- 50+ tests: distribution checks, regex, recency, row count changes
- `expect_column_values_to_be_between`
- `expect_table_row_count_to_equal_other_table`
- `expect_column_stdev_to_be_between`

### Strengths of dbt Tests
- Lives alongside model definitions (same PR, same review)
- Runs as part of `dbt build` (model + test in one command)
- Failures block downstream models
- No extra infrastructure

### Limitations
- SQL-only (no statistical anomaly detection natively)
- Row-level failures require `--store-failures` for debugging
- No cross-run comparison without additional tooling

## Data Profiling

### Purpose
- Understand data before writing quality rules
- Discover: cardinality, distributions, null rates, patterns
- Baseline: establish what "normal" looks like

### Tools
- `ydata-profiling` (formerly pandas-profiling): HTML report with distributions, correlations, missing values
- `whylogs`: lightweight statistical profiling, comparison across runs
- GX Profiler: auto-generates expectations from data characteristics
- dbt `codegen`: generates YAML stubs from source schema

### Profiling Workflow
1. Run profiler on representative sample
2. Review: cardinality, null rates, value distributions
3. Flag anomalies: unexpected nulls, outlier values, wrong types
4. Generate initial quality rules from profile
5. Refine with domain knowledge

## Anomaly Detection

### Statistical Approaches
- Z-score: flag values beyond N standard deviations from rolling mean
- Percentage change: alert if metric changes >X% from previous run
- Seasonal decomposition: account for day-of-week, monthly patterns
- Minimum observation window: need history before flagging anomalies

### Tools
- Soda: built-in anomaly detection on any metric
- Monte Carlo: ML-based anomaly detection across tables
- whylogs: drift detection between profile snapshots
- Custom: rolling statistics in dbt with `dbt_utils.date_spine`

### Common Metrics to Monitor
- Row count per time window
- Null rate per column
- Distinct value count (cardinality shifts)
- Value distribution (mean, median, percentiles)
- Freshness (time since last record)

## Implementation Strategy

### Layered Approach
1. **Critical (block pipeline)**: nulls in primary keys, schema changes, zero rows
2. **Warning (alert, don't block)**: unusual volume, high null rates in optional fields
3. **Informational (log)**: distribution shifts, new enum values appearing

### Where to Check
- After ingestion (Bronze): schema, row count, freshness
- After transformation (Silver): business rules, referential integrity
- Before serving (Gold): completeness, aggregation accuracy

### Organizational Pattern
- Data quality owned by producing team (not central team)
- Platform provides tooling and alerting infrastructure
- Quality SLAs defined in data contracts
- Incident process: quality failure treated like production incident
