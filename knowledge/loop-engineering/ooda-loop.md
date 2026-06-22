# OODA Loop for Software Engineering

Speed of the loop matters more than perfection of any single step. The team or agent that cycles faster, learns faster, wins.

## The Four Phases

**Observe**: Gather signals without interpretation.
- Test results, compiler errors, log output
- User feedback, metrics, error rates
- Code structure, dependency graph, git history
- What changed recently? What's different from expected?

**Orient**: Interpret signals through context and experience.
- What do these observations mean together?
- What mental models apply? What patterns match?
- What are my biases? What am I missing?
- This is the most important phase. Bad orientation means good data leads to wrong decisions.

**Decide**: Choose the next action based on orientation.
- Pick the smallest experiment that tests your interpretation
- Commit to one path. Don't hedge with half-measures.
- Decide fast. A good decision now beats a perfect decision later.

**Act**: Execute the decision, then immediately re-observe.
- Make the change. Run the test. Deploy the fix.
- The goal is to generate new observations quickly.
- Small actions enable fast loops. Large actions slow the cycle.

## Application: Debugging

```
Observe: Test fails with timeout error on CI but passes locally
Orient: Likely environment difference. CI has no local DB? Or resource constraints?
Decide: Check CI logs for connection errors vs actual timeout
Act: Add connection logging, push, observe CI output
→ New observation feeds next cycle
```

## Application: Architecture Decisions

```
Observe: Response times increasing, DB CPU at 80%
Orient: Query patterns changed after feature X. N+1 queries likely.
Decide: Profile the top 5 endpoints, confirm hypothesis before optimizing
Act: Add query logging, measure, identify the actual bottleneck
```

## Application: Incident Response

```
Observe: 500 errors spiking, started 10 minutes ago
Orient: Deployment 12 minutes ago. Correlation strong.
Decide: Rollback first (fastest mitigation), investigate after
Act: Rollback. Errors stop. Now investigate root cause at leisure.
```

## Speed Multipliers

- Automate observation (monitoring, test suites, CI)
- Pre-build mental models (patterns, architecture knowledge)
- Reduce decision latency (runbooks, clear ownership)
- Shrink action size (feature flags, canary deploys, small PRs)

## For AI Agents

The agent's OODA loop is its core execution cycle. Fast loops with small actions and reliable observations converge faster than slow loops with large actions and uncertain feedback.
