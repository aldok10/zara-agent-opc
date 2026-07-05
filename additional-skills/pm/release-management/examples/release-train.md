# Example: Bi-Weekly Release Train — 4 Teams

## Schedule (2-week cycle)

| Day | Activity |
|-----|----------|
| Mon W1 | Sprint starts, teams merge to trunk behind flags |
| Fri W1 | Scope lock: teams confirm what's on the train |
| Wed W2 | Cut date: release branch created from trunk |
| Thu W2 | Code freeze: only P0/P1 cherry-picks |
| Fri W2 | Regression suite + release notes compiled |
| Mon W3 | Release day: canary 1% > 5% > 25% > 100% |
| Tue W3 | Full rollout confirmed, retrospective |

## Teams & Scope (example cycle)

| Team | Feature | Flag |
|------|---------|------|
| Payments | Express checkout v2 | `payments.checkout.express-v2` |
| Search | ML ranking model | `search.ranking.ml-v2` |
| Platform | Rate limit upgrade | `platform.ratelimit.v2` |
| Growth | Referral redesign | `growth.referral.redesign` |

## Cherry-Pick Example
Thu W2: Search team finds ranking bug affecting 2% of queries.
- Fix written + tested on trunk.
- Release captain approves cherry-pick (P1, test coverage confirmed).
- Applied to release branch + verified in staging.
- Total cherry-picks this cycle: 1 of 3 max.

## Release Notes (auto-generated)
```
## v2.14.0 (2024-03-18)
### Features
- Express checkout v2 (payments)
- ML ranking model v2 (search)
- Rate limit v2 with burst support (platform)
- Referral page redesign (growth)
### Fixes  
- Fix ranking relevance for short queries (search)
```

## Outcome
Released Monday. 100% by Tuesday EOD. No rollbacks. Growth team's referral flag held at 25% for additional week (conversion metrics inconclusive).
