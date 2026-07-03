# PHP Extension Development

Build native PHP extensions in C/C++ for PHP 8.x across Linux, macOS, and Windows.

> Docs: https://www.phpinternalsbook.com | Zend Guide: https://www.zend.com/resources/php-extensions | Source: https://github.com/php/php-src | Wiki: https://wiki.php.net/internals | PHP-CPP: https://www.php-cpp.com | FFI RFC: https://wiki.php.net/rfc/ffi

## When to Use

- Performance-critical code that PHP userland can't satisfy
- Wrapping an existing C/C++ library for PHP consumption
- Adding new data types or opcode handlers
- Building PECL-distributable packages

## When NOT to Use

- Simple performance gains (use OPcache/JIT first)
- One-off C library calls (use PHP FFI instead)
- Prototyping (use FFI or PHP-CPP for faster iteration)

## Alternatives to Pure C Extensions

| Approach | Pros | Cons |
|----------|------|------|
| **Zend API (C)** | Full control, best perf, official | Complex, manual memory mgmt |
| **PHP-CPP** | C++ OOP, easier API | Linux/macOS only, community maintained |
| **PHP FFI** | Pure PHP, no compilation | Slower than native ext, runtime overhead |
| **FrankenPHP Go ext** | Write ext in Go, no CGO | FrankenPHP-only, newer ecosystem |

---

## Extension Skeleton (Quick Start)

### Generate with ext_skel

```bash
# From PHP source tree
php php-src/ext/ext_skel.php --ext myext --dir .

# Result:
# myext/
#   config.m4      (Unix build config)
#   config.w32     (Windows build config)
#   php_myext.h    (Header)
#   myext.c        (Main implementation)
#   tests/         (PHPT tests)
```

### Minimal Extension (PHP 8.x)

See `examples/` for complete source files:
- `examples/php_myext.h` — header
- `examples/myext.c` — full minimal extension (function, arginfo, module entry)
- `examples/myext_class.c` — OOP extension (class registration, methods, properties, constants)

---

## References

| Resource | URL |
|----------|-----|
| PHP Internals Book | https://www.phpinternalsbook.com |
| Zend Extension Guide (18 parts) | https://www.zend.com/resources/php-extensions |
| PHP Source | https://github.com/php/php-src |
| PECL | https://pecl.php.net |
| PHP-CPP (C++ wrapper) | https://www.php-cpp.com |
| Windows Build Wiki | https://wiki.php.net/internals/windows/stepbystepbuild_sdk_2 |
| Windows Compiler Matrix | https://wiki.php.net/internals/windows/compiler |
| PHP FFI | https://www.php.net/manual/en/book.ffi.php |
| FrankenPHP Go Extensions | https://frankenphp.dev/docs/extensions/ |
| UPGRADING.INTERNALS | https://github.com/php/php-src/blob/master/UPGRADING.INTERNALS |
| ext-php-rs (Rust) | https://github.com/davidcole1340/ext-php-rs |
| phper (Rust) | https://github.com/phper-framework/phper |
| PIE (PECL replacement) | https://github.com/php/pie |
| PIE RFC | https://wiki.php.net/rfc/adopt_pie_deprecate_pecl |
| PHP-CPP docs | https://www.php-cpp.com/documentation/ |
| Swoole source (C++ ext) | https://github.com/swoole/swoole-src |
| MongoDB driver (complex ext) | https://github.com/mongodb/mongo-php-driver |

## Knowledge

Load on demand:
- `knowledge/build-system.md` — config.m4, config.w32, build & install per OS, linking external libraries
- `knowledge/zend-api.md` — zval, argument parsing, arginfo, memory management, hashtable/arrays, classes & objects, module lifecycle, INI settings, thread safety
- `knowledge/testing-distribution.md` — PHPT testing, PECL distribution, PIE distribution, Rust extensions (ext-php-rs)
- `knowledge/debugging-pitfalls.md` — debugging techniques (GDB, Valgrind, ASAN), common pitfalls
- `knowledge/extensions-bundled.md` — all 73 bundled extensions categorized with source links
- `knowledge/extensions-community.md` — 50+ PECL/community extensions, development approaches, PIE, study references

## Related Skills

| When | Load |
|------|------|
| PHP project context | `php-expert` |
| Debugging ext crashes | `systematic-debugging` |
| C/C++ wrapping for PHP | `swig-expert` |
| Reverse engineering existing ext | `reverse-engineering` |
