// Minimal API CRUD with validation, error handling, typed results
// .NET 10 / C# 14

using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<ProductDbContext>(opts =>
    opts.UseNpgsql(builder.Configuration.GetConnectionString("Products")));
builder.Services.AddOpenApi();

var app = builder.Build();

app.MapOpenApi();
app.MapGroup("/api/products").MapProductEndpoints();
app.Run();

// --- Endpoint Group ---

public static class ProductEndpoints
{
    public static RouteGroupBuilder MapProductEndpoints(this RouteGroupBuilder group)
    {
        group.WithTags("Products");
        group.AddEndpointFilter<ValidationFilter<CreateProductRequest>>();

        group.MapGet("/", GetAll).WithName("GetProducts");
        group.MapGet("/{id:guid}", GetById).WithName("GetProductById");
        group.MapPost("/", Create).WithName("CreateProduct");
        group.MapPut("/{id:guid}", Update).WithName("UpdateProduct");
        group.MapDelete("/{id:guid}", Delete).WithName("DeleteProduct");

        return group;
    }

    static async Task<Ok<List<ProductDto>>> GetAll(
        ProductDbContext db,
        [AsParameters] PaginationRequest pagination,
        CancellationToken ct)
    {
        var products = await db.Products
            .AsNoTracking()
            .OrderBy(p => p.Name)
            .Skip((pagination.Page - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price, p.CreatedAt))
            .ToListAsync(ct);

        return TypedResults.Ok(products);
    }

    static async Task<Results<Ok<ProductDto>, NotFound>> GetById(
        Guid id,
        ProductDbContext db,
        CancellationToken ct)
    {
        var product = await db.Products
            .AsNoTracking()
            .Where(p => p.Id == id)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price, p.CreatedAt))
            .FirstOrDefaultAsync(ct);

        return product is not null
            ? TypedResults.Ok(product)
            : TypedResults.NotFound();
    }

    static async Task<Results<Created<ProductDto>, ValidationProblem>> Create(
        CreateProductRequest request,
        ProductDbContext db,
        TimeProvider time,
        CancellationToken ct)
    {
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Price = request.Price,
            CreatedAt = time.GetUtcNow()
        };

        db.Products.Add(product);
        await db.SaveChangesAsync(ct);

        var dto = new ProductDto(product.Id, product.Name, product.Price, product.CreatedAt);
        return TypedResults.Created($"/api/products/{product.Id}", dto);
    }

    static async Task<Results<NoContent, NotFound>> Update(
        Guid id,
        UpdateProductRequest request,
        ProductDbContext db,
        CancellationToken ct)
    {
        var rows = await db.Products
            .Where(p => p.Id == id)
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.Name, request.Name)
                .SetProperty(p => p.Price, request.Price), ct);

        return rows > 0 ? TypedResults.NoContent() : TypedResults.NotFound();
    }

    static async Task<Results<NoContent, NotFound>> Delete(
        Guid id,
        ProductDbContext db,
        CancellationToken ct)
    {
        var rows = await db.Products
            .Where(p => p.Id == id)
            .ExecuteDeleteAsync(ct);

        return rows > 0 ? TypedResults.NoContent() : TypedResults.NotFound();
    }
}

// --- Models ---

public record ProductDto(Guid Id, string Name, decimal Price, DateTimeOffset CreatedAt);

public record CreateProductRequest(
    [property: Required, StringLength(200, MinimumLength = 1)] string Name,
    [property: Range(0.01, 999999.99)] decimal Price);

public record UpdateProductRequest(
    [property: Required, StringLength(200, MinimumLength = 1)] string Name,
    [property: Range(0.01, 999999.99)] decimal Price);

public record PaginationRequest(
    [FromQuery] int Page = 1,
    [FromQuery] int PageSize = 20);

// --- Entity ---

public sealed class Product
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public decimal Price { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

// --- DbContext ---

public sealed class ProductDbContext(DbContextOptions<ProductDbContext> options)
    : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Product>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.Name).HasMaxLength(200).IsRequired();
            e.Property(p => p.Price).HasPrecision(10, 2);
        });
    }
}

// --- Validation Filter ---

public sealed class ValidationFilter<T> : IEndpointFilter where T : class
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        var argument = context.Arguments.OfType<T>().FirstOrDefault();
        if (argument is null)
            return await next(context);

        var validationResults = new List<ValidationResult>();
        if (!Validator.TryValidateObject(argument, new ValidationContext(argument), validationResults, true))
        {
            var errors = validationResults
                .Where(r => r.MemberNames.Any())
                .GroupBy(r => r.MemberNames.First())
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(r => r.ErrorMessage ?? "Invalid").ToArray());

            return TypedResults.ValidationProblem(errors);
        }

        return await next(context);
    }
}
