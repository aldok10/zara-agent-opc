---
name: modeling
description: "Data modeling: dbt, dimensional modeling, star schema, slowly-changing dimensions, data vault"
---

# Data Modeling Expert

Analytical data modeling. dbt for transformations, dimensional modeling for warehouses, schema design for queryability.

## Scope

- dbt project structure, model layers (staging/intermediate/marts)
- Dimensional modeling: star schema, snowflake schema, bridge tables
- Slowly-changing dimensions (SCD Type 1, 2, 3, 6)
- Data vault: hubs, links, satellites
- Naming conventions, grain definition, conformed dimensions
- Surrogate key generation and natural key preservation
- Model testing, documentation, and lineage

## First Action

1. Check for existing dbt project (`dbt_project.yml`, models directory)
2. Identify the warehouse platform and its SQL dialect
3. Map source systems and their entity relationships
4. Determine query patterns: who queries what, how frequently, what filters

## Constraints

1. Every model must have a defined grain; document it in the model's YAML description.
2. Use staging models for 1:1 source cleaning (rename, cast, deduplicate); no joins in staging.
3. Mart models serve a specific business domain; one mart per team/use-case, not one mega-mart.
4. Star schema by default; snowflake schema only when dimension tables exceed useful denormalization size.
5. SCD Type 2 for dimensions where history matters (customer status, pricing tiers); Type 1 for corrections only.
6. Surrogate keys (hashed or integer) for dimension tables; preserve natural keys as attributes.
7. Fact tables must be at the lowest grain that serves analytical needs; aggregate tables are separate.
8. dbt model naming: `stg_<source>__<entity>`, `int_<entity>_<verb>`, `fct_<event>`, `dim_<entity>`.
9. Every model must have at least: unique test on primary key, not_null on key columns, accepted_values on enums.
10. Use incremental models for fact tables >10M rows; define a reliable `updated_at` or event timestamp.
11. Conformed dimensions must be shared via refs, not duplicated across marts.
12. Bridge tables for many-to-many relationships between dimensions; never arrays in dimension columns.
13. dbt macros for repeated logic; never copy-paste SQL between models.
14. Document all models with descriptions and column-level docs in YAML; undocumented models are tech debt.

## DO NOT

- Mix business logic across model layers (staging doing joins, marts doing raw cleaning)
- Use ephemeral models for anything that other models reference more than once (materializes redundantly)
- Create wide tables with >50 columns without clear grain justification
- Skip testing on models that other models depend on (upstream failures cascade)
- Use dbt snapshots without understanding their storage cost and query implications
- Model data vault for teams without data vault experience; complexity must be justified
- Create circular dependencies between dbt models
- Use raw source references outside of staging models; always go through `stg_` layer
- Define business metrics in multiple places; use dbt metrics/semantic layer for single source of truth

## Route to Subskill

| Signal | Subskill |
|--------|----------|
| SQL optimization in models | `../sql` |
| Warehouse materialization strategy | `../warehouse` |
| dbt orchestration (dagster/airflow) | `../orchestration` |
| Model testing, data contracts | `../quality` |
| Source ingestion before modeling | `../pipeline` |

## Verification

- `dbt build` passes: all models compile, run, and pass tests
- Primary key uniqueness test passes on every model
- Lineage graph shows clean layer separation (no staging-to-mart skips)
- Incremental models produce same results as full refresh on test data
- Documentation coverage: all models and key columns have descriptions
- Query performance on mart models meets SLA with realistic data volume

## Knowledge

- `knowledge/dbt.md` -- project structure, materializations, macros, packages, semantic layer
- `knowledge/dimensional-modeling.md` -- Kimball methodology, star schema, conformed dims
- `knowledge/scd.md` -- Type 1/2/3/6 implementations, dbt snapshots, merge patterns
- `knowledge/data-vault.md` -- hubs, links, satellites, point-in-time tables, business vault

## AI-Era Context (2026)

- dbt Mesh allows cross-project references; model boundaries map to team ownership
- Semantic layer (dbt Metrics, Cube, LookML) is the interface for LLM-powered BI tools
- AI-generated dbt models need grain validation; LLMs often produce models with undefined or mixed grain
- Data contracts (schema + SLA) between producers and consumers are becoming standard practice
- dbt Cloud supports CI with slim builds (state:modified); essential for large projects
- Column-level lineage tools (dbt Explorer, Atlan, DataHub) make impact analysis automatic
- dbt 1.9+: native microbatch incremental, unit testing built-in, YAML contracts with access modifiers for mesh

## Related Skills

- `data-engineer/sql` -- SQL patterns for model transformations
- `data-engineer/warehouse` -- warehouse-specific materialization
- `data-engineer/quality` -- testing and data contracts
- `data-engineer/pipeline` -- source data ingestion
