# Sprint Contract

Fill this before starting a feature. The contract is the boundary; changing it
mid-feature is a scope change and needs a new entry.

## Feature

- Id:
- Title:
- Priority:

## User-Visible Behavior

One sentence, observable from outside.

## Scope In

-

## Scope Out

-

## Definition Of Done

1. Behavior implemented.
2. Layer 1 static gate passed (`make test`).
3. Layer 2 runtime gate passed (`make check`).
4. Layer 3 end-to-end passed when the change crosses a boundary (`make e2e`).
5. Evidence recorded by `make verify-feature F=<id>`.
6. `make clean-check` passes.

## Verification Layers

| Layer | Command | Expected |
|---|---|---|
| L1 static | `make test` | exit 0 |
| L2 runtime | `make check` | exit 0 |
| L3 end-to-end | `make e2e` | ZARA-OK |

## Risks

-

## Approval

- Approved by:
- Date:
