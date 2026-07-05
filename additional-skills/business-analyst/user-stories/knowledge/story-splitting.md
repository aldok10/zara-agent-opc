---
type: fact
title: "User Story Splitting Patterns"
---

# User Story Splitting Patterns

## Why Split

- Stories >5 days signal hidden complexity
- Smaller slices = faster feedback, lower risk, better estimates
- Each slice must deliver testable value independently

## SPIDR Framework

### S — Spike (separate learning from building)
```
Original: "Pay with cryptocurrency"
Split: Spike (research APIs, 2-day timebox) → Implement Bitcoin → Add Ethereum
```

### P — Path (workflow steps)
```
Original: "Check out my cart"
Split: 1. Checkout with saved payment  2. New credit card  3. PayPal  4. Payment failure retry
```

### I — Interface (input methods/platforms)
```
Original: "Upload documents"
Split: 1. File picker  2. Drag-and-drop  3. Multiple files  4. Mobile camera
```

### D — Data Variations
```
Original: "Generate reports"
Split: 1. Single user  2. Team aggregation  3. Custom date range  4. CSV export  5. PDF export
```

### R — Rules (business rules)
```
Original: "Set shipping rates"
Split: 1. Flat rate  2. Weight-based  3. Zone-based  4. Free above threshold
```

## Other Splitting Patterns

**By CRUD**: Add address → View addresses → Edit → Delete → Set default

**By role**: Dashboard for IC → Dashboard for lead → Dashboard for exec

**By performance level**: Working search → Add typo tolerance → Add autocomplete → Personalized ranking

**Defer quality attributes**: Correct results first → <500ms target → <200ms at scale

## Anti-Patterns

| Bad Pattern | Problem |
|------------|---------|
| Technical layers (DB → API → UI) | No story delivers user value alone |
| Too granular (one field per story) | Overhead exceeds work; these are tasks |
| AND conditions in one story | Not actually split |

## Validation Checklist

Each split story must:
- [ ] Deliver visible value (can demo it)
- [ ] Be independently deployable
- [ ] Be testable without other stories complete
- [ ] Estimate at 1-3 days
- [ ] Have clear acceptance criteria

## Decision Tree

```
> 5 points? → Separate happy path from edge cases? (Path)
  → No → Multiple data types? (Data)
    → No → Multiple business rules? (Rules)
      → No → Multiple interfaces? (Interface)
        → No → High uncertainty? (Spike)
          → No → Split by CRUD or defer quality
```
