# PHP 8.3 Changelog (November 2023)

## Major Features

- **Typed Class Constants**: `public const string VERSION = '1.0'`
- **`json_validate()`**: validate JSON without decoding (faster + no memory allocation)
- **`#[\Override]` Attribute**: compiler verifies method actually overrides parent
- **Dynamic Class Constant Fetch**: `$class::{$constantName}`
- **Readonly Amendments**: deep-cloning in `__clone()` allowed
- **`Randomizer` additions**: `getBytesFromString()`, `getFloat()`, `nextFloat()`
- **`mb_str_pad()`**: multibyte-safe string padding
- **Stack overflow detection**: throws `Error` instead of segfault
- **More specific date/time exceptions**: `DateMalformedStringException`, etc.
- **`gc_status()` improvements**: more detailed GC stats
- **`class_alias()` with enum**: now works
- **Untyped constants deprecated in interfaces**: `const FOO = 'bar'` warns without type

## Deprecations
- Calling `get_class()` / `get_parent_class()` without arguments deprecated
- Untyped interface/class constants will require types in future
- `ReflectionMethod::invoke()` with separate args deprecated (use `invokeArgs`)

## Performance
- `json_validate()`: 2-3x faster than `json_decode()` + error check for validation-only
- `#[\Override]`: zero runtime cost (compile-time only)
- Stack overflow detection: negligible overhead
- Improved GC for circular references
