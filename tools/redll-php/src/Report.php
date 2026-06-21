<?php

declare(strict_types=1);

namespace ReDll;

/**
 * Merges native-parser data with rabin2 output (when available) into a unified
 * analysis structure and renders it as terminal text, JSON, or Markdown.
 */
final class Report
{
    /** API name fragments per capability category (case-insensitive substring). */
    private const CAPABILITIES = [
        'networking' => ['wsastartup', 'socket', 'connect', 'send', 'recv', 'gethostby', 'getaddrinfo', 'inet_', 'winhttp', 'wininet', 'ws2_32'],
        'crypto' => ['crypt', 'bcrypt', 'ncrypt', 'cert', 'ssl', 'schannel'],
        'registry' => ['regopen', 'regcreate', 'regset', 'regget', 'regquery', 'regdelete', 'regenum'],
        'process-injection' => ['virtualalloc', 'writeprocessmemory', 'createremotethread', 'openprocess', 'loadlibrary', 'getprocaddress', 'createprocess', 'resumethread'],
        'filesystem' => ['createfile', 'readfile', 'writefile', 'deletefile', 'movefile', 'copyfile', 'findfirstfile', 'createdirectory'],
        'anti-debug' => ['isdebuggerpresent', 'checkremotedebugger', 'ntqueryinformationprocess', 'outputdebugstring', 'queryperformancecounter', 'gettickcount'],
    ];

    /**
     * @param array<string,mixed> $native
     * @return array<string,mixed>
     */
    public static function build(string $file): array
    {
        $native = PeParser::parse($file);

        $info = ToolRunner::rabin2Json('-I', $file);
        $imports = ToolRunner::rabin2Json('-i', $file);
        $exports = ToolRunner::rabin2Json('-E', $file);

        $importNames = [];
        $importLibs = [];
        if (is_array($imports) && isset($imports['imports']) && is_array($imports['imports'])) {
            foreach ($imports['imports'] as $imp) {
                if (isset($imp['name'])) {
                    $importNames[] = (string) $imp['name'];
                }
                if (isset($imp['libname'])) {
                    $importLibs[(string) $imp['libname']] = true;
                }
            }
        }

        $exportList = [];
        if (is_array($exports) && isset($exports['exports']) && is_array($exports['exports'])) {
            foreach ($exports['exports'] as $exp) {
                $exportList[] = [
                    'name' => (string) ($exp['name'] ?? ''),
                    'ordinal' => (int) ($exp['ordinal'] ?? 0),
                    'vaddr' => (int) ($exp['vaddr'] ?? 0),
                ];
            }
        }

        return [
            'native' => $native,
            'rabin2_available' => $info !== null,
            'rabin2_info' => $info['core'] ?? $info ?? null,
            'import_libraries' => array_keys($importLibs),
            'import_symbols' => $importNames,
            'import_count' => count($importNames),
            'exports' => $exportList,
            'export_count' => count($exportList),
            'capabilities' => self::classify($importNames),
        ];
    }

    /**
     * @param list<string> $symbols
     * @return array<string,list<string>>
     */
    public static function classify(array $symbols): array
    {
        $out = [];
        foreach ($symbols as $sym) {
            $low = strtolower($sym);
            foreach (self::CAPABILITIES as $cat => $frags) {
                foreach ($frags as $f) {
                    if (str_contains($low, $f)) {
                        $out[$cat][$sym] = true;
                        break;
                    }
                }
            }
        }
        $result = [];
        foreach ($out as $cat => $hits) {
            $names = array_keys($hits);
            sort($names);
            $result[$cat] = $names;
        }
        return $result;
    }

