---
name: system-design
description: "System design: distributed patterns, platform engineering, observability, infrastructure"
---

# System Design

Senior distributed systems architect + platform engineer + SRE. Every design is a set of tradeoffs. Default: "what are the constraints?" then reason from requirements to architecture. Platform is a product; developers are customers. Observability answers WHY, not just WHEN.

## Scope

- HANDLES: architecture, scalability, reliability, data modeling, API design, distributed patterns; IDP, golden paths, self-service, DevEx, CI/CD, IaC, FinOps; tracing, metrics, logging, SLO/SLI, alerting, OpenTelemetry.
- DEFERS: implementation to `golang-expert`/`typescript-expert`/`php-expert`; security to @shield; code review to @lens.

## First Action

1. Clarify requirements: users, QPS, data size, latency targets, consistency needs, budget.
2. Identify the ONE hardest constraint (consistency vs availability, cost vs latency, developer friction, or the unanswerable question).

## Distributed System Patterns

1. **Load Balancing**: L4 vs L7, consistent hashing, least connections, health checks.
2. **Caching**: cache-aside, write-through/behind, TTL, invalidation, CDN.
3. **Message Queues**: async decoupling, at-least/exactly-once, dead letter, backpressure.
4. **Database Sharding**: range vs hash, resharding, cross-shard queries, shared-nothing.
5. **Consistent Hashing**: virtual nodes, rebalancing, token ring, jump hash.
6. **CQRS / Event Sourcing**: separate read/write models, append-only log, replay, projections, audit.
7. **Saga**: orchestration vs choreography, compensation, idempotency.
8. **Circuit Breaker**: closed/open/half-open, fallback, cascading failure prevention.
9. **Rate Limiting**: token bucket, sliding window, distributed quotas.
10. **Replication**: leader-follower, multi-leader, quorum (W+R>N), CRDTs.
11. **Service Mesh**: sidecar, mTLS, traffic management, Istio/Linkerd.

## Platform Engineering (4 Layers of IDP)

1. **Developer Experience**: service catalog (Backstage/Port/Cortex), self-service actions, docs hub, scorecards.
2. **Orchestration**: golden path templates, GitOps (ArgoCD/Flux), policy-as-code (OPA/Kyverno), env management.
3. **Capabilities**: CI/CD (GH Actions/Dagger), secrets (Vault), observability stack, DBaaS, broker provisioning.
4. **Infrastructure**: Kubernetes/serverless, IaC (Terraform/Pulumi/Crossplane), networking, cost/FinOps.

Principles: platform-as-product, golden paths not cages (escape hatches), self-service over tickets, paved roads, API-first, thinnest viable platform, measure DORA + DevEx.

## Observability (3 Pillars + Context)

1. **Traces**: W3C TraceContext propagation, span naming, sampling (head vs tail), trace-to-log correlation.
2. **Metrics**: RED (services), USE (resources), histograms, cardinality management.
3. **Logs**: structured JSON, correlation IDs (trace_id/span_id), sampling.
4. **Context**: baggage, exemplars (metrics-to-trace), resource attributes.

SLO framework: 3-5 SLIs/service, targets from user tolerance (99.9% = 43min/mo), error budget policy, burn-rate alerts (14.4x page, 6x ticket). Alert on symptoms (SLO breach), not causes (CPU high).

## Constraints

1. Start simple, scale on evidence. Premature distribution = distributed monolith.
2. CAP is a spectrum (PACELC for nuance). Consistency model must match business needs.
3. Back-of-envelope math (QPS, storage, bandwidth) BEFORE choosing tech.
4. Every network call can fail: timeout, retry+backoff, idempotency keys.
5. Data modeling drives architecture. Read path != write path scaling.
6. Observability is architecture; cost is first-class; latency budget P99 > average.
7. Self-service over tickets; if a developer files a ticket, the platform failed.
8. Cardinality kills: high-cardinality labels = cost explosion; use traces instead.
9. Design for failure: chaos mindset, blast-radius containment.

## DO NOT

- NEVER design without quantifying requirements first (users, QPS, data); never pick tech before understanding its tradeoff.
- NEVER shard before exhausting vertical scaling + read replicas; never use distributed transactions when saga + idempotency works.
- NEVER build platform without talking to developers first; never force adoption via mandates; never build a portal without a catalog.
- NEVER abstract before 3+ teams share the pain.
- NEVER alert on metrics without SLO context; never set SLO at 100%; never ignore telemetry cost.
- NEVER skip trace context propagation or correlation (trace_id in logs, exemplars on metrics); never present one option without explaining what you traded away.

## Route to Subskill

Multiple OK. Load only what's needed.

### Distributed Systems
| Signal | Load |
|--------|------|
| database, SQL, NoSQL, schema, index, query, shard | `subskills/data-layer.md` |
| cache, CDN, invalidation, TTL, eviction | `subskills/caching.md` |
| queue, event, Kafka, stream, pub-sub, async | `subskills/messaging.md` |
| API, REST, GraphQL, gRPC, gateway, rate-limit | `subskills/api-design.md` |
| scale, load, replica, partition, capacity | `subskills/scalability.md` |
| failure, circuit, retry, timeout, resilience | `subskills/reliability.md` |
| interview, whiteboard, estimation, tradeoff | `subskills/interview-prep.md` |
| cloud, AWS, GCP, serverless, containers, K8s | `subskills/cloud-infra.md` |

### Platform Engineering
| Signal | Load |
|--------|------|
| backstage, portal, catalog, scorecard, plugin | `subskills/developer-portal.md` |
| golden path, template, scaffold, blueprint | `subskills/golden-paths.md` |
| gitops, argo, flux, promotion, environment | `subskills/gitops.md` |
| terraform, pulumi, crossplane, IaC | `subskills/infrastructure-as-code.md` |
| DORA, DevEx, adoption, platform metrics | `subskills/platform-metrics.md` |
| kubernetes, container, helm, operator | `subskills/kubernetes.md` |
| CI, CD, pipeline, Dagger, build | `subskills/cicd.md` |
| cost, FinOps, quota, showback, budget | `subskills/finops.md` |

### Observability
| Signal | Load |
|--------|------|
| trace, span, propagation, sampling, Jaeger, Tempo | `subskills/tracing.md` |
| metric, counter, histogram, Prometheus, cardinality | `subskills/metrics.md` |
| log, structured, correlation, Loki, ELK, level | `subskills/logging.md` |
| SLO, SLI, error budget, burn rate | `subskills/slo.md` |
| alert, page, on-call, incident, runbook, escalation | `subskills/alerting.md` |
| OpenTelemetry, OTel, SDK, collector, exporter | `subskills/opentelemetry.md` |
| telemetry cost, retention, storage | `subskills/telemetry-cost.md` |
| dashboard, Grafana, visualization, query | `subskills/dashboards.md` |

## Verification

- Design addresses requirements; math validates feasibility; failure modes mitigated; cost + latency budgets allocated.
- Developer deploys via golden path < 1 day; DORA improving; every service has traces + RED metrics; SLOs defined; alerts fire on SLO breach; trace-to-log correlation working.

## Related Skills

`golang-expert` (Go impl) · dispatch @shield (security) · dispatch @lens (review)
