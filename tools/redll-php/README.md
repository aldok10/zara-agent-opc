# redll

PHP orchestration + reporting tier for DLL/PE reverse-engineering triage. PHP 8.3, strict types, PSR-4.

PHP is the **orchestration and reporting** layer here, not a disassembler. It parses the PE natively
(so it always works) and merges richer data from `rabin2` when present, then renders a report.

## What it does
- Native, dependency-free PE parser (`src/PeParser.php`): DOS/NT/COFF/optional headers (PE32 + PE32+),
  section table, per-section Shannon entropy, is-DLL flag, .NET detection (data dir 14).
- Safe external-tool orchestration (`src/ToolRunner.php`): shells out to `rabin2 -j` via `proc_open`
  with an **argv array** (no shell, injection-safe); falls back to native parse if rabin2 is absent.
- Unified report (`src/Report.php`): terminal text, `--json`, or `--md` Markdown. Capability heuristic
  from imports.

## Usage
```bash
php bin/redll analyze <file>          # terminal report
php bin/redll analyze <file> --md     # Markdown
php bin/redll analyze <file> --json   # JSON
```

## Test
```bash
php tests/run-tests.php
```

## Security
Never executes the target DLL. External commands use argv arrays (no shell interpolation). Path is
validated readable before use.
