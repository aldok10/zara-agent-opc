# Risk-Based Test Strategy Matrix

## Scoring Method

- **Impact** (1-5): Business damage if feature fails (revenue loss, data corruption, user trust)
- **Likelihood** (1-5): Probability of failure (code complexity, change frequency, external deps)
- **Risk Score**: Impact x Likelihood (max 25)

## Risk Matrix

| Feature | Impact | Likelihood | Risk Score | Test Strategy |
|---------|--------|------------|------------|---------------|
| Payment processing | 5 | 3 | 15 | E2E + integration + contract + chaos + manual exploratory |
| User authentication | 5 | 2 | 10 | Unit + integration + security scan + penetration test |
| Search/filtering | 3 | 4 | 12 | Unit + integration + performance benchmarks |
| Profile settings | 2 | 2 | 4 | Unit + component + snapshot |
| Admin dashboard | 3 | 3 | 9 | Integration + visual regression + RBAC checks |
| Email notifications | 2 | 3 | 6 | Unit + contract test with email provider |

## Coverage Allocation by Risk Tier

| Tier | Score Range | Test Investment | Automation | Review |
|------|-------------|-----------------|------------|--------|
| Critical | 15-25 | 40% of budget | Full E2E + monitoring | Mandatory 2-reviewer |
| High | 10-14 | 30% of budget | Integration + contract | 1 reviewer + QA sign-off |
| Medium | 5-9 | 20% of budget | Unit + integration | Standard PR review |
| Low | 1-4 | 10% of budget | Unit + snapshot | Standard PR review |

## Notes

- Re-assess quarterly or when architecture changes significantly
- Features touching external APIs get +1 Likelihood bump
- Features handling PII get +1 Impact bump regardless of other factors
