# Measurement

## Leading Indicators (predict future pain)

| Indicator | How to Measure | Healthy | Warning |
|-----------|---------------|---------|---------|
| Cycle time trend | PR open→merge, 4-week rolling avg | Stable or decreasing | >20% increase QoQ |
| Onboarding time | Days to first meaningful PR | <2 weeks | >4 weeks |
| Deployment pain | Failed deploys / total deploys | <5% | >15% |
| Code churn in debt areas | % of commits touching flagged areas | Decreasing | Increasing |
| Build time | CI pipeline duration trend | Stable | >30% increase |

## Lagging Indicators (confirm past decisions)

| Indicator | How to Measure | Healthy | Warning |
|-----------|---------------|---------|---------|
| Incident frequency | Incidents from known debt areas / month | Decreasing | Stable or rising |
| Customer-facing bugs | Bugs traced to debt items | <10% of total | >25% of total |
| Escaped defects | Production bugs per sprint | Stable low | Trending up |

## Proxy Metrics

- **Developer friction score**: Quarterly survey (1-5 scale) per system area
- **"Would you rewrite this?"** percentage per service/module
- **Time-to-fix**: Average for bugs in debt-heavy vs clean areas
- **PR size inflation**: Growing PRs suggest coupling/complexity issues

## Measurement Cadence

| Frequency | What |
|-----------|------|
| Sprint | Debt points delivered, allocation adherence |
| Monthly | Cycle time, incident correlation, debt ratio |
| Quarterly | Full review, friction survey, re-scoring register |
| Annually | Debt strategy review, budget adjustment |

## Tool Sources

| Tool | Metrics Provided |
|------|-----------------|
| SonarQube | Debt ratio, maintainability rating, code smells, duplication % |
| CodeClimate | Technical debt score, churn × complexity |
| GitHub/GitLab | Cycle time, PR size, code churn, deployment frequency |
| PagerDuty/OpsGenie | Incident frequency, MTTR per service |
| Custom survey | Friction score, satisfaction, pain points |

## Verification

- [ ] Leading + lagging indicators tracked monthly
- [ ] Friction survey conducted quarterly
- [ ] Metrics tied to specific debt register items
- [ ] Trends visualized and shared with leadership quarterly
