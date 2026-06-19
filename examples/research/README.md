# Research Examples

## Technical Research

### Scenario
Evaluating database options for a high-write application.

### Ask Zara
```
Research database options for a real-time analytics platform
with 100K writes/second. Compare PostgreSQL, Cassandra,
and TimescaleDB. Consider: consistency, performance, ops burden.
```

### Expected Workflow
1. Zara engages `architect` sub-agent
2. Analysis:
   - Write throughput requirements
   - Consistency vs availability tradeoffs
   - Operational complexity
   - Ecosystem and tooling
3. Comparison:
   - PostgreSQL: Strong consistency, good tooling, write bottleneck
   - Cassandra: High write throughput, eventual consistency, ops heavy
   - TimescaleDB: Time-series optimized, hybrid, newer ecosystem
4. Recommendation with tradeoffs

---

## Documentation Generation

### Scenario
Generating technical documentation from code.

### Ask Zara
```
Generate architecture documentation for this TypeScript
codebase. Include: module structure, data flow,
error handling strategy, and testing approach.
```

### Expected Workflow
1. Zara explores the codebase structure
2. Engages `architect` for architectural analysis
3. Produces:
   - Module dependency diagram
   - Data flow documentation
   - Error handling patterns
   - Testing strategy overview
   - Key architectural decisions (ADRs)

---

## Framework Comparison

### Scenario
Comparing web frameworks for a new project.

### Ask Zara
```
Compare Next.js, Remix, and SvelteKit for building
a data-heavy dashboard application. Team has 5 developers
with React experience.
```

### Expected Workflow
1. Zara engages `architect`
2. Analysis:
   - Team skill match
   - Data fetching patterns
   - Performance characteristics
   - Ecosystem maturity
   - Learning curve
3. Comparison with tradeoffs
4. Recommendation based on context
