# Native AOT

.NET Native AOT: trimming, source generators, reflection-free patterns, AOT analyzers.

## Rules

1. Enable AOT with `<PublishAot>true</PublishAot>` — test from day one, not as afterthought
2. Use `System.Text.Json` source generation — `[JsonSerializable]` context required
3. No `System.Reflection.Emit` — no dynamic proxy generation, no Castle.Core
4. Use `[DynamicallyAccessedMembers]` attributes to preserve types from trimming
5. All DI registrations must be statically analyzable — no `services.AddTransient(typeof(IFoo<>), typeof(Foo<>))`
6. Use `LoggerMessage` source generator — not `ILogger.LogInformation($"...")`
7. Replace `Activator.CreateInstance` with factory patterns or source generators
8. Use `[JsonDerivedType]` for polymorphic serialization — not runtime type discovery
9. Enable AOT analyzers: `<IsAotCompatible>true</IsAotCompatible>` in library projects
10. Validate with `dotnet publish -r linux-x64 -c Release` — check for trim warnings
11. Use `RequestDelegateGenerator` (built-in) for Minimal API AOT support
12. Prefer `FrozenDictionary`/`FrozenSet` for static lookup tables (AOT-optimized)

## Patterns

### JSON Source Generation

```csharp
[JsonSerializable(typeof(ProductDto))]
[JsonSerializable(typeof(List<ProductDto>))]
[JsonSerializable(typeof(ProblemDetails))]
[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull)]
public partial class AppJsonContext : JsonSerializerContext;

// In Program.cs:
builder.Services.ConfigureHttpJsonOptions(opts =>
    opts.SerializerOptions.TypeInfoResolverChain.Add(AppJsonContext.Default));
```

### Source-Generated Logging

```csharp
public static partial class LogMessages
{
    [LoggerMessage(Level = LogLevel.Information, Message = "Product {ProductId} created by {UserId}")]
    public static partial void ProductCreated(ILogger logger, Guid productId, string userId);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Product {ProductId} not found")]
    public static partial void ProductNotFound(ILogger logger, Guid productId);
}
```

### AOT-Compatible Minimal API

```csharp
var builder = WebApplication.CreateSlimBuilder(args);
builder.Services.ConfigureHttpJsonOptions(opts =>
    opts.SerializerOptions.TypeInfoResolverChain.Add(AppJsonContext.Default));

var app = builder.Build();

app.MapGet("/products/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
{
    var product = await db.Products.FindAsync([id], ct);
    return product is not null ? Results.Ok(product) : Results.NotFound();
});

app.Run();
```

### Factory Pattern (replaces Activator.CreateInstance)

```csharp
// Instead of: Activator.CreateInstance(handlerType)
public static class HandlerFactory
{
    private static readonly FrozenDictionary<string, Func<IHandler>> Factories =
        new Dictionary<string, Func<IHandler>>
        {
            ["order.created"] = () => new OrderCreatedHandler(),
            ["order.shipped"] = () => new OrderShippedHandler(),
        }.ToFrozenDictionary();

    public static IHandler? Create(string eventType) =>
        Factories.TryGetValue(eventType, out var factory) ? factory() : null;
}
```

## AOT Compatibility Checklist

- [ ] `<PublishAot>true</PublishAot>` in `.csproj`
- [ ] JSON serialization via source-generated `JsonSerializerContext`
- [ ] No MediatR, AutoMapper, or reflection-heavy libraries
- [ ] EF Core with precompiled queries (EF Core 10)
- [ ] Logging via `[LoggerMessage]` attribute
- [ ] All `IOptions<T>` types annotated for trimming
- [ ] No `Assembly.GetTypes()` or type scanning
- [ ] Validated: `dotnet publish` produces zero trim warnings

## Anti-Patterns

- Adding `<PublishAot>` late in development — trim issues compound
- Using libraries without AOT annotations (check NuGet for `IsAotCompatible`)
- Suppressing trim warnings with `[UnconditionalSuppressMessage]` without understanding impact
- Dynamic generic type resolution at runtime
- Newtonsoft.Json (not AOT-compatible) — use System.Text.Json with source gen

## Verification

1. `dotnet publish -c Release -r <rid>` — zero trim/AOT warnings
2. Run published binary — verify all endpoints respond correctly
3. Check binary size: Minimal API AOT should be 10-30MB
4. Startup time: measure with `time ./app` — should be <100ms
5. Verify no reflection calls at runtime with `DOTNET_EnableDiagnostics=0`
