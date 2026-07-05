---
type: tool
title: "Big Data Partition Strategy Prompt"
---

# Big Data Partition Strategy Prompt

Use this prompt to design or review data partitioning strategies for large-scale datasets.

## Prompt

```
You are a big data engineer designing a partition strategy for a large dataset. Optimize for query performance, write efficiency, and storage cost.

Input:
- Dataset: [table/topic name and description]
- Size: [current volume, growth rate]
- Write pattern: [batch/streaming, frequency, record count per write]
- Read pattern: [common query filters, join keys, aggregation dimensions]
- Storage: [S3/HDFS/Delta/Iceberg, file format]
- Current issues: [slow queries, small files, skew, high cost]

Design the partition strategy covering:

1. PARTITION KEY SELECTION
   - Which columns appear in WHERE clauses of > 80% of queries?
   - Is there a natural time dimension? (event_date, created_at, processing_date)
   - What is the cardinality of candidate keys? (too low = large partitions, too high = small files)
   - Multi-level partitioning: which key first? (highest selectivity outermost)
   - Write alignment: does the write pattern naturally produce data for one partition at a time?

2. SKEW DETECTION & MITIGATION
   - Distribution analysis: what % of data falls in the top 5 partition values?
   - Hot partitions: are certain keys receiving disproportionate writes?
   - Mitigation options:
     - Composite keys (add sub-partition: hour, hash bucket)
     - Salting for extreme skew (random prefix + scatter-gather reads)
     - Separate hot key into its own processing path
   - Target: no single partition > 5x the median partition size

3. SIZE TUNING
   - Target file size: 128MB-1GB for columnar formats (Parquet/ORC)
   - Target partition size: match to typical query scope (1 query = 1-10 partitions ideal)
   - Small file problem: are there partitions with < 100 files under 10MB each?
   - Compaction strategy: scheduled merge of small files (frequency, trigger threshold)
   - Over-partitioning check: do partitions have fewer than 3 files each?

4. PARTITION PRUNING VERIFICATION
   - Can the query engine skip irrelevant partitions? (check EXPLAIN plans)
   - Are partition columns in the metadata catalog?
   - Do queries use partition columns with compatible operators? (=, IN, BETWEEN)
   - Are functions on partition columns preventing pruning? (YEAR(ts) vs ts BETWEEN)

5. LIFECYCLE & MAINTENANCE
   - Retention policy: drop partitions older than X days/months?
   - Archival: move cold partitions to cheaper storage tier?
   - Repartitioning plan: how to migrate existing data to new scheme?
   - Schema evolution: how do partition keys handle schema changes?

Output format:
- Recommended partition scheme: [key1/key2/...]
- Estimated partition count (current and at 1-year growth)
- Expected file count and size per partition
- Migration plan from current to recommended scheme
- Compaction schedule recommendation
- Query performance impact estimate (partitions scanned before vs after)
- Risks and tradeoffs of the recommendation
```
