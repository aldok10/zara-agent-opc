# Subskill: .NET / Managed Decompilation

Scope: a managed DLL decompiles to near-original C#. Detect first, then decompile.

## Detect
Data directory index 14 (CLR header) non-zero → managed. `dllscan` prints `type: .NET`. Also
`dumpbin /CLRHEADER` or `corflags`. If native, use `native-decompile.md` instead.

## Decompile (pick one)
| Tool | Use |
|------|-----|
| ILSpy / `ilspycmd` | best CLI: `ilspycmd asm.dll -p -o outdir` → C# project |
| dnSpyEx | GUI, edit + debug live |
| dotPeek | JetBrains, free |
| ildasm/ilasm | round-trip to IL and back |

## Obfuscated?
`de4dot file.dll` cleans ConfuserEx/Dotfuscator/SmartAssembly: renames, decrypts strings, removes
control-flow junk. Run de4dot first, then ILSpy. Programmatic: `dnlib` / `System.Reflection.Metadata`.

## Rebuild
For .NET you usually port the decompiled C# directly to Go/PHP, or reference the assembly. See `rebuild.md`.

## Knowledge
`knowledge_read("dotnet-decompilation.md")`.

## Routing
Upstream: triage, pe-dll-format. Downstream: rebuild.
