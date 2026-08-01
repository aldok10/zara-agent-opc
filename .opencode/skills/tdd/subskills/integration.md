---
type: subskill
title: "Integration and Test Levels"
---

# Integration and Test Levels

The pyramid: many fast unit tests, fewer integration tests that exercise real wiring, fewest end-to-end tests. Coverage should be highest where the business risk is, not spread evenly.

## Choosing a level

| Level | What it proves | Cost | Use for |
|-------|----------------|------|---------|
| Unit | One unit's behavior in isolation | Fast | Business rules, transformations, edge cases |
| Integration | Units cooperate correctly (real DB, real HTTP, real filesystem) | Slower | Wiring, contracts, transactions, serialization |
| End-to-end | The system behaves for a user | Slowest, flaky | The critical journeys, release gates |

## Integration rules

1. Prefer the real database or a transactional fake over mocks. The value of an integration test is that it fails when wiring breaks; mocks remove that value.
2. Keep integration tests deterministic: fixed seed data, isolated database, controlled clock, no live external services.
3. One integration test should cover the happy path plus the seams that mocks cannot prove (auth middleware, SQL, serialization, event delivery).
4. Never test the framework. Test that your code uses it correctly.

## Common mistakes

- Unit test that hits a real database (slow, flaky, masks unit behavior).
- Integration test that mocks the thing it is meant to integrate.
- End-to-end suite as the only safety net (slow feedback, rarely run).

## Verification

1. Every unit is covered by a fast unit test; wiring seams have at least one integration test.
2. The suite runs deterministically: run it twice, same result.
3. No test depends on network, time, or environment to pass.
