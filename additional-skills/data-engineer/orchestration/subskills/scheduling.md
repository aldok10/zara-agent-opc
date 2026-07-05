---
type: subskill
title: "Scheduling"
---

# Scheduling

## Core Concepts

- Schedules express "when" to run; dependencies express "whether" to run — both are needed
- Data availability trumps clock time: schedule based on when inputs are ready, not arbitrary cron
- Overlapping runs cause data corruption — prevent concurrent execution of the same pipeline
- Time zones matter: UTC internally, local time only at display boundaries
- Catchup behavior must be explicit: should missed runs backfill automatically or not?

## Key Practices

- Use data sensors or event triggers over fixed schedules when input arrival time varies
- Set execution timeouts — a hung task should fail, not block the next scheduled run
- Prevent overlap with concurrency limits or lock mechanisms at the DAG/task level
- Schedule heavy jobs during off-peak hours to avoid resource contention
- Document SLAs: "dashboard refreshes by 8am" drives schedule design backward from deadline

## Common Mistakes

- Scheduling everything at midnight: resource contention causes cascading delays
- Using wall-clock cron without considering DST transitions (23-hour and 25-hour days)
- No timeout on tasks: a single hung job blocks the entire pipeline schedule indefinitely

## When to Apply

- Setting up new pipeline schedules in any orchestration tool
- Pipelines miss SLAs because upstream data arrives late
- Resource contention between concurrent pipelines degrades performance
- Moving from manual/ad-hoc runs to automated scheduled execution
