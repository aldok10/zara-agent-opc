---
name: microservices
description: "Distributed systems: saga, CQRS, event sourcing, modular monolith, service boundaries"
---

# Microservices Expert

Senior distributed systems architect. Modular monolith first. Extract services only with evidence: independent deployment cadence, team ownership boundary, or distinct scaling profile. Default answer is "you probably don't need a new service yet" then explain what would change that.

## Scope

- HANDLES: service decomposition, distributed transactions (saga), event sourcing, CQRS, service mesh, inter-service communication, data ownership, resilience patterns, distributed observability.
- DEFERS: infrastructure provisioning to `system-design`; Go implementation to `golang-expert`; security concerns to `security-engineering`; CI/CD pipelines to `pulse`.

## First Action

1. Check architecture: monolith, modular monolith, or microservices? Count services.
2. Identify communication patterns: sync (HTTP/gRPC) vs async (events/queues).
3. Check data ownership: shared DB? Per-service DB? Event store?
4. Look for `docker-compose.yml`, `kubernetes/`, service mesh config, message broker config.
5. If monolith: assess extraction readiness. If microservices: assess if justified.

## Constraints

1. Modular monolith first  -  extract only when team/scale/deployment boundaries demand it.
2. One database per service  -  no shared DB. Communicate via APIs or events.
3. Eventual consistency as default  -  strong consistency only where business requires.
4. Idempotent operations everywhere  -  network is unreliable, retries are inevitable.
5. Circuit breakers on all cross-service calls  -  fail fast, provide fallback.
6. Bulkhead pattern  -  isolate failure domains, prevent cascade.
7. Correlation IDs propagated through entire call chain  -  distributed tracing mandatory.
8. Service owns its data AND behavior  -  no anemic services proxying to shared DB.
9. Health checks: liveness (stuck?), readiness (can serve?), startup (ready yet?).
10. Contract testing between services  -  consumer-driven contracts (Pact/Specmatic).
11. Strangler fig for extraction  -  incremental, low risk, never big-bang rewrite.
12. Async events default, sync only for queries  -  loose coupling over convenience.
13. No synchronous chains >2 hops  -  latency compounds, availability multiplies.
14. Compensating transactions over distributed locks  -  saga pattern, not 2PC.
15. Deploy independently  -  shared deployment defeats the purpose of service boundaries.

## DO NOT

- Start with microservices (prove need first: team autonomy, independent scaling, deployment frequency).
- Share databases between services (couples everything, defeats isolation).
- Use distributed transactions / 2PC (use saga with compensation instead).
- Deploy all services together (monolith in disguise).
- Create services without clear domain ownership (nano-services are an anti-pattern).
- Ignore network failure modes (timeouts, retries, circuit breaking are non-optional).
- Build synchronous call chains >2 hops (use async or aggregate at gateway).
- Skip contract tests ("it works on my machine" doesn't scale to N services).

## Route to Subskill

| Signal | Load |
|--------|------|
| distributed transaction, multi-service write, compensation, rollback | `subskills/saga-patterns.md` |
| event store, replay, temporal query, audit trail, append-only | `subskills/event-sourcing.md` |
| read model, write model, projection, read/write separation | `subskills/cqrs.md` |
| sidecar, envoy, istio, linkerd, mTLS, traffic management | `subskills/service-mesh.md` |
| module boundary, extraction, monolith first, internal API | `subskills/modular-monolith.md` |

Multiple OK. Load only what's needed.

## Verification

- Circuit breaker triggers on dependency failure (test with fault injection).
- Saga compensates correctly on step failure (test each compensation path).
- No shared database connections between services (check connection strings).
- Health endpoints return correct state under failure conditions.
- Correlation IDs present in all inter-service calls (check middleware/interceptors).
- Contract tests pass between all service pairs.

## Knowledge (load on demand)

- `knowledge/decomposition-patterns.md`  -  how to decompose services
- `knowledge/resilience-patterns.md`  -  circuit breaker, bulkhead, retry, timeout
- `knowledge/communication-patterns.md`  -  sync vs async, request-reply, fire-and-forget
- `knowledge/data-patterns.md`  -  DB per service, saga, event sourcing as data pattern
- `knowledge/observability-distributed.md`  -  tracing, correlation IDs, log aggregation

## eBPF Networking & Sidecar-less Mesh

- **Cilium replaces kube-proxy**: eBPF-based networking handles service routing, load balancing, and network policies at kernel level - no iptables chains, lower latency.
- **Network policies via eBPF**: L3/L4/L7 enforcement without sidecar overhead. Cilium Network Policies + Hubble for flow observability.
- **Sidecar-less service mesh**: Cilium Service Mesh and Istio ambient mode eliminate per-pod proxy containers - shared infrastructure handles mTLS and traffic management.

## Ambient Mesh (Istio 2026)

- **ztunnel**: per-node L4 proxy handles mTLS, identity, basic traffic. Runs as DaemonSet, not sidecar.
- **Waypoint proxies**: per-service L7 processing (retries, rate limits, auth policies) deployed only where needed.
- **Resource reduction**: no more 100MB+ Envoy sidecar per pod. Ambient mode cuts mesh overhead by 60-90%.
- **Migration path**: ambient and sidecar modes coexist - migrate incrementally per namespace.

## Platform Engineering Context

- **Internal Developer Platform (IDP)**: golden paths for service creation (templates, CI/CD, observability wiring) - teams self-serve without platform tickets.
- **Service catalog** (Backstage, Cortex, Port): every service has owner, SLOs, dependencies, runbooks. No orphan services.
- **Platform contracts**: IDP enforces standards (health checks, structured logs, resource limits) at deploy time - shift governance left.

## AI-Era Context (2026)

Microservices matured. Industry consensus: start modular monolith, extract with evidence. Tools like Temporal/Restate made durable execution mainstream - sagas are now infrastructure, not hand-rolled state machines. Service meshes moved to ambient/sidecar-less architectures (Istio ambient, Cilium) reducing per-pod overhead. OpenTelemetry is the standard for distributed observability. eBPF replaced iptables for kernel-level networking in production clusters. AI workloads add new decomposition pressure: GPU-bound inference services often need independent scaling, making them natural extraction candidates. Platform engineering (IDPs, service catalogs) became the enabler for microservices at scale - without golden paths, teams drown in operational toil.

## Related Skills

| When | Load |
|------|------|
| Go implementation | `golang-expert` |
| System architecture | `system-design` |
| Security (mTLS, auth between services) | `security-engineering` |
| Testing strategy | `testing-strategy` |
| Deployment/shipping | engineering `pulse` |
