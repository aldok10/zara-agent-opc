---
type: subskill
title: "Testing .NET"
---

# Testing .NET

xUnit, WebApplicationFactory, Testcontainers, Verify, architecture tests.

## Rules

1. Use `WebApplicationFactory<Program>` for integration tests  -  real HTTP pipeline
2. One assertion per test (or one logical assertion group for object equality)
3. Use Testcontainers for database tests  -  no in-memory provider faking
4. Use Respawn to reset database state between tests (faster than recreate)
5. Name tests: `Method_Scenario_ExpectedResult` or Given/When/Then
6. Use `IClassFixture<T>` for shared expensive setup (DB containers, factories)
7. Use `Verify` for snapshot testing complex objects (JSON responses, error messages)
8. Architecture tests via ArchUnitNET  -  enforce layer boundaries in CI
9. Fake time with `FakeTimeProvider`  -  never `Thread.Sleep` in tests
10. Use `[Theory]` with `[InlineData]`/`[MemberData]` for parameterized tests
11. Test filters/middleware in isolation AND through full pipeline
12. Never test private methods  -  test behavior through public API

## Patterns

### Integration Test with WebApplicationFactory

```csharp
public class ProductsApiTests(WebAppFixture fixture) : IClassFixture<WebAppFixture>
{
    private readonly HttpClient _client = fixture.CreateClient();

    [Fact]
    public async Task GetProduct_ExistingId_ReturnsProduct()
    {
        // Arrange
        var productId = await fixture.SeedProduct("Test Product", 29.99m);

        // Act
        var response = await _client.GetAsync($"/api/products/{productId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var product = await response.Content.ReadFromJsonAsync<ProductDto>();
        product!.Name.Should().Be("Test Product");
    }

    [Fact]
    public async Task GetProduct_NonExistentId_Returns404()
    {
        var response = await _client.GetAsync($"/api/products/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
```

### WebAppFixture with Testcontainers

```csharp
public class WebAppFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .Build();

    private Respawner _respawner = default!;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(opts =>
                opts.UseNpgsql(_postgres.GetConnectionString()));
        });
    }

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        // Run migrations
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
        _respawner = await Respawner.CreateAsync(_postgres.GetConnectionString());
    }

    public async Task ResetDatabaseAsync() =>
        await _respawner.ResetAsync(_postgres.GetConnectionString());

    public new async Task DisposeAsync() => await _postgres.DisposeAsync();
}
```

### Architecture Test

```csharp
[Fact]
public void Domain_ShouldNotDependOn_Infrastructure()
{
    var domain = Types().That().ResideInNamespace("MyApp.Domain");
    var infra = Types().That().ResideInNamespace("MyApp.Infrastructure");

    domain.Should().NotDependOnAny(infra).Check(Architecture);
}
```

### Verify Snapshot

```csharp
[Fact]
public async Task CreateProduct_InvalidRequest_ReturnsValidationProblem()
{
    var response = await _client.PostAsJsonAsync("/api/products", new { Name = "" });
    var body = await response.Content.ReadAsStringAsync();
    await Verify(body);
}
```

## Anti-Patterns

- Using EF InMemory provider (different behavior from real DB)
- Shared mutable state between tests without reset
- Testing framework internals (middleware ordering) instead of behavior
- `Thread.Sleep` for timing  -  use `FakeTimeProvider` or polling with timeout
- Mocking DbContext (test against real database via Testcontainers)

## Verification

1. `dotnet test --logger "console;verbosity=normal"`  -  all green
2. Check coverage: `dotnet test --collect:"XPlat Code Coverage"`
3. Architecture tests in CI prevent layer violations
4. Integration tests run against real containers (not in-memory fakes)
