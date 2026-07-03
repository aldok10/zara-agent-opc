# PHP Shell-Out Tool: rabin2/dumpbin Wrapper for Binary Analysis

TL;DR: A PHP CLI tool that shells out to rabin2 for JSON-based binary analysis, with security notes and a report-friendly output shape.
See also: `php-binary-reading-pe-parse.md`, `php-ffi-packages-assessment.md`

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
