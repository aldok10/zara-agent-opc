# Minimal APIs

ASP.NET Core Minimal API patterns for .NET 10+.

## Rules

1. Group endpoints by feature using `MapGroup()` — one group per slice/domain
2. Return `TypedResults` (e.g., `Results<Ok<T>, NotFound, ValidationProblem>`) for compile-time OpenAPI
3. Use endpoint filters for cross-cutting concerns (validation, logging, auth enrichment)
4. Apply `.WithName()` and `.WithTags()` for OpenAPI operation metadata
5. Use `[AsParameters]` for complex parameter binding into a record/class
6. Prefer `IResult` return types over throwing exceptions for control flow
7. Apply rate limiting per endpoint group with `.RequireRateLimiting("policy")`
8. Use `.WithOpenApi()` to customize operation metadata inline
9. Always add `.Produces<T>(statusCode)` for non-200 responses the type system can't infer
10. Bind request body with `[FromBody]` only when ambiguous — Minimal APIs infer complex types from body

## Patterns

### Route Group with Filters

```csharp
var group = app.MapGroup("/api/products")
    .WithTags("Products")
    .AddEndpointFilter<ValidationFilter>()
    .RequireAuthorization("read:products");

group.MapGet("/", GetProducts).WithName("GetProducts");
group.MapGet("/{id:guid}", GetProductById).WithName("GetProductById");
group.MapPost("/", CreateProduct).WithName("CreateProduct")
    .RequireAuthorization("write:products");
```

### Typed Results

```csharp
static async Task<Results<Ok<ProductDto>, NotFound, ValidationProblem>> GetProductById(
    Guid id,
    AppDbContext db,
    CancellationToken ct)
{
    var product = await db.Products
        .AsNoTracking()
        .Where(p => p.Id == id)
        .Select(p => new ProductDto(p.Id, p.Name, p.Price))
        .FirstOrDefaultAsync(ct);

    return product is not null
        ? TypedResults.Ok(product)
        : TypedResults.NotFound();
}
```

### Endpoint Filter

```csharp
public class ValidationFilter(IValidator<CreateProductRequest> validator) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        var request = context.GetArgument<CreateProductRequest>(0);
        var result = await validator.ValidateAsync(request);

        if (!result.IsValid)
            return TypedResults.ValidationProblem(result.ToDictionary());

        return await next(context);
    }
}
```

### Parameter Binding

```csharp
public record GetProductsRequest(
    [FromQuery] int Page = 1,
    [FromQuery] int PageSize = 20,
    [FromQuery] string? Search = null);

group.MapGet("/", ([AsParameters] GetProductsRequest request, AppDbContext db) => ...);
```

## Anti-Patterns

- Defining all endpoints in `Program.cs` — extract to extension methods per feature
- Using `app.Map*` without groups — loses shared metadata and filters
- Returning `IActionResult` — use `IResult`/`TypedResults` in Minimal APIs
- String-based route parameters without constraints (`{id}` vs `{id:guid}`)
- Missing `CancellationToken` on async handlers

## Verification

1. Run `dotnet build` — no warnings
2. Generate OpenAPI: verify all endpoints appear with correct schemas
3. Test with `WebApplicationFactory` — HTTP integration tests per endpoint
4. Verify auth policies applied: test 401/403 responses
5. Check rate limiting: verify 429 responses under load
