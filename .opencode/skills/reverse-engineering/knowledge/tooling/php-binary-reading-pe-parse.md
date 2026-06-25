# PHP Binary Reading & PE Header Parsing

TL;DR: PHP's `unpack()` for binary inspection, format codes reference, and a complete hand-rolled PE/DLL header parser with export walking.
See also: `php-ffi-packages-assessment.md`, `php-rabin2-shell-tool.md`

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
