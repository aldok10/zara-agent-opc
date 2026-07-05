---
type: subskill
title: "Error Handling"
---

# Error Handling

## Core Concepts

- Failures in data pipelines are expected, not exceptional  -  design for recovery from the start
- Distinguish between transient errors (retry) and permanent errors (alert and skip/quarantine)
- Failed tasks should not corrupt downstream data  -  partial writes are worse than no writes
- Error context must be preserved: what failed, on which data, at what point in the pipeline
- Dead letter queues and quarantine tables collect poisoned records for later inspection

## Key Practices

- Configure retries with exponential backoff for transient failures (network, rate limits)
- Set max retry limits  -  infinite retries mask permanent problems
- Write atomic outputs: temp location first, then swap/rename on success
- Route bad records to quarantine with full context (source row, error message, timestamp)
- Alert on failure patterns, not individual retries  -  reduce noise for on-call teams

## Common Mistakes

- Retrying permanently broken operations until the backlog grows unmanageable
- Swallowing errors silently: the pipeline "succeeds" but data is incomplete
- Failing the entire batch because one record is malformed  -  use per-record error handling

## When to Apply

- Building any pipeline that runs unattended (batch or streaming)
- Pipeline failures currently require manual investigation with no structured error info
- Upstream data quality is unreliable and malformed records appear regularly
- On-call engineers are overwhelmed by alerts from transient issues
