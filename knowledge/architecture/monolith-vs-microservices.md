# Monolith vs Microservices

Pairwise decision guide for choosing between monolithic and microservice architectures.

## When to Choose Monolith

- Team < 10 engineers
- Domain boundaries unclear (still exploring)
- Time-to-market matters more than scalability
- Single deployment target, simple ops
- Shared data model, strong consistency needed
- Early-stage product (pivot likely)

## When to Choose Microservices

- Multiple teams own independent domains
- Different services need independent scaling
- Different services need different tech stacks
- Deployment independence required (team autonomy)
- Domain boundaries well-understood and stable
- Organization has platform/infra team capacity

## Key Differentiators

| Dimension | Monolith | Microservices |
|-----------|----------|---------------|
| Complexity | In the code | In the infrastructure |
| Latency | Function calls (ns) | Network calls (ms) |
| Consistency | ACID transactions easy | Eventual consistency, sagas |
| Debugging | Stack traces, single process | Distributed tracing, log correlation |
| Deploy speed | Slow (deploy everything) | Fast (deploy one service) |
| Team coupling | High (shared codebase) | Low (API contracts) |
| Operational cost | Low | High (k8s, service mesh, observability) |

## Common Mistakes

- Microservices for a 3-person team (operational burden > benefit)
- Monolith without module boundaries (becomes big ball of mud)
- Distributed monolith (microservices that must deploy together)
- Choosing microservices because it's "modern" without data on scaling needs

## Middle Ground

**Modular Monolith**: monolithic deployment with strict module boundaries. Get most benefits of both. Migrate to microservices later if proven need exists. This is almost always the correct starting point.

## Decision Rule

Start monolith. Split only when: (1) team size forces it, (2) scaling data proves it, or (3) deployment coupling blocks velocity. Never split speculatively.
