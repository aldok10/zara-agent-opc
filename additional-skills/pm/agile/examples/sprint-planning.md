# Sprint Planning Example

## Context
Team: 5 devs, 2-week sprint, velocity avg 34 pts (last 3 sprints: 32, 35, 36).

## Sprint Goal
"Users can reset their password via email without contacting support."

## Capacity Check
- 5 devs × 10 days = 50 dev-days
- Vacations: 1 dev out 3 days = -3
- On-call: 1 dev at 50% = -5
- Available: 42 dev-days × 80% = 33.6 → plan for ~34 pts

## Stories Pulled (team pulls, not assigned)

| # | Story | Points | AC Count |
|---|-------|--------|----------|
| 1 | Password reset email trigger | 8 | 4 |
| 2 | Token generation + expiry (15min) | 5 | 3 |
| 3 | Reset form + validation | 8 | 5 |
| 4 | Success/failure notifications | 5 | 3 |
| 5 | Rate limiting (max 3/hour) | 5 | 2 |
| 6 | Audit log for reset events | 3 | 2 |
| **Total** | | **34** | |

## DoD Check
Each story verified against: code reviewed, tests passing, no known defects, docs updated, deployable.

## Outcome
Sprint goal accepted. Team confidence: all 5 thumbs up. No dependencies on other teams identified. Risk: email provider rate limits (mitigated by spike last sprint).
