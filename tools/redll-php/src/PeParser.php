<?php

declare(strict_types=1);

namespace ReDll;

/**
 * Native, dependency-free PE/DLL parser using fopen/fread + unpack().
 *
 * Parses the DOS header, NT headers, COFF file header, optional header
 * (PE32 / PE32+), and the section table, computing Shannon entropy per
 * section. Detects the IMAGE_FILE_DLL characteristic and a managed (.NET)
 * image via data directory index 14 (CLR runtime header).
 *
 * This is the static fallback that always works, even when no external
 * toolchain (rabin2/dumpbin) is present.
 */
final class PeParser
{
    private const IMAGE_FILE_DLL = 0x2000;
    private const DIR_CLR = 14;

    /** @var resource */
    private $fh;

    private function __construct($fh)
    {
        $this->fh = $fh;
    }

    /**
     * @return array<string,mixed>
     *
     * @throws \RuntimeException on unreadable file or malformed PE
     */
    public static function parse(string $path): array
    {
        if (!is_file($path) || !is_readable($path)) {
            throw new \RuntimeException("not a readable file: {$path}");
        }
        $fh = fopen($path, 'rb');
        if ($fh === false) {
            throw new \RuntimeException("cannot open: {$path}");
        }
        try {
            return (new self($fh))->run($path);
        } finally {
            fclose($fh);
        }
    }

    /**
     * @return array<string,mixed>
     */
    private function run(string $path): array
    {
        $size = (int) filesize($path);

        // --- DOS header ---
        $dos = $this->readAt(0, 64);
        if (substr($dos, 0, 2) !== 'MZ') {
            throw new \RuntimeException('not a PE: missing MZ signature');
        }
        $eLfanew = $this->u32($dos, 0x3c);

        // --- NT headers ---
        $sig = $this->readAt($eLfanew, 4);
        if ($sig !== "PE\0\0") {
            throw new \RuntimeException('not a PE: missing PE\0\0 signature');
        }

        // COFF file header (20 bytes) right after the signature
        $coff = $this->readAt($eLfanew + 4, 20);
        $machine = $this->u16($coff, 0);
        $numSections = $this->u16($coff, 2);
        $timeStamp = $this->u32($coff, 4);
        $optSize = $this->u16($coff, 16);
        $characteristics = $this->u16($coff, 18);
        $isDll = ($characteristics & self::IMAGE_FILE_DLL) !== 0;

        // --- Optional header ---
        $optOff = $eLfanew + 24;
        $opt = $this->readAt($optOff, $optSize);
        $magic = $this->u16($opt, 0);
        $isPe32Plus = $magic === 0x20b;

        if ($isPe32Plus) {
            $entry = $this->u32($opt, 16);
            $imageBase = $this->u64($opt, 24);
            $subsystem = $this->u16($opt, 68);
            $numRvaOff = 108;
            $dirOff = 112;
        } else {
            // PE32
            $entry = $this->u32($opt, 16);
            $imageBase = (string) $this->u32($opt, 28);
            $subsystem = $this->u16($opt, 68);
            $numRvaOff = 92;
            $dirOff = 96;
        }
        $numRva = $this->u32($opt, $numRvaOff);

        $isManaged = false;
        if ($numRva > self::DIR_CLR) {
            $clrRva = $this->u32($opt, $dirOff + self::DIR_CLR * 8);
            $isManaged = $clrRva !== 0;
        }

        // --- Section table ---
        $sectOff = $optOff + $optSize;
        $sections = [];
        for ($i = 0; $i < $numSections; $i++) {
            $base = $sectOff + $i * 40;
            $row = $this->readAt($base, 40);
            $name = rtrim(substr($row, 0, 8), "\0");
            $vsize = $this->u32($row, 8);
            $vaddr = $this->u32($row, 12);
            $rawSize = $this->u32($row, 16);
            $rawPtr = $this->u32($row, 20);

            $entropy = 0.0;
            if ($rawSize > 0 && $rawPtr > 0 && $rawPtr < $size) {
                $len = min($rawSize, $size - $rawPtr);
                $data = $this->readAt($rawPtr, $len);
                $entropy = self::shannon($data);
            }
            $sections[] = [
                'name' => $name,
                'virtual_size' => $vsize,
                'virtual_address' => $vaddr,
                'raw_size' => $rawSize,
                'entropy' => round($entropy, 3),
                'likely_packed' => $entropy > 7.0,
            ];
        }

        // overall entropy (cap read for very large files at 16 MiB for speed)
        $overall = self::shannon($this->readAt(0, min($size, 16 * 1024 * 1024)));

        return [
            'path' => $path,
            'size' => $size,
            'md5' => md5_file($path),
            'sha256' => hash_file('sha256', $path),
            'machine' => self::machineName($machine),
            'bitness' => $isPe32Plus ? 'PE32+' : 'PE32',
            'is_dll' => $isDll,
            'is_dotnet' => $isManaged,
            'subsystem' => self::subsystemName($subsystem),
            'timestamp' => $timeStamp,
            'entry_point_rva' => $entry,
            'image_base' => is_string($imageBase) ? $imageBase : '0x' . dechex($imageBase),
            'num_sections' => $numSections,
            'sections' => $sections,
            'overall_entropy' => round($overall, 3),
            'likely_packed' => $overall > 7.0,
        ];
    }

    /** Shannon entropy in bits/byte, range [0, 8]. */
    public static function shannon(string $data): float
    {
        $n = strlen($data);
        if ($n === 0) {
            return 0.0;
        }
        $counts = count_chars($data, 1); // byte value => frequency
        $h = 0.0;
        foreach ($counts as $c) {
            $p = $c / $n;
            $h -= $p * log($p, 2);
        }
        return $h;
    }

    private function readAt(int $offset, int $len): string
    {
        if ($len <= 0) {
            return '';
        }
        if (fseek($this->fh, $offset) !== 0) {
            throw new \RuntimeException("seek to {$offset} failed");
        }
        $buf = fread($this->fh, $len);
        if ($buf === false) {
            throw new \RuntimeException("read {$len} at {$offset} failed");
        }
        return $buf;
    }

    private function u16(string $s, int $o): int
    {
        return unpack('v', substr($s, $o, 2))[1];
    }

    private function u32(string $s, int $o): int
    {
        return unpack('V', substr($s, $o, 4))[1];
    }

    private function u64(string $s, int $o): int
    {
        return unpack('P', substr($s, $o, 8))[1];
    }

    private static function machineName(int $m): string
    {
        return match ($m) {
            0x014c => 'x86 (i386)',
            0x8664 => 'x64 (amd64)',
            0xaa64 => 'arm64',
            0x01c4 => 'arm (thumb-2)',
            default => sprintf('unknown (0x%04x)', $m),
        };
    }

    private static function subsystemName(int $s): string
    {
        return match ($s) {
            1 => 'native',
            2 => 'Windows GUI',
            3 => 'Windows CUI (console)',
            default => "subsystem {$s}",
        };
    }
}
