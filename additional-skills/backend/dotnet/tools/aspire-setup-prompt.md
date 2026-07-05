---
type: tool
title: ".NET Aspire Setup"
---

# .NET Aspire Setup

## Purpose

Guide .NET Aspire project setup including app host configuration, service defaults, component integration, and local development orchestration. Covers distributed app modeling and resource provisioning.

## When to Use

- Starting a new distributed .NET application with Aspire
- Adding Aspire orchestration to existing .NET services
- Configuring Aspire components (Redis, PostgreSQL, RabbitMQ)
- Setting up service discovery and health checks
- Troubleshooting Aspire dashboard or resource startup

## Prompt Template

```
CONTEXT:
- .NET version: [8 | 9]
- Aspire version: [8.x | 9.x]
- Project type: [new greenfield | adding to existing solution]
- Services: [list of services with their types: API, worker, Blazor, etc.]
- Dependencies: [Redis | PostgreSQL | SQL Server | RabbitMQ | Kafka | Azure resources]
- Hosting: [local dev | Azure Container Apps | Kubernetes]

SETUP CHECKLIST:
1. AppHost project
   - Resource declarations (containers, projects, executables)
   - Connection string wiring
   - Environment variable passing
   - Health check configuration
   - Replica count for load testing

2. ServiceDefaults project
   - OpenTelemetry configuration (traces, metrics, logs)
   - Health check endpoints (/health, /alive)
   - Service discovery registration
   - Resilience policies (retry, circuit breaker via Polly)
   - HTTP client defaults

3. Component integration
   - NuGet component packages (Aspire.Hosting.*, Aspire.*)
   - Client configuration in each service
   - Connection string resolution via DI
   - Component-specific health checks

4. Development workflow
   - Dashboard access and usage
   - Structured logging correlation
   - Resource lifecycle management
   - Debugging multi-service scenarios

CONFIGURATION:
- Custom resource definitions
- Parameterized deployments
- Secrets management integration
- Container image overrides for local dev
```

## Output Format

```
## Aspire Setup: [project name]

### Project Structure
[Solution layout with AppHost, ServiceDefaults, and service projects]

### AppHost Configuration
[Key resource declarations and wiring code]

### ServiceDefaults Setup
[Shared configuration applied to all services]

### Component Integration
| Component | Package | Configuration | Health Check |
|-----------|---------|---------------|--------------|
| ... | ... | ... | ... |

### Local Development
- Dashboard URL: [default port]
- Starting services: [dotnet run command]
- Debugging: [attach strategy]

### Production Considerations
- [Deployment target specifics]
- [Resource provisioning differences]
```
