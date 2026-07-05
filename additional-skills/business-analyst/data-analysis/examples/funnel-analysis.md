---
type: example
title: "Product Funnel Analysis"
---

# Product Funnel Analysis

## Context
When measuring conversion through a multi-step user flow to identify where users drop off and quantify improvement opportunities. This template works for signup funnels, checkout flows, onboarding sequences, or any sequential process.

## Code/Template

### Funnel Definition: SaaS Trial-to-Paid Conversion

```
Funnel: Free Trial → Paid Subscription
Period: 2026-Q2 (Apr 1 - Jun 30)
Cohort: Users who started a free trial in this period
```

### Step-by-Step Metrics

| Step | Event | Users | Conversion | Drop-off | Drop-off % |
|------|-------|-------|-----------|----------|-----------|
| 1 | Visited pricing page | 48,200 |  -  |  -  |  -  |
| 2 | Started free trial | 12,050 | 25.0% | 36,150 | 75.0% |
| 3 | Completed onboarding | 8,435 | 70.0% | 3,615 | 30.0% |
| 4 | Created first project | 5,904 | 70.0% | 2,531 | 30.0% |
| 5 | Invited team member | 2,952 | 50.0% | 2,952 | 50.0% |
| 6 | Reached "aha moment" | 2,361 | 80.0% | 591 | 20.0% |
| 7 | Converted to paid | 1,653 | 70.0% | 708 | 30.0% |

**Overall Conversion (Step 1 → 7): 3.4%**
**Trial-to-Paid (Step 2 → 7): 13.7%**

### Drop-off Analysis

```
Biggest absolute drop-off: Step 1 → 2 (36,150 users)
  Root cause: Pricing page lacks social proof, no free-trial CTA above fold
  Impact if improved by 5pp: +2,410 additional trials → ~330 paid conversions

Biggest relative drop-off: Step 4 → 5 (50% drop)
  Root cause: "Invite team" is buried in settings, no contextual prompt
  Impact if improved by 15pp: +885 users reaching step 5 → ~496 paid conversions

Lowest-effort fix: Step 2 → 3 (30% drop in onboarding completion)
  Root cause: Onboarding has 8 steps, users abandon at step 5 (integration setup)
  Fix: Make integration optional, add "skip for now" with reminder
```

### Segmented View

| Segment | Trial Start | Paid Conversion | Notes |
|---------|-------------|-----------------|-------|
| Organic search | 4,820 | 18.2% | Highest intent |
| Paid ads | 3,615 | 9.1% | Lower quality traffic |
| Product Hunt | 1,807 | 14.8% | One-time spike |
| Referral | 1,205 | 22.4% | Best segment |
| Other | 603 | 11.0% |  -  |

### SQL Query (event-based funnel)

```sql
WITH funnel AS (
  SELECT
    user_id,
    MIN(CASE WHEN event = 'pricing_page_view' THEN event_at END) AS step_1,
    MIN(CASE WHEN event = 'trial_started' THEN event_at END) AS step_2,
    MIN(CASE WHEN event = 'onboarding_complete' THEN event_at END) AS step_3,
    MIN(CASE WHEN event = 'first_project_created' THEN event_at END) AS step_4,
    MIN(CASE WHEN event = 'team_member_invited' THEN event_at END) AS step_5,
    MIN(CASE WHEN event = 'aha_moment_reached' THEN event_at END) AS step_6,
    MIN(CASE WHEN event = 'subscription_started' THEN event_at END) AS step_7
  FROM events
  WHERE event_at BETWEEN '2026-04-01' AND '2026-06-30'
  GROUP BY user_id
)
SELECT
  COUNT(step_1) AS pricing_page,
  COUNT(step_2) AS trial_started,
  COUNT(step_3) AS onboarding_complete,
  COUNT(step_4) AS first_project,
  COUNT(step_5) AS invited_team,
  COUNT(step_6) AS aha_moment,
  COUNT(step_7) AS converted_paid,
  ROUND(100.0 * COUNT(step_7) / NULLIF(COUNT(step_2), 0), 1) AS trial_to_paid_pct
FROM funnel;
```

### Recommendations (prioritized by impact)

| Priority | Action | Expected Impact | Effort |
|----------|--------|-----------------|--------|
| P0 | Add contextual "invite team" prompt after first project | +15pp step 4→5 conversion | 1 sprint |
| P1 | Simplify onboarding (skip optional steps) | +10pp step 2→3 conversion | 1 sprint |
| P2 | Add social proof to pricing page | +3pp step 1→2 conversion | 3 days |
| P3 | Double down on referral program | +20% referral volume | 2 sprints |

## Key Points
- Always measure both absolute drop-off (volume) and relative drop-off (rate). The biggest volume loss may not be the highest-leverage fix.
- Segment funnels by acquisition channel  -  aggregate numbers hide that referral converts at 2.5x the rate of paid ads.
- Attach a revenue estimate to each improvement: "15pp improvement at step X = Y additional paid conversions at $Z ARR each."
