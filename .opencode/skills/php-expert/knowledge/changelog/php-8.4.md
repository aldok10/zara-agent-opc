# PHP 8.4 Changelog (November 2024)

## Major Features

- **Property Hooks**: `get`/`set` hooks replace getters/setters
  ```php
  class User {
      public string $name { set => strtolower($value); }
      public string $fullName { get => "$this->first $this->last"; }
  }
  ```
- **Asymmetric Visibility**: `public private(set) string $name` — read publicly, write privately
- **`#[\Deprecated]` Attribute**: user-defined deprecation with `message` and `since`
- **`new` without parentheses**: `new Foo()->method()` — no wrapping needed
- **`array_find()`**: first element matching callback
- **`array_find_key()`**: key of first matching element
- **`array_any()`**: true if ANY element matches
- **`array_all()`**: true if ALL elements match
- **HTML5 DOM**: `Dom\HTMLDocument`, `Dom\XMLDocument` — spec-compliant with `querySelector()`
- **BCMath Objects**: `BcMath\Number` with operator overloading
- **PDO Subclasses**: `Pdo\MySql`, `Pdo\Sqlite` — driver-specific methods
- **Lazy Objects**: `ReflectionClass::newLazyProxy()`, `newLazyGhost()` — deferred init
- **New JIT (IR Framework)**: rewritten, better optimization
- **`mb_trim()` / `mb_ltrim()` / `mb_rtrim()`**: multibyte trim
- **`mb_ucfirst()` / `mb_lcfirst()`**: multibyte case
- **`grapheme_str_split()`**: Unicode grapheme cluster splitting
- **`http_get_last_response_headers()`**: replaces `$http_response_header`
- **`request_parse_body()`**: parse non-POST request bodies
- **`Closure::call()` now static-compatible**
- **Improved `exit` / `die`**: now a proper function (can be used as callable)

## Deprecations
- Implicitly nullable parameter types deprecated: `function f(int $x = null)` → use `?int`
- `session_set_save_handler()` with individual callbacks deprecated (use class)
- `CURLOPT_BINARYTRANSFER` removed
- `E_STRICT` constant removed

## Performance
- New JIT (IR Framework): 5-20% improvement over PHP 8.3 JIT
- Lazy objects: zero cost until accessed (proxy pattern built-in)
- Property hooks: comparable to manual getter/setter (direct memory access)
- `array_find/any/all`: faster than manual foreach for matching (optimized C implementation)
