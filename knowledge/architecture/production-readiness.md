# Production Readiness Checklist

Based on Google SRE PRR and industry best practices. Use as a template before any production launch.

## Reliability

- [ ] SLOs defined with measurable SLIs
- [ ] Error budget policy documented (what happens when budget exhausted)
- [ ] Graceful degradation: system functions (reduced) when dependencies fail
- [ ] Circuit breakers on all external calls
- [ ] Retries with exponential backoff and jitter
- [ ] Timeouts on ALL network I/O (no unbounded waits)
- [ ] Idempotency for all write operations that may be retried
- [ ] Rate limiting to prevent cascade under load
- [ ] Load tested at 2x expected peak

## Observability

- [ ] Structured logging (JSON, correlation IDs)
- [ ] Distributed tracing (OpenTelemetry or equivalent)
- [ ] RED metrics: Rate, Error rate, Duration (per endpoint)
- [ ] USE metrics: Utilization, Saturation, Errors (per resource)
- [ ] Dashboards for key user journeys
- [ ] Alerts with runbooks linked (not just "CPU high")
- [ ] Log retention policy defined
- [ ] Can answer "why is it broken?" without deploying new code

## Deployment

- [ ] CI/CD pipeline with automated tests
- [ ] Canary or blue-green deployment strategy
- [ ] Rollback plan tested (< 5 min to previous version)
- [ ] Feature flags for risky changes
- [ ] Database migrations are reversible (no destructive DDL without plan)
- [ ] Zero-downtime deploys (no maintenance windows)
- [ ] Deploy frequency: at least weekly (ideally daily)

## Security

- [ ] Authentication on all endpoints (no accidental public routes)
- [ ] Authorization: least privilege, RBAC or ABAC
- [ ] Secrets in vault (not env vars, not config files, not code)
- [ ] Input validation on all external input
- [ ] Dependency scanning (Snyk, Dependabot, or equivalent)
- [ ] Network segmentation: services only talk to what they need
- [ ] TLS everywhere (internal and external)
- [ ] Security headers configured (CSP, HSTS, etc.)

## Operability

- [ ] Runbooks for common failure scenarios
- [ ] On-call rotation defined with escalation path
- [ ] Incident response process documented
- [ ] Capacity planning: know when you need to scale (before it's urgent)
- [ ] Load testing done and results documented
- [ ] Graceful shutdown handles in-flight requests
- [ ] Health check endpoints (liveness + readiness)

## Data

- [ ] Backup strategy: automated, tested restoration
- [ ] Retention policy: how long, where, compliance requirements
- [ ] Disaster recovery tested (not just planned)
- [ ] Data classification: what's PII, what's sensitive, what's public
- [ ] GDPR/compliance: deletion capability, export capability
- [ ] Data migration plan for schema changes

## Dependencies

- [ ] SLOs of upstream services documented
- [ ] Fallback behavior defined for each dependency failure
- [ ] Circuit breakers configured with sensible thresholds
- [ ] Dependency health visible in dashboards
- [ ] No single point of failure in critical path
- [ ] Async where possible to reduce temporal coupling

## Launch Decision

All critical items checked? If not, document accepted risks with owner and timeline.
A service missing observability is not production-ready. A service missing rollback is not production-ready. Ship when you can operate it, not just when it works on your laptop.
