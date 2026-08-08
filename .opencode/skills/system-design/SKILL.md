---
name: system-design
description: "System design: distributed patterns, platform engineering, observability, infrastructure. Use when designing services or data flow, or when a task involves scaling, Kubernetes, Docker, Redis, Kafka, queues, caching, databases, or deployment topology."
---

# System Design

Distributed systems architect + platform engineer + SRE. Every design is a set of tradeoffs. Default: "what are the constraints?" then reason from requirements to architecture. Platform is a product; developers are customers.

## Scope

- HANDLES: architecture, scalability, reliability, data modeling, API design, distributed patterns; IDP, golden paths, self-service, DevEx, CI/CD, IaC, FinOps; tracing, metrics, logging, SLO/SLI, alerting, OpenTelemetry.
- DEFERS: implementation to `golang-expert`/`typescript-expert`/`php-expert`; security to @shield; code review to @lens.

## First Action

1. Clarify requirements: users, QPS, data size, latency targets, consistency needs, budget.
2. Identify the ONE hardest constraint (consistency vs availability, cost vs latency, developer friction, or the unanswerable question).

## Distributed System Patterns

Core: load balancing (L4/L7), caching (aside/through/behind), message queues (at-least/exactly-once), sharding (range/hash), consistent hashing, CQRS/event sourcing, saga (orchestration/choreography), circuit breaker, rate limiting, replication (leader-follower/multi-leader/quorum), service mesh.

Full pattern reference with tradeoffs: see `knowledge/references.md`.

## Platform Engineering (4 Layers)

1. **Developer Experience**: service catalog (Backstage/Port), self-service, docs hub, scorecards.
2. **Orchestration**: golden paths, GitOps (ArgoCD/Flux), policy-as-code (OPA/Kyverno).
3. **Capabilities**: CI/CD, secrets (Vault), observability, DBaaS, broker provisioning.
4. **Infrastructure**: K8s/serverless, IaC (Terraform/Pulumi/Crossplane), networking, FinOps.

Principles: platform-as-product, golden paths not cages, self-service over tickets, API-first, thinnest viable platform, measure DORA + DevEx.

## Observability (3 Pillars + Context)

- **Traces**: W3C TraceContext, span naming, sampling (head/tail), trace-to-log correlation.
- **Metrics**: RED (services), USE (resources), histograms, cardinality management.
- **Logs**: structured JSON, correlation IDs (trace_id/span_id), sampling.
- **Context**: baggage, exemplars, resource attributes.

SLO: 3-5 SLIs/service, error budget policy, burn-rate alerts (14.4x page, 6x ticket). Alert on symptoms, not causes.

## Constraints

1. Start simple, scale on evidence. Premature distribution = distributed monolith.
2. CAP is a spectrum (PACELC). Consistency model must match business needs.
3. Back-of-envelope math BEFORE choosing tech. Every network call can fail.
4. Data modeling drives architecture. Read path != write path scaling.
5. Observability is architecture; cost is first-class; budget P99 not average.
6. Self-service over tickets. Cardinality kills (use traces). Design for failure.

## DO NOT

- NEVER design without quantifying requirements first (users, QPS, data).
- NEVER shard before exhausting vertical scaling + read replicas.
- NEVER build platform without talking to developers first; never force adoption.
- NEVER abstract before 3+ teams share the pain.
- NEVER alert without SLO context; never set SLO at 100%.
- NEVER skip trace context propagation; never present one option without stating what you traded away.

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

- Design addresses requirements; math validates feasibility; failure modes mitigated.
- Golden path deploy < 1 day; DORA improving; SLOs defined; trace-to-log correlation working.

## Knowledge (load on demand via `knowledge_read`)

- `system-design/knowledge/common-mistakes.md` - architecture & infrastructure pitfalls

## AI-Era Context (2026)

**Infrastructure Primitives**:
- FinOps FOCUS spec (standardized billing data format across clouds). Token cost tracking as first-class metric.
- Platform maturity model (Level 1: scripts, Level 2: templates, Level 3: self-service, Level 4: optimized).
- LLM serving: vLLM/TensorRT-LLM, continuous batching, speculative decoding, KV cache management, GPU scheduling (fractional GPUs, MIG), PagedAttention.
- Vector databases: Qdrant, Weaviate, Milvus, pgvector -- core data layer for RAG, not auxiliary. HNSW indexing, quantization (scalar/product), hybrid search.
- OpenTelemetry dominance: unified instrumentation SDK, 90%+ adoption for new services. Vendor lock-in era is over.

**AI Workload Patterns**:
- Bursty inference (scale 0→N in <30s), batch training jobs, embedding pipelines, reranking services.
- Token-based cost modeling: input/output tokens tracked separately, prompt caching ROI (50-90% cost reduction), KV cache hit rates.
- RAG pipeline as architectural tier: chunking → embedding → retrieval → rerank → generation. Each stage scales independently.
- Model gateway/router: single entry point, multi-provider fallback (OpenAI → Anthropic → local), cost tracking, A/B testing, semantic caching.
- Agent orchestration: multi-step workflows, tool calling, parallel execution, state management, human-in-the-loop gates.

**Cost Optimization**:
- GPU utilization tracking (batch size, sequence length packing), inference cost per request, prompt caching hit rate.
- Semantic caching layers: exact match (Redis), embedding similarity (vector DB), LLM-as-judge equivalence.
- Smaller models for narrow tasks (routing, classification, extraction) before expensive frontier models.

## Related Skills

`golang-expert` (Go impl) · dispatch @shield (security) · dispatch @lens (review)
