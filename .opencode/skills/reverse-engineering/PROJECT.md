# PROJECT.md — Reverse-Engineering Skill Context

Read this before any RE task. Project-specific context that overrides generic advice.

## Where things live

- **Target binaries**: `data/library/` (e.g. `MT5APIManager64.dll` — PE32+ x64, ~6.9 MB, MT5 Manager API).
- **RE results**: `data/result-mt5-sdk/` (analysis reports + rebuilt Go/PHP code go here).
- **Our tools**:
  - Go `dllscan`: `tools/dllscan/` — run `go run ./tools/dllscan <dll> [-json]` (or build the binary).
  - PHP `redll`: `tools/redll-php/` — run `php bin/redll analyze <dll> [--md|--json]`.
- **Research corpus**: `docs/research/reverse-engineering/01..19` (raw, deep). Synthesized into
  `.opencode/skills/reverse-engineering/knowledge/`.
- **Spec/plan**: `docs/specs/2026-06-21-reverse-engineering-dll-design.md`,
  `docs/plans/2026-06-21-reverse-engineering-skill.md`.

## Local environment (verified 2026-06-21)

- macOS (darwin/arm64). Host **cannot** LoadLibrary a Win64 DLL natively → dynamic analysis of Windows
  DLLs needs a Windows VM. Acceptance is **static-analysis-driven**.
- Go 1.26.4 · PHP 8.3.30 · radare2 6.1.4 + rabin2 (present).
- Ghidra / IDA / ilspycmd: not confirmed present — probe with `which`, install on demand, note if absent.

## Conventions

- Triage with our own tools first (`dllscan`, `redll`), then route by managed-vs-native.
- Never guess tool paths: `which <tool>` + version, fall back gracefully, note availability in the report.
- Every recovered function gets a confidence label: **verified** (behavior-confirmed) / **inferred**
  (from decompiler + signatures) / **guessed** (heuristic only).
- Rebuild scope = the **usable API surface** (exports + interop bindings) + selected self-contained
  algorithms. Do not pretend to fully reimplement a 6.9 MB native DLL.
- Code style: Go → `golang-expert` (stdlib-first, Uber style). PHP → `php-expert` (PSR-12, strict_types).

## Safety frame

Authorized analysis only. Static-first. Flag any dynamic execution. No weaponization. See SKILL.md.
