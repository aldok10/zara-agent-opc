# Example: Escalating a Delayed Release

```
Subject: [ESCALATION] Auth Service Migration - 2-week delay risk

SITUATION:
Auth service migration blocked by legacy API deprecation
discovered during integration testing. Dependency team
(Platform) cannot provide fix before our March 15 deadline.

IMPACT:
- 2-week delay to Q1 launch (affects 12K users on old auth)
- $45K/week in extended legacy infrastructure costs
- Marketing campaign scheduled Mar 18 needs adjustment

OPTIONS:
A) Wait for Platform fix (Mar 29 ship) - lowest risk, highest cost
B) Build adapter shim (Mar 18 ship) - 5 eng-days, adds tech debt
C) Partial migration without legacy users (Mar 15) - 8K of 12K users migrated

RECOMMENDATION: Option B
- Meets marketing timeline
- Tech debt is scoped and ticketed (DEBT-234)
- Platform fix replaces shim in Q2 (already planned)

ASK: Approve Option B by Thursday EOD.
If no decision by Friday, we default to Option A (2-week slip).

ESCALATION PATH TAKEN:
1. Discussed with Platform lead (Mon) - confirmed no earlier fix
2. Explored options with eng team (Tue)
3. Escalating to VP Eng for cross-team prioritization
```
