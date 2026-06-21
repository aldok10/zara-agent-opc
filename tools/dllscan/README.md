# dllscan

Fast reverse-engineering triage for PE/DLL files. Pure Go standard library, no dependencies.

## What it does
- Headers: machine, PE32/PE32+, is-DLL, subsystem, entry point, image base, timestamp, MD5/SHA256.
- Sections with per-section **Shannon entropy** (flags likely-packed regions > 7.0).
- **Imports** grouped by library + a **capability heuristic** (networking, crypto, registry,
  process-injection, filesystem, anti-debug, persistence).
- **Exports** parsed manually from the export directory (names, ordinals, RVAs, forwarders) — the piece
  `debug/pe` does not expose.
- **.NET detection** via the CLR runtime header (data directory 14).

## Usage
```bash
go run ./cmd/dllscan <file>                 # human-readable report
go run ./cmd/dllscan -json <file>           # JSON
go run ./cmd/dllscan -max-exports 0 <file>  # print all exports (0 = no limit)
go build -o dllscan ./cmd/dllscan           # build a binary
```

## Test
```bash
go test ./... -race
```

## Layout
```
cmd/dllscan/main.go          CLI + report rendering
internal/peinfo              PE parse, manual export directory walk, .NET detect
internal/entropy             Shannon entropy + packed heuristic
internal/capabilities        import-name → capability categorization
```
