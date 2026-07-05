# Now/Next/Later Structure

## Column Definitions

| Column | Confidence | Horizon | Detail Level |
|--------|-----------|---------|--------------|
| Now | High (>80%) | This quarter | Full: owner, metrics, dependencies, timeline |
| Next | Medium (50-80%) | Next quarter | Partial: outcome, hypothesis, open questions |
| Later | Low (<50%) | Future | Directional: theme, strategic bet, discovery needed |

## Confidence Mapping

- **High**: validated problem, known solution, capacity allocated, dependencies clear
- **Medium**: validated problem, solution in discovery, capacity tentative
- **Low**: strategic bet, problem hypothesized, needs exploration

## How to Fill

### Now (from sprint backlog + committed work)
- Pull from validated discovery that's solution-ready
- Confirm capacity with engineering
- Assign owner and success metric
- Map dependencies — nothing blocked without mitigation plan

### Next (from validated discovery)
- Problems validated through research/data
- Solutions in design or early validation
- Tentative capacity slot identified
- Open questions listed explicitly

### Later (from strategic bets)
- Aligned to long-term OKRs or themes
- Requires discovery before commitment
- No capacity promise — directional only
- Kill criteria: what would make us abandon this

## Progressive Detail

```
Later → Next: Discovery complete, problem validated, solution shaped
Next → Now: Solution validated, capacity confirmed, dependencies resolved
Now → Done: Success metric met or kill criteria triggered
```

## Review Cadence

- **Weekly**: Now column health check (on track/blocked/at risk)
- **Monthly**: Shift check — should anything move between columns?
- **Quarterly**: Full review — rebuild from current OKRs + learnings

## Movement Rules

- Items move LEFT (Later→Next→Now) only with evidence
- Items move RIGHT (Now→Next) if blocked or deprioritized — state why
- Items EXIT if kill criteria met — document learning
- No item stays in Now without progress for 2+ sprints — escalate or move

## Anti-patterns

- Now column has 20+ items → capacity overflow, trim ruthlessly
- Next column empty → no pipeline, discovery debt
- Later column never changes → not learning, not reviewing
- Items jump Later→Now → skipping validation, high risk
