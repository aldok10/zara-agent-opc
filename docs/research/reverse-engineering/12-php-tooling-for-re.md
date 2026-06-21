# PHP for Binary Inspection & RE-Adjacent Tooling

A research note on where PHP genuinely helps in a reverse-engineering workflow,
and where it has no business being. Short version: PHP is a fine glue and
reporting language. It is not a disassembler. Use it for the parts it's good at
and shell out for everything else.

---

## 1. Reading binary files in PHP

PHP reads bytes just fine. The file functions are byte-safe (PHP strings are
byte arrays, not UTF-16), so `fread` / `file_get_contents` give you raw octets
with no encoding mangling.

```php
<?php
declare(strict_types=1);

// Whole-file slurp (fine for small binaries, < a few hundred MB).
$blob = file_get_contents('sample.dll');

// Streaming read when you only need a header window.
$fh = fopen('sample.dll', 'rb');   // 'b' matters on Windows
$dosHeader = fread($fh, 64);       // read first 64 bytes
fseek($fh, 0x3C, SEEK_SET);        // jump to e_lfanew
$peOffsetRaw = fread($fh, 4);
fclose($fh);
```

The real work is `unpack()`. It turns a binary string into a keyed array
according to format codes. Format codes are shared with `pack()`
([php.net/unpack](https://www.php.net/manual/en/function.unpack.php)).

### Format codes you actually use for headers

| Code | Meaning | Width |
|------|---------|-------|
| `C` / `c` | unsigned / signed char | 1 |
| `v` | unsigned short, **little-endian** | 2 |
| `n` | unsigned short, big-endian | 2 |
| `V` | unsigned long (32-bit), **little-endian** | 4 |
| `N` | unsigned long, big-endian | 4 |
| `P` | unsigned long long (64-bit), little-endian | 8 |
| `a` | NUL-padded string (keeps trailing NULs) | n |
| `Z` | NUL-padded string (strips trailing NULs) | n |
| `A` | space-padded string (strips trailing whitespace) | n |

PE/COFF is little-endian, so you live in `v`, `V`, and `P` land. Name your
fields with `/`-separated labels so you get an associative array
([unpack docs](https://www.php.net/manual/en/function.unpack.php)):

```php
$dos = unpack('a2magic/v58_/Ve_lfanew', $blob);
// $dos['magic'] === 'MZ', $dos['e_lfanew'] points at the PE signature
```

Gotchas worth knowing up front:

- PHP has no native unsigned 64-bit type. `P` returns an `int`, and on values
  above `PHP_INT_MAX` it goes negative. For RVAs and file offsets in normal
  binaries this rarely bites, but be aware.
- `unpack` offsets: the optional 3rd arg (`offset`, since PHP 7.1) lets you
  unpack from the middle of the blob without `substr`-ing first.
- `a`/`A`/`Z` differ in trailing-byte handling; for section names (8 bytes,
  NUL-padded) use `Z8` to auto-trim, or `A8`.

`pack()` is the inverse and is how you'd patch/forge bytes if you ever write
back. For pure inspection you mostly read.

---

## 2. Worked example: parse a PE/DLL header by hand

This parses the DOS stub, the COFF/NT headers, the optional header (PE32 and
PE32+), the section table, and walks the export directory. No dependencies,
pure `unpack`. PE layout reference is the standard COFF/PE spec; the constants
below (machine types, characteristics, directory indices) are from the
Microsoft PE format documentation.

```php
<?php
declare(strict_types=1);

final class PeReader
{
    private string $data;

    public function __construct(string $path)
    {
        $blob = @file_get_contents($path);
        if ($blob === false) {
            throw new RuntimeException("cannot read {$path}");
        }
        $this->data = $blob;
    }

    /** unpack a single format at an absolute offset and return the value. */
    private function u(string $fmt, int $offset): array
    {
        $out = unpack($fmt, $this->data, $offset);
        if ($out === false) {
            throw new RuntimeException("unpack failed at {$offset}");
        }
        return $out;
    }

    public function analyze(): array
    {
        // --- DOS header ---
        $dos = $this->u('a2e_magic', 0);
        if ($dos['e_magic'] !== 'MZ') {
            throw new RuntimeException('not an MZ image');
        }
        $eLfanew = $this->u('Voffset', 0x3C)['offset'];

        // --- PE signature ---
        $sig = $this->u('a4sig', $eLfanew);
        if ($sig['sig'] !== "PE\0\0") {
            throw new RuntimeException('PE signature missing');
        }

        // --- COFF file header (20 bytes, right after the 4-byte signature) ---
        $coffOff = $eLfanew + 4;
        $coff = $this->u(
            'vMachine/vNumberOfSections/VTimeDateStamp/'
            . 'VPointerToSymbolTable/VNumberOfSymbols/'
            . 'vSizeOfOptionalHeader/vCharacteristics',
            $coffOff
        );

        // --- Optional header ---
        $optOff = $coffOff + 20;
        $magic  = $this->u('vMagic', $optOff)['Magic'];
        $isPe32Plus = ($magic === 0x20B);     // 0x10B = PE32, 0x20B = PE32+

        $entry = $this->u('VAddressOfEntryPoint', $optOff + 16)['AddressOfEntryPoint'];
        $imageBase = $isPe32Plus
            ? $this->u('PImageBase', $optOff + 24)['ImageBase']
            : $this->u('VImageBase', $optOff + 28)['ImageBase'];

        // NumberOfRvaAndSizes + the data directory array start at different
        // offsets for PE32 (96) vs PE32+ (112).
        $dirOff = $optOff + ($isPe32Plus ? 112 : 96);
        // Data directory [0] = export table (RVA, size).
        $exportDir = $this->u('VRva/VSize', $dirOff);

        // --- Section table (follows the optional header) ---
        $secOff = $optOff + $coff['SizeOfOptionalHeader'];
        $sections = [];
        for ($i = 0; $i < $coff['NumberOfSections']; $i++) {
            $base = $secOff + ($i * 40);                // each entry is 40 bytes
            $s = $this->u(
                'Z8Name/VVirtualSize/VVirtualAddress/'
                . 'VSizeOfRawData/VPointerToRawData',
                $base
            );
            $sections[] = $s;
        }

        return [
            'machine'      => $this->machineName($coff['Machine']),
            'is_dll'       => (bool)($coff['Characteristics'] & 0x2000), // IMAGE_FILE_DLL
            'is_exe'       => (bool)($coff['Characteristics'] & 0x0002), // EXECUTABLE_IMAGE
            'pe_kind'      => $isPe32Plus ? 'PE32+' : 'PE32',
            'image_base'   => $imageBase,
            'entry_point'  => $entry,                    // RVA
            'sections'     => array_map(fn($s) => $s['Name'], $sections),
            'section_table'=> $sections,
            'export_rva'   => $exportDir['Rva'],
            'export_size'  => $exportDir['Size'],
            'exports'      => $exportDir['Rva']
                ? $this->readExports($exportDir['Rva'], $sections)
                : [],
        ];
    }

    /** Translate an RVA to a file offset using the section table. */
    private function rvaToOffset(int $rva, array $sections): ?int
    {
        foreach ($sections as $s) {
            $start = $s['VirtualAddress'];
            $end   = $start + max($s['VirtualSize'], $s['SizeOfRawData']);
            if ($rva >= $start && $rva < $end) {
                return $s['PointerToRawData'] + ($rva - $start);
            }
        }
        return null;
    }

    /** Walk IMAGE_EXPORT_DIRECTORY and collect exported names. */
    private function readExports(int $exportRva, array $sections): array
    {
        $off = $this->rvaToOffset($exportRva, $sections);
        if ($off === null) {
            return [];
        }
        // IMAGE_EXPORT_DIRECTORY: Name at +12, NumberOfNames at +24,
        // AddressOfNames (RVA array) at +32.
        $ed = $this->u(
            'VCharacteristics/VTimeDateStamp/vMajor/vMinor/VName/VBase/'
            . 'VNumberOfFunctions/VNumberOfNames/VAddrOfFunctions/'
            . 'VAddrOfNames/VAddrOfNameOrdinals',
            $off
        );

        $namesOff = $this->rvaToOffset($ed['AddrOfNames'], $sections);
        if ($namesOff === null) {
            return [];
        }

        $names = [];
        for ($i = 0; $i < $ed['NumberOfNames']; $i++) {
            $nameRva = $this->u('Vrva', $namesOff + $i * 4)['rva'];
            $strOff  = $this->rvaToOffset($nameRva, $sections);
            if ($strOff !== null) {
                $names[] = $this->readCString($strOff);
            }
        }
        return $names;
    }

    private function readCString(int $offset): string
    {
        $end = strpos($this->data, "\0", $offset);
        return substr($this->data, $offset, ($end ?: $offset) - $offset);
    }

    private function machineName(int $m): string
    {
        return [
            0x014C => 'x86 (i386)',
            0x8664 => 'x86-64 (AMD64)',
            0x01C0 => 'ARM',
            0xAA64 => 'ARM64',
            0x0200 => 'IA64',
        ][$m] ?? sprintf('unknown (0x%04X)', $m);
    }
}

// --- usage ---
$pe = new PeReader($argv[1] ?? 'kernel32.dll');
$info = $pe->analyze();

printf("Kind:        %s\n", $info['pe_kind']);
printf("Machine:     %s\n", $info['machine']);
printf("Is DLL:      %s\n", $info['is_dll'] ? 'yes' : 'no');
printf("ImageBase:   0x%X\n", $info['image_base']);
printf("EntryPoint:  0x%X (RVA)\n", $info['entry_point']);
printf("Sections:    %s\n", implode(', ', $info['sections']));
printf("Exports (%d): %s\n",
    count($info['exports']),
    implode(', ', array_slice($info['exports'], 0, 20))
);
```

This is ~150 lines and gets you machine type, PE32 vs PE32+, DLL detection via
the `IMAGE_FILE_DLL` (0x2000) characteristic, entry point RVA, section names,
and the export name table. It deliberately skips imports, relocations, TLS,
resources, and Authenticode. Each of those is another directory entry you'd
parse the same way. The point is: header parsing in PHP is straightforward and
honest. It's just `unpack` and offset arithmetic.

A real-world reference implementation of this approach (PE headers + imports +
resources, with a web UI) is [sjoorm/readpe](https://github.com/sjoorm/readpe),
a PE parser written entirely in PHP. Worth reading to see how far hand-rolled
parsing scales before it gets unwieldy.

---

## 3. FFI in PHP 7.4+ (calling native code)

`ext-ffi` (stable since PHP 7.4, [FFI RFC](https://wiki.php.net/rfc/ffi)) lets
PHP call C functions and use C types directly. This is the most RE-relevant
modern PHP feature: you can build a dynamic interop harness that loads a target
`.so`/`.dll` and calls its exported functions, instead of only reading bytes
statically.

Three ways to get an `FFI` instance
([class.ffi docs](https://www.php.net/manual/en/class.ffi.php)):

- `FFI::cdef($cDecls, $libPath)` — inline C declarations, optionally bound to a
  library.
- `FFI::load($headerFile)` — parse a `.h` that uses `#define FFI_LIB "..."`
  ([FFI::load docs](https://www.php.net/manual/en/ffi.load.php)).
- `FFI::scope($name)` — use a preloaded definition.

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

- **[sjoorm/readpe](https://github.com/sjoorm/readpe)** — GitHub, not on
  Packagist. PE header + imports + resources parser with a web front-end. Small
  (2 stars) but a useful reference for the hand-rolled `unpack` approach.
- **General binary readers on Packagist** — search yields stream/buffer
  abstractions rather than format parsers. Spreadsheet libraries like
  [php-excel-reader/spreadsheet-reader](https://packagist.org/packages/php-excel-reader/spreadsheet-reader)
  read the binary XLS format directly and are a decent study in disciplined
  `unpack`-based parsing, even though they're not RE tools.
- **ELF / Mach-O** — no maintained, production-grade pure-PHP parser worth
  depending on at time of writing. If you need real ELF/PE/Mach-O abstraction,
  bind to LIEF via FFI or shell out (next section).

Honest takeaway: there is no PHP equivalent of `pefile` or LIEF. For anything
beyond header dumping, don't search for a PHP package, wrap an external tool.

---

## 5. Honest assessment: what PHP is and isn't for RE

PHP is good at:

- **Orchestration** — driving a pipeline of external RE tools, queuing samples,
  managing jobs.
- **Web dashboards / reporting** — rendering analysis results (a strength;
  PHP's whole reason to exist). A web UI over RE output is a natural fit.
- **`unpack`-based header/format parsers** — file magic, PE/COFF headers,
  custom/proprietary binary formats, network protocol dumps. Tractable and
  readable.
- **FFI interop harnesses** — exercising native libraries dynamically (section
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

## 6. Sketch: PHP tool that shells out to rabin2/dumpbin and reports

`rabin2 -j` (radare2's binary info tool) emits JSON, which is exactly what you
want from a PHP wrapper. On Windows, `dumpbin /headers /exports` emits text you
parse, or prefer `rabin2` cross-platform.

```php
<?php
declare(strict_types=1);

final class BinaryAnalyzer
{
    public function __construct(private string $rabin2 = 'rabin2') {}

    /** Run rabin2 with given flags and decode JSON. */
    private function run(string $flag, string $file): array
    {
        $cmd = sprintf('%s %s %s',
            escapeshellcmd($this->rabin2),
            $flag,                       // -Ij, -ij, -Sj  (already trusted)
            escapeshellarg($file)
        );

        $descriptors = [
            1 => ['pipe', 'w'],          // stdout
            2 => ['pipe', 'w'],          // stderr
        ];
        $proc = proc_open($cmd, $descriptors, $pipes);
        if (!is_resource($proc)) {
            throw new RuntimeException("failed to spawn: {$cmd}");
        }

        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $code = proc_close($proc);

        if ($code !== 0) {
            throw new RuntimeException("rabin2 exited {$code}: {$stderr}");
        }
        return json_decode($stdout, true, flags: JSON_THROW_ON_ERROR);
    }

    public function analyze(string $file): array
    {
        return [
            'info'     => $this->run('-Ij', $file),   // headers / bin info
            'imports'  => $this->run('-ij', $file),   // imports
            'exports'  => $this->run('-Ej', $file),   // exports
            'sections' => $this->run('-Sj', $file),   // sections
        ];
    }

    /** Flatten into a report-friendly shape. */
    public function report(string $file): array
    {
        $a = $this->analyze($file);
        $bin = $a['info']['bin'] ?? [];

        return [
            'file'    => $file,
            'format'  => $bin['bintype']  ?? '?',     // pe, elf, mach0
            'arch'    => $bin['arch']     ?? '?',
            'bits'    => $bin['bits']     ?? '?',
            'os'      => $bin['os']       ?? '?',
            'is_dll'  => ($bin['bintype'] ?? '') === 'pe'
                          && (bool)($bin['dll'] ?? false),
            'canary'  => $bin['canary']   ?? null,    // mitigations, nice for triage
            'nx'      => $bin['nx']       ?? null,
            'pic'     => $bin['pic']      ?? null,
            'sections'=> array_map(
                fn($s) => ['name' => $s['name'], 'size' => $s['size'],
                           'perm' => $s['perm'] ?? ''],
                $a['sections']['sections'] ?? $a['sections'] ?? []
            ),
            'imports' => array_map(fn($i) => $i['name'] ?? '', $a['imports']),
            'exports' => array_map(fn($e) => $e['name'] ?? '', $a['exports']),
        ];
    }
}

// --- CLI front-end ---
if (PHP_SAPI === 'cli') {
    $file = $argv[1] ?? exit("usage: analyze.php <binary>\n");
    $r = (new BinaryAnalyzer())->report($file);

    printf("=== %s ===\n", $r['file']);
    printf("Format:   %s  %s/%s-bit  (%s)\n", $r['format'], $r['arch'], $r['bits'], $r['os']);
    printf("DLL:      %s\n", $r['is_dll'] ? 'yes' : 'no');
    printf("Mitig:    NX=%s PIC=%s canary=%s\n",
        var_export($r['nx'], true), var_export($r['pic'], true), var_export($r['canary'], true));
    printf("Sections: %d, Imports: %d, Exports: %d\n",
        count($r['sections']), count($r['imports']), count($r['exports']));
    foreach (array_slice($r['exports'], 0, 25) as $e) {
        echo "  export  {$e}\n";
    }
}
```

The same `report()` method feeds a web view trivially: `json_encode($r)` to a
front-end, or a Blade/Twig template rendering a per-DLL analysis page. That's
the sweet spot, PHP managing the workflow and presentation, radare2 doing the
actual binary analysis.

Security notes for the shell-out layer:

- Always `escapeshellarg()` user-supplied filenames; never interpolate raw
  paths into the command string. Untrusted sample names are an injection vector.
- Prefer `proc_open` over `shell_exec` so you separate stdout/stderr and capture
  exit codes deterministically.
- Run analysis on untrusted binaries in a container/VM. Even "just parsing"
  tools have had parser CVEs, and you may end up *executing* samples via FFI.
- Treat all tool output as untrusted data, not as instructions.

---

## Summary

PHP earns its place in an RE stack as the orchestration and reporting tier:
`unpack`-based parsers for headers and proprietary formats (section 2), an FFI
harness to dynamically exercise native libraries (section 3), and a thin
`proc_open` wrapper that turns `rabin2`/`dumpbin` JSON into dashboards
(section 6). It is not, and should not pretend to be, a disassembler,
decompiler, or debugger; the package ecosystem for binary formats is thin and
you should lean on radare2/Ghidra/LIEF for the heavy lifting. The right call is
PHP up top for glue and presentation, real RE tools underneath.

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
