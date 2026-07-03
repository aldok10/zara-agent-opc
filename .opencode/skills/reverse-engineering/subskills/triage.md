# Subskill: Triage (first contact with any binary)

Scope: the cheap first pass that answers most questions and decides the route. Always run this before
deep analysis. Climb the pyramid only as high as the question needs.

## The analysis pyramid

```
manual RE (Ghidra/IDA/r2 — slow, deep)        ▲ expensive
behavioral / dynamic (debugger/Frida/sandbox)  │
static (headers/imports/exports/strings)        │
automated triage (hash/file/entropy/AV)         ▼ cheap — start here
```

## Triage workflow

1. **Identity**: `file <bin>`; our `dllscan <bin>` and `redll analyze <bin> --md`.
   - machine (x86/x64/arm64), PE32 vs PE32+, subsystem, is-DLL flag, compile timestamp.
2. **Hashes**: MD5/SHA256 (dedupe, VT lookup), imphash (import-table fingerprint), ssdeep/TLSH (fuzzy).
3. **Managed vs native**: CLR header / data directory index 14 non-zero → .NET. This is the first fork.
4. **Packed?**: overall + per-section entropy. >7.0 → likely packed/encrypted/compressed. Weird section
   names (UPX0, .vmp, .themida), tiny import table, high entropy → protection present → go to `anti-re.md`.
5. **Surface**: exports (the API to rebuild), imports (what it can do → capability profile).
6. **Strings**: `rabin2 -zz` / FLOSS for obfuscated strings. URLs, paths, registry keys, error messages,
   format strings, crypto constants.
7. **Capabilities**: heuristic from imports — networking, crypto, registry, process-injection,
   filesystem, anti-debug. (dllscan prints this.)

## Decision after triage

- .NET → `dotnet-decompile.md` (you'll get near-source C#).
- Native, unpacked → `native-decompile.md` + `radare2.md`.
- Packed/protected → `anti-re.md` then `unpacking.md`, re-triage after unpacking.
- Want to call it → `dll-interop.md`. Want to rebuild → `rebuild.md`.

## Stopping rules

- "What is this / what can it do" → triage + strings + capabilities is often enough. Stop.
- "How does function X work" → decompile X, don't boil the ocean.
- "Rebuild the API" → exports + signatures + interop binding. Full reimpl only where logic is self-contained.

## Safe handling

Unknown sample = untrusted. Static-first. Detonation only in isolated VM, no host network, snapshot first.

## Knowledge
`knowledge_read("triage-methodology.md")`, `knowledge_read("pe-dll-format.md")`,
`knowledge_read("anti-re-techniques.md")`.

## Routing
Upstream: SKILL.md. Downstream: every other subskill. Sibling: pe-dll-format.
