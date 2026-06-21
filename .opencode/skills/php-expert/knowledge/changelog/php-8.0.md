# PHP 8.0 Changelog (November 2020)

## Major Features

- **Named Arguments**: `htmlspecialchars($s, double_encode: false)` — skip defaults, self-documenting
- **Match Expression**: strict `===`, no fall-through, returns value: `match($x) { 1 => 'one', default => 'other' }`
- **Nullsafe Operator**: `$user?->address?->city` — short-circuits to null
- **Union Types**: `function foo(int|string $val): int|false`
- **Attributes**: `#[Route("/api")]` — native metadata replacing docblock annotations
- **Constructor Promotion**: `public function __construct(private readonly string $name)`
- **Throw Expression**: `$val = $x ?? throw new InvalidArgumentException()`
- **WeakMap**: object keys with automatic garbage collection
- **`mixed` type**: explicit top type declaration
- **`static` return type**: for fluent interfaces / late static binding
- **JIT Compiler**: Tracing JIT based on DynASM (opcache.jit=1255)
- **`str_contains()`**: replaces `strpos() !== false`
- **`str_starts_with()` / `str_ends_with()`**: native prefix/suffix check
- **`fdiv()`**: IEEE 754 float division (never throws)
- **`get_debug_type()`**: human-readable type names
- **`Stringable` interface**: auto-implemented when `__toString()` exists
- **`::class` on objects**: `$obj::class` works without `get_class()`
- **Trailing comma in parameter lists**: `function foo($a, $b,) {}`
- **`match` without expression**: `match(true) { $x > 0 => 'positive' }`

## Deprecations
- String→number comparison behavior changed (non-numeric strings)
- `create_function()` removed (use closures)
- `each()` removed
- Unbacked match without default throws `UnhandledMatchError`

## Performance
- JIT: 1.5-3x for CPU-bound, minimal for I/O-bound web
- Named args zero runtime cost (resolved at compile time)
- `str_contains` faster than `strpos` (no offset calculation)
