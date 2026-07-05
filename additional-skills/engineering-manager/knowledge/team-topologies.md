# Team Topologies

Based on the Team Topologies framework (Skelton & Pais). Four fundamental team types that map to modern software organizations.

## The Four Types

### 1. Stream-Aligned Team

The primary team type. Aligned to a single flow of work (product area, user journey, business domain).

**Characteristics**:
- End-to-end ownership of a slice of the product
- Cross-functional (frontend, backend, data, sometimes ops)
- Can deliver value independently without waiting on other teams
- Owns their deployments and operational health

**Size**: 5-9 people (two-pizza rule)

**When to use**: default choice. Most teams should be stream-aligned.

**Examples**: Checkout team, Search team, Onboarding team, Payments team

**Anti-patterns**:
- Needing 3+ other teams to ship anything
- Unclear ownership boundaries (shared services confusion)
- Too broad a scope (trying to own everything)

### 2. Platform Team

Provides internal services that reduce cognitive load for stream-aligned teams.

**Characteristics**:
- Treats stream-aligned teams as customers
- Self-service interfaces (APIs, CLIs, docs)
- Measures success by adoption and developer experience
- Owns reliability of platform services

**Size**: varies, but each sub-team within platform follows 5-9 rule

**When to use**: when multiple stream-aligned teams need the same capabilities (deployment, observability, data infrastructure).

**Examples**: Developer Platform team, Infrastructure team, Data Platform team

**Anti-patterns**:
- Becoming a gatekeeper/bottleneck
- Building things nobody asked for
- No self-service (teams must file tickets)
- Treating internal users worse than external customers

### 3. Enabling Team

Helps stream-aligned teams adopt new capabilities. Temporary engagement, not permanent dependency.

**Characteristics**:
- Specialists in a domain (testing, security, observability)
- Work WITH teams, not FOR them (teaching, not doing)
- Time-boxed engagements (weeks, not months)
- Success = the stream team no longer needs them

**Size**: 3-5 specialists

**When to use**: new technology adoption, practice improvement, upskilling.

**Examples**: SRE enablement team, Security champions team, ML adoption team

**Anti-patterns**:
- Permanent dependency (doing the work instead of teaching)
- Ivory tower (advising without hands-on pairing)
- No clear exit criteria for engagements

### 4. Complicated-Subsystem Team

Owns a component that requires deep specialist knowledge most stream-aligned engineers don't have.

**Characteristics**:
- Heavy math, science, or niche domain expertise
- Provides clear API/interface to consuming teams
- Small team of specialists
- Reduces cognitive load on stream-aligned teams

**Size**: 3-7 deep specialists

**When to use**: video codecs, ML model training, payment processing rules, compliance engines.

**Examples**: Search ranking algorithm team, Fraud detection model team, Compiler team

**Anti-patterns**:
- Using this type to avoid cross-training (hoarding knowledge)
- Too many complicated-subsystem teams (sign of poor platform design)
- No clear interface contract with consumers

## Interaction Modes

### Collaboration

Two teams working together for a defined period. High bandwidth, high cost.

- Use for: new product development, major integration work
- Time-box it (1-3 months)
- Goal: establish patterns, then shift to X-as-a-service

### X-as-a-Service

One team provides, other consumes via API/interface.

- Use for: mature capabilities, platform services
- Clear contract, low coordination overhead
- Provider team owns reliability and documentation

### Facilitating

One team helps another learn/improve.

- Use for: enabling team engagements
- Teaching, pairing, coaching
- Exit criteria defined upfront

## Team Design Heuristics

1. If a team can't deliver end-to-end: it's mis-scoped
2. If two teams always need to coordinate: consider merging or redesigning boundary
3. If a team > 9 people: split along a natural seam
4. If platform team has > 2 week backlog from internal requests: understaffed or scope too broad
5. If an enabling team engagement lasts > 3 months: something is wrong
6. Cognitive load > team capacity: reduce scope or add people

## Conway's Law

"Organizations design systems that mirror their communication structure."

Use this intentionally:
- Design team boundaries along desired architecture boundaries
- If you want microservices: small, autonomous teams
- If you want a monolith: one team (or accept coupling)
- Inverse Conway: structure teams to get the architecture you want

## Scaling

| Org Size | Pattern |
|----------|---------|
| < 20 eng | 2-3 stream-aligned teams, no platform |
| 20-50 eng | 4-6 stream, 1 platform (infra), 1 enabling |
| 50-150 eng | Many stream, platform with sub-teams, enabling teams |
| 150+ eng | Full topology with all four types, tribe/division structure |
