# PHP Extension Debugging & Common Pitfalls

> Docs: https://www.phpinternalsbook.com/php7/debugging.html | Valgrind: https://valgrind.org/docs/manual/mc-manual.html

## Debugging

```bash
# Compile with debug
phpize
./configure --enable-myext CFLAGS="-g -O0"
make

# GDB
gdb --args php -d extension=./modules/myext.so test.php

# Valgrind (memory leaks)
USE_ZEND_ALLOC=0 valgrind --leak-check=full php -d extension=./modules/myext.so test.php

# Address Sanitizer
phpize
./configure --enable-myext CFLAGS="-fsanitize=address -g" LDFLAGS="-fsanitize=address"
make
```

## Common Pitfalls

1. **Memory leaks**: Always `zend_string_release()` / `efree()` what you allocate
2. **Segfault on string**: `RETURN_STRING()` copies. `RETURN_STR()` takes ownership. Don't double-free.
3. **Wrong VS version on Windows**: Must match PHP binary's compiler exactly
4. **Forgetting COMPILE_DL_**: Without `#ifdef COMPILE_DL_MYEXT` the shared build breaks
5. **Static variables**: In ZTS builds, static vars are shared across threads. Use module globals.
6. **Not handling NULL zvals**: Always check `Z_TYPE_P(zv)` before accessing
7. **phpize not found**: Install `php-dev` (Debian) / `php-devel` (RHEL) / Homebrew PHP includes it
8. **macOS phpize path**: Use Homebrew's phpize, not system's (removed since Monterey)
