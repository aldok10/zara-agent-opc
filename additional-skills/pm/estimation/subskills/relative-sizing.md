# Relative Sizing

## Purpose

Compare items by effort/complexity relative to each other. Builds shared understanding. NOT for delivery commitments.

## When Relative Sizing Adds Value

- Backlog grooming: shared mental model of work
- Capacity sanity check: "is this sprint overloaded?"
- Splitting signal: items sized XL need decomposition
- New teams without throughput history

## T-Shirt Sizes

| Size | Relative effort | Typical use |
|------|----------------|-------------|
| XS | Trivial, <1h | Config change, typo fix |
| S | Small, known pattern | Standard CRUD, minor UI |
| M | Medium, some unknowns | New feature, moderate complexity |
| L | Large, significant effort | Cross-cutting, integration |
| XL | Too big — split first | Epic-level, high uncertainty |

## Fibonacci Sequence (1,2,3,5,8,13,21)

Rationale: larger items have more uncertainty, gaps between numbers reflect this. Prevents false precision at high end. 13 and 21 = "split this."

## Anchor Story Technique

1. Pick 1 well-understood completed story
2. Assign it a reference size (e.g., "3" or "M")
3. Size all other items relative to anchor
4. Re-anchor each quarter as team calibrates

## Calibration Sessions

- Monthly: review completed items vs their estimate
- Check: are all "3s" taking similar time?
- Adjust anchor if systematic over/under-estimation
- Track calibration ratio: actual_avg / estimated_avg per size

## Anti-Patterns

- **Precision theater**: debating 5 vs 8 for 20 minutes (both mean "medium-large")
- **Sizing everything**: don't size items already committed or trivially small
- **Using sizes for commitment**: "we committed to 40 points" — no
- **Individual sizing**: one person estimates alone, defeats shared understanding
- **Anchoring bias**: first speaker influences all — use simultaneous reveal
