# Roadmap Builder Prompt

## Input Required

1. **OKRs**: Current quarter objectives + key results
2. **Discovery backlog**: Validated problems, research findings, opportunity scores
3. **Capacity**: Available eng/design person-weeks this quarter

## Process

```
1. Map each OKR to potential initiatives (brainstorm)
2. Score initiatives: evidence strength × expected impact × effort fit
3. Assign columns:
   - Now: high evidence + fits capacity + dependencies clear
   - Next: validated problem + needs solution shaping
   - Later: strategic alignment + needs discovery
4. For each Now item: define outcome hypothesis, owner, metric, kill criteria
5. For each Next item: list open questions, required discovery
6. For each Later item: state strategic bet, discovery needed, kill criteria
7. Capacity check: sum Now effort ≤ 80% capacity (20% buffer for unplanned)
8. Dependency map: identify cross-team or external blockers
```

## Output Format

```
## Roadmap: [Quarter]  -  [Team/Product]

### Now (Committed, High Confidence)
[Table: Initiative | Outcome | Metric | Owner | Dependencies]

### Next (Shaped, Medium Confidence)
[Table: Initiative | Hypothesis | Open Questions | Confidence %]

### Later (Exploring, Low Confidence)
[Table: Initiative | Strategic Bet | Discovery Needed | Kill Criteria]

### Capacity: [X/Y person-weeks allocated, Z% buffer]
### Dependencies: [cross-team blockers + mitigation]
### Review date: [next quarterly review]
```

## Validation Checklist

- [ ] Every Now item traces to OKR
- [ ] Total Now effort ≤ 80% capacity
- [ ] No item without outcome hypothesis
- [ ] Kill criteria on all medium/low confidence items
- [ ] Dependencies have owners and mitigation plans
