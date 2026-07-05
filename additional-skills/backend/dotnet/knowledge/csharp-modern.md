# C# 12–14 Modern Features

## C# 12 (.NET 8)

### Primary Constructors (classes + structs)
```csharp
public class ProductService(AppDbContext db, ILogger<ProductService> logger)
{
    public async Task<Product?> GetAsync(Guid id, CancellationToken ct) =>
        await db.Products.FindAsync([id], ct);
}
```
- Parameters captured as fields — no explicit field declaration needed
- Use for DI injection pattern (replaces constructor + private readonly fields)
- Caution: captured parameters are mutable — don't reassign

### Collection Expressions
```csharp
int[] numbers = [1, 2, 3, 4, 5];
List<string> names = ["Alice", "Bob"];
Span<byte> buffer = [0x01, 0x02, 0x03];
// Spread operator
int[] combined = [..first, ..second, 42];
```

### Default Lambda Parameters
```csharp
var greet = (string name, string greeting = "Hello") => $"{greeting}, {name}!";
```

### Alias Any Type
```csharp
using ProductId = System.Guid;
using Point = (int X, int Y);
using HttpHandler = System.Func<HttpContext, Task>;
```

## C# 13 (.NET 9)

### `params` Collections (not just arrays)
```csharp
public void Log(params ReadOnlySpan<string> messages) { }
public void AddTags(params IEnumerable<string> tags) { }
// Avoids array allocation for spans:
Log("one", "two", "three"); // no heap allocation
```

### `field` Keyword (semi-auto properties, preview)
```csharp
// Preview in C# 13 — finalized in C# 14
public string Name
{
    get => field;
    set => field = value?.Trim() ?? throw new ArgumentNullException(nameof(value));
}
```

### `Lock` Object
```csharp
public class Counter
{
    private readonly Lock _lock = new();
    private int _count;

    public void Increment()
    {
        using (_lock.EnterScope())
            _count++;
    }
}
```

### Implicit Index Access in Initializers
```csharp
var buffer = new Buffer10
{
    [^1] = 99, // last element
    [^2] = 98  // second-to-last
};
```

## C# 14 (.NET 10)

### Extension Members (methods, properties, static methods)
```csharp
// Extension properties and static methods — not just methods anymore
public implicit extension ProductExtensions for Product
{
    public decimal DiscountedPrice => this.Price * 0.9m;

    public static Product Empty => new(Guid.Empty, "", 0m);
}

// Usage:
var price = product.DiscountedPrice;   // extension property
var empty = Product.Empty;             // extension static member
```

### `field` Keyword Finalized
```csharp
// Semi-auto properties — compiler generates backing field, you control accessors
public string Name
{
    get => field;
    set => field = value?.Trim() ?? throw new ArgumentNullException(nameof(value));
}
// No private backing field declaration needed
```

### `allows ref struct` Generic Constraint
```csharp
public T Parse<T>(ReadOnlySpan<char> input) where T : ISpanParsable<T>, allows ref struct
{
    return T.Parse(input, null);
}
```

### Unbound Generic Types in `nameof`
```csharp
var name = nameof(List<>); // "List" — works without specifying type argument
```

## When to Use What

| Feature | Use When |
|---------|----------|
| Primary constructors | DI injection, simple data holders |
| Collection expressions | Any collection initialization |
| `params` collections | Hot path APIs needing zero-alloc |
| `field` keyword | Property validation without backing field boilerplate |
| `Lock` type | New lock objects (replaces `object _lock = new()`) |
| Extension members | Adding properties/static members to existing types |
| `allows ref struct` | Generic code operating on spans/ref structs |
