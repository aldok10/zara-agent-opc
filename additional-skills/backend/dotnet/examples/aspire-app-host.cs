// .NET Aspire AppHost Configuration
// Orchestrates a multi-service application with infrastructure dependencies

using Aspire.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

// --- Infrastructure Resources ---

var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin()
    .WithDataVolume("postgres-data")
    .WithLifetime(ContainerLifetime.Persistent);

var catalogDb = postgres.AddDatabase("catalog-db");
var identityDb = postgres.AddDatabase("identity-db");

var redis = builder.AddRedis("cache")
    .WithRedisInsight()
    .WithDataVolume("redis-data")
    .WithLifetime(ContainerLifetime.Persistent);

var rabbitMq = builder.AddRabbitMQ("messaging")
    .WithManagementPlugin()
    .WithDataVolume("rabbitmq-data")
    .WithLifetime(ContainerLifetime.Persistent);

// --- Application Services ---

var catalogApi = builder.AddProject<Projects.Catalog_Api>("catalog-api")
    .WithReference(catalogDb)
    .WithReference(redis)
    .WithReference(rabbitMq)
    .WaitFor(catalogDb)
    .WaitFor(redis)
    .WithReplicas(2)
    .WithHttpHealthCheck("/health");

var identityApi = builder.AddProject<Projects.Identity_Api>("identity-api")
    .WithReference(identityDb)
    .WithReference(redis)
    .WaitFor(identityDb)
    .WithHttpHealthCheck("/health");

var orderProcessor = builder.AddProject<Projects.Order_Processor>("order-processor")
    .WithReference(catalogDb)
    .WithReference(rabbitMq)
    .WaitFor(catalogDb)
    .WaitFor(rabbitMq);

// --- Frontend (BFF pattern) ---

var webApp = builder.AddProject<Projects.Web_App>("web-app")
    .WithExternalHttpEndpoints()
    .WithReference(catalogApi)
    .WithReference(identityApi)
    .WaitFor(catalogApi)
    .WaitFor(identityApi);

// --- Build and Run ---

builder.Build().Run();

// --- Service Defaults Extension (shared across all projects) ---
// File: ServiceDefaults/Extensions.cs

public static class Extensions
{
    public static IHostApplicationBuilder AddServiceDefaults(
        this IHostApplicationBuilder builder)
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

    public static IHostApplicationBuilder ConfigureOpenTelemetry(
        this IHostApplicationBuilder builder)
    {
        builder.Logging.AddOpenTelemetry(logging =>
        {
            logging.IncludeFormattedMessage = true;
            logging.IncludeScopes = true;
        });

        builder.Services.AddOpenTelemetry()
            .WithMetrics(metrics =>
            {
                metrics.AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddRuntimeInstrumentation();
            })
            .WithTracing(tracing =>
            {
                tracing.AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddEntityFrameworkCoreInstrumentation();
            });

        builder.AddOpenTelemetryExporters();
        return builder;
    }

    private static IHostApplicationBuilder AddOpenTelemetryExporters(
        this IHostApplicationBuilder builder)
    {
        var useOtlp = !string.IsNullOrWhiteSpace(
            builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]);

        if (useOtlp)
        {
            builder.Services.AddOpenTelemetry()
                .UseOtlpExporter();
        }

        return builder;
    }

    public static IHostApplicationBuilder AddDefaultHealthChecks(
        this IHostApplicationBuilder builder)
    {
        builder.Services.AddHealthChecks()
            .AddCheck("self", () => HealthCheckResult.Healthy(), ["live"]);

        return builder;
    }

    public static WebApplication MapDefaultEndpoints(this WebApplication app)
    {
        app.MapHealthChecks("/health");

        app.MapHealthChecks("/alive", new HealthCheckOptions
        {
            Predicate = r => r.Tags.Contains("live")
        });

        return app;
    }
}
