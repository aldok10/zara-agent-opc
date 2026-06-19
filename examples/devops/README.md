# DevOps Examples

## CI/CD Pipeline Design

### Scenario
Designing a CI/CD pipeline for a monorepo with multiple services.

### Ask Zara
```
Design a CI/CD pipeline for our monorepo with:
- 5 microservices in Go
- Shared libraries
- Database migrations
- Infrastructure as Code (Terraform)
- Multi-environment deployment (dev, staging, prod)
```

### Expected Workflow
1. Zara engages `architect` and `delivery-lead`
2. Analysis:
   - Dependency graph of services
   - Build optimization (caching, parallel builds)
   - Test strategy at each stage
   - Deployment strategy (blue/green, canary)
3. Recommendations:
   - CI: Lint → Unit Tests → Build → Integration Tests
   - CD: Staging Deploy → E2E Tests → Prod Deploy
   - Infrastructure: Terraform plan/apply pipeline

---

## Docker Optimization

### Scenario
Docker images are too large (2GB) and builds are slow.

### Ask Zara
```
Our Docker images are 2GB and builds take 15 minutes.
Help us optimize the Dockerfiles and build process.
```

### Expected Workflow
1. Zara engages `practices-lead`
2. Analysis:
   - Multi-stage builds
   - Layer caching strategy
   - Base image selection (alpine vs slim)
   - Dependency installation ordering
3. Recommendations:
   - Use distroless or slim base images
   - Multi-stage builds (build → runtime)
   - Optimize .dockerignore
   - Layer caching for dependencies

---

## Kubernetes Configuration

### Scenario
Deploying a new service to Kubernetes.

### Ask Zara
```
Review our Kubernetes deployment configuration for a
Node.js API service. We need proper resource limits,
health checks, and zero-downtime deployments.
```

### Expected Workflow
1. Zara engages `architect` and `security-reviewer`
2. Analysis:
   - Resource requests/limits
   - Readiness and liveness probes
   - Pod disruption budgets
   - Network policies
   - Secrets management
3. Recommendations:
   - Proper probe configuration
   - Horizontal pod autoscaling
   - Security contexts
   - ConfigMap for configuration
