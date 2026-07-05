---
type: subskill
title: ".NET Aspire"
---

# .NET Aspire

.NET Aspire orchestration, service defaults, components, and observability.

## Rules

1. AppHost is orchestration only  -  no business logic, no shared models
2. Use service defaults project for cross-cutting: OpenTelemetry, health checks, resilience
3. Name resources with kebab-case matching deployment resource names
4. Use `WithReference()` for service-to-service discovery  -  never hardcode URLs
5. Health checks: liveness at `/health`, readiness at `/ready`  -  both required
6. Use Aspire components over raw client packages (get config + health + telemetry free)
7. Connection strings flow via environment  -  never commit secrets to AppHost
8. Use `WaitFor()` to express startup dependencies between resources
9. Dashboard is dev-only  -  don't rely on it for production observability
10. Use `WithReplicas()` for local load-balancing testing

## Patterns

### AppHost Configuration

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin()
    .WithDataVolume();

var db = postgres.AddDatabase("catalog-db");

var redis = builder.AddRedis("cache")
    .WithRedisInsight();

var rabbitMq = builder.AddRabbitMQ("messaging")
    .WithManagementPlugin();

var catalogApi = builder.AddProject<Projects.Catalog_Api>("catalog-api")
    .WithReference(db)
    .WithReference(redis)
    .WithReference(rabbitMq)
    .WaitFor(db)
    .WaitFor(redis);

var webFrontend = builder.AddProject<Projects.Web_Frontend>("web-frontend")
    .WithExternalHttpEndpoints()
    .WithReference(catalogApi);

builder.Build().Run();
```

### Service Defaults

```csharp
public static IHostApplicationBuilder AddServiceDefaults(this IHostApplicationBuilder builder)
{
    builder.ConfigureOpenTelemetry();
    builder.AddDefaultHealthChecks();
    builder.Services.AddServiceDiscovery();
    builder.Services.ConfigureHttpClientDefaults(http =>
    {
        http.AddStandardResilienceHandler();
        http.AddServiceDiscovery();
    });
    return builder;
}
```

### Component Usage (API project)

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<CatalogDbContext>("catalog-db");
builder.AddRedisDistributedCache("cache");

var app = builder.Build();
app.MapDefaultEndpoints(); // /health, /ready, /alive
```

## Anti-Patterns

- Putting business logic in AppHost project
- Using `AddConnectionString()` without corresponding infrastructure resource
- Skipping `WaitFor()`  -  race conditions on startup
- Ignoring structured logging  -  Aspire dashboard relies on it
- Not using service defaults  -  loses standardized telemetry/resilience

## Dashboard

- Traces: distributed traces across services (OpenTelemetry)
- Metrics: request rates, latencies, error rates
- Logs: structured logs with correlation
- Resources: health status of all orchestrated components

## Verification

1. `dotnet run --project AppHost`  -  all resources start green in dashboard
2. Health endpoints respond 200 on all services
3. Distributed trace visible for cross-service calls
4. Connection strings resolve correctly via service discovery
5. `WaitFor` dependencies respected (check startup logs)
