# PHP 8.2 Changelog (December 2022)

## Major Features

- **Readonly Classes**: `readonly class DTO {}` - all properties implicitly readonly
- **DNF Types**: `(A&B)|null` - Disjunctive Normal Form type declarations
- **Standalone `true`/`false`/`null` types**: `function alwaysFalse(): false`
- **Constants in Traits**: traits can define constants
- **`#[\SensitiveParameter]`**: redact values in stack traces
- **Dynamic Properties Deprecated**: must use `#[\AllowDynamicProperties]`
- **`Random\Randomizer`**: OOP CSPRNG API, replaceable engines
- **`enum_exists()`**: check if enum exists
- **`ini_parse_quantity()`**: parse INI shorthand ("256M" → int)
- **`mysqli_execute_query()`**: prepare + bind + execute in one call
- **`curl_upkeep()`**: HTTP/2 connection keepalive
- **Disjunctive Normal Form types**: complex type expressions
- **Deprecate `${var}` string interpolation**: use `{$var}` only

## Deprecations
- Dynamic properties deprecated (use `__get`/`__set` or `#[\AllowDynamicProperties]`)
- `utf8_encode()`/`utf8_decode()` deprecated → `mb_convert_encoding()`
- `strtolower()`/`strtoupper()` no longer locale-sensitive
- Callables `"self::method"`, `"static::method"`, `["self", "method"]` deprecated

## Performance
- Readonly classes: same perf as readonly properties (compile-time enforcement)
- `Random\Randomizer`: slightly faster than `random_int()` for batch operations
- DNF types: zero runtime cost (compile-time checked)
