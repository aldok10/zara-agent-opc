# References

## dbt Core (10 refs)
- **dbt Documentation** -- https://docs.getdbt.com/ -- Official dbt reference and guides
- **dbt Best Practices** -- https://docs.getdbt.com/best-practices -- Modeling, testing, and project structure
- **dbt Materializations** -- https://docs.getdbt.com/docs/build/materializations -- Table, view, incremental, ephemeral patterns
- **dbt Tests** -- https://docs.getdbt.com/docs/build/data-tests -- Generic and singular data testing
- **dbt Metrics** -- https://docs.getdbt.com/docs/build/metrics-overview -- Semantic layer metrics definition
- **dbt Packages** -- https://hub.getdbt.com/ -- Community package registry
- **dbt Jinja** -- https://docs.getdbt.com/docs/build/jinja-macros -- Templating and macro authoring
- **dbt Exposures** -- https://docs.getdbt.com/docs/build/exposures -- Downstream dependency documentation
- **dbt Sources** -- https://docs.getdbt.com/docs/build/sources -- Raw data source configuration and freshness
- **dbt Snapshots** -- https://docs.getdbt.com/docs/build/snapshots -- SCD Type 2 implementation in dbt

## Data Vault (10 refs)
- **Data Vault Alliance** -- https://datavaultalliance.com/ -- Official Data Vault 2.0 methodology
- **AutomateDV** -- https://automate-dv.readthedocs.io/ -- dbt package for Data Vault automation
- **Data Vault Hubs** -- https://datavaultalliance.com/news/dv2-hub/ -- Business key entity pattern
- **Data Vault Links** -- https://datavaultalliance.com/news/dv2-link/ -- Relationship modeling pattern
- **Data Vault Satellites** -- https://datavaultalliance.com/news/dv2-satellite/ -- Descriptive context and history
- **Point-in-Time Tables** -- https://automate-dv.readthedocs.io/en/latest/tutorial/tut_point_in_time/ -- Performance optimization layer
- **Bridge Tables** -- https://automate-dv.readthedocs.io/en/latest/tutorial/tut_bridges/ -- Multi-link query acceleration
- **Hash Keys** -- https://automate-dv.readthedocs.io/en/latest/best_practices/hashing/ -- Surrogate key generation patterns
- **Business Vault** -- https://datavaultalliance.com/ -- Derived and calculated business rules layer
- **Data Vault + dbt** -- https://www.getdbt.com/blog/data-vault-with-dbt -- Implementing Data Vault using dbt models

## Star Schema and SCD (10 refs)
- **Star Schema Design** -- https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/star-schema-olap-cube/ -- Kimball star schema pattern
- **SCD Type 1** -- https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-1/ -- Overwrite historical values
- **SCD Type 2** -- https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-2/ -- Track full history with versioning
- **SCD Type 3** -- https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-3/ -- Limited history with previous value column
- **Conformed Dimensions** -- https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/conformed-dimension/ -- Shared dimensions across fact tables
- **Factless Fact Tables** -- https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/factless-fact-table/ -- Event tracking without measures
- **Junk Dimensions** -- https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/junk-dimension/ -- Low-cardinality flag consolidation
- **Role-Playing Dimensions** -- https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/role-playing-dimension/ -- Single dimension with multiple foreign keys
- **Aggregate Tables** -- https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/aggregate-fact-table-or-olap-cube/ -- Pre-computed summaries for performance
- **dbt Incremental Models** -- https://docs.getdbt.com/docs/build/incremental-models -- Efficient SCD and append patterns in dbt

## Modeling Patterns (10 refs)
- **Activity Schema** -- https://www.activityschema.com/ -- Event-based single-table analytics modeling
- **One Big Table** -- https://benn.substack.com/p/the-case-for-the-one-big-table -- Denormalized wide table approach
- **Entity-Event Modeling** -- https://www.getdbt.com/analytics-engineering/modular-data-modeling-technique -- Modular data modeling technique
- **Metrics Layer** -- https://docs.getdbt.com/docs/build/metrics-overview -- Centralized metric definitions
- **Dimensional Modeling Techniques** -- https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/ -- Complete Kimball technique reference
- **Data Mesh Modeling** -- https://www.datamesh-architecture.com/ -- Domain-oriented decentralized ownership
- **Anchor Modeling** -- https://www.anchormodeling.com/ -- Sixth normal form for agile evolution
- **Medallion Architecture** -- https://www.databricks.com/glossary/medallion-architecture -- Bronze/Silver/Gold layering pattern
- **SQLMesh** -- https://sqlmesh.readthedocs.io/ -- Next-gen SQL transformation framework
- **Cube.js Semantic Layer** -- https://cube.dev/docs -- Headless BI and metrics API layer
