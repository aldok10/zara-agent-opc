# PHP 8.1 Changelog (November 2021)

## Major Features

- **Enums**: `enum Suit: string { case Hearts = 'H'; }` — backed/pure, methods, interfaces, traits
- **Fibers**: `Fiber` class — cooperative multitasking, foundation for async (AMPHP, ReactPHP)
- **Readonly Properties**: `public readonly string $name` — set once, then immutable
- **Intersection Types**: `function foo(Countable&Iterator $x)` — must satisfy ALL types
- **`never` Return Type**: function never returns (throws or exits)
- **First-class Callables**: `$fn = strlen(...)` — create Closure from any callable
- **`array_is_list()`**: check sequential 0-based integer keys
- **Enum methods**: can implement interfaces, use traits, have `match` on `$this`
- **`fsync()` / `fdatasync()`**: filesystem sync
- **`sodium_crypto_stream_xchacha20_xor_ic()`**: crypto stream with initial counter
- **Fibers API**: `start()`, `suspend()`, `resume()`, `throw()`, `getReturn()`
- **Pure Intersection Types**: `A&B` in all type positions

## Deprecations
- `$GLOBALS` can no longer be used as a reference
- Internal function return type changes (stricter)
- `utf8_encode()`/`utf8_decode()` deprecated (use `mb_convert_encoding`)
- Passing `null` to non-nullable internal params deprecated

## Performance
- Enum operations are fast (backed by int/string internally)
- Fiber context switch: ~5μs (micro-seconds), ~4KB memory per fiber
- Readonly enforcement is compile-time (no runtime cost)
