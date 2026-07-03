# PHP Extension Build System

> Docs: https://www.phpinternalsbook.com/build_system.html | Windows: https://wiki.php.net/internals/windows/stepbystepbuild_sdk_2

## config.m4 (Linux/macOS)

```m4
dnl config.m4 for extension myext

PHP_ARG_ENABLE([myext],
  [whether to enable myext support],
  [AS_HELP_STRING([--enable-myext],
    [Enable myext support])],
  [no])

if test "$PHP_MYEXT" != "no"; then
  dnl Link external library (if needed):
  dnl PHP_ADD_LIBRARY(somelib, 1, MYEXT_SHARED_LIBADD)
  dnl PHP_ADD_INCLUDE(/path/to/headers)
  dnl PHP_SUBST(MYEXT_SHARED_LIBADD)

  PHP_NEW_EXTENSION(myext, myext.c, $ext_shared)
fi
```

## config.w32 (Windows)

```javascript
ARG_ENABLE("myext", "Enable myext support", "no");

if (PHP_MYEXT != "no") {
    EXTENSION("myext", "myext.c", PHP_MYEXT_SHARED, "/DZEND_ENABLE_STATIC_TSRMLS_CACHE=1");
    // Link external lib:
    // CHECK_LIB("somelib.lib", "myext", PHP_MYEXT);
    // CHECK_HEADER_ADD_INCLUDE("somelib.h", "CFLAGS_MYEXT");
}
```

## Build & Install: Linux (Ubuntu/Debian)

```bash
# Prerequisites
sudo apt-get install php-dev gcc make autoconf

# Build
cd myext/
phpize
./configure --enable-myext
make
sudo make install

# Enable
echo "extension=myext.so" | sudo tee /etc/php/8.4/mods-available/myext.ini
sudo phpenmod myext

# Verify
php -m | grep myext
php -r "echo myext_hello('World');"
```

## Build & Install: Linux (RHEL/Fedora/AlmaLinux)

```bash
# Prerequisites
sudo dnf install php-devel gcc make autoconf

# Build (same as above)
cd myext/ && phpize && ./configure --enable-myext && make && sudo make install

# Enable
echo "extension=myext.so" | sudo tee /etc/php.d/50-myext.ini

# Verify
php -m | grep myext
```

## Build & Install: macOS (Homebrew)

```bash
# Prerequisites
brew install php autoconf

# Build
cd myext/
phpize
./configure --enable-myext
make
make install

# Enable (find ini dir)
php --ini  # shows loaded ini path
echo "extension=myext.so" >> $(php -r "echo php_ini_scanned_dir();")/myext.ini

# Verify
php -m | grep myext
```

**macOS gotchas:**
- Apple ships read-only `/usr` since Catalina. Always use Homebrew PHP.
- If `phpize` errors about missing headers: `xcode-select --install`
- M1/M2 ARM: libs in `/opt/homebrew/`, Intel: `/usr/local/`

## Build & Install: Windows (Visual Studio)

```batch
REM Prerequisites:
REM - Visual Studio 2019/2022 (C++ Desktop workload)
REM - PHP SDK: https://github.com/php/php-sdk-binary-tools
REM - PHP source matching your target version
REM - PHP development pack (headers + lib): https://windows.php.net/downloads/

REM Setup environment
cd C:\php-sdk
phpsdk-vs17-x64.bat

REM Build
cd C:\php-src
buildconf
configure --enable-myext=shared
nmake php_myext.dll

REM Install
copy Release_TS\php_myext.dll C:\php\ext\
echo extension=php_myext.dll >> C:\php\php.ini

REM Verify
php -m | findstr myext
```

**Windows gotchas:**
- Must use same VS version that built your PHP binary (check `phpinfo()` "Compiler")
- Thread-safe (TS) PHP needs TS extension build. NTS needs NTS build.
- PHP 8.1-8.3 = VS16 (2019). PHP 8.4+ = VS17 (2022). Check https://wiki.php.net/internals/windows/compiler
- Download PHP SDK: https://github.com/php/php-sdk-binary-tools
- x64 only for modern PHP. No 32-bit builds since PHP 8.0.

## Linking External Libraries

### Linux/macOS (config.m4)

```m4
PHP_ARG_WITH([myext],
  [for myext support],
  [AS_HELP_STRING([--with-myext], [Enable myext with libfoo])])

if test "$PHP_MYEXT" != "no"; then
  dnl Check for library
  LIBFOO_DIR=""
  AC_MSG_CHECKING([for libfoo])
  for i in /usr /usr/local /opt/homebrew; do
    if test -f "$i/lib/libfoo.so" || test -f "$i/lib/libfoo.dylib"; then
      LIBFOO_DIR=$i
      break
    fi
  done

  if test -z "$LIBFOO_DIR"; then
    AC_MSG_ERROR([libfoo not found])
  fi

  PHP_ADD_INCLUDE($LIBFOO_DIR/include)
  PHP_ADD_LIBRARY_WITH_PATH(foo, $LIBFOO_DIR/lib, MYEXT_SHARED_LIBADD)
  PHP_SUBST(MYEXT_SHARED_LIBADD)
  PHP_NEW_EXTENSION(myext, myext.c, $ext_shared)
fi
```

### Windows (config.w32)

```javascript
ARG_WITH("myext", "Enable myext with libfoo", "no");

if (PHP_MYEXT != "no") {
    if (CHECK_LIB("foo.lib", "myext", PHP_MYEXT) &&
        CHECK_HEADER_ADD_INCLUDE("foo.h", "CFLAGS_MYEXT")) {
        EXTENSION("myext", "myext.c", PHP_MYEXT_SHARED, "/DZEND_ENABLE_STATIC_TSRMLS_CACHE=1");
    } else {
        WARNING("myext not enabled; foo library not found");
    }
}
```
