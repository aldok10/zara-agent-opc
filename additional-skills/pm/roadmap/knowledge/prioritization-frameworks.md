# Prioritization Frameworks Reference

## RICE

**Formula**: (Reach × Impact × Confidence) / Effort

| Factor | Scale | Notes |
|--------|-------|-------|
| Reach | # users/quarter | Estimated affected users |
| Impact | 0.25, 0.5, 1, 2, 3 | Minimal → Massive |
| Confidence | 0-100% | Evidence backing estimate |
| Effort | person-months | Total work required |

**Use when**: Comparing many initiatives objectively. Need stakeholder alignment on numbers.
**Anti-pattern**: Gaming scores, false precision on estimates.

## ICE

**Formula**: Impact × Confidence × Ease (each 1-10)

**Use when**: Quick scoring, early-stage ideas, less rigorous than RICE.
**Anti-pattern**: All items score 7-8, no differentiation.

## MoSCoW

**Categories**: Must / Should / Could / Won't (this time)

**Use when**: Fixed scope (releases, contracts). Negotiating tradeoffs with stakeholders.
**Anti-pattern**: Everything is "Must". No "Won't" items. Stakeholders game categories.

## Kano Model

**Categories**: Basic (must-have) / Performance (more=better) / Delighter (unexpected joy)

**Use when**: Understanding customer satisfaction drivers. Differentiating table-stakes from differentiators.
**Anti-pattern**: Classifying without customer research. Delighters become basics over time — revisit.

## Value vs Effort (2x2)

**Quadrants**: Quick Wins (high value/low effort) → Do first. Big Bets (high/high) → Plan carefully. Fill-ins (low/low) → If capacity allows. Money Pits (low/high) → Avoid.

**Use when**: Visual prioritization with team. Fast alignment exercise.
**Anti-pattern**: Effort estimates wildly off. "Everything is high value."

## Opportunity Scoring (Ulwick/ODI)

**Formula**: Opportunity = Importance + max(Importance - Satisfaction, 0)

| Score | Segment |
|-------|---------|
| >10 | Underserved — high opportunity |
| 6-10 | Appropriately served |
| <6 | Overserved — deprioritize |

**Use when**: JTBD-oriented teams. Identifying underserved needs. Validating where to invest.
**Anti-pattern**: Survey without proper JTBD framing. Small sample size. Using without segmenting by persona.

## Weighted Scoring (Enterprise)

Custom criteria with weights summing to 100%. Example:
- Strategic alignment: 30%
- Revenue impact: 25%
- Customer demand: 20%
- Technical feasibility: 15%
- Competitive pressure: 10%

**Use when**: Enterprise orgs with multiple decision-makers. Need transparent, auditable prioritization.
**Anti-pattern**: Too many criteria (>7), equal weights (defeats purpose), no recalibration quarterly.

## WSJF (Weighted Shortest Job First)

**Formula**: WSJF = Cost of Delay / Job Duration

**Cost of Delay** = User-Business Value + Time Criticality + Risk Reduction/Opportunity Enablement

| Factor | Scale | Notes |
|--------|-------|-------|
| User-Business Value | 1-10 (Fibonacci) | Revenue, user satisfaction, market share |
| Time Criticality | 1-10 (Fibonacci) | Deadline pressure, competitive window |
| Risk Reduction | 1-10 (Fibonacci) | Enables future work, reduces uncertainty |
| Job Duration | 1-10 (Fibonacci) | Relative size of work (smaller = higher WSJF) |

**Use when**: Large backlogs needing economic prioritization. SAFe contexts. PI planning prioritization. Comparing features with different time sensitivities.
**Anti-pattern**: Gaming scores without data. Using absolute values instead of relative sizing. Ignoring dependencies between items. Not recalibrating as context changes.

## Selection Guide

| Situation | Framework |
|-----------|-----------|
| Many items, need objectivity | RICE |
| Enterprise, multi-stakeholder | Weighted Scoring |
| Quick triage, early stage | ICE |
| Fixed scope negotiation | MoSCoW |
| Customer satisfaction focus | Kano |
| Team alignment exercise | Value vs Effort |
| Jobs-to-be-done context | Opportunity Scoring |
| Large backlog, SAFe, economic sequencing | WSJF |

## General Anti-patterns

- Using one framework for everything
- Prioritizing without customer/data input
- Scoring without revisiting as evidence changes
- Framework as substitute for judgment (it's an input, not a decision)

## RICE Calibration Tips

- **Reach**: Use real data — MAU, segment size, funnel stage counts. Never guess.
- **Impact**: Anchor to historical feature launches. "What moved the needle 3x before?"
- **Confidence**: <50% = you're speculating. Run a spike/experiment first.
- **Effort**: Include design, QA, infra, documentation. Not just dev time.
