# Assumption Map Example: Team Collaboration Feature

## Context
Proposed: real-time collaborative editing for project docs.
Target: increase team engagement metric by 20%.

## Assumptions (8 identified)

| # | Assumption | Category | Importance | Evidence | Quadrant |
|---|-----------|----------|------------|----------|----------|
| 1 | Teams want to edit docs simultaneously | Desirability | H | L (opinion only) | TEST NOW |
| 2 | Real-time sync is technically feasible at scale | Feasibility | H | L (no spike done) | TEST NOW |
| 3 | Users will find collaboration UX intuitive | Usability | H | L (novel interaction) | TEST NOW |
| 4 | Feature won't cannibalize existing doc tool revenue | Viability | M | M (finance modeled) | MONITOR |
| 5 | Users will invite teammates (viral loop) | Desirability | M | L (hoped, not tested) | MONITOR |
| 6 | Mobile editing is required for adoption | Feasibility | L | M (analytics: 8% mobile) | SKIP |
| 7 | Enterprise customers need audit trails | Viability | M | H (contract requirements) | VALIDATED |
| 8 | Performance won't degrade with 10+ editors | Feasibility | H | M (similar tools exist) | TEST NOW |

## Top 3 for Testing (high importance, low evidence)

### Test 1: Desirability (#1)
- Method: Fake door  -  "Collaborate live" button in doc editor
- Success: >4% click rate (n=2000 active doc users)
- Kill: <1% click rate
- Duration: 1 week

### Test 2: Feasibility (#2)
- Method: Technical spike  -  CRDT prototype, load test with 20 concurrent editors
- Success: <500ms sync latency p95
- Kill: >2s latency or data conflicts
- Duration: 1 week

### Test 3: Usability (#3)
- Method: Prototype test  -  5 users attempt collaborative task in Figma prototype
- Success: 4/5 complete without help
- Kill: <3/5 complete task
- Duration: 3 days
