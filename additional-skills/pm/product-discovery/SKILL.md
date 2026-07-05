---
name: product-discovery
description: "Product discovery: continuous exploration, validation, experiments"
---

# Product Discovery

## Scope

Continuous discovery practices: identify opportunities, validate assumptions, design experiments, synthesize learnings. Not a phase - a cadence running parallel to delivery.

## Core Principles

1. Opportunity Solution Trees: map opportunities to desired outcomes before ideating solutions
2. Assumption mapping before building anything significant - plot importance x evidence
3. Interview weekly (min 1 customer/week per Torres; product trio talks to at least 1 customer every week)
4. Five assumption types (Torres): Desirability, Viability, Feasibility, Usability, Ethical
5. Four assumption test types (Torres): Prototype tests, One-question surveys, Data mining, Research spikes
6. Smallest assumption test to validate riskiest assumption first
7. Separate discovery from delivery cadences - different rhythms, different artifacts
8. Evidence hierarchy: opinion < survey < behavior < experiment < replicated results
9. Kill ideas early and cheaply - prototype cost << build cost
10. Cross-functional discovery: design + eng + PM together in interviews and synthesis
11. OST structure: Outcome > Opportunities > Solutions > Assumption Tests (tree, not list)
12. One metric that matters per discovery cycle - focus prevents scattered learning
13. Assumption tests ≠ experiments: assumption tests are used in DISCOVERY when deciding between ideas; experiments MEASURE THE IMPACT of what was built (Torres)

## DO NOT

1. Skip assumption mapping and jump straight to building
2. Interview only power users or internal stakeholders as proxy for users
3. Run experiments without pre-defined success criteria and kill conditions
4. Treat discovery as a phase that ends when "we know enough"
5. Confuse customer requests with validated opportunities

## Route to Subskill

| Signal | Subskill |
|--------|----------|
| Need to connect work to outcomes | `subskills/opportunity-tree.md` |
| Validating risky assumptions | `subskills/assumption-testing.md` |
| Planning/running user interviews | `subskills/user-interviews.md` |
| Designing lightweight experiments | `subskills/experiment-design.md` |

## Decision Matrix

| Situation | Action |
|-----------|--------|
| New outcome assigned, no opportunities mapped | Build OST first |
| Multiple solutions proposed, unclear winner | Map assumptions, test riskiest |
| Assumption is desirability risk | Fake door or interview |
| Assumption is feasibility risk | Spike or concierge |
| Assumption is usability risk | Prototype test (5 users) |
| Assumption is viability risk | Business model canvas + stakeholder review |
| Low evidence, high importance | Experiment immediately |
| High evidence, any importance | Proceed to delivery |

## Verification

- OST has measurable outcome at root
- Every solution has >= 1 underlying assumption identified
- Every experiment has success criteria defined BEFORE execution
- Kill criteria exist for every active experiment
- Interview synthesis produces opportunity statements, not feature requests
- Evidence level labeled on every insight driving decisions

## Self-Review Before Delivering

- [ ] Every recommendation traces to evidence (not opinion)
- [ ] Assumption types labeled (desirability/viability/feasibility/usability/ethical)
- [ ] Riskiest assumption identified and test designed BEFORE build recommendation
- [ ] Kill criteria defined for any experiment/test
- [ ] Discovery output actionable by product trio without further clarification

## AI-Era Context (2026)

AI synthesizes interview transcripts into opportunity statements, generates assumption maps from PRDs, and identifies patterns across user research sessions at scale. It dramatically reduces the time from raw research to structured insights. However, AI cannot replace user empathy -- it summarizes what was said but misses tone, hesitation, and unspoken needs. The risk: teams skip actual user contact because AI synthesis "feels" sufficient. Discovery still requires direct observation and conversation; AI accelerates analysis, not understanding. AI generates hypothesis candidates from data signals, drafts PRDs from opportunity statements, and produces assumption maps - reducing discovery prep time. AI PRDs are starting points, not final artifacts.

## Knowledge

- `knowledge/discovery-frameworks.md` -- framework quick-reference
- `knowledge/evidence-levels.md` -- evidence hierarchy and thresholds
