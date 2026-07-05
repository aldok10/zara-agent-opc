---
type: subskill
title: "Bottleneck Analysis"
---

# Bottleneck Analysis

Value stream mapping, cycle time measurement, and WIP limits for process optimization.

## When to Load

- Identifying why a process is slow or inefficient
- Measuring cycle time vs lead time
- Implementing flow-based improvements
- Applying Theory of Constraints to workflows

## Key Concepts

**Value Stream Mapping (VSM)** -- Visual tool showing all steps from request to delivery. Separates value-adding time from wait time. Reveals that most lead time is waiting, not working.

**Cycle Time** -- Time spent actively working on an item. Lead time = cycle time + wait time. Typical finding: 5% value-add, 95% waiting.

**Work in Progress (WIP) Limits** -- Constraining concurrent work to prevent overload. Little's Law: Lead Time = WIP / Throughput. Reducing WIP reduces lead time without working faster.

**Theory of Constraints (TOC)** -- The system's throughput is limited by one bottleneck at a time. Identify it, exploit it (maximize its utilization), subordinate everything else to it, elevate it (add capacity).

**Flow Efficiency** -- Ratio of active time to total time. Flow efficiency = cycle time / lead time * 100. Most knowledge work: 5-15%. Target: 40%+.

## Patterns

```
# Value Stream Map (text representation)

Request -> [Queue: 3d] -> Design -> [Queue: 5d] -> Dev -> [Queue: 2d] -> Review -> [Queue: 1d] -> Deploy
             wait          2d         wait         5d        wait        0.5d       wait         0.5d

Lead Time: 19 days
Cycle Time: 8 days (Design 2d + Dev 5d + Review 0.5d + Deploy 0.5d)
Flow Efficiency: 8/19 = 42%

Bottleneck: Queue before Dev (5 days wait)
Root cause: 3 developers, 15 items in WIP = 5 items per person
```

```
# WIP Limit Calculation
Current state:
  - Throughput: 10 items/week
  - Average lead time: 20 days
  - Current WIP: 10/7 * 20 = ~29 items (Little's Law)

Target state:
  - Target lead time: 10 days
  - Same throughput: 10 items/week
  - Required WIP: 10/7 * 10 = ~14 items

Action: Set WIP limit to 14 across the board.
Expected result: Lead time drops to ~10 days.
```

```
# Bottleneck identification checklist
1. Where does work queue up the longest? (largest queue)
2. What step has the highest utilization? (>85% = bottleneck candidate)
3. What step has the most variability in completion time?
4. Where do people multitask the most? (context switching = hidden bottleneck)
5. What step creates the most rework/returns upstream?
```

## Gotchas

- Optimizing non-bottleneck steps has zero impact on total throughput -- focus on THE bottleneck
- WIP limits without cultural buy-in lead to gaming (starting items then "parking" them)
- Measuring only cycle time ignores wait time, which is usually the larger problem
- Bottlenecks shift after improvement -- be ready to re-identify the new constraint
- Averaging cycle time hides bimodal distributions (easy tasks vs complex tasks)

## Verification

- Can you identify the single biggest bottleneck with data (not intuition)?
- Lead time measurement includes all wait time (not just active work)
- WIP limits are set based on throughput and desired lead time (Little's Law)
- Improvements target the bottleneck specifically, not the overall process
- Metrics are tracked over time to confirm improvement (before/after with dates)
