---
type: example
title: "Example: Metrics Specification -- E-commerce Platform"
---

# Example: Metrics Specification -- E-commerce Platform

## Product: Online Marketplace

### North Star Metric

**Weekly Gross Merchandise Value (GMV)**

- Definition: Total value of completed transactions (excluding refunds) in a rolling 7-day window
- Formula: SUM(order_total) WHERE order_status = 'completed' AND refund_status IS NULL
- Data Source: orders table, payments service
- Owner: Head of Product

---

### Acquisition Metrics

#### Visitor-to-Signup Rate

- Definition: % of unique visitors who create an account within the same session
- Formula: (new_signups / unique_visitors) * 100
- Granularity: Daily, by acquisition channel
- Data Source: Analytics events (page_view, signup_completed)
- Target: 4.5% (current: 3.8%)
- Alert: Drop below 2.5% for 3 consecutive days
- Segments: Channel (organic, paid, referral), Device (mobile, desktop)

#### Cost Per Acquisition (CPA)

- Definition: Marketing spend divided by new customers who complete first purchase
- Formula: total_marketing_spend / first_purchase_customers
- Time Window: Calendar month
- Target: < $35
- Alert: Exceeds $50

---

### Activation Metrics

#### First Purchase Rate

- Definition: % of new signups who complete a purchase within 14 days
- Formula: (users_with_first_purchase_within_14d / new_signups) * 100
- Cohort: Based on signup date
- Target: 25%
- Alert: Below 18%

#### Time to First Purchase

- Definition: Median days from signup to first completed order
- Formula: MEDIAN(first_order_date - signup_date) in days
- Target: < 3 days
- Segments: By onboarding flow variant

---

### Retention Metrics

#### D7 / D30 / D90 Retention

- Definition: % of users active on day N after first activity
- Active = at least one session with a product view or purchase
- Targets: D7: 45%, D30: 25%, D90: 15%

#### Monthly Active Buyers

- Definition: Unique users who complete at least one purchase in a calendar month
- Trend: Month-over-month growth rate
- Target: 8% MoM growth

---

### Revenue Metrics

#### Average Order Value (AOV)

- Definition: Mean order total for completed transactions
- Formula: SUM(order_total) / COUNT(orders) WHERE status = 'completed'
- Time Window: Rolling 28 days
- Target: $67
- Segments: Category, customer tier, device

#### Customer Lifetime Value (LTV)

- Definition: Predicted total revenue from a customer over 12 months
- Model: Historical average for cohort (updated quarterly)
- Formula: AOV * purchase_frequency * avg_customer_lifespan_months
- Target: LTV:CPA ratio > 3:1

---

### Operational Guardrails

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate (5xx) | > 1% | Page engineering |
| Checkout latency P95 | > 4s | Performance review |
| Refund rate | > 8% | Quality investigation |
| Support tickets / 1000 orders | > 50 | Process review |
| Payment failure rate | > 3% | Payment team alert |

---

### Metric Review Cadence

- Daily: Acquisition, error rate, revenue
- Weekly: Activation, AOV, retention trends
- Monthly: LTV, CPA, cohort analysis
- Quarterly: Metric relevance review, target adjustment
