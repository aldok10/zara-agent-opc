# Example: Quarterly Tech Debt Review (Q3 2025)

## Debt Register (Scored)

| # | Item | Type | Quadrant | Impact | Freq | Cost | Score | Category |
|---|------|------|----------|:---:|:---:|:---:|:---:|----------|
| 1 | Auth service N+1 queries | Code | Prudent-Deliberate | 4 | 5 | 2 | 10.0 | Immediate |
| 2 | Monolith payment coupling | Architecture | Prudent-Deliberate | 5 | 3 | 5 | 3.0 | Accept |
| 3 | Flaky integration test suite | Test | Reckless-Deliberate | 4 | 5 | 3 | 6.7 | Planned |
| 4 | Stale API docs (v2 endpoints) | Documentation | Prudent-Inadvertent | 3 | 4 | 1 | 12.0 | Immediate |
| 5 | React 17 → 18 migration | Dependency | Prudent-Deliberate | 3 | 2 | 4 | 1.5 | Accept |
| 6 | Manual staging deploys | Infrastructure | Reckless-Deliberate | 4 | 4 | 3 | 5.3 | Planned |
| 7 | Missing input validation (admin) | Code | Reckless-Deliberate | 5 | 2 | 2 | 5.0 | Planned |
| 8 | God class: OrderProcessor | Code | Prudent-Inadvertent | 3 | 3 | 4 | 2.3 | Accept |

## Selected for Q4

1. **#4 Stale API docs** (Score 12.0) — Owner: @sarah, 1 sprint
2. **#1 Auth N+1 queries** (Score 10.0) — Owner: @mike, 2 sprints
3. **#3 Flaky test suite** (Score 6.7) — Owner: @team-platform, ongoing 20% allocation

## Allocation: 18% sprint capacity protected (agreed with VP Eng)

## Metrics This Quarter
- Cycle time: 52h → 48h (improving)
- Debt-linked incidents: 4 → 2 (down 50%)
- Friction score: 3.2 → 3.4 (slight improvement)
