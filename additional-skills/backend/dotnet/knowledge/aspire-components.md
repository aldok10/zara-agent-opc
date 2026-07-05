---
type: fact
title: "Aspire Components Catalog"
---

# Aspire Components Catalog

## Database

### PostgreSQL
```csharp
// AppHost:
var postgres = builder.AddPostgres("pg").WithPgAdmin();
var db = postgres.AddDatabase("catalog");
builder.AddProject<Projects.Api>("api").WithReference(db);

// API project:
builder.AddNpgsqlDbContext<CatalogDbContext>("catalog");
// or for Dapper/raw:
builder.AddNpgsqlDataSource("catalog");
```

### SQL Server
```csharp
var sql = builder.AddSqlServer("sql").AddDatabase("orders");
// API:
builder.AddSqlServerDbContext<OrderDbContext>("orders");
```

## Caching

### Redis
```csharp
// AppHost:
var cache = builder.AddRedis("cache").WithRedisInsight();
builder.AddProject<Projects.Api>("api").WithReference(cache);

// API  -  distributed cache:
builder.AddRedisDistributedCache("cache");
// API  -  output cache:
builder.AddRedisOutputCache("cache");
```

## Messaging

### RabbitMQ
```csharp
// AppHost:
var mq = builder.AddRabbitMQ("messaging").WithManagementPlugin();

// API:
builder.AddRabbitMQClient("messaging");
```

### Azure Service Bus
```csharp
// AppHost:
var sb = builder.AddAzureServiceBus("servicebus");
sb.AddQueue("orders");
sb.AddTopic("events").AddSubscription("processor");

// API:
builder.AddAzureServiceBusClient("servicebus");
```

## Observability (built into service defaults)

```csharp
// Automatic with AddServiceDefaults():
// - OpenTelemetry traces, metrics, logs
// - Health checks for all referenced resources
// - Service discovery via DNS/config
```

## Storage

### Azure Blob Storage
```csharp
var storage = builder.AddAzureStorage("storage");
var blobs = storage.AddBlobs("documents");
// API:
builder.AddAzureBlobClient("documents");
```

## Component Benefits (vs raw packages)

Each Aspire component provides:
1. **Configuration**: strongly-typed settings via `IOptions`
2. **Health checks**: automatic liveness/readiness probes
3. **Telemetry**: OpenTelemetry integration (traces + metrics)
4. **Resilience**: retry policies via `Microsoft.Extensions.Resilience`
5. **Connection management**: pooling, disposal, lifecycle

## Resource Customization

```csharp
// Custom container image:
var postgres = builder.AddPostgres("pg")
    .WithImage("postgis/postgis")
    .WithImageTag("16-3.4");

// Data volumes (persist across runs):
var redis = builder.AddRedis("cache").WithDataVolume();

// Custom environment:
var api = builder.AddProject<Projects.Api>("api")
    .WithEnvironment("FEATURE_FLAG", "true");
```
