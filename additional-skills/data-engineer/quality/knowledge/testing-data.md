---
type: fact
title: "Testing Data"
---

# Testing Data

Great Expectations, Soda, dbt tests, and anomaly detection patterns for data quality validation.

## Testing Layers

| Layer | When | Tools | What |
|-------|------|-------|------|
| Schema | On write/publish | Pydantic, Avro, dbt contracts | Types, nullability, constraints |
| Freshness | Scheduled | dbt source freshness, Soda | Data arrives on time |
| Volume | Post-load | Custom SQL, Soda | Row counts within expected range |
| Distribution | Post-transform | Great Expectations, Monte Carlo | Values follow expected patterns |
| Business Rules | Post-transform | dbt tests, custom | Domain invariants hold |
| Cross-dataset | Post-merge | dbt relationships, GE | Referential integrity |

## Great Expectations

### Expectation Suite

```python
import great_expectations as gx

context = gx.get_context()

datasource = context.data_sources.add_pandas("orders_source")
asset = datasource.add_dataframe_asset("orders")
batch = asset.add_batch_definition_whole_dataframe("full").get_batch(
    batch_parameters={"dataframe": df}
)

suite = gx.ExpectationSuite(name="orders_quality")
suite.add_expectation(
    gx.expectations.ExpectColumnToExist(column="order_id")
)
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToNotBeNull(column="order_id")
)
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToBeUnique(column="order_id")
)
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToBeBetween(
        column="amount", min_value=0, max_value=1000000
    )
)
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToBeInSet(
        column="status", value_set=["completed", "refunded", "cancelled"]
    )
)
suite.add_expectation(
    gx.expectations.ExpectTableRowCountToBeBetween(
        min_value=1000, max_value=1000000
    )
)
```

### Common Expectations

| Category | Expectation | Use |
|----------|------------|-----|
| Existence | `expect_column_to_exist` | Schema validation |
| Nulls | `expect_column_values_to_not_be_null` | Required fields |
| Uniqueness | `expect_column_values_to_be_unique` | Primary keys |
| Range | `expect_column_values_to_be_between` | Numeric bounds |
| Set | `expect_column_values_to_be_in_set` | Enum validation |
| Regex | `expect_column_values_to_match_regex` | Format validation |
| Volume | `expect_table_row_count_to_be_between` | Data completeness |
| Distribution | `expect_column_mean_to_be_between` | Statistical checks |
| Cross-table | `expect_column_pair_values_to_be_equal` | Consistency |

## Soda

### Soda Checks

```yaml
# checks/orders.yml
checks for orders:
  - row_count > 0
  - missing_count(order_id) = 0
  - duplicate_count(order_id) = 0
  - invalid_count(amount) = 0:
      valid min: 0
  - invalid_count(status) = 0:
      valid values: [completed, refunded, cancelled]
  - freshness(created_at) < 2h
  - anomaly detection for row_count:
      warn: 0.05
      fail: 0.01

  # Volume anomaly (detects unusual drops/spikes)
  - change for row_count last 7:
      warn: when > 50%
      fail: when > 80%

  # Cross-check
  - values in (customer_id) must exist in dim_customers (customer_id)
```

### Soda with Airflow

```python
from soda.scan import Scan

def run_soda_checks(table: str, checks_file: str) -> None:
    scan = Scan()
    scan.set_data_source_name("warehouse")
    scan.add_configuration_yaml_file("soda/configuration.yml")
    scan.add_sodacl_yaml_file(checks_file)
    scan.execute()

    if scan.has_check_failures():
        failed = [c for c in scan.get_checks_fail()]
        raise ValueError(f"Soda checks failed: {[c.name for c in failed]}")
```

## dbt Tests

### Built-in Tests

```yaml
models:
  - name: fct_orders
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: customer_id
        tests:
          - not_null
          - relationships:
              to: ref('dim_customers')
              field: customer_id
      - name: status
        tests:
          - accepted_values:
              values: ['completed', 'refunded', 'cancelled']
      - name: amount
        tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: 0
              inclusive: true
```

### Custom dbt Tests

```sql
-- tests/generic/test_row_count_above_threshold.sql
{% test row_count_above_threshold(model, min_rows) %}
SELECT 1
FROM (SELECT COUNT(*) AS cnt FROM {{ model }}) sub
WHERE cnt < {{ min_rows }}
{% endtest %}

-- tests/assert_orders_revenue_positive.sql
SELECT order_date, SUM(amount) AS daily_revenue
FROM {{ ref('fct_orders') }}
GROUP BY order_date
HAVING SUM(amount) < 0
```

## Anomaly Detection

### Statistical Approaches

| Method | Use Case | Implementation |
|--------|----------|----------------|
| Z-score | Detect outlier values | (value - mean) / stddev > 3 |
| IQR | Volume anomalies | Outside Q1 - 1.5*IQR, Q3 + 1.5*IQR |
| Moving average | Trend detection | Compare to 7/30-day rolling avg |
| Percentage change | Sudden shifts | Day-over-day change > threshold |

### SQL-Based Anomaly Detection

```sql
WITH daily_stats AS (
    SELECT
        order_date,
        COUNT(*) AS row_count,
        AVG(COUNT(*)) OVER (
            ORDER BY order_date ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING
        ) AS avg_7d,
        STDDEV(COUNT(*)) OVER (
            ORDER BY order_date ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING
        ) AS stddev_7d
    FROM orders
    GROUP BY order_date
)
SELECT *
FROM daily_stats
WHERE ABS(row_count - avg_7d) > 3 * stddev_7d;
```

## Testing Strategy by Pipeline Stage

| Stage | Test Type | Fail Action |
|-------|-----------|-------------|
| Raw ingestion | Schema, null PK, volume | Block load |
| Staging | Dedup verification, type casting | Alert + block |
| Transform | Business rules, referential integrity | Block downstream |
| Mart | Freshness, distribution, cross-checks | Alert consumers |
| Serving | Query performance, cache hit rate | Alert SRE |

## Anti-Patterns

- Testing only at the end of the pipeline (fail fast at source)
- No volume checks (empty tables pass all quality checks)
- Static thresholds without seasonal adjustment
- Testing in production only (use sample data in CI/CD)
- Alerting without actionable context (which rows failed, why)
- Not testing the tests (validate expectations catch known-bad data)
