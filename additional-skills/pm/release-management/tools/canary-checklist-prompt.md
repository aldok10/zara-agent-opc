# Canary Deployment Checklist Prompt

```
Generate a canary deployment checklist for: [SERVICE/CHANGE DESCRIPTION]

Context:
- Traffic baseline: [RPS/QPS]
- SLOs: [latency p99, error rate, availability]
- Rollback mechanism: [automated/manual]

Stage progression:
1. 1% (15min) — Monitor: error rate, latency p99, CPU/memory
2. 5% (30min) — Monitor: business metrics, downstream dependencies
3. 25% (1h) — Monitor: resource saturation, queue depth, customer impact
4. 50% (2h) — Monitor: full metric suite + cost impact
5. 100% — Confirm: all SLOs met for 1h at 50% before promoting

Rollback triggers (any = immediate rollback):
- Error rate >2x baseline
- Latency p99 >3x baseline
- Any 5xx spike >0.1%
- Downstream dependency errors increase
- Alert fires from on-call

Success criteria per stage:
- All metrics within 1.5x baseline for full stage duration
- No new alerts triggered
- No customer-reported issues
- Business metrics (conversion, checkout) unchanged

Output: checklist with metric thresholds, monitoring dashboards, rollback commands.
```
