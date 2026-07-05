---
type: subskill
title: "EF Core"
---

# EF Core

Entity Framework Core 10 patterns: migrations, query optimization, interceptors.

## Rules

1. One `DbContext` per bounded context  -  don't create a god context
2. Use `AsNoTracking()` on all read-only queries  -  significant perf gain
3. Project with `Select()`  -  never load full entities when only fields needed
4. Migrations: one concern per migration, name descriptively (`AddProductAuditColumns`)
5. Use expand-contract for breaking schema changes  -  never drop columns in same release
6. Compiled queries for hot paths: `EF.CompileAsyncQuery()`
7. Use `IDbContextFactory<T>` for background services / parallel work
8. Interceptors for cross-cutting: audit fields, soft delete, tenant filtering
9. Value converters for domain types (strongly-typed IDs, enums, JSON columns)
10. Configure entities in `IEntityTypeConfiguration<T>` classes  -  not in `OnModelCreating`
11. Use `HasQueryFilter()` for global filters (soft delete, multi-tenancy)
12. Batch operations: use `ExecuteUpdateAsync`/`ExecuteDeleteAsync` over loading + saving
13. Always specify `MaxLength` on string properties  -  prevents nvarchar(max)

## Patterns

### Compiled Query

```csharp
private static readonly Func<AppDbContext, Guid, CancellationToken, Task<ProductDto?>> GetByIdQuery =
    EF.CompileAsyncQuery((AppDbContext db, Guid id, CancellationToken ct) =>
        db.Products
            .AsNoTracking()
            .Where(p => p.Id == id)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .FirstOrDefault());
```

### Audit Interceptor

```csharp
public sealed class AuditInterceptor(TimeProvider timeProvider) : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken ct = default)
    {
        var context = eventData.Context!;
        var now = timeProvider.GetUtcNow();

        foreach (var entry in context.ChangeTracker.Entries<IAuditable>())
        {
            if (entry.State == EntityState.Added)
                entry.Entity.CreatedAt = now;
            if (entry.State is EntityState.Added or EntityState.Modified)
                entry.Entity.UpdatedAt = now;
        }

        return base.SavingChangesAsync(eventData, result, ct);
    }
}
```

### Strongly-Typed ID

```csharp
[JsonConverter(typeof(ProductIdJsonConverter))]
public readonly record struct ProductId(Guid Value)
{
    public static ProductId New() => new(Guid.NewGuid());
}

// In configuration:
builder.Property(p => p.Id)
    .HasConversion(id => id.Value, value => new ProductId(value));
```

### Bulk Operations

```csharp
await db.Products
    .Where(p => p.CategoryId == categoryId)
    .ExecuteUpdateAsync(s => s
        .SetProperty(p => p.IsArchived, true)
        .SetProperty(p => p.ArchivedAt, timeProvider.GetUtcNow()), ct);
```

## Anti-Patterns

- Lazy loading enabled (N+1 queries by default)
- Repository/UnitOfWork wrapping DbContext  -  EF IS the repository + UoW
- `ToListAsync()` before filtering  -  fetches all rows then filters in memory
- Non-idempotent migrations (will fail on re-run or in CI)
- Using `Include()` chains loading entire object graphs

## Migration Strategy

1. **Expand**: add new columns nullable, add new tables
2. **Migrate data**: backfill in a separate migration/job
3. **Contract**: drop old columns/tables in a later release
4. Always generate idempotent scripts for review: `dotnet ef migrations script --idempotent`

## Verification

1. `dotnet ef migrations script --idempotent`  -  review generated SQL
2. Run migrations against test database in CI
3. Query tests: verify N+1 detection with `DbContext` logging
4. Verify no tracking on read endpoints (inspect `ChangeTracker.Entries()` count)
