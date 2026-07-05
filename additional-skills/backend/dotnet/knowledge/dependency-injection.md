# .NET Dependency Injection

## Lifetimes

| Lifetime | Scope | Use For |
|----------|-------|---------|
| Transient | New instance per request | Lightweight, stateless services |
| Scoped | One per HTTP request/scope | DbContext, unit of work |
| Singleton | One for app lifetime | Caches, configuration, HttpClientFactory |

## Keyed Services (.NET 8+)

```csharp
builder.Services.AddKeyedSingleton<INotifier, EmailNotifier>("email");
builder.Services.AddKeyedSingleton<INotifier, SmsNotifier>("sms");

// Resolve:
app.MapPost("/notify", ([FromKeyedServices("email")] INotifier notifier) =>
    notifier.Send(message));
```

## IServiceScopeFactory (background services)

```csharp
public class OrderProcessor(IServiceScopeFactory scopeFactory) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            // Process orders...
            await Task.Delay(TimeSpan.FromSeconds(30), ct);
        }
    }
}
```
Never inject scoped services into singletons directly  -  use `IServiceScopeFactory`.

## Disposal Patterns

- Container disposes `IDisposable`/`IAsyncDisposable` services it creates
- Factory-registered instances: container does NOT dispose
- Singleton disposed at app shutdown
- Scoped/transient disposed at scope end

```csharp
// Container manages disposal:
services.AddScoped<MyDbContext>();

// You manage disposal (container won't):
services.AddSingleton(new ExternalClient());
```

## Registration Patterns

```csharp
// Open generics:
services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));

// Decorator pattern (manual):
services.AddScoped<IProductService>(sp =>
{
    var inner = new ProductService(sp.GetRequiredService<AppDbContext>());
    var logger = sp.GetRequiredService<ILogger<CachingProductService>>();
    return new CachingProductService(inner, logger);
});

// TryAdd (don't override existing):
services.TryAddScoped<IProductService, ProductService>();
```

## Common Mistakes

- Captive dependency: scoped service injected into singleton (memory leak + stale data)
- Service locator: injecting `IServiceProvider` directly (hides dependencies)
- Registering DbContext as singleton (concurrency issues, stale data)
- Not using `TryAdd` in library code (overwrites app registrations)
- Disposing services manually that container owns (double-dispose)
