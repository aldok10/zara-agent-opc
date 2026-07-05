---
type: fact
title: "Value Stream Mapping"
---

# Value Stream Mapping

## Key Metrics

| Metric | Definition |
|--------|-----------|
| **Lead Time** | Total time from request to delivery |
| **Cycle Time** | Time actively working (hands-on) |
| **Wait Time** | Time idle between steps |
| **%C/A** | % items needing no rework |
| **Process Efficiency** | Cycle Time / Lead Time × 100 (typical: 5-15%) |

## Mapping the Current State

### 1. Define Boundaries
Start: "Feature requested". End: "Deployed to production". Don't mix work types.

### 2. Walk the Process (interview people who DO the work)
- What triggers this step? What do you do? How long (hands-on)?
- Where does it go next? How long before next person picks it up?

### 3. Draw and Annotate
```
[Groom]→[Design]→[Build]→[Review]→[Deploy]
PT:30m   PT:4h    PT:2d   PT:2h    PT:30m
WT:5d    WT:3d    WT:0    WT:2d    WT:1d

Lead: 13.5d | Cycle: 2.8d | Efficiency: 21%
```

## 8 Wastes in Software

| Waste | Examples |
|-------|---------|
| Waiting | Review queue, approval delays, blocked by deps |
| Handoffs | Dev→QA→Ops (context lost each transfer) |
| Partially done | Open PRs, undeployed code |
| Extra processing | Gold-plating, unused docs, unnecessary approvals |
| Task switching | 5 things in progress, none finishing |
| Defects | Bugs found late, rework cycles |
| Motion | Searching for info, switching tools |
| Overproduction | Features nobody uses |

## Designing Future State

Principles:
1. Remove wait times (biggest gains)
2. Reduce batch sizes (smaller PRs, frequent deploys)
3. Eliminate handoffs (cross-functional teams)
4. Automate repeatable steps (CI/CD)
5. Pull-based flow (WIP limits)

## Workshop Format (3 hours)

- **Participants**: 4-8 people who do the work (not just managers)
- **Agenda**: Define scope (15m) → Map current (90m) → Identify waste (30m) → Design future (45m) → Actions (15m)

## Improvement Prioritization

| High impact + Low effort | Do first (quick wins) |
| High impact + High effort | Plan and invest |
| Low impact + Low effort | When convenient |
| Low impact + High effort | Skip |

Top candidates: automated testing, continuous deployment, smaller batches, same-day code review.