    /** @param array<string,mixed> $r */
    public static function renderText(array $r): string
    {
        $n = $r['native'];
        $lines = [];
        $lines[] = "== redll: {$n['path']} ==";
        $lines[] = '';
        $lines[] = sprintf('size            %d bytes', $n['size']);
        $lines[] = sprintf('md5             %s', $n['md5']);
        $lines[] = sprintf('sha256          %s', $n['sha256']);
        $lines[] = sprintf('machine         %s', $n['machine']);
        $lines[] = sprintf('bitness         %s', $n['bitness']);
        $lines[] = sprintf('is DLL          %s', $n['is_dll'] ? 'yes' : 'no');
        $lines[] = sprintf('type            %s', $n['is_dotnet'] ? '.NET (managed)' : 'native');
        $lines[] = sprintf('subsystem       %s', $n['subsystem']);
        $lines[] = sprintf('image base      %s', $n['image_base']);
        $lines[] = sprintf('entry point     0x%x (RVA)', $n['entry_point_rva']);
        $lines[] = sprintf('overall entropy %.3f bits/byte', $n['overall_entropy']);
        $lines[] = sprintf('likely packed   %s', $n['likely_packed'] ? 'YES' : 'no');
        $lines[] = sprintf('rabin2          %s', $r['rabin2_available'] ? 'available' : 'absent (native parse only)');
        $lines[] = sprintf('exports         %d', $r['export_count']);
        $lines[] = sprintf('imports         %d symbols across %d libraries', $r['import_count'], count($r['import_libraries']));
        $lines[] = '';
        $lines[] = '-- sections --';
        foreach ($n['sections'] as $s) {
            $flag = $s['likely_packed'] ? '  packed?' : '';
            $lines[] = sprintf('  %-10s vsize=0x%-7x vaddr=0x%-7x entropy=%.3f%s',
                $s['name'], $s['virtual_size'], $s['virtual_address'], $s['entropy'], $flag);
        }
        if ($r['import_libraries'] !== []) {
            $lines[] = '';
            $lines[] = '-- imported libraries --';
            foreach ($r['import_libraries'] as $lib) {
                $lines[] = "  {$lib}";
            }
        }
        if ($r['capabilities'] !== []) {
            $lines[] = '';
            $lines[] = '-- capability profile --';
            foreach ($r['capabilities'] as $cat => $hits) {
                $lines[] = sprintf('  [%s] %d', $cat, count($hits));
            }
        }
        if ($r['exports'] !== []) {
            $lines[] = '';
            $lines[] = '-- exports --';
            foreach ($r['exports'] as $e) {
                $name = $e['name'] !== '' ? $e['name'] : "(ordinal #{$e['ordinal']})";
                $lines[] = sprintf('  #%-4d %s @ 0x%x', $e['ordinal'], $name, $e['vaddr']);
            }
        }
        return implode("\n", $lines) . "\n";
    }

    /** @param array<string,mixed> $r */
    public static function renderMarkdown(array $r): string
    {
        $n = $r['native'];
        $md = [];
        $md[] = "# DLL Analysis Report — `" . basename($n['path']) . "`";
        $md[] = '';
        $md[] = '## Identity';
        $md[] = '';
        $md[] = '| Field | Value |';
        $md[] = '|-------|-------|';
        $md[] = "| Size | {$n['size']} bytes |";
        $md[] = "| MD5 | `{$n['md5']}` |";
        $md[] = "| SHA-256 | `{$n['sha256']}` |";
        $md[] = "| Machine | {$n['machine']} |";
        $md[] = "| Bitness | {$n['bitness']} |";
        $md[] = '| Is DLL | ' . ($n['is_dll'] ? 'yes' : 'no') . ' |';
        $md[] = '| Type | ' . ($n['is_dotnet'] ? '.NET (managed)' : 'native') . ' |';
        $md[] = "| Subsystem | {$n['subsystem']} |";
        $md[] = "| Image base | {$n['image_base']} |";
        $md[] = sprintf('| Entry point | 0x%x (RVA) |', $n['entry_point_rva']);
        $md[] = sprintf('| Overall entropy | %.3f bits/byte |', $n['overall_entropy']);
        $md[] = '| Likely packed | ' . ($n['likely_packed'] ? 'YES' : 'no') . ' |';
        $md[] = '';
        $md[] = '## Sections';
        $md[] = '';
        $md[] = '| Name | VSize | VAddr | RawSize | Entropy | Packed? |';
        $md[] = '|------|-------|-------|---------|---------|---------|';
        foreach ($n['sections'] as $s) {
            $md[] = sprintf('| %s | 0x%x | 0x%x | 0x%x | %.3f | %s |',
                $s['name'], $s['virtual_size'], $s['virtual_address'], $s['raw_size'],
                $s['entropy'], $s['likely_packed'] ? 'yes' : '');
        }
        if ($r['import_libraries'] !== []) {
            $md[] = '';
            $md[] = '## Imported Libraries';
            $md[] = '';
            foreach ($r['import_libraries'] as $lib) {
                $md[] = "- `{$lib}`";
            }
        }
        if ($r['capabilities'] !== []) {
            $md[] = '';
            $md[] = '## Capability Profile';
            $md[] = '';
            $md[] = '| Category | Hit count |';
            $md[] = '|----------|-----------|';
            foreach ($r['capabilities'] as $cat => $hits) {
                $md[] = sprintf('| %s | %d |', $cat, count($hits));
            }
        }
        if ($r['exports'] !== []) {
            $md[] = '';
            $md[] = '## Exports';
            $md[] = '';
            $md[] = '| Ordinal | Name | VAddr |';
            $md[] = '|---------|------|-------|';
            foreach ($r['exports'] as $e) {
                $name = $e['name'] !== '' ? $e['name'] : "(ordinal #{$e['ordinal']})";
                $md[] = sprintf('| %d | `%s` | 0x%x |', $e['ordinal'], $name, $e['vaddr']);
            }
        }
        return implode("\n", $md) . "\n";
    }
}
