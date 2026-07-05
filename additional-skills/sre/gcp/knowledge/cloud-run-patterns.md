# Cloud Run Patterns

## Scaling Behavior

- Scale to zero: no instances when no traffic (pay nothing at idle)
- Minimum instances: keep warm to avoid cold starts (costs per instance-hour)
- Maximum instances: cap scaling for cost control and downstream protection
- Concurrency: requests per instance (default 80, tune based on workload)
- CPU allocation: "request-processing only" vs "always allocated"
  - Request-processing: CPU throttled between requests (cheaper, no background work)
  - Always allocated: CPU available continuously (background tasks, WebSockets)

## Cold Start Mitigation

- Minimum instances (1-2 for production services)
- Startup CPU boost: 2x CPU during startup for faster init
- Lazy initialization: defer heavy setup until first request
- Small container images: distroless, multi-stage builds
- Startup probes: tell Cloud Run when instance is ready
- Language choice matters: Go/Rust < Node.js < Python < Java (cold start time)
- For Java: GraalVM native image or CRaC (Coordinated Restore at Checkpoint)

## Traffic Splitting

- Canary deployments: route percentage to new revision
- Tag-based routing: named URLs for specific revisions (preview URLs)
- Gradual rollout: 1% -> 5% -> 25% -> 50% -> 100%
- Instant rollback: shift 100% back to previous revision
- No downtime: new revision serves traffic only after passing health checks

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: api
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/startup-cpu-boost: "true"
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "100"
    spec:
      containerConcurrency: 80
      timeoutSeconds: 300
      containers:
        - image: gcr.io/project/api:v2
          ports:
            - containerPort: 8080
          resources:
            limits:
              cpu: "2"
              memory: "1Gi"
          startupProbe:
            httpGet:
              path: /healthz
            initialDelaySeconds: 0
            periodSeconds: 1
            failureThreshold: 30
          livenessProbe:
            httpGet:
              path: /healthz
            periodSeconds: 10
  traffic:
    - revisionName: api-v1
      percent: 90
    - latestRevision: true
      percent: 10
      tag: canary
```

## Networking

- Ingress settings:
  - `all`: public internet (default)
  - `internal`: VPC and Cloud Load Balancing only
  - `internal-and-cloud-load-balancing`: internal + GCLB
- VPC connector: access VPC resources (Redis, Cloud SQL, internal services)
- Direct VPC egress: no connector needed, simpler, better performance (GA 2024)
- Private Google Access: reach Google APIs without public internet
- Custom domains: Cloud Load Balancing or Firebase Hosting in front

## Security

- Identity-based access: require authentication (IAM invoker role)
- Service-to-service: use ID tokens (automatic with Cloud Run invoker role)
- Public APIs: remove `allUsers` invoker, use API Gateway or Cloud Endpoints
- Binary Authorization: enforce signed container images
- VPC Service Controls: restrict data exfiltration
- Secret Manager integration: mount secrets as env vars or volumes
- CMEK: customer-managed encryption keys for container images and storage

## Service-to-Service Communication

- Cloud Run service URL + IAM authentication (built-in)
- Automatic ID token generation when calling between Cloud Run services
- Service mesh: Cloud Service Mesh for advanced traffic management
- Pub/Sub push subscriptions for async communication
- Eventarc for event-driven triggers (GCS, BigQuery, Pub/Sub, custom)

## Jobs (Batch Workloads)

- Cloud Run Jobs for tasks that run to completion
- Parallelism: multiple tasks executing concurrently
- Retries: configurable per task
- Scheduling: Cloud Scheduler triggers on cron
- Use cases: data processing, migrations, report generation, ML training

## Observability

- Built-in metrics: request count, latency, instance count, CPU/memory utilization
- Structured logging: JSON to stdout/stderr, auto-parsed by Cloud Logging
- Cloud Trace: automatic for HTTP, add client libraries for custom spans
- Error Reporting: auto-capture of uncaught exceptions
- Custom metrics via OpenTelemetry or Cloud Monitoring client library

## Cost Optimization

- CPU allocation "request-processing" for simple request/response services
- Scale to zero for infrequently called services
- Right-size: start small (1 vCPU, 512Mi), scale up based on metrics
- Committed use discounts for minimum instances
- Use Cloud Run Jobs instead of always-running workers for batch
- Concurrency tuning: higher concurrency = fewer instances = lower cost

## Deployment Patterns

- GitOps: Cloud Deploy for managed rollout pipelines
- Blue-green: deploy new revision, validate, shift traffic
- Canary: gradual traffic shift with automatic rollback on errors
- Multi-region: deploy to multiple regions, use Global Load Balancer
- Preview environments: tagged revisions with unique URLs per PR

## Anti-Patterns

- Long-running WebSocket connections without "always allocated" CPU
- Large container images (>1GB) causing slow cold starts
- Not setting concurrency (default may be too high for CPU-intensive work)
- Using Cloud Run for stateful workloads without external state store
- Ignoring instance lifecycle: requests can arrive before startup probe passes
- Setting minimum instances too high (paying for unused capacity)
