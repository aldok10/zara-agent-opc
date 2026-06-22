# Architecture Quality Attributes

## Priority Stack

From project philosophy (non-negotiable ordering):

**Correctness > Simplicity > Maintainability > Reliability > Security > Scalability > Observability > Cost**

Never optimize a lower-priority attribute at the expense of a higher one.

## Attributes

| Attribute | Key Question | How to Measure | Tradeoff With |
|-----------|-------------|----------------|---------------|
| Scalability | Can we handle 10x load? | Load test: requests/sec at target latency | Simplicity, Cost |
| Reliability | Does it work correctly every time? | Error rate, SLI/SLO adherence | Performance, Cost |
| Availability | What % uptime? | Nines (99.9% = 8.7h/year down) | Cost, Simplicity |
| Performance | How fast? | p50, p95, p99 latency; throughput | Maintainability, Cost |
| Maintainability | How fast can new dev be productive? | Time to first PR, change failure rate | Performance |
| Security | What's the blast radius of a breach? | Vulnerabilities found, time to patch | Usability, Performance |
| Observability | Can we answer "why broken?" without deploying? | MTTR, % of incidents needing code deploy to diagnose | Cost, Complexity |
| Testability | Can we test in isolation? | Test coverage, time to run suite | Simplicity |
| Deployability | How often can we safely release? | Deploy frequency, lead time, rollback time | Reliability |
| Cost Efficiency | What's our $/request or $/user? | Unit economics at current and projected scale | All of the above |

## Measurement Strategies

**SLI/SLO/SLA:**
- SLI (indicator): the metric (e.g., "% of requests < 200ms")
- SLO (objective): the target (e.g., "99.5% of requests < 200ms over 30 days")
- SLA (agreement): the contract with consequences (e.g., "credits if below 99.9%")
- Error budget = 100% - SLO. Spend it on velocity. Exhausted = freeze features, fix reliability.

**Availability nines:**
- 99% = 3.65 days/year down
- 99.9% = 8.7 hours/year
- 99.95% = 4.38 hours/year
- 99.99% = 52 minutes/year (requires redundancy everywhere)

**Performance percentiles:**
- p50: typical user experience
- p95: "most users" experience
- p99: tail latency, often where real problems hide
- Never use averages for latency. They lie.

## Decision Framework

When attributes conflict:
1. Identify which attributes are actually required (not wished for)
2. Quantify: "how much scalability?" not "is it scalable?"
3. Make tradeoffs explicit and document in ADRs
4. Revisit as load/team/requirements change

A system that is correct, simple, and maintainable but only handles current load is better than a complex, scalable system that has bugs and nobody can modify.
