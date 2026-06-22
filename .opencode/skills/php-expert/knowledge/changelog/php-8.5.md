# PHP 8.5 Changelog (November 2025)

## Major Features

- **Pipe Operator `|>`**: Chain function calls cleanly without nesting
  ```php
  $output = $input
      |> trim(...)
      |> strtolower(...)
      |> fn($s) => str_replace(' ', '-', $s);
  ```
- **Clone With**: Assign values while cloning (immutable update)
  ```php
  $updated = clone($original, ['title' => 'New Title']);
  ```
- **`#[NoDiscard]` Attribute**: Warn if return value unused
  ```php
  #[NoDiscard("result must be used")]
  function compute(): int { return 42; }
  compute(); // Warning!
  (void) compute(); // Suppress with (void) cast
  ```
- **Closures in Constant Expressions**: Closures allowed in attributes
  ```php
  #[Filter(static fn($v) => $v > 0)]
  public array $items;
  ```
- **Fatal Error Backtraces**: Stack traces on fatal errors (max execution time, etc.)
- **`array_first()` / `array_last()`**: Get first/last element without key dance
  ```php
  $first = array_first($items); // replaces $items[array_key_first($items)]
  ```
- **URI Extension**: `Uri\Rfc3986\Uri` - proper URI parsing (replaces parse_url)
  ```php
  $uri = new Uri\Rfc3986\Uri('https://example.com/path?q=1');
  $uri->getHost(); // "example.com"
  ```
- **`#[DelayedTargetValidation]`**: Postpone attribute validation to runtime
- **Asymmetric Visibility on Static Properties**
- **Attributes on Constants**: Non-class constants can have attributes
- **`final` Constructor Promotion**: `public final readonly string $name`
- **`#[\Override]` on Properties**: Verify property overrides parent

## Deprecations
- `(boolean)`, `(integer)` cast syntax deprecated → use `(bool)`, `(int)`
- Backticks `` ` `` for shell_exec deprecated → use `shell_exec()`
- Constant redeclaration deprecated
- `disabled_classes` ini setting removed

## Performance
- Pipe operator: zero overhead (compiled to sequential calls)
- Clone with: direct property assignment (no __clone overhead)
- Fatal error backtraces: negligible (only on crash path)
