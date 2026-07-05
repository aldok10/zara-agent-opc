---
name: quality
description: "Data quality: Great Expectations, Soda, dbt tests, schema contracts, anomaly detection, SLA monitoring"
---

# Data Quality Expert

Data quality engineering. Validation, contracts, anomaly detection, and SLA monitoring across the data platform.

## Scope

- Validation frameworks: Great Expectations, Soda Core, dbt tests, Pandera
- Schema contracts between producers and consumers
- Anomaly detection: volume, freshness, distribution drift
- SLA definition and monitoring (freshness, completeness, accuracy)
- Data observability platforms (Monte Carlo, Metaplane, Elementary)
- Quality gates in CI/CD and pipeline orchestration
- Incident response for data quality failures

## First Action

1. Identify existing quality checks (dbt tests, GE suites, custom scripts)
2. Map critical data assets and their downstream consumers
3. Determine current SLAs (explicit or implicit) for freshness and completeness
4. Check for existing alerting on data quality failures

## Constraints

1. Every pipeline must have quality checks before data reaches consumers; fail early, not at the dashboard.
2. Schema contracts define column names, types, nullability, and value ranges; enforce at pipeline entry points.
3. dbt tests for model-level quality (uniqueness, not_null, relationships, accepted_values) -- minimum viable coverage.
4. Great Expectations or Soda for cross-system validation, statistical checks, and freshness monitoring.
5. Volume anomaly detection required for all ingestion jobs; alert on >20% deviation from rolling 7-day average.
6. Freshness SLA must be defined per table with explicit tolerance (e.g., "updated within 2 hours of source").
7. Data contracts must be versioned; breaking changes require consumer notification and migration window.
8. Quality checks must be fast enough to not block pipeline SLAs; sample for expensive statistical tests.
9. Distinguish hard failures (data stops flowing, alert immediately) from soft warnings (drift, review weekly).
10. Every quality failure must produce actionable context: which rows failed, what rule, what expected vs actual.
11. Use data profiling on new sources before building pipelines; understand distributions and edge cases first.
12. Anomaly detection models need a baseline period (minimum 30 days) before alerting; avoid false positives.
13. Data quality metrics (pass rate, incident count, time-to-detect) must be tracked and reported.
14. Contract tests run in CI; schema-breaking PRs fail before merge.

## DO NOT

- Rely solely on dbt tests for quality; they only catch issues after transformation, not at ingestion
- Alert on every statistical anomaly without tuning sensitivity; alert fatigue kills data quality programs
- Define quality rules without input from data consumers; rules must reflect actual usage requirements
- Skip quality checks for "low priority" tables; downstream dependencies are often invisible
- Use quality tools that require data to leave your infrastructure without security review
- Implement complex ML-based anomaly detection before basic threshold checks are in place
- Treat data quality as a one-time project; it requires continuous monitoring and rule maintenance
- Block all pipelines on warnings; distinguish between blocking failures and advisory alerts
- Test only happy paths; validate behavior on NULL, empty strings, duplicates, and late arrivals

## Route to Subskill

| Signal | Subskill |
|--------|----------|
| dbt model testing | `../modeling` |
| SQL validation queries | `../sql` |
| Pipeline quality gates | `../pipeline` |
| Streaming data validation | `../streaming` |
| Python data validation (Pandera/Pydantic) | `../python-data` |

## Verification

- All critical tables have freshness monitoring with defined SLA
- Schema contract tests run in CI and block breaking changes
- Volume anomaly alerts fire correctly on simulated spike/drop (tested in staging)
- Quality check execution time is <10% of pipeline total runtime
- Failed quality checks produce clear, actionable error messages with row-level detail
- Time-to-detect for simulated data issues is within defined SLA

## Knowledge

- `knowledge/great-expectations.md` -- expectations, checkpoints, data docs, stores
- `knowledge/soda.md` -- checks, agreements, cloud integration, anomaly detection
- `knowledge/dbt-tests.md` -- generic tests, custom tests, packages (dbt_utils, dbt_expectations)
- `knowledge/data-contracts.md` -- schema versioning, producer/consumer agreements, tooling
- `knowledge/observability.md` -- Monte Carlo, Elementary, metadata-driven anomaly detection

## AI-Era Context (2026)

- Data contracts are standard practice; tools like Soda Agreements and dbt contracts enforce them automatically
- AI-generated data (synthetic, LLM-extracted) requires quality checks on semantic accuracy, not just schema
- LLM-powered anomaly explanation (why did this metric change?) reduces triage time
- Elementary (dbt-native observability) provides quality monitoring without external SaaS dependency
- Column-level lineage enables automatic impact analysis when quality checks fail upstream
- Data quality as code (checked into git, tested in CI) is the default operating model

## Related Skills

- `data-engineer/modeling` -- dbt test patterns
- `data-engineer/pipeline` -- quality gates in pipelines
- `data-engineer/orchestration` -- alerting integration
- `data-engineer/warehouse` -- warehouse-level monitoring
