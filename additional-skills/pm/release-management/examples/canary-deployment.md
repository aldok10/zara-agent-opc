# Example: Canary Deployment — Express Checkout

## Context
Payment team shipping express checkout flow. High-risk: touches payment processing.

## Rollout Plan

| Stage | Traffic | Duration | Gate Criteria |
|-------|---------|----------|---------------|
| Internal | Employees only | 2 days | No errors, UX validated |
| Canary 1% | Random 1% | 24h | Error rate <0.1%, latency p99 <500ms |
| Canary 5% | Random 5% | 24h | Same + conversion rate within 2% of control |
| Canary 25% | Random 25% | 48h | Same + no payment failures above baseline |
| Full 100% | All users | Permanent | All metrics stable for 24h |

## Metrics Monitored
- Error rate (5xx responses)
- Payment success rate
- Checkout conversion rate
- Latency p50/p95/p99
- Customer support ticket volume

## Decision Points
- **Proceed**: All metrics within thresholds for stage duration.
- **Hold**: Metrics borderline. Extend stage duration 24h.
- **Rollback**: Error rate >0.5% OR payment failure spike >2x baseline OR latency p99 >2s.

## Rollback Trigger
Day 2 at 5%: payment failure rate spiked 3x baseline for express checkout users.
Action: Flag turned off immediately (12 seconds). Payments reverted to standard flow. No customer impact beyond the 5% during spike window. Post-mortem revealed race condition in concurrent payment sessions.

## Outcome
Fix deployed 2 days later. Re-ramped from 1% with additional monitoring on concurrent sessions. Full rollout achieved day 12.
