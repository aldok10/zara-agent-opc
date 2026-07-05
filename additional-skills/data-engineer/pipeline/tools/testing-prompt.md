---
type: tool
title: "Data Pipeline Testing Strategy Prompt"
---

# Data Pipeline Testing Strategy Prompt

Use this prompt to design a testing strategy for data pipelines covering unit, integration, and data quality.

## Prompt

```
You are a data engineer designing a testing strategy for a production data pipeline. Ensure correctness, reliability, and data quality at every layer.

Input:
- Pipeline: [description of what it does, source to destination]
- Tech stack: [Spark/dbt/Airflow/Python/SQL]
- Data volume: [rows per run, total size]
- Existing tests: [what's already covered, if anything]
- Known quality issues: [duplicates, nulls, schema drift, late arrivals]
- Environments: [local/dev/staging/prod available?]

Design the testing strategy covering:

1. UNIT TESTS
   - Transform logic: test individual functions with known input/output pairs
   - Business rules: test each conditional branch (edge cases, boundaries)
   - Data type handling: nulls, empty strings, special characters, overflow
   - Date/time logic: timezone handling, DST transitions, epoch boundaries
   - Framework: [pytest/unittest for Python, dbt tests for SQL, ScalaTest for Spark]
   - Mocking: how to isolate transforms from I/O (mock sources, in-memory frames)

2. INTEGRATION TESTS
   - End-to-end: small dataset through the full pipeline, verify output schema and values
   - Source connectivity: can the pipeline reach and read from all sources?
   - Sink write: does output land in the correct format, partition, and location?
   - Dependency ordering: do tasks run in correct sequence?
   - Failure scenarios: does the pipeline handle source unavailability gracefully?
   - Environment: use a test database/bucket with synthetic data

3. DATA QUALITY TESTS (run in production)
   - Completeness: row count within expected range, no unexpected nulls in required fields
   - Uniqueness: primary key uniqueness, no unintended duplicates
   - Freshness: data arrived within SLA window, timestamps are recent
   - Validity: values within expected ranges, referential integrity holds
   - Consistency: cross-table totals match, source-to-target reconciliation
   - Distribution: statistical checks (mean, stddev, percentiles within bounds)

4. CONTRACT TESTS
   - Schema validation: column names, types, nullable flags match specification
   - Schema evolution: detect additions, removals, type changes before they break consumers
   - API contract: upstream source schema hasn't changed since last verified
   - Output contract: downstream consumers' expectations are still met

5. PERFORMANCE TESTS
   - Baseline: expected duration for standard data volume
   - Scale test: 2x and 5x volume behavior (does it scale linearly?)
   - Resource test: memory/CPU usage within allocation limits
   - Regression: does a code change make the pipeline slower?

6. TEST DATA MANAGEMENT
   - Synthetic data generation: how to create realistic test datasets
   - Fixtures: static test files for unit tests (small, version-controlled)
   - Production sampling: anonymized subset for integration tests
   - Edge case datasets: nulls-only, empty, maximum-size, unicode, malformed

Output format:
- Test pyramid: unit count | integration count | e2e count (target ratio 70/20/10)
- Test matrix: layer | what's tested | tool | frequency | owner
- Data quality checks: check | table | column | threshold | alert on fail
- Sample test cases for each layer (3-5 per layer)
- CI/CD integration: which tests run where (PR, merge, deploy, scheduled)
- Coverage gaps: what remains untested and why
```
