# PHP 8.6 Changelog (Expected November 2026)

Status: In development. GA target: November 19, 2026.

## Implemented

- **`clamp()` function**: `clamp($value, $min, $max)` — bound value within range
- **`enum SortDirection`**: native `SortDirection::Asc` / `SortDirection::Desc` enum
- **Debugable Enums**: Better debug output for enum values
- **`mysqli_quote_string()`**: Proper string quoting for MySQL
- **Form Feed in `trim()`**: `\f` now included in default trim characters
- **`isReadable`/`isWritable` Reflection methods**: Check property accessibility
- **Polling API**: Non-blocking I/O polling (foundation for async)

## Accepted (will ship)

- **Partial Function Application (v2)**: Create closures with `?` placeholder
  ```php
  $double = multiply(?, 2);  // creates fn($x) => multiply($x, 2)
  $greet = sprintf("Hello, %s from %s!", ?, ?);
  echo $greet("Alice", "Wonderland");
  ```
- **Partial Function — Optional Parameters**: Handle defaults in partial application
- **`#[\Override]` for Class Constants**: Verify constant overrides parent
- **Closure Optimizations**: Faster closure creation and invocation
- **Stream Error Handling Improvements**: Better error reporting in stream operations
- **Secure Session Defaults**: `cookie_httponly=1`, `cookie_secure=1`, `use_strict_mode=1` by default
- **Display Function Arguments in Errors**: Error messages show arg values
- **`pack()`/`unpack()` Endianness**: Float + integer endianness modifiers
- **URI Extension Followup**: Additional URI manipulation methods

## In Voting / Under Discussion

- **True Async**: Native async/await (under discussion — the biggest potential feature)
- **Bound-Erased Generic Types**: Generics with type erasure (voting, currently failing)
- **`__exists()` Magic Method**: Distinguish "missing" from "set to null" (voting, failing)
- **Deprecate returning from `__construct`/`__destruct`**
- **`BackedEnum::values()`**: Get all backed values as array

## Key Takeaway

PHP 8.6's **headline feature** is **Partial Function Application** — composable functions without manual closure wrapping. Combined with 8.5's pipe operator, PHP gets a powerful functional composition story:

```php
// PHP 8.5 pipe + 8.6 partial application
$result = $input
    |> trim(...)
    |> strtolower(...)
    |> str_replace(' ', '-', ?, ?)  // partial: fills first arg from pipe
    |> substr(?, 0, 50);           // partial: fills first arg from pipe
```

The **Polling API** and **True Async RFC** signal PHP's direction toward native async — potential game-changer for long-running servers if accepted.
