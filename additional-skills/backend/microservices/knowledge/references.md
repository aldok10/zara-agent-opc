# References

## Microservice Patterns (8 refs)

- **Microservices.io** -- https://microservices.io/patterns/ -- Chris Richardson's pattern catalog
- **Building Microservices (Sam Newman)** -- https://samnewman.io/books/building_microservices_2nd_edition/ -- Definitive microservices book
- **Microsoft Microservices Architecture** -- https://learn.microsoft.com/en-us/azure/architecture/microservices/ -- Complete architecture guide
- **12-Factor App** -- https://12factor.net/ -- SaaS application methodology
- **Domain-Driven Design** -- https://www.domainlanguage.com/ddd/ -- Strategic design for services
- **Decomposition Patterns** -- https://microservices.io/patterns/decomposition/decompose-by-business-capability.html -- Service boundary strategies
- **Strangler Fig** -- https://microservices.io/patterns/refactoring/strangler-application.html -- Migration from monolith
- **Backends for Frontends** -- https://microservices.io/patterns/apigateway.html -- API gateway patterns

## Service Mesh & Communication (6 refs)

- **Istio Documentation** -- https://istio.io/latest/docs/ -- Service mesh platform
- **Linkerd** -- https://linkerd.io/2/overview/ -- Lightweight service mesh
- **Envoy Proxy** -- https://www.envoyproxy.io/docs/ -- L7 proxy and communication bus
- **Service-to-Service Auth** -- https://istio.io/latest/docs/concepts/security/ -- mTLS and authorization policies
- **gRPC for Microservices** -- https://grpc.io/docs/what-is-grpc/introduction/ -- Inter-service communication
- **Circuit Breaker Pattern** -- https://microservices.io/patterns/reliability/circuit-breaker.html -- Failure isolation

## Resilience (6 refs)

- **Resilience4j** -- https://resilience4j.readme.io/docs/getting-started -- Java resilience library
- **Polly (.NET)** -- https://www.thepollyproject.org/ -- .NET resilience and transient-fault handling
- **Retry Pattern** -- https://learn.microsoft.com/en-us/azure/architecture/patterns/retry -- Retry with backoff
- **Bulkhead Pattern** -- https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead -- Resource isolation
- **Timeout Pattern** -- https://microservices.io/patterns/reliability/circuit-breaker.html -- Preventing cascading failures
- **Chaos Engineering** -- https://principlesofchaos.org/ -- Testing system resilience

## Data Consistency (7 refs)

- **Saga Pattern** -- https://microservices.io/patterns/data/saga.html -- Distributed transaction alternative
- **Transactional Outbox** -- https://microservices.io/patterns/data/transactional-outbox.html -- Reliable event publishing
- **CQRS Pattern** -- https://microservices.io/patterns/data/cqrs.html -- Command Query Responsibility Segregation
- **Event Sourcing** -- https://microservices.io/patterns/data/event-sourcing.html -- State as event sequence
- **Database per Service** -- https://microservices.io/patterns/data/database-per-service.html -- Data isolation strategy
- **Two-Phase Commit** -- https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction -- When and why to avoid
- **Change Data Capture** -- https://debezium.io/documentation/ -- Database change streaming

## Observability (6 refs)

- **OpenTelemetry** -- https://opentelemetry.io/docs/ -- Unified observability framework
- **Distributed Tracing** -- https://opentelemetry.io/docs/concepts/signals/traces/ -- Request flow tracking
- **Jaeger** -- https://www.jaegertracing.io/docs/ -- Distributed tracing backend
- **Prometheus** -- https://prometheus.io/docs/ -- Metrics collection and alerting
- **Grafana** -- https://grafana.com/docs/ -- Visualization and dashboards
- **Structured Logging** -- https://www.honeycomb.io/blog/structured-logging-and-your-team -- Correlation across services

## API Gateway (4 refs)

- **Kong Gateway** -- https://docs.konghq.com/ -- API gateway and management
- **AWS API Gateway** -- https://docs.aws.amazon.com/apigateway/ -- Managed API gateway
- **Traefik** -- https://doc.traefik.io/traefik/ -- Cloud-native application proxy
- **APISIX** -- https://apisix.apache.org/docs/ -- Dynamic API gateway

## Deployment & Operations (5 refs)

- **Kubernetes** -- https://kubernetes.io/docs/ -- Container orchestration platform
- **Helm** -- https://helm.sh/docs/ -- Kubernetes package manager
- **ArgoCD** -- https://argo-cd.readthedocs.io/ -- GitOps continuous delivery
- **Canary Deployments** -- https://martinfowler.com/bliki/CanaryRelease.html -- Progressive rollout strategy
- **Feature Flags** -- https://openfeature.dev/docs/reference/intro -- Standardized feature flag API

## Testing Microservices (4 refs)

- **Contract Testing (Pact)** -- https://docs.pact.io/ -- Consumer-driven contract testing
- **Testcontainers** -- https://testcontainers.com/ -- Integration testing with containers
- **Service Virtualization** -- https://www.mock-server.com/ -- Mock external dependencies
- **Testing Strategies** -- https://martinfowler.com/articles/microservice-testing/ -- Test pyramid for microservices
