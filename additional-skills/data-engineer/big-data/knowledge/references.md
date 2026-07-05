# References

## Apache Spark (10 refs)
- **Spark Documentation** -- https://spark.apache.org/docs/latest/ -- Official Apache Spark reference
- **Spark SQL Guide** -- https://spark.apache.org/docs/latest/sql-programming-guide.html -- DataFrame and SQL API reference
- **Spark Structured Streaming** -- https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html -- Micro-batch and continuous streaming
- **Spark Performance Tuning** -- https://spark.apache.org/docs/latest/sql-performance-tuning.html -- Query optimization and caching
- **Spark on Kubernetes** -- https://spark.apache.org/docs/latest/running-on-kubernetes.html -- K8s-native Spark deployment
- **PySpark API** -- https://spark.apache.org/docs/latest/api/python/ -- Python interface for Spark
- **Spark Connect** -- https://spark.apache.org/docs/latest/spark-connect-overview.html -- Thin client architecture for Spark
- **Adaptive Query Execution** -- https://spark.apache.org/docs/latest/sql-performance-tuning.html#adaptive-query-execution -- Runtime query plan optimization
- **Spark UI** -- https://spark.apache.org/docs/latest/web-ui.html -- Job monitoring and debugging interface
- **Databricks Runtime** -- https://docs.databricks.com/en/release-notes/runtime/index.html -- Optimized Spark runtime environment

## Apache Iceberg (10 refs)
- **Iceberg Documentation** -- https://iceberg.apache.org/docs/latest/ -- Official table format specification and guides
- **Iceberg Spec** -- https://iceberg.apache.org/spec/ -- Table format specification
- **Iceberg + Spark** -- https://iceberg.apache.org/docs/latest/spark-getting-started/ -- Spark integration for Iceberg tables
- **Iceberg Partitioning** -- https://iceberg.apache.org/docs/latest/partitioning/ -- Hidden partitioning and transforms
- **Iceberg Schema Evolution** -- https://iceberg.apache.org/docs/latest/evolution/ -- Safe schema changes without rewrites
- **Time Travel** -- https://iceberg.apache.org/docs/latest/spark-queries/#time-travel -- Querying historical table snapshots
- **Iceberg REST Catalog** -- https://iceberg.apache.org/docs/latest/rest-catalog/ -- Catalog API specification
- **Iceberg Maintenance** -- https://iceberg.apache.org/docs/latest/maintenance/ -- Compaction, expiration, orphan cleanup
- **Nessie** -- https://projectnessie.org/ -- Git-like catalog for Iceberg tables
- **Tabular** -- https://tabular.io/ -- Managed Iceberg platform by creators

## Delta Lake (10 refs)
- **Delta Lake Documentation** -- https://docs.delta.io/latest/ -- Official Delta Lake reference
- **Delta Lake Protocol** -- https://github.com/delta-io/delta/blob/master/PROTOCOL.md -- Transaction log specification
- **Delta UniForm** -- https://docs.delta.io/latest/delta-uniform.html -- Universal format for Iceberg/Hudi compatibility
- **Delta Sharing** -- https://delta.io/sharing/ -- Open protocol for secure data sharing
- **Delta Change Data Feed** -- https://docs.delta.io/latest/delta-change-data-feed.html -- Track row-level changes
- **Z-Ordering** -- https://docs.delta.io/latest/optimizations-oss.html -- Multi-dimensional data clustering
- **Liquid Clustering** -- https://docs.databricks.com/en/delta/clustering.html -- Incremental automatic clustering
- **Delta Constraints** -- https://docs.delta.io/latest/delta-constraints.html -- CHECK constraints and NOT NULL
- **Vacuum** -- https://docs.delta.io/latest/delta-utility.html#vacuum -- Removing old files safely
- **Delta Spark Integration** -- https://docs.delta.io/latest/quick-start.html -- Using Delta with Apache Spark

## Distributed Computing Patterns (10 refs)
- **MapReduce Paper** -- https://research.google/pubs/pub62/ -- Foundational distributed processing model
- **Spark Shuffle** -- https://spark.apache.org/docs/latest/rdd-programming-guide.html#shuffle-operations -- Data redistribution and partitioning
- **Skew Handling** -- https://spark.apache.org/docs/latest/sql-performance-tuning.html#adaptive-query-execution -- Handling data skew in joins
- **Broadcast Joins** -- https://spark.apache.org/docs/latest/sql-performance-tuning.html#broadcast-hint -- Small table join optimization
- **Apache Hudi** -- https://hudi.apache.org/docs/overview -- Incremental data lake processing
- **Trino Federation** -- https://trino.io/docs/current/overview/use-cases.html -- Distributed SQL across heterogeneous sources
- **Ray** -- https://docs.ray.io/ -- Distributed Python for ML and data workloads
- **Dask Distributed** -- https://distributed.dask.org/ -- Parallel computing with dynamic scheduling
- **Ballista** -- https://arrow.apache.org/ballista/ -- Distributed query engine on Apache Arrow
- **Velox** -- https://velox-lib.io/ -- Unified execution engine for data systems
