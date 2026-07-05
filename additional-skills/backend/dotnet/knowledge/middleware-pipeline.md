---
type: fact
title: "ASP.NET Core Middleware Pipeline"
---

# ASP.NET Core Middleware Pipeline

## Pipeline Order (critical  -  order matters)

```csharp
var app = builder.Build();

// 1. Exception handling (outermost  -  catches everything below)
app.UseExceptionHandler("/error");

// 2. HSTS (before any response)
app.UseHsts();

// 3. HTTPS redirection
app.UseHttpsRedirection();

// 4. Static files (short-circuit for static assets)
app.UseStaticFiles();

// 5. Rate limiting
app.UseRateLimiter();

// 6. CORS (before auth, after routing sets endpoint)
app.UseCors();

// 7. Authentication (who are you?)
app.UseAuthentication();

// 8. Authorization (are you allowed?)
app.UseAuthorization();

// 9. Response caching/compression
app.UseResponseCaching();
app.UseResponseCompression();

// 10. Endpoint execution
app.MapControllers();
app.MapGroup("/api").MapProductEndpoints();
```

## Middleware vs Endpoint Filters

| Aspect | Middleware | Endpoint Filter |
|--------|-----------|-----------------|
| Scope | All requests | Specific endpoints/groups |
| Access to endpoint metadata | No (before routing) | Yes |
| DI | Manual via `RequestServices` | Constructor injection |
| Use for | Cross-cutting (logging, CORS, auth) | Validation, transform, per-endpoint logic |

## Custom Middleware

```csharp
public class CorrelationIdMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers["X-Correlation-Id"].FirstOrDefault()
            ?? Guid.NewGuid().ToString();

        context.Response.Headers["X-Correlation-Id"] = correlationId;

        using (logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId
        }))
        {
            await next(context);
        }
    }
}
```

## Endpoint Routing

```csharp
// Routing middleware sets the endpoint:
app.UseRouting();

// Middleware between UseRouting and endpoint execution can inspect:
app.Use(async (context, next) =>
{
    var endpoint = context.GetEndpoint();
    var requiresAuth = endpoint?.Metadata.GetMetadata<AuthorizeAttribute>();
    await next(context);
});
```

## Short-Circuit Patterns

```csharp
// Health check before auth:
app.MapHealthChecks("/health").AllowAnonymous();

// Static files bypass remaining pipeline:
app.UseStaticFiles(); // returns 200 and stops pipeline

// Terminal middleware:
app.Map("/warmup", () => Results.Ok("ready")); // no next() call
```

## Common Mistakes

- CORS after Authorization  -  CORS preflight will get 401
- Exception handler not first  -  exceptions in earlier middleware uncaught
- UseRouting/UseEndpoints split without understanding (legacy pattern)
- Static files after auth  -  forces auth for CSS/JS
- Rate limiter after auth  -  DDoS hits auth layer first
