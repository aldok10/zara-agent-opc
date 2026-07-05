# .NET Performance Patterns

## Span<T> and Memory<T>

```csharp
// Parse without allocation:
public static int CountWords(ReadOnlySpan<char> text)
{
    int count = 0;
    foreach (var range in text.Split(' '))
        if (!text[range].IsEmpty) count++;
    return count;
}

// Slice without copying:
ReadOnlySpan<byte> payload = buffer.AsSpan()[headerSize..];
```

## ArrayPool<T>

```csharp
var pool = ArrayPool<byte>.Shared;
var buffer = pool.Rent(4096); // may return larger array
try
{
    var bytesRead = await stream.ReadAsync(buffer.AsMemory(0, 4096), ct);
    ProcessData(buffer.AsSpan(0, bytesRead));
}
finally
{
    pool.Return(buffer, clearArray: true); // clear if sensitive
}
```

## Frozen Collections (.NET 8+)

```csharp
// Created once, optimized for reads:
private static readonly FrozenDictionary<string, Handler> Routes =
    new Dictionary<string, Handler>
    {
        ["/api/products"] = new ProductHandler(),
        ["/api/orders"] = new OrderHandler(),
    }.ToFrozenDictionary();

private static readonly FrozenSet<string> AllowedOrigins =
    new[] { "https://app.example.com", "https://admin.example.com" }.ToFrozenSet();
```

## SearchValues (.NET 8+)

```csharp
private static readonly SearchValues<char> Separators =
    SearchValues.Create(",;|");

public static int FindFirstSeparator(ReadOnlySpan<char> input) =>
    input.IndexOfAny(Separators); // SIMD-accelerated
```

## Source Generators (zero-reflection patterns)

### JSON
```csharp
[JsonSerializable(typeof(ApiResponse<ProductDto>))]
public partial class AppJsonContext : JsonSerializerContext;
```

### Logging
```csharp
[LoggerMessage(Level = LogLevel.Information, Message = "Processed {Count} items in {Elapsed}ms")]
public static partial void LogProcessed(ILogger logger, int count, long elapsed);
```

### Regex
```csharp
[GeneratedRegex(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")]
private static partial Regex EmailRegex();
```

## String Performance

```csharp
// Use StringComparison explicitly:
if (name.Equals("admin", StringComparison.OrdinalIgnoreCase)) { }

// StringBuilder for >4 concatenations:
var sb = new StringBuilder(estimatedCapacity);

// String.Create for known-length results:
string result = string.Create(length, state, (span, s) => { /* write to span */ });
```

## Async Best Practices

```csharp
// ValueTask for hot paths that often complete synchronously:
public ValueTask<Product?> GetCachedAsync(Guid id)
{
    if (_cache.TryGetValue(id, out var product))
        return ValueTask.FromResult<Product?>(product);
    return GetFromDbAsync(id); // only allocates Task when cache miss
}

// ConfigureAwait(false) in library code:
var data = await httpClient.GetAsync(url, ct).ConfigureAwait(false);

// Avoid async state machine for trivial wrappers:
public Task SaveAsync(Product p, CancellationToken ct) =>
    _db.SaveChangesAsync(ct); // no async/await — direct return
```

## Measurement

- BenchmarkDotNet for micro-benchmarks
- `dotnet-counters` for runtime metrics
- `dotnet-trace` for profiling
- Allocation tracking: `[MemoryDiagnoser]` in BenchmarkDotNet
