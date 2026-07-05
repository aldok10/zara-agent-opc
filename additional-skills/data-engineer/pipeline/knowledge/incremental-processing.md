# Incremental Processing

Watermarks, late data handling, partitioning, and incremental load patterns.

## Core Concept

Process only new or changed data since the last run. Avoids reprocessing entire dataset every execution.

## Watermark Strategies

### High Watermark (Most Common)

Track the maximum value of a monotonically increasing column.

```sql
-- Store watermark
CREATE TABLE pipeline_state (
    pipeline_id VARCHAR PRIMARY KEY,
    high_watermark TIMESTAMP,
    last_run_at TIMESTAMP
);

-- Fetch new data
SELECT *
FROM source_table
WHERE updated_at > :last_high_watermark
  AND updated_at <= :current_run_timestamp;

-- Update watermark after successful load
UPDATE pipeline_state
SET high_watermark = :current_run_timestamp,
    last_run_at = NOW()
WHERE pipeline_id = 'orders_incremental';
```

### Low + High Watermark (Overlap)

Handle late-arriving updates by re-scanning a lookback window.

```sql
-- Low watermark: go back 2 hours to catch late updates
SELECT *
FROM source_table
WHERE updated_at > (:last_high_watermark - INTERVAL '2 hours')
  AND updated_at <= :current_run_timestamp;
```

Combined with MERGE at sink to handle re-processing idempotently.

### Partition-Based Watermark

Track which partitions have been processed.

```python
def get_unprocessed_partitions(source_partitions: list[str], processed: set[str]) -> list[str]:
    return [p for p in source_partitions if p not in processed]
```

## Late Data Handling

### Problem

Data arrives after the pipeline has already processed that time window.

### Strategies

| Strategy | How | Trade-off |
|----------|-----|-----------|
| Lookback window | Re-scan last N hours/days | Higher compute, guaranteed correctness |
| Reprocessing trigger | Detect late data, trigger backfill | Complex, but efficient |
| Allowed lateness | Accept data up to N hours late | Works for streaming |
| Reconciliation job | Periodic full scan to fix gaps | Expensive, but catches everything |

### Lookback Implementation

```sql
-- In dbt incremental model
{{
    config(
        materialized='incremental',
        unique_key='event_id',
        incremental_strategy='merge'
    )
}}

SELECT *
FROM {{ ref('stg_events') }}

{% if is_incremental() %}
WHERE event_timestamp > (
    SELECT MAX(event_timestamp) - INTERVAL '3 hours'
    FROM {{ this }}
)
{% endif %}
```

## Partition Strategies for Incremental

### Time-Based Partitioning

```sql
-- Load only today's partition
INSERT OVERWRITE TABLE target PARTITION (date = '{{ ds }}')
SELECT * FROM transform_query WHERE event_date = '{{ ds }}';
```

### Size-Based Partitioning

For non-time-series data, partition by ID ranges:

```python
def get_id_range(batch_size: int, last_processed_id: int) -> tuple[int, int]:
    return (last_processed_id + 1, last_processed_id + batch_size)
```

## Change Detection Methods

### Modified Timestamp

Most reliable. Requires source to maintain `updated_at`.

```sql
WHERE updated_at > :watermark
```

### CDC (Change Data Capture)

Database transaction log provides exact changes. Best correctness, but requires infrastructure.

### Hash Comparison

Detect changes by comparing row hashes (no `updated_at` available).

```sql
WITH current_hashes AS (
    SELECT id, MD5(CONCAT(col1, col2, col3)) AS row_hash
    FROM source
),
target_hashes AS (
    SELECT id, row_hash FROM target
)
SELECT c.*
FROM current_hashes c
LEFT JOIN target_hashes t ON c.id = t.id
WHERE t.id IS NULL OR c.row_hash != t.row_hash;
```

**Trade-off**: requires reading entire source to compute hashes. Better than full reload if transform is expensive.

### Audit Columns

Some sources provide `_created_at` and `_updated_at` audit columns. Use these as watermarks.

## State Management

### Database Table

```sql
CREATE TABLE pipeline_state (
    pipeline_id VARCHAR PRIMARY KEY,
    source_name VARCHAR,
    high_watermark VARCHAR,
    rows_processed BIGINT,
    last_run_at TIMESTAMP,
    last_run_status VARCHAR
);
```

### File-Based (for simple pipelines)

```python
import json
from pathlib import Path

STATE_FILE = Path("pipeline_state.json")

def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"watermark": None}

def save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state))
```

### Orchestrator-Managed

- Airflow: XCom or Variables
- Dagster: asset materialization metadata
- dbt: `{{ this }}` reference to current table state

## Common Pitfalls

### Gap in Watermark

If pipeline fails between fetching data and updating watermark, data is re-processed on retry. Solution: MERGE/upsert at sink makes re-processing safe.

### Source Deletes

Incremental loads don't capture deletions (only new/modified). Solutions:
- Soft delete column in source (`deleted_at`)
- Periodic full reconciliation
- CDC captures DELETE events

### Non-Monotonic Updates

Source updates old records with new `updated_at`. Watermark misses them. Solution: lookback window.

### Clock Skew

Source system clock differs from pipeline clock. Solution: always use source timestamps for watermarks, not pipeline execution time.

## Anti-Patterns

- Incrementally loading without idempotent sink (duplicates on retry)
- Trusting `CURRENT_TIMESTAMP()` instead of source timestamps
- No late data strategy (silently drops records)
- Watermark in memory only (lost on crash)
- Full table scan to find "new" records (defeats incremental purpose)
- No reconciliation job (drift accumulates indefinitely)
