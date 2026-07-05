# Decomposition Patterns

How to break a monolith into services. Multiple strategies; choose based on context.

## By Domain (Bounded Context)

DDD approach. Each service maps to a bounded context.

1. Identify core domains via Event Storming or domain experts.
2. Map bounded contexts — where language/models change, draw a boundary.
3. Define context maps — relationships between contexts (upstream/downstream).
4. Each bounded context becomes a candidate service.

**Signals for boundary**: different ubiquitous language, different rate of change, different stakeholders.

## By Team (Conway's Law)

Align services to team structure. Each team owns 1-3 services end-to-end.

- Team owns code, data, deployment, on-call.
- Service boundary = team boundary.
- Communication between services mirrors communication between teams.
- Inverse Conway: design teams to get the architecture you want.

## By Data Ownership

Services own their data. If two functions access the same data, they're probably the same service.

1. Map data entities to their primary writers.
2. Group entities that participate in same transactions.
3. Entities written together likely belong in same service.
4. Read-heavy consumers get their own read models (CQRS).

## Strangler Fig

Incremental extraction from existing monolith. Named after tropical strangler figs that grow around trees.

```
Process:
1. Identify a seam in the monolith (a module with clear inputs/outputs)
2. Build new service that implements the same functionality
3. Route traffic: proxy/gateway directs relevant requests to new service
4. New service calls back to monolith for data it doesn't own yet
5. Gradually migrate data ownership to new service
6. Remove old code from monolith when traffic is 100% on new service
```

**Key rules**:
- Never rewrite from scratch. Always incremental.
- Both old and new must coexist during migration.
- Feature parity before cutover (test with shadow traffic).

## Branch by Abstraction

Refactor internal code to enable extraction without changing behavior.

```
Steps:
1. Introduce abstraction (interface) around code to extract
2. Existing implementation remains behind interface
3. Build new implementation (in new service or module)
4. Switch implementation at runtime (feature flag)
5. Remove old implementation when confident
```

## Decomposition Heuristics

| Signal | Action |
|--------|--------|
| Module changes 10x more than others | Extract (independent deployment) |
| Module needs different scaling | Extract (independent scaling) |
| Module owned by different team | Extract (team autonomy) |
| Module has different SLA | Extract (fault isolation) |
| Two modules always change together | Merge (false boundary) |
| Module is < 1 person's work | Too small, merge with related |

## Common Mistakes

- **Extracting too early**: boundaries aren't clean yet. Extract from well-structured monolith.
- **Extracting too small**: nano-services add overhead with no benefit.
- **Shared libraries as services**: utils/common should be libraries, not services.
- **Data-layer extraction only**: extracting the DB without the behavior creates anemic services.
- **Big bang**: rewriting everything at once. Always strangler fig.

## Verification

- Each service has clear domain ownership (can explain in one sentence).
- No circular dependencies between services.
- Each service can be deployed independently.
- Each service has its own data store.
- Team can reason about service in isolation (doesn't need to understand all other services).
