---
type: fact
title: "Debt Measurement Metrics Reference"
---

# Debt Measurement Metrics Reference

| Metric | How to Measure | Healthy Range | Warning Threshold | Tool Source |
|--------|---------------|---------------|-------------------|-------------|
| Debt ratio | Tech debt time / dev time | <5% | >10% | SonarQube |
| Maintainability rating | SonarQube A-E scale | A-B | C or below | SonarQube |
| Code duplication % | Duplicated lines / total | <3% | >5% | SonarQube, CodeClimate |
| Cycle time | PR open → merge (rolling avg) | <48h | >96h | GitHub/GitLab analytics |
| Deployment frequency | Deploys per week | Stable/increasing | Decreasing trend | CI/CD platform |
| Failed deployment rate | Failed / total deploys | <5% | >15% | CI/CD platform |
| Incident rate (debt-linked) | Incidents traced to debt items/month | Decreasing | Stable or rising | PagerDuty/OpsGenie |
| MTTR | Mean time to recovery | <1h | >4h | Incident platform |
| PR size (lines changed) | Average PR diff size | <300 lines | >500 lines | GitHub/GitLab |
| Code churn | Re-edits of same code within 3 weeks | <15% | >30% | CodeClimate |
| Onboarding time | Days to first meaningful PR | <10 days | >20 days | Manual tracking |
| Developer friction score | Quarterly survey (1-5) | >3.5 | <3.0 | Custom survey |
| Dependency freshness | % deps within 1 major version | >80% | <60% | Renovate/Dependabot |
| Test coverage in debt areas | Coverage % for flagged modules | >70% | <50% | Coverage tools |
| Build time | CI pipeline duration | <10min | >20min | CI platform |

| AI debt ratio | AI-generated issues / total issues | <20% | >40% | Exceeds AI + SonarQube |
| Rework rate | % code rewritten within 2 weeks | <10% | >25% | GitClear |

## Correlation Pairs to Track

- Debt ratio ↔ Cycle time (expect positive correlation)
- Debt items fixed ↔ Incident rate (expect inverse)
- Sprint allocation adherence ↔ Velocity trend (expect positive)
- Friction score ↔ Attrition risk (leading indicator)
- AI debt ratio ↔ Rework rate (strong positive correlation)
- Release frequency + AI tooling adoption ↔ Compound debt acceleration

## AI Debt Measurement

- **AI debt ratio**: AI-flagged issues / total open issues. Rising = AI tooling outpacing review.
- **Rework rate**: engineering quality signal (not an official DORA metric but correlated with stability).
- Faster release cycles + AI tooling = debt compounds faster (shorter feedback loops amplify).
- Measurement must be **daily discipline** (dashboard), not quarterly review (too late).

## Measurement Cadence

| Frequency | Metrics | Action |
|-----------|---------|--------|
| Daily | Debt ratio, AI debt ratio, rework rate | Dashboard alert on threshold breach |
| Weekly | Cycle time, churn, stale flags | Standup discussion if trending wrong |
| Sprint | Incident correlation, cleanup rate | Sprint planning input |
| Quarterly | Trends, developer friction, compound analysis | Strategy adjustment |
