# DORA Benchmarks (2024)

## Metric Grouping (2024 Structure)

**Throughput**: Deploy Frequency, Lead Time for Changes, Failed Deployment Recovery Time
**Instability**: Change Failure Rate, Deployment Rework Rate (5th metric, added 2024)

Note: "Deployment rework rate" = ratio of deployments that are unplanned but happen as a result of an incident in production.

## Performance Levels

| Metric | Elite | High | Medium | Low |
|--------|-------|------|--------|-----|
| Deploy Frequency | On-demand (multiple/day) | Weekly-monthly | Monthly-6mo | >6 months |
| Lead Time | <1 day | 1 day - 1 week | 1 week - 6 months | >6 months |
| Change Failure Rate | 0-15% (elite average ~5%) | 10-15% | 16-30% | >30% |
| Failed Deployment Recovery Time | <1 hour | <1 day | 1 day - 1 week | >1 week |

## Improvement Levers by Level

### Low → Medium
- Automate build + deploy pipeline (remove manual steps).
- Add basic test suite (smoke tests, critical paths).
- Implement monitoring/alerting for production.
- Reduce branch lifetime (merge within 1 week).

### Medium → High
- Trunk-based development or short-lived branches (<2 days).
- Automated test suite with >70% coverage on critical paths.
- Deploy pipeline <30 minutes end-to-end.
- Incident runbooks for top-5 failure modes.

### High → Elite
- Continuous deployment (every merge auto-deploys).
- Feature flags decouple deploy from release.
- CI <15 minutes. Full pipeline <30 minutes.
- Canary/progressive rollouts with auto-rollback.
- Observability-driven development (metrics, traces, logs correlated).

## Quick Assessment

1. How many prod deploys last month? → Deploy frequency
2. Pick last 5 merged PRs: median time from first commit to prod? → Lead time
3. Last 20 deploys: how many caused incident/rollback? → Change failure rate
4. Last 5 failed deployments: median time from detection to service restored? → Failed deployment recovery time
5. Last 20 deploys: how many were unplanned rework due to production incidents? → Deployment rework rate

## Key Insight

All five metrics improve together. Teams that deploy more frequently have LOWER failure rates (smaller changes = less risk). Don't sacrifice one for another.

## DORA 2024 Key Findings

> Note: DORA 2024 restructured into throughput/instability dimensions (not throughput/stability). The table above uses legacy cluster labels for convenience.

- **AI impact**: "AI adoption significantly increases individual productivity, flow, and job satisfaction. However, it also negatively impacts software delivery stability and throughput."
- **Deployment rework rate**: 5th metric added in 2024. Ratio of unplanned deployments caused by production incidents. Grouped under instability.
- **Organizational stability**: Unstable priorities = meaningful productivity decrease + burnout increase. Stability > speed.
- **User-centric mindset**: Teams focused on end-user outcomes report higher productivity AND job satisfaction.
- **Platform engineering**: Internal developer platforms reduce cognitive load and improve all DORA metrics.

## AI Impact on Metrics

- AI adoption increases individual productivity and job satisfaction but negatively impacts delivery stability and throughput (DORA 2024 finding).
- Deploy frequency may increase (AI-assisted coding) but change failure rate can spike (less understood code).
- Lead time improves for boilerplate but worsens for complex logic requiring more review.
- Key: measure AI-assisted vs human-written change failure rates separately to calibrate trust.
