---
type: subskill
title: "Data Testing"
---

# Data Testing

Great Expectations, Soda, dbt tests, and assertion patterns for data pipeline validation.

## When to Load

- Implementing data quality checks in pipelines
- Choosing between testing frameworks (GE, Soda, dbt tests)
- Building custom data assertions for business rules
- Setting up alerting on data quality failures

## Key Concepts

**Testing Framework Comparison**
| Framework | Best For | Integration | Learning Curve |
|-----------|----------|-------------|----------------|
| dbt tests | SQL models in dbt projects | Native dbt | Low |
| Great Expectations | Python pipelines, complex rules | Airflow, Spark | Medium |
| Soda | Multi-platform, SQL-first | Airflow, dbt, standalone | Low |
| Custom SQL | Simple checks, any SQL engine | Universal | Lowest |

**Test Categories**
- Schema: column existence, types, constraints
- Completeness: not-null rates, required field coverage
- Uniqueness: primary keys, natural keys
- Referential integrity: foreign key relationships hold
- Range/validity: values within expected bounds
- Freshness: data is recent enough for SLAs
- Volume: row counts within expected range (anomaly detection)
- Custom business rules: domain-specific logic

**Testing Strategy**
- Source ingestion: schema + volume + freshness (catch broken upstream early)
- Transformation: referential integrity + business rules
- Output/mart: completeness + range + uniqueness (protect consumers)
- Critical path: all categories on key tables
- Non-critical: schema + volume (lighter touch)

## Patterns

```yaml
# Soda checks (soda-checks.yml)
checks for fct_orders:
  - schema:
      fail:
        when required column missing: [order_id, customer_id, order_amount]
  - row_count > 0
  - duplicate_count(order_id) = 0
  - missing_count(customer_id) = 0
  - invalid_percent(order_amount) < 1%:
      valid min: 0
      valid max: 100000
  - freshness(loaded_at) < 2h
  - anomaly detection for row_count:
      warn: anomaly score > 3

checks for dim_customers:
  - row_count between 10000 and 5000000
  - duplicate_count(customer_id) = 0
  - values in (customer_segment) must be in ['enterprise', 'mid-market', 'smb', 'individual']
```

```python
# Great Expectations suite
import great_expectations as gx

context = gx.get_context()

suite = context.add_expectation_suite("orders_suite")

suite.add_expectation(
    gx.expectations.ExpectColumnToExist(column="order_id")
)
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToBeUnique(column="order_id")
)
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToNotBeNull(column="customer_id")
)
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToBeBetween(
        column="order_amount", min_value=0, max_value=100000
    )
)
suite.add_expectation(
    gx.expectations.ExpectTableRowCountToBeBetween(
        min_value=1000, max_value=10000000
    )
)
```

**Alert Escalation**
- Warning: metric degraded but within tolerance (log, notify Slack)
- Error: threshold breached, pipeline should pause (PagerDuty, block downstream)
- Critical: data corruption detected, rollback needed (page on-call, halt consumers)

## Gotchas

- Testing adds pipeline latency -- batch critical tests, sample for expensive checks
- Row count anomaly detection needs baseline (first 2 weeks may false-alarm)
- dbt tests run after model build -- failures don't prevent the build itself
- Great Expectations data docs are useful but add storage/compute overhead
- Test environments need representative data (not just 10 rows)
- Over-testing creates noise -- focus on tests that would catch real incidents

## Verification

- All critical tables have at minimum: uniqueness, not-null, freshness tests
- Test failures trigger appropriate alerts within SLA
- False positive rate below 5% (tune thresholds from real data)
- Pipeline stops propagating bad data when tests fail
- Test execution time is within acceptable overhead (<10% of pipeline duration)
