# GCP Data Services

BigQuery, Cloud SQL, Spanner, and Dataflow for data storage and processing.

## When to Load
- Designing data architecture on GCP
- Choosing between Cloud SQL, Spanner, and AlloyDB
- Optimizing BigQuery cost and performance
- Building streaming/batch pipelines with Dataflow

## Key Concepts

**Storage decision matrix:**
- Cloud SQL: PostgreSQL/MySQL, single-region, <10TB, familiar SQL tooling
- AlloyDB: PostgreSQL-compatible, columnar engine for analytics, high performance
- Spanner: globally distributed, strongly consistent, unlimited scale, expensive
- BigQuery: serverless analytics warehouse, columnar, petabyte-scale

**BigQuery pricing models:** On-demand ($7.50/TB scanned) vs Capacity (slots, predictable cost). Editions: Standard, Enterprise, Enterprise Plus.

**Dataflow:** managed Apache Beam runner. Batch and streaming. Auto-scaling, exactly-once processing. Templates for common patterns.

## Patterns

**BigQuery cost optimization:**
```sql
-- Use partitioned + clustered tables
CREATE TABLE dataset.events
PARTITION BY DATE(event_time)
CLUSTER BY user_id, event_type
AS SELECT * FROM raw_events;

-- Preview bytes scanned before running
-- (use --dry_run flag in bq CLI)

-- Materialized view for repeated aggregations
CREATE MATERIALIZED VIEW dataset.daily_summary AS
SELECT
  DATE(event_time) AS day,
  event_type,
  COUNT(*) AS event_count
FROM dataset.events
GROUP BY day, event_type;
```

**Cloud SQL with Private IP (Terraform):**
```hcl
resource "google_sql_database_instance" "primary" {
  name             = "prod-postgres"
  database_version = "POSTGRES_15"
  region           = "us-central1"

  settings {
    tier              = "db-custom-4-16384"
    availability_type = "REGIONAL"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = 30
      }
    }

    insights_config {
      query_insights_enabled = true
    }
  }
}
```

**Dataflow streaming pipeline (Python):**
```python
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions

options = PipelineOptions([
    "--runner=DataflowRunner",
    "--project=my-project",
    "--region=us-central1",
    "--streaming",
])

with beam.Pipeline(options=options) as p:
    (p
     | "Read" >> beam.io.ReadFromPubSub(topic="projects/proj/topics/events")
     | "Parse" >> beam.Map(parse_json)
     | "Window" >> beam.WindowInto(beam.window.FixedWindows(60))
     | "Aggregate" >> beam.CombinePerKey(sum)
     | "Write" >> beam.io.WriteToBigQuery(
         "project:dataset.table",
         write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND
     ))
```

## Gotchas
- BigQuery on-demand: `SELECT *` on large tables is expensive -- always select specific columns
- BigQuery streaming inserts have higher cost than batch loads
- Cloud SQL storage auto-increase can't be disabled once enabled
- Spanner minimum cost is 1 node (~$700/month) or equivalent in processing units
- Dataflow shuffle service is default -- good for large pipelines but adds network cost
- Cloud SQL connections: use Cloud SQL Auth Proxy or Private IP, never public IP in production
- BigQuery BI Engine cache has per-project memory limits

## Verification
- `bq query --dry_run` to check bytes scanned before running
- `bq show --format=json dataset.table` for table metadata
- `gcloud sql instances describe <instance>` for Cloud SQL status
- `gcloud dataflow jobs list --region=<region>` for pipeline health
- BigQuery INFORMATION_SCHEMA for query patterns and slot usage
- Cloud SQL Insights for query performance analysis
