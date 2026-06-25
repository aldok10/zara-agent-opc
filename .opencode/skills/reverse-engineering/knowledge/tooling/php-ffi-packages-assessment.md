# PHP FFI, Existing Packages & Honest Assessment for RE

TL;DR: PHP 7.4+ FFI for calling native code/DLLs, the thin PHP binary-parsing ecosystem, and where PHP fits (and doesn't) in RE workflows.
See also: `php-binary-reading-pe-parse.md`, `php-rabin2-shell-tool.md`

---

## 3. FFI in PHP 7.4+ (calling native code)

`ext-ffi` (stable since PHP 7.4, [FFI RFC](https://wiki.php.net/rfc/ffi)) lets
PHP call C functions and use C types directly. This is the most RE-relevant
modern PHP feature: you can build a dynamic interop harness that loads a target
`.so`/`.dll` and calls its exported functions, instead of only reading bytes
statically.

Three ways to get an `FFI` instance
([class.ffi docs](https://www.php.net/manual/en/class.ffi.php)):

- `FFI::cdef($cDecls, $libPath)` -- inline C declarations, optionally bound to a
  library.
- `FFI::load($headerFile)` -- parse a `.h` that uses `#define FFI_LIB "..."`
  ([FFI::load docs](https://www.php.net/manual/en/ffi.load.php)).
- `FFI::scope($name)` -- use a preloaded definition.

### Basic: declare a libc function and call it

```php
<?php
declare(strict_types=1);

$libc = FFI::cdef(
    'int printf(const char *format, ...);
     unsigned int strlen(const char *s);',
    'libc.so.6'                 // 'libc.so.6' on Linux; omit/adjust on Windows
);

$libc->printf("hello from %s\n", "ffi");
var_dump($libc->strlen("abcd"));   // int(4)
```

The basic-usage pattern is straight from the
[PHP manual FFI examples](https://www.php.net/manual/en/ffi.examples-basic.php).
Note the manual's warning: non-default calling conventions (`__stdcall`,
`__fastcall`, `__vectorcall`) need care on Windows.

### Dynamic harness: dlopen + dlsym for arbitrary exports

When you don't have headers and want to poke an arbitrary export at runtime, you
can FFI-declare the dynamic-linker functions themselves and resolve symbols by
name. This pattern is from a working
[PHP 7.4 FFI + dlopen/dlsym gist](https://gist.github.com/dirx/257c5262d8a58ef54e23a6e8edb31105):

```php
<?php
declare(strict_types=1);

const RTLD_LAZY   = 0x00001;
const RTLD_GLOBAL = 0x00100;

$dl = FFI::cdef("
    void *dlopen(const char *filename, int flags);
    int   dlclose(void *handle);
    void *dlsym(void *handle, const char *symbol);
    char *dlerror(void);
");

$handle = $dl->dlopen('/usr/local/lib/librdkafka.so', RTLD_GLOBAL | RTLD_LAZY);
if (($err = $dl->dlerror()) !== null) {
    fwrite(STDERR, FFI::string($err) . "\n");
    exit(1);
}

// Resolve a symbol by name.
$ptr = $dl->dlsym($handle, 'rd_kafka_version_str');
if (($err = $dl->dlerror()) !== null) {
    fwrite(STDERR, FFI::string($err) . "\n");
    exit(1);
}

// Build a generic function pointer and copy the resolved address into it.
$fn = FFI::new('char*(*)(void)');
FFI::memcpy(FFI::addr($fn), FFI::addr($ptr), FFI::sizeof($fn));

$result = $fn();
var_dump(FFI::string(FFI::cast('char*', $result)));

$dl->dlclose($handle);
```

What this buys you for RE work:

- A scriptable harness to fuzz/exercise exported functions of a native library
  without writing C, recompiling, or attaching a debugger.
- Reading/writing native structs via `FFI::new`, `FFI::cast`, `FFI::addr`,
  `FFI::string`, and `FFI::memcpy` for marshalling.
- Quick differential testing: call the real implementation and compare against
  your reimplementation.

Caveats, stated honestly:

- FFI executes native code in-process. A crashing target takes your PHP process
  down with it. Run harnesses in a sandbox/container, never on shared hosting.
- No memory safety. You're one bad cast away from a segfault. That's the deal.
- FFI is disabled or restricted on most managed hosts and is intended for CLI /
  controlled environments (`ffi.enable` settings).
- It calls code; it does not analyze code. FFI tells you nothing about a
  function's internals, only its observable behavior.

---

## 4. Existing PHP packages for PE/binary parsing

The ecosystem here is thin. PHP is not where binary-format communities live
(that's Python with [LIEF](https://lief.re/doc/stable/intro.html) and
`pefile`, or C/C++ with [libpe](https://github.com/evilsocket/libpe)). What
exists in PHP:

- **[sjoorm/readpe](https://github.com/sjoorm/readpe)** -- GitHub, not on
  Packagist. PE header + imports + resources parser with a web front-end. Small
  (2 stars) but a useful reference for the hand-rolled `unpack` approach.
- **General binary readers on Packagist** -- search yields stream/buffer
  abstractions rather than format parsers. Spreadsheet libraries like
  [php-excel-reader/spreadsheet-reader](https://packagist.org/packages/php-excel-reader/spreadsheet-reader)
  read the binary XLS format directly and are a decent study in disciplined
  `unpack`-based parsing, even though they're not RE tools.
- **ELF / Mach-O** -- no maintained, production-grade pure-PHP parser worth
  depending on at time of writing. If you need real ELF/PE/Mach-O abstraction,
  bind to LIEF via FFI or shell out (next section).

Honest takeaway: there is no PHP equivalent of `pefile` or LIEF. For anything
beyond header dumping, don't search for a PHP package, wrap an external tool.

---

## 5. Honest assessment: what PHP is and isn't for RE

PHP is good at:

- **Orchestration** -- driving a pipeline of external RE tools, queuing samples,
  managing jobs.
- **Web dashboards / reporting** -- rendering analysis results (a strength;
  PHP's whole reason to exist). A web UI over RE output is a natural fit.
- **`unpack`-based header/format parsers** -- file magic, PE/COFF headers,
  custom/proprietary binary formats, network protocol dumps. Tractable and
  readable.
- **FFI interop harnesses** -- exercising native libraries dynamically (section
  3), differential testing, marshalling structs.

PHP is **not**:

- A disassembler or decompiler. It has no instruction decoder, no CFG
  recovery, no symbolic execution. Don't reimplement Capstone in PHP.
- A debugger. No ptrace bindings of note; FFI can call but not introspect.
- A place to do CPU-heavy binary analysis. The runtime and the int model
  (signed 64-bit, no native unsigned) fight you.

The pragmatic architecture: **PHP for the orchestration and reporting layer,
external tools for the heavy lifting.** Invoke `radare2`/`rabin2`, Ghidra
(headless), `objdump`, or `dumpbin` via `proc_open`/`shell_exec`, capture their
structured (ideally JSON) output, and let PHP parse, store, and present it.

---

### Sources
- PHP `unpack` / format codes: https://www.php.net/manual/en/function.unpack.php
- PHP FFI examples: https://www.php.net/manual/en/ffi.examples-basic.php
- PHP FFI class reference: https://www.php.net/manual/en/class.ffi.php
- FFI RFC (7.4): https://wiki.php.net/rfc/ffi
- FFI::load: https://www.php.net/manual/en/ffi.load.php
- FFI + dlopen/dlsym gist: https://gist.github.com/dirx/257c5262d8a58ef54e23a6e8edb31105
- sjoorm/readpe (PHP PE parser): https://github.com/sjoorm/readpe
- LIEF (recommended for real work): https://lief.re/doc/stable/intro.html
- libpe (C/C++ reference): https://github.com/evilsocket/libpe
