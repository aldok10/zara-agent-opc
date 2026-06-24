<?php

declare(strict_types=1);

namespace ReDll;

/**
 * Safely shells out to external RE tools (rabin2 today) using proc_open with
 * an argument array — never string interpolation of the target path — to avoid
 * command injection. Tool availability is probed; when a tool is absent the
 * caller falls back to the native parser.
 */
final class ToolRunner
{
    /** Returns the absolute path to a tool, or null if not on PATH. */
    public static function which(string $tool): ?string
    {
        $path = self::run(['/usr/bin/env', 'which', $tool]);
        if ($path === null) {
            return null;
        }
        $path = trim($path);
        return $path === '' ? null : $path;
    }

    /**
     * Runs `rabin2 -j <flag> <file>` and decodes the JSON.
     *
     * @return array<string,mixed>|null null if rabin2 is missing or failed
     */
    public static function rabin2Json(string $flag, string $file): ?array
    {
        if (self::which('rabin2') === null) {
            return null;
        }
        // rabin2 -j emits JSON; flags: I=info, i=imports, E=exports, s=symbols, z=strings
        $out = self::run(['rabin2', '-j', $flag, $file]);
        if ($out === null || trim($out) === '') {
            return null;
        }
        $decoded = json_decode($out, true);
        return is_array($decoded) ? $decoded : null;
    }

    /**
     * Executes a command given as an argv array. Returns stdout, or null on
     * non-zero exit / spawn failure. No shell is involved, so arguments
     * (including file paths) cannot be interpreted as shell metacharacters.
     *
     * @param list<string> $argv
     */
    private static function run(array $argv): ?string
    {
        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $proc = proc_open($argv, $descriptors, $pipes);
        if (!is_resource($proc)) {
            return null;
        }
        fclose($pipes[0]);
        $stdout = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $code = proc_close($proc);

        if ($code !== 0 || $stdout === false) {
            return null;
        }
        return $stdout;
    }
}
