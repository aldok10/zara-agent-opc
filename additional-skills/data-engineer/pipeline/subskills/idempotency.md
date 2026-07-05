---
type: subskill
title: "Idempotency"
---

# Idempotency

## Core Concepts

- An idempotent operation produces the same result whether executed once or many times
- Essential for safe retries: if a pipeline fails halfway, rerunning it must not duplicate data
- Achieved through overwrite semantics, deduplication keys, or upsert operations
- Partition-level overwrite is the simplest pattern: replace the entire partition on each run
- Idempotency applies to both writes (no duplicates) and side effects (no duplicate emails sent)

## Key Practices

- Use partition overwrite: write to `date=2024-01-15` partition, replacing all existing data
- For row-level operations, use upsert with a natural key or deterministic surrogate key
- Include a run_id or processing timestamp to identify which execution produced each row
- Make external side effects (API calls, notifications) gated by a "processed" flag
- Test idempotency explicitly: run the same pipeline twice, assert output is identical

## Common Mistakes

- Appending without deduplication: each rerun adds duplicate rows
- Using auto-increment IDs as primary keys — they guarantee non-idempotent inserts
- Assuming "it won't fail" so idempotency isn't needed — it always fails eventually

## When to Apply

- Any pipeline that may be retried (which is every pipeline in production)
- Switching from append-only to correct-on-rerun semantics
- Building pipelines that process events which may be delivered more than once
- Debugging duplicate data issues in downstream tables
