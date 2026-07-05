# References

## ELT Patterns (10 refs)
- **ELT vs ETL** -- https://www.getdbt.com/analytics-engineering/elt-vs-etl -- Modern transformation-in-warehouse approach
- **Fivetran** -- https://fivetran.com/docs -- Managed data movement and ELT platform
- **Airbyte** -- https://docs.airbyte.com/ -- Open-source data integration and ELT
- **Meltano** -- https://docs.meltano.com/ -- Singer-based ELT orchestration framework
- **dlt (data load tool)** -- https://dlthub.com/docs -- Python-native data loading library
- **Stitch** -- https://www.stitchdata.com/docs/ -- Simple cloud-based data ingestion
- **Singer Specification** -- https://www.singer.io/ -- Open standard for data extraction taps/targets
- **Census** -- https://docs.getcensus.com/ -- Reverse ETL from warehouse to SaaS tools
- **Hightouch** -- https://hightouch.com/docs -- Reverse ETL and data activation platform
- **Polytomic** -- https://docs.polytomic.com/ -- Data movement between databases and APIs

## Idempotent Loading (10 refs)
- **Idempotent Pipelines** -- https://docs.getdbt.com/docs/build/incremental-models -- dbt incremental model strategies
- **MERGE Pattern** -- https://docs.snowflake.com/en/sql-reference/sql/merge -- Upsert via SQL MERGE statement
- **DELETE+INSERT** -- https://docs.getdbt.com/docs/build/incremental-models#about-incremental_strategy -- Safe incremental reload strategy
- **Dagster Partitions** -- https://docs.dagster.io/concepts/partitions-schedules-sensors/partitions -- Partition-based idempotent loads
- **Airflow Idempotency** -- https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html -- DAG design for rerunnable tasks
- **Deduplication Patterns** -- https://www.startdataengineering.com/post/data-engineering-project-to-impress-hiring-managers/ -- Row-level dedup strategies
- **Exactly-Once Loading** -- https://docs.confluent.io/kafka-connectors/jdbc/current/sink-connector/overview.html -- JDBC sink idempotent writes
- **Write-Audit-Publish** -- https://lakefs.io/blog/data-engineering-patterns-write-audit-publish/ -- Safe data publishing pattern
- **Tombstone Pattern** -- https://www.confluent.io/blog/handling-gdpr-log-forget/ -- Soft delete for compliance
- **Temporal Tables** -- https://www.postgresql.org/docs/current/sql-createtable.html -- System-versioned tables for history

## Incremental Processing (10 refs)
- **dbt Incremental Strategies** -- https://docs.getdbt.com/docs/build/incremental-strategy -- append, merge, delete+insert, microbatch
- **Snowflake Streams** -- https://docs.snowflake.com/en/user-guide/streams-intro -- Track row-level changes for incremental
- **BigQuery Partitioned Tables** -- https://cloud.google.com/bigquery/docs/partitioned-tables -- Partition pruning for incremental queries
- **Delta Lake Change Feed** -- https://docs.delta.io/latest/delta-change-data-feed.html -- CDC from Delta tables
- **Iceberg Incremental Reads** -- https://iceberg.apache.org/docs/latest/spark-queries/#incremental-read -- Snapshot-based incremental consumption
- **Watermark Tracking** -- https://docs.dagster.io/concepts/partitions-schedules-sensors/partitions -- High-water mark for incremental loads
- **Flink CDC** -- https://nightlies.apache.org/flink/flink-cdc-docs-stable/ -- Real-time incremental processing
- **Debezium** -- https://debezium.io/documentation/ -- Database-level change capture for incremental
- **Materialized Views** -- https://www.postgresql.org/docs/current/rules-materializedviews.html -- Incremental refresh patterns
- **SQLMesh Incremental** -- https://sqlmesh.readthedocs.io/en/stable/concepts/models/model_kinds/#incremental-by-time-range -- Time-range incremental models

## Partitioning Strategies (10 refs)
- **BigQuery Partitioning** -- https://cloud.google.com/bigquery/docs/partitioned-tables -- Time, range, and integer partitioning
- **Snowflake Clustering** -- https://docs.snowflake.com/en/user-guide/tables-clustering-micropartitions -- Automatic micro-partitioning and clustering keys
- **Hive Partitioning** -- https://iceberg.apache.org/docs/latest/partitioning/ -- Directory-based data organization
- **Iceberg Hidden Partitioning** -- https://iceberg.apache.org/docs/latest/partitioning/ -- Partition transforms without directory naming
- **Delta Lake Partitioning** -- https://docs.delta.io/latest/best-practices.html#choose-the-right-partition-column -- Z-order and partition optimization
- **PostgreSQL Partitioning** -- https://www.postgresql.org/docs/current/ddl-partitioning.html -- Declarative range, list, hash partitioning
- **Redshift Distribution** -- https://docs.aws.amazon.com/redshift/latest/dg/c_choosing_dist_sort.html -- Distribution and sort key selection
- **Parquet Row Groups** -- https://parquet.apache.org/documentation/latest/ -- Physical data layout optimization
- **Partition Pruning** -- https://cloud.google.com/bigquery/docs/querying-partitioned-tables -- Query optimization via partition elimination
- **Data Compaction** -- https://iceberg.apache.org/docs/latest/maintenance/#compact-data-files -- Small file consolidation strategies
