<?php

declare(strict_types=1);

namespace ReDll;

require_once __DIR__ . '/../src/PeParser.php';
require_once __DIR__ . '/../src/Report.php';

$failures = 0;
function check(string $name, bool $cond, int &$failures): void
{
    if ($cond) {
        echo "PASS  {$name}\n";
    } else {
        echo "FAIL  {$name}\n";
        $failures++;
    }
}

// --- entropy ---
check('entropy empty = 0', PeParser::shannon('') === 0.0, $failures);
check('entropy single symbol = 0', PeParser::shannon(str_repeat("A", 16)) === 0.0, $failures);
check('entropy two equal = 1.0', abs(PeParser::shannon("\x00\x01") - 1.0) < 1e-9, $failures);
$all = '';
for ($i = 0; $i < 256; $i++) {
    $all .= chr($i);
}
check('entropy all 256 = 8.0', abs(PeParser::shannon($all) - 8.0) < 1e-9, $failures);

// --- capability classification ---
$caps = Report::classify([
    'WSAStartup', 'connect',          // networking
    'CryptEncrypt',                    // crypto
    'VirtualAllocEx', 'LoadLibraryW',  // injection
    'IsDebuggerPresent',               // anti-debug
    'CreateFileW',                     // filesystem
    'RegOpenKeyExW',                   // registry
    'Unrelated',                       // none
]);
check('cap networking = 2', count($caps['networking'] ?? []) === 2, $failures);
check('cap crypto = 1', count($caps['crypto'] ?? []) === 1, $failures);
check('cap injection = 2', count($caps['process-injection'] ?? []) === 2, $failures);
check('cap anti-debug = 1', count($caps['anti-debug'] ?? []) === 1, $failures);
check('cap registry = 1', count($caps['registry'] ?? []) === 1, $failures);
check('cap none unmatched', !isset($caps['service-persistence']), $failures);

echo $failures === 0 ? "\nALL TESTS PASSED\n" : "\n{$failures} TEST(S) FAILED\n";
exit($failures === 0 ? 0 : 1);
