# Example: Quarterly Team Health Assessment

## Team: Payments (Stream-Aligned, 6 engineers)

### DORA Metrics (Q3 2024)

| Metric | Value | Level | Trend |
|--------|-------|-------|-------|
| Deploy freq | 8/week | High | ↑ from 5/wk |
| Lead time | 2.1 days | High | → stable |
| Change failure | 18% | Medium | ↑ concern |
| Recovery time | 3 hours | High | ↓ improved |

### DevEx Survey (Response: 6/6, 100%)

| Dimension | Score | Prev | Delta |
|-----------|-------|------|-------|
| Flow | 3.8 | 3.5 | +0.3 |
| Cognitive Load | 3.1 | 3.4 | -0.3 |
| Feedback | 4.2 | 4.0 | +0.2 |

Top open-text theme: "Too many services to maintain, hard to context-switch."

### Diagnosis

- Change failure rate rising correlates with cognitive load decline.
- Team took ownership of 2 additional microservices in Q2.
- Now owns 7 services (above 5-service guideline).

### Actions Taken

1. **Immediate**: Retired 1 unused service, merged 2 related services → now owns 5.
2. **Q4 plan**: Add integration tests for payment flows (target: failure rate <15%).
3. **Ongoing**: Protected 2-hour morning focus blocks (no meetings before 11am).

### Result (Q4 follow-up)

- Cognitive load score recovered to 3.5.
- Change failure rate dropped to 12% (High level).
