---
type: example
title: "Example: Weekly Stakeholder Update"
---

# Example: Weekly Stakeholder Update

```
Subject: Product Weekly - Jan 13 - Overall: AMBER

---

## Auth Migration: GREEN
SHIPPED: Batch 1 migrated (3.2K users, 0 errors)
NEXT: Batch 2 (4.1K users) starting Jan 15
RISK: None

## Search Redesign: AMBER
SHIPPED: New index deployed to staging
NEXT: Performance testing (target: p99 <200ms)
RISK: Latency at 340ms in staging - optimization in progress,
      fallback to current search if not resolved by Jan 17

## Mobile Onboarding: GREEN
SHIPPED: A/B test live (50% rollout), +12% completion rate
NEXT: Full rollout pending 7-day data (Jan 18 decision)
RISK: None

---

DECISIONS NEEDED:
- Search: Accept 250ms p99 or delay 1 week for <200ms? (by Jan 16)

ACTION ITEMS:
- @platform: Provide search cluster metrics (Jan 14)
- @design: Final onboarding assets for full rollout (Jan 17)
- @PM: Decision record for search latency trade-off (Jan 16)
```
